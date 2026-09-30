alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table campaign_escrow enable row level security;
alter table campaign_applications enable row level security;
alter table clips enable row level security;
alter table view_snapshots enable row level security;
alter table settlements enable row level security;

create or replace function current_role_is(target_role user_role)
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = target_role
  );
$$ language sql stable security definer;

-- profiles
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or current_role_is('admin'));
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- campaigns
create policy "campaigns_brand_crud" on campaigns
  for all using (brand_id = auth.uid() or current_role_is('admin'))
  with check (brand_id = auth.uid() or current_role_is('admin'));

create policy "campaigns_creator_select_self_serve" on campaigns
  for select using (track = 'self_serve' and status = 'live');

create policy "campaigns_creator_select_invited_managed" on campaigns
  for select using (
    track = 'managed' and exists (
      select 1 from campaign_applications ca
      where ca.campaign_id = campaigns.id and ca.creator_id = auth.uid()
    )
  );

-- campaign_escrow
create policy "escrow_brand_select" on campaign_escrow
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );
create policy "escrow_admin_insert" on campaign_escrow
  for insert with check (current_role_is('admin'));
create policy "escrow_admin_update" on campaign_escrow
  for update using (current_role_is('admin'));

-- campaign_applications
create policy "applications_creator_crud_own" on campaign_applications
  for all using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "applications_brand_select" on campaign_applications
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );

-- clips
create policy "clips_creator_crud_own" on clips
  for all using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "clips_brand_select" on clips
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );
create policy "clips_admin_update" on clips
  for update using (current_role_is('admin'));

-- view_snapshots
create policy "view_snapshots_select" on view_snapshots
  for select using (
    exists (
      select 1 from clips cl
      join campaigns c on c.id = cl.campaign_id
      where cl.id = clip_id and (cl.creator_id = auth.uid() or c.brand_id = auth.uid())
    )
    or current_role_is('admin')
  );
create policy "view_snapshots_admin_insert" on view_snapshots
  for insert with check (current_role_is('admin'));

-- settlements
create policy "settlements_creator_select" on settlements
  for select using (creator_id = auth.uid() or current_role_is('admin'));
create policy "settlements_admin_write" on settlements
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));
