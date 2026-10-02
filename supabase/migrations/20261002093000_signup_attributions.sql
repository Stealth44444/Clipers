-- Where each sign-up came from. The public site captures its first-visit attribution (utm, ref, referrer host,
-- landing page), carries it through the sign-up link into the user's sign-up metadata, and handle_new_user() stores
-- it here as the account is created (before the e-mail is verified). complete_onboarding() adds the optional
-- "how did you hear of Clipers" answer. Design: docs/superpowers/specs/2026-10-02-signup-attribution-design.md.
-- Nothing writes through the API; only admins read.

create table public.signup_attributions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  requested_role text check (requested_role is null or requested_role in ('brand', 'creator')),
  landing_path text check (landing_path is null or char_length(landing_path) <= 200),
  landed_at timestamptz,
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 200),
  utm_source text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),
  ref text check (ref is null or char_length(ref) <= 200),
  heard_from text,
  heard_from_at timestamptz,
  -- Keep in sync with HEARD_FROM_OPTIONS in packages/db/src/onboarding.ts (enforced by onboarding.test.ts).
  constraint signup_attributions_heard_from_valid check (
    heard_from is null or heard_from in ('search', 'youtube_shortform', 'instagram_tiktok', 'friend_creator', 'community_blog', 'press', 'other')
  )
);

create index signup_attributions_created_at_idx on public.signup_attributions (created_at desc);

alter table public.signup_attributions enable row level security;

create policy signup_attributions_admin_read on public.signup_attributions
  for select using (public.current_role_is('admin'));

grant select on public.signup_attributions to authenticated;
revoke all on public.signup_attributions from anon;

-- A client-supplied timestamp must never break account creation.
create or replace function public.safe_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

revoke execute on function public.safe_timestamptz(text) from public, anon, authenticated;

-- Profile creation now also records the sign-up's attribution (all values cut to the column limit).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'requested_role';
  resolved_role public.user_role := 'creator';
  attribution jsonb := new.raw_user_meta_data->'attribution';
begin
  if requested_role = 'brand' then
    resolved_role := 'brand';
  end if;

  insert into public.profiles (id, role, display_name)
  values (new.id, resolved_role, coalesce(new.raw_user_meta_data->>'name', new.email));

  begin
    insert into public.signup_attributions (
      user_id, requested_role, landing_path, landed_at, referrer_host,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref
    )
    values (
      new.id,
      case when requested_role in ('brand', 'creator') then requested_role end,
      left(attribution->>'landing_path', 200),
      public.safe_timestamptz(attribution->>'landed_at'),
      left(attribution->>'referrer_host', 200),
      left(attribution->>'utm_source', 200),
      left(attribution->>'utm_medium', 200),
      left(attribution->>'utm_campaign', 200),
      left(attribution->>'utm_content', 200),
      left(attribution->>'utm_term', 200),
      left(attribution->>'ref', 200)
    );
  exception when others then
    -- Attribution is a nice-to-have; the account always gets created.
    raise warning 'signup attribution not stored for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- complete_onboarding() takes the optional "heard from" answer. The 4-argument version goes, so PostgREST
-- never sees two overloads.
drop function public.complete_onboarding(public.user_role, text[], text, text);

create or replace function public.complete_onboarding(
  p_role public.user_role,
  p_interests text[] default '{}',
  p_on_camera text default null,
  p_experience_level text default null,
  p_heard_from text default null
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

revoke execute on function public.complete_onboarding(public.user_role, text[], text, text, text) from public, anon;
grant execute on function public.complete_onboarding(public.user_role, text[], text, text, text) to authenticated;
