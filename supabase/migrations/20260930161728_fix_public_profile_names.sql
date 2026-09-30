-- profiles는 지금까지 본인/admin만 조회 가능했다. 마켓플레이스에서 브랜드명(카드/상세)과
-- 크리에이터명(리더보드)을 조인해서 보여줘야 하는데, anon은 profiles를 전혀 못 읽어서
-- 항상 null -> UI 기본값("브랜드"/"크리에이터")만 노출되는 실사용 버그였다.

create or replace function public.is_public_facing_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaigns c
    where c.brand_id = target_profile_id and c.track = 'self_serve' and c.status = 'live'
  )
  or exists (
    select 1 from settlements s
    join campaigns c on c.id = s.campaign_id
    where s.creator_id = target_profile_id and c.track = 'self_serve' and c.status = 'live'
  );
$$;

revoke execute on function public.is_public_facing_profile(uuid) from public;
grant execute on function public.is_public_facing_profile(uuid) to anon, authenticated;

create policy profiles_public_select on profiles
  for select using (public.is_public_facing_profile(id));
