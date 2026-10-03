-- Clip fraud guards (docs/superpowers/specs/2026-10-03-clip-fraud-guards-design.md): when a campaign went live,
-- accounts creators proved they own, what the server confirmed about a YouTube video, when a video stopped being
-- public, and the adult confirmation at onboarding.

-- 1) When a campaign first went live. Videos posted before it don't count.
alter table public.campaigns add column live_at timestamptz;
-- Campaigns that were live before this column existed: their creation time (existing clips are grandfathered).
update public.campaigns set live_at = created_at where status in ('live', 'paused', 'closed') and live_at is null;
-- campaigns uses per-column read grants (brand_cpm and total_budget are hidden); signed-in users may read live_at.
grant select (live_at) on public.campaigns to authenticated;

create or replace function public.stamp_campaign_live_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'live' and new.live_at is null then
    new.live_at := now();
  end if;
  return new;
end;
$$;

create trigger stamp_campaign_live_at
  before insert or update of status on public.campaigns
  for each row execute function public.stamp_campaign_live_at();

-- 2) Accounts a creator proved they own. The app server (service key) adds and auto-verifies; admins verify the rest.
create table public.creator_channels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube_shorts', 'tiktok', 'instagram_reels', 'facebook', 'x', 'naver_clip', 'kakao_shorts')),
  url text not null check (char_length(url) <= 500),
  external_id text,
  verification_code text not null check (verification_code ~ '^CLIPERS-[A-Z2-9]{5}$'),
  verified_at timestamptz,
  verified_by text check (verified_by in ('auto', 'admin')),
  created_at timestamptz not null default now(),
  unique (creator_id, platform, url),
  check ((verified_at is null) = (verified_by is null))
);

-- One account can be verified by one person only (YouTube by channel id, others by normalized url).
create unique index creator_channels_verified_account_unique
  on public.creator_channels (platform, coalesce(external_id, url))
  where verified_at is not null;
create index creator_channels_creator_idx on public.creator_channels (creator_id);

alter table public.creator_channels enable row level security;
revoke all on public.creator_channels from anon;

create policy creator_channels_select_own_or_admin on public.creator_channels
  for select to authenticated
  using (creator_id = (select auth.uid()) or public.current_role_is('admin'));
create policy creator_channels_admin_update on public.creator_channels
  for update to authenticated
  using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));
create policy creator_channels_admin_delete on public.creator_channels
  for delete to authenticated
  using (public.current_role_is('admin'));

-- 3) Clip facts. video_* are what the server read from YouTube at submission; unavailable_* mark a video that was
-- deleted or made private ('missing': an API key can't tell the two apart), unlisted, or marked by an operator.
alter table public.clips
  add column video_published_at timestamptz,
  add column video_channel_id text,
  add column unavailable_at timestamptz,
  add column unavailable_reason text check (unavailable_reason in ('missing', 'unlisted', 'manual')),
  add constraint clips_unavailable_pair check ((unavailable_at is null) = (unavailable_reason is null));

-- YouTube clips go through the app server, which checks the video first. Creators insert other platforms directly.
drop policy clips_creator_insert_own on public.clips;
create policy clips_creator_insert_own on public.clips
  for insert with check (
    creator_id = auth.uid()
    and platform <> 'youtube_shorts'
    and status = 'pending_review'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
    and public.current_role_is('creator')
    and exists (
      select 1
      from public.campaigns c
      join public.campaign_applications ca on ca.campaign_id = c.id
      where c.id = clips.campaign_id
        and c.status = 'live'
        and clips.platform = any (c.allowed_platforms)
        and ca.creator_id = auth.uid()
        and ca.status = 'approved'
    )
  );

create or replace function public.prepare_clip_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_sla_hours integer;
  campaign_daily_limit integer;
  submitted_today integer;
  -- The app server inserts YouTube clips with the service key after checking the signed-in user itself.
  from_server boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
begin
  if not from_server and new.creator_id is distinct from auth.uid() then
    raise exception 'A clip can only be submitted for the current user';
  end if;

  if not from_server then
    new.video_published_at := null;
    new.video_channel_id := null;
  end if;
  new.unavailable_at := null;
  new.unavailable_reason := null;

  select c.review_sla_hours, c.daily_clip_limit into campaign_sla_hours, campaign_daily_limit
  from campaigns c
  join campaign_applications ca on ca.campaign_id = c.id
  where c.id = new.campaign_id
    and c.status = 'live'
    and new.platform = any(c.allowed_platforms)
    and ca.creator_id = new.creator_id
    and ca.status = 'approved';

  if campaign_sla_hours is null then
    raise exception 'An approved application to a live campaign is required';
  end if;

  -- Every platform needs a verified account before its clips are accepted (pending verification is not enough).
  if not exists (
    select 1 from creator_channels ch
    where ch.creator_id = new.creator_id and ch.platform = new.platform and ch.verified_at is not null
  ) then
    raise exception 'account_not_verified';
  end if;

  if campaign_daily_limit is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.campaign_id::text, 0));
    select count(*) into submitted_today
    from clips
    where campaign_id = new.campaign_id
      and creator_id = new.creator_id
      and status in ('pending_review', 'approved')
      and submitted_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
    if submitted_today >= campaign_daily_limit then
      raise exception 'daily_clip_limit_reached' using detail = campaign_daily_limit::text;
    end if;
  end if;

  new.status := 'pending_review';
  new.rejection_reason := null;
  new.submitted_at := now();
  new.sla_deadline := new.submitted_at + make_interval(hours => campaign_sla_hours);
  new.reviewed_at := null;
  new.reviewed_by := null;

  return new;
end;
$$;

-- 4) Adult confirmation, recorded once at onboarding.
alter table public.profiles add column adult_confirmed_at timestamptz;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or public.current_role_is('admin')
    or current_setting('clipers.profile_guard_bypass', true) = 'on' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only an admin can change profile roles';
  end if;

  if new.onboarding_completed_at is distinct from old.onboarding_completed_at
    or new.terms_agreed_at is distinct from old.terms_agreed_at
    or new.adult_confirmed_at is distinct from old.adult_confirmed_at then
    raise exception 'Onboarding is completed through complete_onboarding()';
  end if;

  return new;
end;
$$;

drop trigger prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before update of role, onboarding_completed_at, terms_agreed_at, adult_confirmed_at on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- New signature (one more argument): drop the old one so PostgREST never has two to choose from.
drop function public.complete_onboarding(public.user_role, text[], text, text, text);

create function public.complete_onboarding(
  p_role public.user_role,
  p_interests text[] default '{}',
  p_on_camera text default null,
  p_experience_level text default null,
  p_heard_from text default null,
  p_adult_confirmed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
begin
  select * into current_profile from public.profiles where id = auth.uid() for update;

  if current_profile.id is null then
    raise exception 'Not signed in';
  end if;
  if current_profile.onboarding_completed_at is not null then
    raise exception 'Onboarding is already completed';
  end if;
  if current_profile.role = 'admin' or p_role not in ('creator', 'brand') then
    raise exception 'Onboarding can only choose the creator or brand role';
  end if;
  if p_adult_confirmed is not true then
    raise exception 'Only adults (19 or older) can use Clipers';
  end if;
  if p_role = 'creator'
    and (coalesce(cardinality(p_interests), 0) < 1 or p_on_camera is null or p_experience_level is null) then
    raise exception 'Creators must answer every onboarding question';
  end if;
  if p_heard_from is not null
    and p_heard_from not in ('search', 'youtube_shortform', 'instagram_tiktok', 'friend_creator', 'community_blog', 'press', 'other') then
    raise exception 'Unknown heard_from answer';
  end if;

  perform set_config('clipers.profile_guard_bypass', 'on', true);

  update public.profiles
  set role = p_role,
      interests = case when p_role = 'creator' then coalesce(p_interests, '{}') else '{}' end,
      on_camera = case when p_role = 'creator' then p_on_camera end,
      experience_level = case when p_role = 'creator' then p_experience_level end,
      terms_agreed_at = now(),
      adult_confirmed_at = now(),
      onboarding_completed_at = now()
  where id = current_profile.id;

  perform set_config('clipers.profile_guard_bypass', 'off', true);

  -- Accounts from before this table exists have no row yet.
  insert into public.signup_attributions (user_id, heard_from, heard_from_at)
  values (current_profile.id, p_heard_from, case when p_heard_from is not null then now() end)
  on conflict (user_id) do update
    set heard_from = excluded.heard_from,
        heard_from_at = excluded.heard_from_at;
end;
$$;

revoke execute on function public.complete_onboarding(public.user_role, text[], text, text, text, boolean) from public, anon;
grant execute on function public.complete_onboarding(public.user_role, text[], text, text, text, boolean) to authenticated;
