-- Campaign pricing: brands buy verified views at brand_cpm per 1,000; creators are paid creator_cpm per 1,000.
-- Defaults and the minimum budget mirror packages/db/src/pricing.ts (enforced by pricing.test.ts).
-- Also adds the brief fields used by the new campaign form (description, multiple reference links).

alter table public.campaigns
  add column brand_cpm numeric(12, 2) not null default 3000,
  add column creator_cpm numeric(12, 2) not null default 800,
  add column description text,
  add column reference_links text[] not null default '{}',
  add constraint campaigns_pricing_valid check (creator_cpm > 0 and brand_cpm >= creator_cpm),
  add constraint campaigns_min_budget check (total_budget >= 1000000),
  add constraint campaigns_description_length check (char_length(description) <= 2000),
  add constraint campaigns_reference_links_max check (cardinality(reference_links) <= 10);

update public.campaigns set reference_links = array[reference_url] where reference_url is not null;
alter table public.campaigns drop column reference_url;

-- Brands always start at the default rates; only admins (or the service role) may change pricing afterwards.
create or replace function public.enforce_campaign_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.current_role_is('admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.brand_cpm := 3000;
    new.creator_cpm := 800;
  elsif new.brand_cpm is distinct from old.brand_cpm or new.creator_cpm is distinct from old.creator_cpm then
    raise exception 'Only an admin can change campaign pricing';
  end if;

  return new;
end;
$$;

create trigger enforce_campaign_pricing
  before insert or update of brand_cpm, creator_cpm on public.campaigns
  for each row execute function public.enforce_campaign_pricing();

-- campaign_platform_rates.cpm_rate (read by settlement and the marketplace) always equals the campaign's creator_cpm.
create or replace function public.sync_platform_rate_cpm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select creator_cpm into new.cpm_rate from public.campaigns where id = new.campaign_id;
  return new;
end;
$$;

create trigger sync_platform_rate_cpm
  before insert or update on public.campaign_platform_rates
  for each row execute function public.sync_platform_rate_cpm();

create or replace function public.propagate_creator_cpm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaign_platform_rates set cpm_rate = new.creator_cpm where campaign_id = new.id;
  return new;
end;
$$;

create trigger propagate_creator_cpm
  after update of creator_cpm on public.campaigns
  for each row when (old.creator_cpm is distinct from new.creator_cpm)
  execute function public.propagate_creator_cpm();

-- Brands edit their own drafts, which replaces the per-platform rate rows.
create policy campaign_platform_rates_brand_update_own_draft on public.campaign_platform_rates
  for update
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid() and c.status = 'draft'))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid() and c.status = 'draft'));

create policy campaign_platform_rates_brand_delete_own_draft on public.campaign_platform_rates
  for delete
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid() and c.status = 'draft'));

revoke execute on function public.enforce_campaign_pricing() from public, anon;
revoke execute on function public.sync_platform_rate_cpm() from public, anon;
revoke execute on function public.propagate_creator_cpm() from public, anon;
