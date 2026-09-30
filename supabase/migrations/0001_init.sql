-- 사용자 프로필
create type user_role as enum ('brand', 'creator', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'creator',
  display_name text not null,
  created_at timestamptz not null default now()
);

-- 캠페인
create type campaign_track as enum ('managed', 'self_serve');
create type campaign_content_type as enum ('clipping', 'ugc');
create type campaign_status as enum (
  'draft', 'pending_escrow', 'pending_managed_review', 'live', 'paused', 'closed'
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references profiles(id) on delete cascade,
  track campaign_track not null,
  title text not null,
  content_type campaign_content_type not null,
  category text not null,
  total_budget numeric(12,2) not null check (total_budget > 0),
  cpm_rate numeric(10,2) not null check (cpm_rate > 0),
  per_clip_cap numeric(12,2) not null check (per_clip_cap > 0),
  review_sla_hours integer not null check (review_sla_hours > 0),
  allowed_platforms text[] not null,
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- 예산 에스크로
create type escrow_status as enum ('awaiting_manual_confirm', 'confirmed', 'pg_pending');

create table campaign_escrow (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  escrow_status escrow_status not null default 'awaiting_manual_confirm',
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz
);

-- 크리에이터 지원
create type application_status as enum ('applied', 'approved', 'rejected');

create table campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  status application_status not null default 'applied',
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

-- 클립 제출
create type clip_status as enum ('pending_review', 'approved', 'rejected');

create table clips (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  platform text not null,
  url text not null,
  status clip_status not null default 'pending_review',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  sla_deadline timestamptz not null
);

-- 조회수 스냅샷
create table view_snapshots (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  view_count bigint not null check (view_count >= 0),
  captured_at timestamptz not null default now()
);

-- 정산
create type settlement_status as enum ('pending', 'requested', 'paid');

create table settlements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  clip_id uuid not null references clips(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status settlement_status not null default 'pending',
  period text not null
);

-- 신규 가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'creator', coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
