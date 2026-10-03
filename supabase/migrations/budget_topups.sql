-- Budget top-ups: a brand adds service amount to a live campaign, or to one closed because its budget ran out (which
-- reopens it). Paid like the campaign deposit: bank transfer or balance, the operator records what arrived, short
-- waits and extra goes back. Design: docs/superpowers/specs/2026-10-03-budget-topup-design.md. The minimum mirrors
-- MIN_TOPUP in packages/db/src/topup.ts (topup.test.ts).

create type public.topup_status as enum ('pending', 'confirmed');

create table public.campaign_topups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  brand_id uuid not null references public.profiles(id) on delete restrict,
  amount integer not null check (amount >= 100000),
  credit_applied integer not null default 0 check (credit_applied >= 0),
  received_amount integer not null default 0 check (received_amount >= 0),
  status public.topup_status not null default 'pending',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  constraint campaign_topups_credit check (credit_applied <= amount),
  constraint campaign_topups_confirmed check ((status = 'confirmed') = (confirmed_at is not null))
);

create index campaign_topups_campaign_idx on public.campaign_topups (campaign_id, requested_at desc);
create index campaign_topups_status_idx on public.campaign_topups (status, requested_at);
create index campaign_topups_brand_idx on public.campaign_topups (brand_id);
create index campaign_topups_confirmed_by_idx on public.campaign_topups (confirmed_by);
create unique index campaign_topups_one_pending on public.campaign_topups (campaign_id) where status = 'pending';

alter table public.campaign_topups enable row level security;

create policy campaign_topups_select_own_or_admin on public.campaign_topups
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.campaign_topups from anon, authenticated;
grant select on public.campaign_topups to authenticated;

-- Balance spent on, and extra paid for, a top-up: one each per top-up. The first deposit keeps one per campaign.
alter table public.brand_balance_entries add column topup_id uuid references public.campaign_topups(id) on delete restrict;
drop index public.brand_balance_one_applied;
create unique index brand_balance_one_applied on public.brand_balance_entries (campaign_id) where kind = 'applied' and topup_id is null;
create unique index brand_balance_one_topup on public.brand_balance_entries (topup_id) where topup_id is not null;

alter table public.brand_refunds add column topup_id uuid references public.campaign_topups(id) on delete restrict;
drop index public.brand_refunds_one_over_deposit;
create unique index brand_refunds_one_over_deposit on public.brand_refunds (campaign_id) where kind = 'over_deposit' and topup_id is null;
create unique index brand_refunds_one_topup on public.brand_refunds (topup_id) where topup_id is not null;

-- The brand asks to add `p_amount` to its campaign, paying `p_credit` of it from its balance, and reports the transfer.
create or replace function public.request_topup(p_campaign_id uuid, p_amount integer, p_credit integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target campaigns;
  available integer;
  new_topup_id uuid;
begin
  if auth.uid() is null or not current_role_is('brand') then
    raise exception 'Only a brand can top up a campaign';
  end if;
  if p_amount is null or p_amount < 100000 then
    raise exception 'Top-ups start at 100,000 won' using hint = 'topup_amount';
  end if;
  if p_credit is null or p_credit < 0 or p_credit > p_amount then
    raise exception 'Credit must be between zero and the top-up' using hint = 'invalid_credit';
  end if;

  select * into target from campaigns where id = p_campaign_id and brand_id = auth.uid() for update;
  if target.id is null or not (target.status = 'live' or (target.status = 'closed' and target.stopped_at is null)) then
    raise exception 'Only a live campaign, or one closed by its budget, can be topped up' using hint = 'not_toppable';
  end if;
  if not exists (select 1 from brand_billing_profiles where brand_id = auth.uid()) then
    raise exception 'Add tax invoice details before reporting a deposit' using hint = 'billing_profile_missing';
  end if;
  if exists (select 1 from campaign_topups where campaign_id = p_campaign_id and status = 'pending') then
    raise exception 'A top-up of this campaign is already waiting' using hint = 'topup_open';
  end if;

  if p_credit > 0 then
    perform 1 from profiles where id = auth.uid() for update;
    select balance into available from brand_balance(auth.uid());
    if p_credit > available then
      raise exception 'Credit exceeds the balance' using hint = 'credit_too_large';
    end if;
  end if;

  insert into campaign_topups (campaign_id, brand_id, amount, credit_applied)
  values (p_campaign_id, auth.uid(), p_amount, p_credit)
  returning id into new_topup_id;

  if p_credit > 0 then
    insert into brand_balance_entries (brand_id, kind, amount, campaign_id, topup_id)
    values (auth.uid(), 'applied', -p_credit, p_campaign_id, new_topup_id);
  end if;
  return new_topup_id;
end;
$$;

revoke execute on function public.request_topup(uuid, integer, integer) from public, anon;
grant execute on function public.request_topup(uuid, integer, integer) to authenticated;

-- The operator records money seen for a top-up. Enough: the budget grows (and a campaign closed by its budget
-- reopens). Short: keep waiting. Over: queue the extra to go back.
create or replace function public.record_topup(p_topup_id uuid, p_amount integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  topup campaign_topups;
  target campaigns;
  due integer;
  received integer;
  reopened boolean;
begin
  if not current_role_is('admin') then
    raise exception 'Only an admin can record deposits';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be zero or more' using hint = 'invalid_amount';
  end if;

  select * into topup from campaign_topups where id = p_topup_id and status = 'pending' for update;
  if topup.id is null then
    raise exception 'Top-up is not waiting for a deposit' using hint = 'not_pending';
  end if;
  select * into target from campaigns where id = topup.campaign_id for update;
  if target.stopped_at is not null then
    raise exception 'The campaign was stopped; settle this top-up by hand' using hint = 'campaign_stopped';
  end if;

  due := deposit_due(topup.amount - topup.credit_applied);
  received := topup.received_amount + p_amount;

  if received < due then
    update campaign_topups set received_amount = received where id = topup.id;
    perform private.notify(
      topup.brand_id,
      'topup_short',
      jsonb_build_object('campaign_id', target.id, 'campaign_title', target.title, 'received', received, 'difference', due - received),
      '/brand/campaigns/' || target.id
    );
    return 'short';
  end if;

  update campaign_topups
  set received_amount = received, status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
  where id = topup.id;

  reopened := target.status = 'closed';
  update campaigns
  set total_budget = total_budget + topup.amount,
      status = case when reopened then 'live'::campaign_status else status end,
      finalized_at = case when reopened then null else finalized_at end
  where id = target.id;

  perform private.notify(
    topup.brand_id,
    'topup_confirmed',
    jsonb_build_object('campaign_id', target.id, 'campaign_title', target.title, 'amount', topup.amount, 'reopened', reopened),
    '/brand/campaigns/' || target.id
  );

  if received > due then
    insert into brand_refunds (brand_id, kind, campaign_id, topup_id, transfer_amount)
    values (topup.brand_id, 'over_deposit', target.id, topup.id, received - due);
    return 'over';
  end if;
  return 'exact';
end;
$$;

revoke execute on function public.record_topup(uuid, integer) from public, anon;
grant execute on function public.record_topup(uuid, integer) to authenticated;

-- A campaign with a top-up waiting can't be stopped: the operator would have money for a campaign that is gone.
create or replace function public.stop_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.campaign_topups where campaign_id = p_campaign_id and status = 'pending') then
    raise exception 'A top-up of this campaign is waiting' using hint = 'topup_pending';
  end if;

  update public.campaigns
  set status = 'closed', stopped_at = now()
  where id = p_campaign_id and brand_id = auth.uid() and status = 'live';
  if not found then
    raise exception 'Only a live campaign of yours can be stopped' using hint = 'not_stoppable';
  end if;

  update public.clips
  set status = 'rejected', rejection_reason = '광고주가 캠페인을 중단했어요', reviewed_at = now()
  where campaign_id = p_campaign_id and status = 'pending_review';
end;
$$;
