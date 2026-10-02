-- Stopping campaigns, the brand balance (leftovers of stopped campaigns) and returns of it, and deposits that don't
-- match what was asked. Design: docs/superpowers/specs/2026-10-02-brand-balance-refunds-design.md.
-- deposit_due(), brand_balance() and the refund window mirror packages/db/src/brandBalance.ts (brandBalance.test.ts).
-- Ledger amounts are service won without VAT. Only the functions below write the ledger and the refunds.

-- 1. Campaign stop and leftover fixing
alter table public.campaigns
  add column stopped_at timestamptz,
  add column finalized_at timestamptz;

grant select (stopped_at, finalized_at) on public.campaigns to authenticated;

-- 2. Deposits: what reached the bank account so far (VAT included) and how much balance the campaign used
alter table public.campaign_escrow
  add column received_amount numeric(12, 0) not null default 0 check (received_amount >= 0),
  add column credit_applied numeric(12, 0) not null default 0 check (credit_applied >= 0);

-- 3. Returns: a brand's request for its balance, or an over-deposit sent back to the account it came from
create type public.refund_kind as enum ('leftover', 'over_deposit');
create type public.refund_status as enum ('requested', 'paid');

create table public.brand_refunds (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.profiles(id) on delete restrict,
  kind public.refund_kind not null,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  service_amount integer check (service_amount > 0),
  transfer_amount integer not null check (transfer_amount > 0),
  bank_code text check (bank_code ~ '^\d{3}$'),
  account_number text check (account_number ~ '^\d{6,20}$'),
  account_holder text check (char_length(account_holder) between 1 and 100),
  status public.refund_status not null default 'requested',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  constraint brand_refunds_paid_at check ((status = 'paid') = (paid_at is not null)),
  constraint brand_refunds_shape check (
    (kind = 'leftover' and campaign_id is null and service_amount is not null
      and bank_code is not null and account_number is not null and account_holder is not null)
    or (kind = 'over_deposit' and campaign_id is not null and service_amount is null
      and bank_code is null and account_number is null and account_holder is null)
  )
);

create index brand_refunds_brand_idx on public.brand_refunds (brand_id, requested_at desc);
create index brand_refunds_status_idx on public.brand_refunds (status, requested_at);
create index brand_refunds_paid_by_idx on public.brand_refunds (paid_by);
create unique index brand_refunds_one_open_leftover on public.brand_refunds (brand_id) where kind = 'leftover' and status = 'requested';
create unique index brand_refunds_one_over_deposit on public.brand_refunds (campaign_id) where kind = 'over_deposit';

alter table public.brand_refunds enable row level security;

create policy brand_refunds_select_own_or_admin on public.brand_refunds
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.brand_refunds from anon, authenticated;
grant select on public.brand_refunds to authenticated;

-- 4. Ledger
create type public.balance_entry_kind as enum ('leftover', 'applied', 'refunded');

create table public.brand_balance_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.profiles(id) on delete restrict,
  kind public.balance_entry_kind not null,
  amount integer not null,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  refund_id uuid references public.brand_refunds(id) on delete restrict,
  refundable_until timestamptz,
  created_at timestamptz not null default now(),
  constraint brand_balance_entries_shape check (
    (kind = 'leftover' and amount > 0 and campaign_id is not null and refund_id is null and refundable_until is not null)
    or (kind = 'applied' and amount < 0 and campaign_id is not null and refund_id is null and refundable_until is null)
    or (kind = 'refunded' and amount < 0 and campaign_id is null and refund_id is not null and refundable_until is null)
  )
);

create index brand_balance_entries_brand_idx on public.brand_balance_entries (brand_id, created_at desc);
create index brand_balance_entries_refund_idx on public.brand_balance_entries (refund_id);
create unique index brand_balance_one_leftover on public.brand_balance_entries (campaign_id) where kind = 'leftover';
create unique index brand_balance_one_applied on public.brand_balance_entries (campaign_id) where kind = 'applied';

alter table public.brand_balance_entries enable row level security;

create policy brand_balance_entries_select_own_or_admin on public.brand_balance_entries
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.brand_balance_entries from anon, authenticated;
grant select on public.brand_balance_entries to authenticated;

-- 5. Shared math (mirrors depositAmount and balanceSummary)
create or replace function public.deposit_due(p_service numeric)
returns integer
language sql
immutable
set search_path = public
as $$
  select (greatest(0, p_service) + floor(greatest(0, p_service) / 10))::integer
$$;

create or replace function public.brand_balance(p_brand_id uuid, out balance integer, out refundable integer)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      coalesce(sum(amount), 0) as balance,
      coalesce(sum(amount) filter (where kind = 'leftover' and refundable_until <= now()), 0) as expired,
      coalesce(-sum(amount) filter (where kind in ('applied', 'refunded')), 0) as used
    from public.brand_balance_entries
    where brand_id = p_brand_id
  )
  select balance::integer, greatest(0, balance - greatest(0, expired - used))::integer from totals
$$;

revoke execute on function public.deposit_due(numeric) from public, anon;
grant execute on function public.deposit_due(numeric) to authenticated;
revoke execute on function public.brand_balance(uuid) from public, anon, authenticated;

-- 6. The brand stops its live campaign: off the market at once, pending clips rejected (terms 제11조 2항)
create or replace function public.stop_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke execute on function public.stop_campaign(uuid) from public, anon;
grant execute on function public.stop_campaign(uuid) to authenticated;

-- 7. The brand reports its deposit, optionally paying part of the budget from its balance
create or replace function public.report_deposit(p_campaign_id uuid, p_credit integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
  available integer;
begin
  if p_credit is null or p_credit < 0 then
    raise exception 'Credit must be zero or more' using hint = 'invalid_credit';
  end if;

  select * into target from public.campaigns
  where id = p_campaign_id and brand_id = auth.uid() and status = 'draft'
  for update;
  if target.id is null then
    raise exception 'Only a draft campaign of yours can report a deposit' using hint = 'not_draft';
  end if;

  if p_credit > 0 then
    -- One balance change at a time per brand.
    perform 1 from public.profiles where id = auth.uid() for update;
    select balance into available from public.brand_balance(auth.uid());
    if p_credit > least(available, target.total_budget) then
      raise exception 'Credit exceeds the balance or the budget' using hint = 'credit_too_large';
    end if;
    insert into public.brand_balance_entries (brand_id, kind, amount, campaign_id)
    values (auth.uid(), 'applied', -p_credit, p_campaign_id);
  end if;

  update public.campaign_escrow set credit_applied = p_credit where campaign_id = p_campaign_id;
  -- require_billing_before_deposit still refuses this without tax invoice details.
  update public.campaigns set status = 'pending_escrow' where id = p_campaign_id;
end;
$$;

revoke execute on function public.report_deposit(uuid, integer) from public, anon;
grant execute on function public.report_deposit(uuid, integer) to authenticated;

-- 8. The operator records money seen in the bank account. Short: keep waiting. Enough: confirm (the escrow trigger
-- makes the campaign live). Over: confirm and queue the excess to go back.
create or replace function public.record_deposit(p_campaign_id uuid, p_amount integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
  escrow public.campaign_escrow;
  due integer;
  received integer;
begin
  if not public.current_role_is('admin') then
    raise exception 'Only an admin can record deposits';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be zero or more' using hint = 'invalid_amount';
  end if;

  select * into target from public.campaigns where id = p_campaign_id and status = 'pending_escrow' for update;
  if target.id is null then
    raise exception 'Campaign is not waiting for a deposit' using hint = 'not_pending';
  end if;
  select * into escrow from public.campaign_escrow where campaign_id = p_campaign_id for update;

  due := public.deposit_due(target.total_budget - escrow.credit_applied);
  received := escrow.received_amount + p_amount;

  if received < due then
    update public.campaign_escrow set received_amount = received where campaign_id = p_campaign_id;
    return 'short';
  end if;

  update public.campaign_escrow
  set received_amount = received, escrow_status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where campaign_id = p_campaign_id and escrow_status = 'awaiting_manual_confirm';

  if received > due then
    insert into public.brand_refunds (brand_id, kind, campaign_id, transfer_amount)
    values (target.brand_id, 'over_deposit', p_campaign_id, received - due);
    return 'over';
  end if;
  return 'exact';
end;
$$;

revoke execute on function public.record_deposit(uuid, integer) from public, anon;
grant execute on function public.record_deposit(uuid, integer) to authenticated;

-- 9. The settlement run fixes a stopped campaign's leftover once its last week is settled. Runs once per campaign.
create or replace function public.finalize_campaign(p_campaign_id uuid, p_leftover integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.current_role_is('admin')) then
    raise exception 'Only the settlement run can finalize campaigns';
  end if;

  select * into target from public.campaigns
  where id = p_campaign_id and status = 'closed' and finalized_at is null
  for update;
  if target.id is null then
    return false;
  end if;
  if p_leftover is null or p_leftover < 0 or p_leftover > target.total_budget then
    raise exception 'Leftover % is outside the budget', p_leftover;
  end if;

  update public.campaigns set finalized_at = now() where id = p_campaign_id;
  if p_leftover > 0 then
    insert into public.brand_balance_entries (brand_id, kind, amount, campaign_id, refundable_until)
    values (target.brand_id, 'leftover', p_leftover, p_campaign_id, now() + interval '12 months');
  end if;
  return true;
end;
$$;

revoke execute on function public.finalize_campaign(uuid, integer) from public, anon;
grant execute on function public.finalize_campaign(uuid, integer) to authenticated, service_role;

-- 10. The brand asks for part or all of its returnable balance (one open request at a time)
create or replace function public.request_refund(p_amount integer, p_bank_code text, p_account_number text, p_account_holder text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  summary record;
  new_refund_id uuid;
begin
  if auth.uid() is null or not public.current_role_is('brand') then
    raise exception 'Only a brand can ask for its balance back';
  end if;

  perform 1 from public.profiles where id = auth.uid() for update;
  if exists (select 1 from public.brand_refunds where brand_id = auth.uid() and kind = 'leftover' and status = 'requested') then
    raise exception 'A return request is already open' using hint = 'refund_open';
  end if;

  select * into summary from public.brand_balance(auth.uid());
  if p_amount is null or p_amount < 1 or p_amount > summary.refundable then
    raise exception 'Return amount out of range (returnable %)', summary.refundable using hint = 'refund_amount';
  end if;

  insert into public.brand_refunds (brand_id, kind, service_amount, transfer_amount, bank_code, account_number, account_holder)
  values (auth.uid(), 'leftover', p_amount, public.deposit_due(p_amount), p_bank_code, p_account_number, trim(p_account_holder))
  returning id into new_refund_id;

  insert into public.brand_balance_entries (brand_id, kind, amount, refund_id)
  values (auth.uid(), 'refunded', -p_amount, new_refund_id);
  return new_refund_id;
end;
$$;

revoke execute on function public.request_refund(integer, text, text, text) from public, anon;
grant execute on function public.request_refund(integer, text, text, text) to authenticated;

-- 11. The operator marks a return sent, after making the transfer
create or replace function public.mark_refund_paid(p_refund_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_role_is('admin') then
    raise exception 'Only an admin can mark returns sent';
  end if;
  update public.brand_refunds
  set status = 'paid', paid_at = now(), paid_by = auth.uid()
  where id = p_refund_id and status = 'requested';
  if not found then
    raise exception 'Return is not waiting to be sent' using hint = 'not_requested';
  end if;
end;
$$;

revoke execute on function public.mark_refund_paid(uuid) from public, anon;
grant execute on function public.mark_refund_paid(uuid) to authenticated;
