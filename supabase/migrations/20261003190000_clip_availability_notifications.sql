-- Tell the creator when a clip's settlement stops (its video was found deleted, private or unlisted, by the daily
-- view collection or an operator) and when an operator resumes it (docs/superpowers/specs/2026-10-03-clip-fraud-guards-design.md).
-- Wording lives in packages/db/src/notifications.ts (clip_unavailable, clip_available_again).

create or replace function public.notify_clip_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notify(
    new.creator_id,
    case when new.unavailable_at is not null then 'clip_unavailable' else 'clip_available_again' end,
    jsonb_build_object(
      'clip_id', new.id,
      'campaign_title', (select title from campaigns where id = new.campaign_id),
      'reason', new.unavailable_reason
    ),
    '/creator/submissions'
  );
  return new;
exception when others then
  raise warning 'clip availability notification failed: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_clip_availability
  after update of unavailable_at on public.clips
  for each row when ((old.unavailable_at is null) <> (new.unavailable_at is null) and new.status = 'approved')
  execute function public.notify_clip_availability();

-- The trigger function is not an API: only the trigger calls it (same as the other notify_* functions).
revoke execute on function public.notify_clip_availability() from public, anon, authenticated;
