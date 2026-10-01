-- Phase 1 of closing public columns (docs/legal/README.md section 4): the new read paths, additive only, so code
-- deployed before them keeps working. Brands and admins read a campaign's budget and brand rate through
-- campaign_finances; the public market gets each campaign's creator payout limit from campaign_payout_limits()
-- (mirrors creatorPayoutCap in packages/db/src/pricing.ts, enforced by pricing.test.ts).
-- Phase 2 (close_public_columns) revokes the old column access once the code using these paths is deployed.

grant execute on function public.current_role_is(public.user_role) to service_role;

create view public.campaign_finances as
select c.id as campaign_id, c.total_budget, c.brand_cpm, c.creator_cpm
from public.campaigns c
where coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  or c.brand_id = auth.uid()
  or public.current_role_is('admin');

revoke all on public.campaign_finances from anon, authenticated;
grant select on public.campaign_finances to authenticated, service_role;

create or replace function public.campaign_payout_limits(p_campaign_ids uuid[])
returns table (campaign_id uuid, payout_limit numeric)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, floor(c.total_budget * c.creator_cpm / c.brand_cpm)
  from public.campaigns c
  where c.id = any(p_campaign_ids)
    and c.track = 'self_serve'
    and c.status = 'live'
    and c.brand_cpm > 0;
$$;

revoke execute on function public.campaign_payout_limits(uuid[]) from public;
grant execute on function public.campaign_payout_limits(uuid[]) to anon, authenticated;
