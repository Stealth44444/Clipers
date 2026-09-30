-- applications_brand_select(campaign_applications) -> campaigns 직접 EXISTS 참조가
-- campaigns_creator_select_invited_managed(campaigns) -> campaign_applications 참조와 맞물려
-- 여전히 재귀를 유발했다. brand_id 조회도 SECURITY DEFINER 헬퍼로 우회.

create or replace function public.campaign_brand_id(target_campaign_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select brand_id from campaigns where id = target_campaign_id;
$$;

revoke execute on function public.campaign_brand_id(uuid) from public;
grant execute on function public.campaign_brand_id(uuid) to authenticated;

drop policy applications_brand_select on campaign_applications;
create policy applications_brand_select on campaign_applications
  for select using (
    public.campaign_brand_id(campaign_id) = auth.uid() or current_role_is('admin')
  );
