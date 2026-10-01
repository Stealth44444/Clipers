-- Tax invoice details for brands. Clipers sells brands a marketing service and issues a tax invoice for each deposit
-- (service amount plus VAT), so a brand gives its business number, company name, representative and invoice email
-- before telling us it has transferred. Validation mirrors validateBillingProfile in packages/db/src/billing.ts.

create table public.brand_billing_profiles (
  brand_id uuid primary key references public.profiles(id) on delete cascade,
  business_number text not null check (business_number ~ '^\d{10}$'),
  company_name text not null check (char_length(company_name) between 1 and 100),
  representative text not null check (char_length(representative) between 1 and 40),
  invoice_email text not null check (char_length(invoice_email) between 3 and 200 and invoice_email like '%@%.%'),
  updated_at timestamptz not null default now()
);

alter table public.brand_billing_profiles enable row level security;

create policy brand_billing_profiles_select on public.brand_billing_profiles
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

create policy brand_billing_profiles_insert_own on public.brand_billing_profiles
  for insert to authenticated
  with check (brand_id = auth.uid() and public.current_role_is('brand'));

create policy brand_billing_profiles_update_own on public.brand_billing_profiles
  for update to authenticated
  using (brand_id = auth.uid() and public.current_role_is('brand'))
  with check (brand_id = auth.uid() and public.current_role_is('brand'));

revoke all on public.brand_billing_profiles from anon, authenticated;
grant select, insert, update on public.brand_billing_profiles to authenticated;

-- A campaign can't move from draft to waiting-for-deposit until its brand has invoice details.
create or replace function public.require_billing_before_deposit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status = 'pending_escrow'
    and not exists (select 1 from public.brand_billing_profiles where brand_id = new.brand_id) then
    raise exception 'Add tax invoice details before reporting a deposit' using hint = 'billing_profile_missing';
  end if;
  return new;
end;
$$;

revoke execute on function public.require_billing_before_deposit() from public;

create trigger require_billing_before_deposit
  before update of status on public.campaigns
  for each row execute function public.require_billing_before_deposit();
