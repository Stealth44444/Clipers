-- Notifications for brands and creators (in-app, and by email when Resend is configured). Design:
-- docs/superpowers/specs/2026-10-03-notifications-design.md. Rows keep a kind and its values; the app renders the words
-- (packages/db/src/notifications.ts). Triggers write them when a status changes, whichever path changed it; a failed
-- notification only raises a warning, so it can never block the change itself.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 60),
  data jsonb not null default '{}',
  link text check (link like '/%'),
  dedupe_key text,
  email boolean not null default true,
  email_sent_at timestamptz,
  email_attempts smallint not null default 0,
  email_error text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_queue_idx on public.notifications (created_at) where email and email_sent_at is null;
create unique index notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

-- Writes one notification; a repeated dedupe key is ignored.
create or replace function private.notify(p_user uuid, p_kind text, p_data jsonb, p_link text, p_email boolean default true, p_dedupe text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, data, link, email, dedupe_key)
  values (p_user, p_kind, p_data, p_link, p_email, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
$$;

-- 1. Applications reviewed
create or replace function public.notify_application_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.creator_id,
    case new.status when 'approved' then 'application_approved' else 'application_rejected' end,
    jsonb_build_object('campaign_id', new.campaign_id, 'campaign_title', (select title from campaigns where id = new.campaign_id)),
    '/creator/campaigns'
  );
  return new;
exception when others then
  raise warning 'application notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_application_reviewed
  after update of status on public.campaign_applications
  for each row when (old.status = 'applied' and new.status in ('approved', 'rejected'))
  execute function public.notify_application_reviewed();

-- 2. Clips reviewed (the campaign stop rejects pending clips too); the brand hears about its first approved clip once
create or replace function public.notify_clip_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target campaigns;
begin
  select * into target from campaigns where id = new.campaign_id;
  perform private.notify(
    new.creator_id,
    case new.status when 'approved' then 'clip_approved' else 'clip_rejected' end,
    jsonb_build_object('clip_id', new.id, 'campaign_title', target.title, 'reason', new.rejection_reason),
    '/creator/submissions'
  );
  if new.status = 'approved' then
    perform private.notify(
      target.brand_id,
      'first_clip_approved',
      jsonb_build_object('campaign_id', target.id, 'campaign_title', target.title),
      '/brand/campaigns/' || target.id,
      true,
      'first_clip:' || target.id
    );
  end if;
  return new;
exception when others then
  raise warning 'clip notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_clip_reviewed
  after update of status on public.clips
  for each row when (old.status is distinct from new.status and new.status in ('approved', 'rejected'))
  execute function public.notify_clip_reviewed();

-- 3. Weekly settlement: one notification per creator per week, adding up that week's rows
create or replace function public.notify_settlement_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, kind, data, link, dedupe_key)
  values (new.creator_id, 'settlement_created', jsonb_build_object('period', new.period, 'amount', new.amount), '/creator/earnings', 'settlement:' || new.period)
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do update set data = jsonb_set(notifications.data, '{amount}', to_jsonb(coalesce((notifications.data ->> 'amount')::numeric, 0) + new.amount));
  return new;
exception when others then
  raise warning 'settlement notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_settlement_created
  after insert on public.settlements
  for each row when (new.amount > 0)
  execute function public.notify_settlement_created();

-- 4. Payout sent
create or replace function public.notify_payout_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(new.creator_id, 'payout_paid', jsonb_build_object('payout_id', new.id, 'net_amount', new.net_amount), '/creator/earnings');
  return new;
exception when others then
  raise warning 'payout notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_payout_paid
  after update of status on public.payouts
  for each row when (old.status = 'requested' and new.status = 'paid')
  execute function public.notify_payout_paid();

-- 5. Dispute resolved
create or replace function public.notify_dispute_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.creator_id,
    'dispute_resolved',
    jsonb_build_object(
      'clip_id', new.clip_id,
      'campaign_title', (select c.title from clips k join campaigns c on c.id = k.campaign_id where k.id = new.clip_id),
      'note', new.resolution_note
    ),
    '/creator/submissions'
  );
  return new;
exception when others then
  raise warning 'dispute notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_dispute_resolved
  after update of status on public.clip_disputes
  for each row when (old.status = 'open' and new.status = 'resolved')
  execute function public.notify_dispute_resolved();

-- 6. View report reviewed
create or replace function public.notify_view_report_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.creator_id,
    'view_report_reviewed',
    jsonb_build_object(
      'clip_id', new.clip_id,
      'campaign_title', (select c.title from clips k join campaigns c on c.id = k.campaign_id where k.id = new.clip_id),
      'verified', new.status = 'verified'
    ),
    '/creator/submissions'
  );
  return new;
exception when others then
  raise warning 'view report notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_view_report_reviewed
  after update of status on public.manual_view_reports
  for each row when (old.status = 'pending' and new.status in ('verified', 'rejected'))
  execute function public.notify_view_report_reviewed();

-- 7. Campaign went live, or closed (budget spent or stopped)
create or replace function public.notify_campaign_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb := jsonb_build_object('campaign_id', new.id, 'campaign_title', new.title);
  creator uuid;
begin
  if new.status = 'live' and old.status = 'pending_escrow' then
    perform private.notify(new.brand_id, 'campaign_live', payload, '/brand/campaigns/' || new.id);
  elsif new.status = 'closed' and old.status in ('live', 'paused') then
    -- A stopped campaign was the brand's own doing; it hears about the leftover instead.
    if new.stopped_at is null then
      perform private.notify(new.brand_id, 'campaign_exhausted', payload, '/brand/campaigns/' || new.id);
    end if;
    for creator in select creator_id from campaign_applications where campaign_id = new.id and status = 'approved' loop
      perform private.notify(creator, 'campaign_closed', payload, '/creator/campaigns', false);
    end loop;
  end if;
  return new;
exception when others then
  raise warning 'campaign notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_campaign_status
  after update of status on public.campaigns
  for each row when (old.status is distinct from new.status)
  execute function public.notify_campaign_status();

-- 8. Deposit recorded but still short
create or replace function public.notify_deposit_short()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target campaigns;
  due integer;
begin
  select * into target from campaigns where id = new.campaign_id;
  due := deposit_due(target.total_budget - new.credit_applied);
  if new.received_amount < due then
    perform private.notify(
      target.brand_id,
      'deposit_short',
      jsonb_build_object('campaign_id', target.id, 'campaign_title', target.title, 'received', new.received_amount, 'difference', due - new.received_amount),
      '/brand/campaigns/' || target.id
    );
  end if;
  return new;
exception when others then
  raise warning 'deposit notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_deposit_short
  after update of received_amount on public.campaign_escrow
  for each row when (new.received_amount > old.received_amount and new.escrow_status = 'awaiting_manual_confirm')
  execute function public.notify_deposit_short();

-- 9. Leftover of a stopped campaign fixed as balance
create or replace function public.notify_leftover_finalized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.brand_id,
    'leftover_finalized',
    jsonb_build_object('campaign_id', new.campaign_id, 'campaign_title', (select title from campaigns where id = new.campaign_id), 'amount', new.amount),
    '/brand/spend'
  );
  return new;
exception when others then
  raise warning 'leftover notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_leftover_finalized
  after insert on public.brand_balance_entries
  for each row when (new.kind = 'leftover')
  execute function public.notify_leftover_finalized();

-- 10. Return sent
create or replace function public.notify_refund_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.brand_id,
    'refund_paid',
    jsonb_build_object('refund_id', new.id, 'refund_kind', new.kind, 'amount', new.transfer_amount),
    '/brand/spend'
  );
  return new;
exception when others then
  raise warning 'refund notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_refund_paid
  after update of status on public.brand_refunds
  for each row when (old.status = 'requested' and new.status = 'paid')
  execute function public.notify_refund_paid();

revoke execute on function public.notify_application_reviewed(), public.notify_clip_reviewed(), public.notify_settlement_created(),
  public.notify_payout_paid(), public.notify_dispute_resolved(), public.notify_view_report_reviewed(),
  public.notify_campaign_status(), public.notify_deposit_short(), public.notify_leftover_finalized(),
  public.notify_refund_paid() from public, anon, authenticated;
revoke execute on function private.notify(uuid, text, jsonb, text, boolean, text) from public, anon, authenticated;

-- The signed-in user marks their notifications read (all of them, or the given ones)
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Emails to send: recent notifications that ask for one, with the address. Only the email route (service role) calls it.
create or replace function public.notification_email_queue(p_limit integer default 50)
returns table (id uuid, email text, kind text, data jsonb, link text, email_attempts smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, u.email::text, n.kind, n.data, n.link, n.email_attempts
  from public.notifications n
  join auth.users u on u.id = n.user_id
  where n.email and n.email_sent_at is null and n.email_attempts < 3 and n.created_at > now() - interval '1 day'
    and u.email is not null
  order by n.created_at
  limit greatest(1, least(p_limit, 200));
$$;

revoke execute on function public.notification_email_queue(integer) from public, anon, authenticated;
grant execute on function public.notification_email_queue(integer) to service_role;
