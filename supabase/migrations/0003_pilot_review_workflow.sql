alter table campaign_applications
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references profiles(id);

alter table clips
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references profiles(id);

alter table clips
  add constraint clips_rejection_reason_required
  check (
    (status = 'rejected' and nullif(trim(rejection_reason), '') is not null)
    or (status <> 'rejected' and rejection_reason is null)
  ) not valid;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not public.current_role_is('admin') then
    raise exception 'Only an admin can change profile roles';
  end if;

  return new;
end;
$$;

create trigger prevent_profile_role_escalation
  before update of role on profiles
  for each row execute function public.prevent_profile_role_escalation();

drop policy applications_creator_crud_own on campaign_applications;

create policy applications_creator_select_own on campaign_applications
  for select using (creator_id = auth.uid());

create policy applications_creator_insert_own on campaign_applications
  for insert with check (
    creator_id = auth.uid()
    and status = 'applied'
    and reviewed_at is null
    and reviewed_by is null
    and current_role_is('creator')
    and exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.track = 'self_serve'
        and c.status = 'live'
    )
  );

create policy applications_admin_update on campaign_applications
  for update using (current_role_is('admin'))
  with check (current_role_is('admin'));

drop policy clips_creator_crud_own on clips;

drop policy clips_admin_update on clips;

create policy clips_creator_select_own on clips
  for select using (creator_id = auth.uid());

create policy clips_creator_insert_own on clips
  for insert with check (
    creator_id = auth.uid()
    and status = 'pending_review'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
    and current_role_is('creator')
    and exists (
      select 1
      from campaigns c
      join campaign_applications ca on ca.campaign_id = c.id
      where c.id = campaign_id
        and c.status = 'live'
        and platform = any(c.allowed_platforms)
        and ca.creator_id = auth.uid()
        and ca.status = 'approved'
    )
  );

create policy clips_admin_update on clips
  for update using (current_role_is('admin'))
  with check (current_role_is('admin'));

create or replace function public.prepare_clip_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_sla_hours integer;
begin
  if new.creator_id is distinct from auth.uid() then
    raise exception 'A clip can only be submitted for the current user';
  end if;

  select c.review_sla_hours into campaign_sla_hours
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

  new.status := 'pending_review';
  new.rejection_reason := null;
  new.submitted_at := now();
  new.sla_deadline := new.submitted_at + make_interval(hours => campaign_sla_hours);
  new.reviewed_at := null;
  new.reviewed_by := null;

  return new;
end;
$$;

create trigger prepare_clip_submission
  before insert on clips
  for each row execute function public.prepare_clip_submission();
