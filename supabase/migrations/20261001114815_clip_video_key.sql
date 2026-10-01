-- One video, one active submission: the same video can't be paid twice by submitting it again (in the same or
-- another campaign) under a different-looking link. clip_video_key() reduces a link to the video it points at;
-- clips.video_key stores it, and a unique index covers every clip that isn't rejected (a rejected clip's link
-- may be submitted again after the fix).

create or replace function public.clip_video_key(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  -- Scheme and fragment off; ids are case-sensitive, so only the host is lowercased.
  rest text := split_part(regexp_replace(btrim(p_url), '^[A-Za-z][A-Za-z0-9+.-]*://', ''), '#', 1);
  authority text := split_part(split_part(rest, '/', 1), '?', 1);
  host text := regexp_replace(lower(authority), '^(www\.|m\.|mobile\.|web\.)', '');
  tail text := substr(rest, length(authority) + 1);
  path text := split_part(tail, '?', 1);
  query text := case when position('?' in tail) > 0 then substr(tail, position('?' in tail) + 1) else '' end;
  m text[];
begin
  if host in ('youtube.com', 'youtu.be', 'youtube-nocookie.com') then
    if host = 'youtu.be' then
      m := regexp_match(path, '^/([A-Za-z0-9_-]{11})');
    elsif path ~ '^/watch/?$' then
      m := regexp_match(query, '(?:^|&)v=([A-Za-z0-9_-]{11})');
    else
      m := regexp_match(path, '^/(?:shorts|embed|live|v)/([A-Za-z0-9_-]{11})');
    end if;
    if m is not null then return 'youtube:' || m[1]; end if;
  elsif host = 'tiktok.com' then
    m := regexp_match(path, '/(?:video|photo)/([0-9]+)');
    if m is not null then return 'tiktok:' || m[1]; end if;
  elsif host = 'instagram.com' then
    m := regexp_match(path, '^/(?:[^/]+/)?(?:reels?|p|tv)/([A-Za-z0-9_-]+)');
    if m is not null then return 'instagram:' || m[1]; end if;
  elsif host in ('facebook.com', 'fb.com') then
    m := regexp_match(path, '/(?:reel|videos)/([0-9]+)');
    if m is null and path ~ '^/watch/?$' then
      m := regexp_match(query, '(?:^|&)v=([0-9]+)');
    end if;
    if m is not null then return 'facebook:' || m[1]; end if;
  elsif host in ('x.com', 'twitter.com') then
    m := regexp_match(path, '/status(?:es)?/([0-9]+)');
    if m is not null then return 'x:' || m[1]; end if;
  end if;

  -- Anything else (short links, Naver, Kakao): the link itself, minus scheme, www and a trailing slash. The query
  -- stays, since on some sites it is what names the video; a missed duplicate beats blocking a different video.
  return 'url:' || host || regexp_replace(path, '/+$', '') || case when query <> '' then '?' || query else '' end;
end;
$$;

alter table public.clips
  add column video_key text generated always as (public.clip_video_key(url)) stored;

create unique index clips_video_key_active_unique
  on public.clips (video_key)
  where status <> 'rejected';
