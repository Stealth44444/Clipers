-- 1) 플랫폼별 요율 테이블
create table campaign_platform_rates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  platform text not null,
  cpm_rate numeric(10,2) not null check (cpm_rate > 0),
  min_payout numeric(12,2) not null default 0 check (min_payout >= 0),
  max_payout numeric(12,2) not null check (max_payout >= min_payout),
  unique (campaign_id, platform)
);

alter table campaign_platform_rates enable row level security;

create policy campaign_platform_rates_select on campaign_platform_rates
  for select using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or current_role_is('admin') or (c.track = 'self_serve' and c.status = 'live'))
    )
  );

create policy campaign_platform_rates_brand_insert_own on campaign_platform_rates
  for insert with check (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid() and c.status = 'draft'
    )
  );

create policy campaign_platform_rates_admin_all on campaign_platform_rates
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));

-- 2) 기존 단일 요율 데이터를 새 테이블로 백필 (allowed_platforms의 각 플랫폼에 동일 요율 적용)
insert into campaign_platform_rates (campaign_id, platform, cpm_rate, min_payout, max_payout)
select c.id, p.platform, c.cpm_rate, 0, c.per_clip_cap
from campaigns c, unnest(c.allowed_platforms) as p(platform)
on conflict (campaign_id, platform) do nothing;

-- 3) campaigns에 배너/설명 필드 추가, 단일 요율 컬럼 제거
alter table campaigns
  add column cover_image_url text,
  add column content_requirements text,
  add column reference_url text;

alter table campaigns
  drop column cpm_rate,
  drop column per_clip_cap;
