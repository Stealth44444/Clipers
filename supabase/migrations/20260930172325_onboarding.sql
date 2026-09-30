-- Onboarding: role choice (creator/brand), creator profile answers, terms consent.
-- Completion happens only through complete_onboarding(), which is the single place a
-- user may change their own role (creator <-> brand, before onboarding is finished).

alter table public.profiles
  add column onboarding_completed_at timestamptz,
  add column terms_agreed_at timestamptz,
  add column interests text[] not null default '{}',
  add column on_camera text,
  add column experience_level text,
  add constraint profiles_interests_valid check (
    cardinality(interests) <= 3
    and interests <@ array[
      'music', 'entertainment', 'gaming', 'beauty_fashion', 'food',
      'tech', 'sports', 'lifestyle', 'education', 'comedy'
    ]::text[]
  ),
  add constraint profiles_on_camera_valid check (on_camera in ('always', 'sometimes', 'never', 'undecided')),
  add constraint profiles_experience_level_valid check (experience_level in ('new', 'beginner', 'intermediate', 'pro'));

-- Accounts created before onboarding existed are treated as onboarded (terms stay null: they never agreed).
update public.profiles set onboarding_completed_at = created_at;

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
    or new.terms_agreed_at is distinct from old.terms_agreed_at then
    raise exception 'Onboarding is completed through complete_onboarding()';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before update of role, onboarding_completed_at, terms_agreed_at on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

create or replace function public.complete_onboarding(
  p_role public.user_role,
  p_interests text[] default '{}',
  p_on_camera text default null,
  p_experience_level text default null
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
end;
$$;

revoke execute on function public.complete_onboarding(public.user_role, text[], text, text) from public, anon;
grant execute on function public.complete_onboarding(public.user_role, text[], text, text) to authenticated;
