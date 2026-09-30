-- view_snapshots_public_select_live_campaigns의 EXISTS 서브쿼리가 clips 테이블을 참조하는데,
-- clips에는 anon용 SELECT 정책이 없어 서브쿼리가 항상 0건으로 평가되어 조회수가 절대 보이지 않았다.
-- SECURITY DEFINER 헬퍼로 clips+campaigns 조회를 RLS 우회시켜 실제로 동작하게 한다.

create or replace function public.is_approved_clip_of_live_campaign(target_clip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from clips cl
    join campaigns c on c.id = cl.campaign_id
    where cl.id = target_clip_id and cl.status = 'approved' and c.track = 'self_serve' and c.status = 'live'
  );
$$;

revoke execute on function public.is_approved_clip_of_live_campaign(uuid) from public;
grant execute on function public.is_approved_clip_of_live_campaign(uuid) to anon, authenticated;

drop policy view_snapshots_public_select_live_campaigns on view_snapshots;
create policy view_snapshots_public_select_live_campaigns on view_snapshots
  for select using (public.is_approved_clip_of_live_campaign(clip_id));
