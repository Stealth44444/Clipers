-- Leftover balances can be returned for five years after they are fixed (the commercial limitation period), not one:
-- forfeiting the cash return of unused prepaid fees after a year risked being an unfair term (약관규제법 제6조·제9조).
-- Decided 2026-10-03. Mirrors REFUND_WINDOW_MONTHS in packages/db/src/brandBalance.ts (brandBalance.test.ts).

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
    values (target.brand_id, 'leftover', p_leftover, p_campaign_id, now() + interval '60 months');
  end if;
  return true;
end;
$$;

revoke execute on function public.finalize_campaign(uuid, integer) from public, anon;
grant execute on function public.finalize_campaign(uuid, integer) to authenticated, service_role;

-- Leftovers fixed before this change get the same five years.
update public.brand_balance_entries set refundable_until = created_at + interval '60 months' where kind = 'leftover';
