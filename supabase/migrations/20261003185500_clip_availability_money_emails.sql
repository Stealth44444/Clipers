-- A clip whose settlement stopped (deleted or private video) or started again is about money: email it even to people
-- who turned activity emails off. Same list as MONEY_NOTIFICATION_KINDS in packages/db/src/notifications.ts.

create or replace function private.apply_email_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email
    and new.kind not in ('settlement_created', 'payout_paid', 'refund_paid', 'deposit_short', 'topup_confirmed',
                         'topup_short', 'leftover_finalized', 'campaign_live', 'campaign_exhausted',
                         'clip_unavailable', 'clip_available_again')
    and exists (select 1 from public.profiles where id = new.user_id and not email_activity_notifications)
  then
    new.email := false;
  end if;
  return new;
end;
$$;
