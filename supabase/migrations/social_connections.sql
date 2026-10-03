-- TikTok and Instagram accounts connected through their official login (OAuth): the account counts as verified, its
-- tokens are kept for the daily view collection, and clips the server matched to the account carry the platform's
-- video id. Design: docs/superpowers/specs/2026-10-03-social-oauth-views-design.md.

-- 1. A third way to verify an account
alter table public.creator_channels drop constraint creator_channels_verified_by_check;
alter table public.creator_channels
  add constraint creator_channels_verified_by_check check (verified_by in ('auto', 'admin', 'oauth'));

-- 2. Tokens, encrypted by the app server (AES-256-GCM). Service role only: RLS on and no policy, no grants.
create table public.channel_connections (
  channel_id uuid primary key references public.creator_channels(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram_reels')),
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  last_error text,
  reconnect_notified_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channel_connections enable row level security;
revoke all on public.channel_connections from anon, authenticated;

-- 3. The platform's id for a clip the server matched to a connected account (TikTok video id, Instagram media id)
alter table public.clips add column external_video_id text check (char_length(external_video_id) <= 64);
create index clips_external_video_idx on public.clips (platform, external_video_id) where external_video_id is not null;

-- Only the app server may set it: a creator inserting directly could otherwise point a clip at another of their videos.
create or replace function public.guard_clip_external_video_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    new.external_video_id := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_clip_external_video_id() from public, anon, authenticated;

create trigger guard_clip_external_video_id
  before insert or update of external_video_id on public.clips
  for each row execute function public.guard_clip_external_video_id();
