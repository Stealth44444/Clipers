-- 1) 참여자 수 카운트용 — 라이브 셀프서브 캠페인의 지원서 공개 조회
create policy campaign_applications_public_select on campaign_applications
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.track = 'self_serve' and c.status = 'live')
  );

-- 2) 리더보드용 — 라이브 셀프서브 캠페인의 정산 내역 공개 조회 (Whop도 크리에이터명+수익을 공개 노출)
create policy settlements_public_select_live_campaigns on settlements
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.track = 'self_serve' and c.status = 'live')
  );

-- 3) 조회수 차트/Top clips용 — 라이브 셀프서브 캠페인의 승인된 클립 스냅샷 공개 조회
create policy view_snapshots_public_select_live_campaigns on view_snapshots
  for select using (
    exists (
      select 1 from clips cl
      join campaigns c on c.id = cl.campaign_id
      where cl.id = clip_id and cl.status = 'approved' and c.track = 'self_serve' and c.status = 'live'
    )
  );

-- 4) 캠페인 배너 이미지 Storage 버킷 (public-read, 브랜드 본인 폴더에만 쓰기)
insert into storage.buckets (id, name, public)
values ('campaign-banners', 'campaign-banners', true)
on conflict (id) do nothing;

create policy campaign_banners_public_read on storage.objects
  for select using (bucket_id = 'campaign-banners');

create policy campaign_banners_brand_insert_own on storage.objects
  for insert with check (
    bucket_id = 'campaign-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy campaign_banners_brand_update_own on storage.objects
  for update using (
    bucket_id = 'campaign-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
