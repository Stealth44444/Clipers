-- 같은 이유로 campaign_applications에 대한 anon SELECT 평가 시 applications_brand_select가
-- campaign_brand_id를 호출하므로 anon에도 EXECUTE 필요.
grant execute on function public.campaign_brand_id(uuid) to anon;
