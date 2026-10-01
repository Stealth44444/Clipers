-- Creators withdraw their whole pending balance at once, and only from 3,000 won (net of withholding).
-- Mirrors MIN_WITHDRAWAL in packages/db/src/pricing.ts. Replaces the per-row pending -> requested update policy.
create or replace function public.request_payout()
returns table (requested_count integer, requested_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance numeric;
  rows_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(sum(amount - withholding_amount), 0) into balance
  from public.settlements
  where creator_id = auth.uid() and status = 'pending';

  if balance < 3000 then
    raise exception 'Payout requests start at 3,000 won (pending balance %)', balance;
  end if;

  update public.settlements set status = 'requested'
  where creator_id = auth.uid() and status = 'pending';
  get diagnostics rows_updated = row_count;

  return query select rows_updated, balance;
end;
$$;

revoke execute on function public.request_payout() from public, anon;
grant execute on function public.request_payout() to authenticated;

drop policy if exists settlements_creator_request_own on public.settlements;
