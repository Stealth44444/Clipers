create type dispute_status as enum ('open', 'resolved');

create table clip_disputes (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  status dispute_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create index idx_clip_disputes_open on clip_disputes (status, created_at);

alter table clip_disputes enable row level security;

create policy clip_disputes_select on clip_disputes
  for select using (creator_id = auth.uid() or current_role_is('admin'));

create policy clip_disputes_creator_insert_own on clip_disputes
  for insert with check (
    creator_id = auth.uid()
    and status = 'open'
    and resolution_note is null
    and resolved_at is null
    and resolved_by is null
    and current_role_is('creator')
    and exists (
      select 1 from clips cl where cl.id = clip_id and cl.creator_id = auth.uid()
    )
  );

create policy clip_disputes_admin_update on clip_disputes
  for update using (current_role_is('admin'))
  with check (current_role_is('admin'));

create or replace function public.stamp_dispute_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolved' and old.status = 'open' then
    new.resolved_by := auth.uid();
    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger stamp_dispute_resolution
  before update on clip_disputes
  for each row execute function public.stamp_dispute_resolution();
