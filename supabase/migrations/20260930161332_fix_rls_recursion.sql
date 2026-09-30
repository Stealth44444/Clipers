-- campaigns_creator_select_invited_managed(campaigns) <-> campaign_applications_public_select(campaign_applications)
-- 두 정책이 서로 EXISTS 서브쿼리로 상대 테이블을 참조하면서 무한 재귀(42P17)가 발생했다.
-- SECURITY DEFINER 헬퍼 함수로 campaigns 조회를 RLS 우회시켜 순환을 끊는다(current_role_is와 동일 패턴).

create or replace function public.is_live_self_serve_campaign(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaigns c
    where c.id = target_campaign_id and c.track = 'self_serve' and c.status = 'live'
  );
$$;

revoke execute on function public.is_live_self_serve_campaign(uuid) from public;
grant execute on function public.is_live_self_serve_campaign(uuid) to anon, authenticated;

drop policy campaign_applications_public_select on campaign_applications;
create policy campaign_applications_public_select on campaign_applications
  for select using (public.is_live_self_serve_campaign(campaign_id));

drop policy settlements_public_select_live_campaigns on settlements;
create policy settlements_public_select_live_campaigns on settlements
  for select using (public.is_live_self_serve_campaign(campaign_id));

drop policy view_snapshots_public_select_live_campaigns on view_snapshots;
create policy view_snapshots_public_select_live_campaigns on view_snapshots
  for select using (
    exists (
      select 1 from clips cl
      where cl.id = clip_id and cl.status = 'approved' and public.is_live_self_serve_campaign(cl.campaign_id)
    )
  );

drop policy campaign_platform_rates_select on campaign_platform_rates;
create policy campaign_platform_rates_select on campaign_platform_rates
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and (c.brand_id = auth.uid() or current_role_is('admin')))
    or public.is_live_self_serve_campaign(campaign_id)
  );
