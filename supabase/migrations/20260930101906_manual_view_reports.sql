-- 틱톡/릴스는 공식 API 심사·오디트 완료 전까지 조회수 자동 수집이 불가능하므로
-- (유튜브만 API 키로 공개 조회수 조회 가능), 크리에이터 자진 신고 + 운영자 스팟체크로
-- 파일럿 기간 동안 대체한다. 심사가 끝나면 해당 플랫폼도 자동 수집으로 전환하고
-- 이 워크플로우는 감사(audit) 대응용 보조 경로로 남긴다.

alter table view_snapshots
  add column source text not null default 'api',
  add constraint view_snapshots_source_check check (source in ('api', 'manual'));

create type manual_view_report_status as enum ('pending', 'verified', 'rejected');

create table manual_view_reports (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  reported_view_count bigint not null check (reported_view_count >= 0),
  evidence_url text not null,
  status manual_view_report_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_manual_view_reports_pending on manual_view_reports (status, created_at);

alter table manual_view_reports enable row level security;

create policy manual_view_reports_select on manual_view_reports
  for select using (creator_id = auth.uid() or current_role_is('admin'));

create policy manual_view_reports_creator_insert_own on manual_view_reports
  for insert with check (
    creator_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and current_role_is('creator')
    and exists (
      select 1 from clips cl
      where cl.id = clip_id and cl.creator_id = auth.uid() and cl.status = 'approved'
    )
  );

create policy manual_view_reports_admin_update on manual_view_reports
  for update using (current_role_is('admin'))
  with check (current_role_is('admin'));
