-- People can turn off activity notification emails (approvals, rejections, campaign news) in settings. Money
-- notifications (settlements, payouts, deposits, refunds, budget) are always emailed. In-app notifications are unchanged.
-- The same money list lives in packages/db/src/notifications.ts (MONEY_NOTIFICATION_KINDS): keep both in step.

alter table public.profiles add column email_activity_notifications boolean not null default true;

-- Decides per notification as it is written, whichever path writes it (private.notify, a trigger's own insert, or the
-- service role), so the email queue never holds a mail the person turned off.
create or replace function private.apply_email_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email
    and new.kind not in ('settlement_created', 'payout_paid', 'refund_paid', 'deposit_short', 'topup_confirmed',
                         'topup_short', 'leftover_finalized', 'campaign_live', 'campaign_exhausted')
    and exists (select 1 from public.profiles where id = new.user_id and not email_activity_notifications)
  then
    new.email := false;
  end if;
  return new;
end;
$$;

revoke all on function private.apply_email_preference() from public;

create trigger apply_email_preference
  before insert on public.notifications
  for each row execute function private.apply_email_preference();
