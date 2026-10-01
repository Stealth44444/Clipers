-- Creator payouts: payout details (bank account, legal name, encrypted resident number), one payouts row per payout
-- request with its business-income withholding, and a log of every time a resident number is read in the clear.
-- Design: docs/superpowers/specs/2026-10-01-creator-payouts-design.md. payout_tax() mirrors payoutTax() in
-- packages/db/src/payouts.ts (enforced by payouts.test.ts).

do $$
begin
  if exists (select 1 from public.settlements where status = 'requested') then
    raise exception 'Requested settlements exist without a payout; settle them before applying this migration';
  end if;
end;
$$;

-- Payout details, one row per creator. The resident number is encrypted by the app server (AES-256-GCM, key only
-- in the server's environment); the API can never read the ciphertext column. Only the app server writes here.
create table public.payout_accounts (
  creator_id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 1 and 40),
  bank_code text not null check (bank_code ~ '^\d{3}$'),
  account_number text not null check (account_number ~ '^\d{6,20}$'),
  birth_date date not null,
  rrn_ciphertext text not null,
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

create policy payout_accounts_select_own_or_admin on public.payout_accounts
  for select to authenticated
  using (creator_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.payout_accounts from anon, authenticated;
grant select (creator_id, legal_name, bank_code, account_number, birth_date, updated_at) on public.payout_accounts to authenticated;

-- One row per payout request. Amounts are whole won; the bank details are copied at request time so a later change
-- of account can't redirect a payout already asked for. Tax records are kept, so a creator with payouts can't be
-- deleted out from under them.
create type public.payout_status as enum ('requested', 'paid');

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  gross_amount integer not null check (gross_amount >= 0),
  income_tax integer not null check (income_tax >= 0),
  local_tax integer not null check (local_tax >= 0),
  net_amount integer not null,
  legal_name text not null,
  bank_code text not null,
  account_number text not null,
  status public.payout_status not null default 'requested',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  constraint payouts_net_amount check (net_amount = gross_amount - income_tax - local_tax),
  constraint payouts_paid_at check ((status = 'paid') = (paid_at is not null))
);

create index payouts_creator_idx on public.payouts (creator_id, requested_at desc);
create index payouts_status_idx on public.payouts (status, paid_at);

alter table public.payouts enable row level security;

create policy payouts_select_own_or_admin on public.payouts
  for select to authenticated
  using (creator_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.payouts from anon, authenticated;
grant select on public.payouts to authenticated;

alter table public.settlements add column payout_id uuid references public.payouts(id);
create index settlements_payout_idx on public.settlements (payout_id);

-- Every read of resident numbers in the clear (the monthly tax report). Written by the app server only.
create table public.pii_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null check (char_length(action) between 1 and 100),
  subject_count integer not null check (subject_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.pii_access_logs enable row level security;

create policy pii_access_logs_admin_select on public.pii_access_logs
  for select to authenticated
  using (public.current_role_is('admin'));

revoke all on public.pii_access_logs from anon, authenticated;
grant select on public.pii_access_logs to authenticated;

-- Business-income withholding on one payout: 3% income tax and 10% of it as local income tax, each cut to 10 won;
-- none at all when the income tax would be under 1,000 won (소액부징수).
create or replace function public.payout_tax(p_settled numeric, out gross integer, out income_tax integer, out local_tax integer, out net integer)
language plpgsql
immutable
set search_path = public
as $$
begin
  gross := greatest(0, floor(p_settled))::integer;
  income_tax := (floor(gross * 3 / 1000.0) * 10)::integer;
  if income_tax < 1000 then
    income_tax := 0;
    local_tax := 0;
  else
    local_tax := (floor(income_tax / 100.0) * 10)::integer;
  end if;
  net := gross - income_tax - local_tax;
end;
$$;

revoke execute on function public.payout_tax(numeric) from public, anon;
grant execute on function public.payout_tax(numeric) to authenticated;

-- A creator asks for their whole pending balance (from 3,000 won) as one payout, to the account on file.
drop function if exists public.request_payout();

create function public.request_payout()
returns table (payout_id uuid, gross_amount integer, net_amount integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  account public.payout_accounts;
  settled numeric;
  tax record;
  new_payout_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into account from public.payout_accounts where creator_id = auth.uid();
  if account.creator_id is null then
    raise exception 'Register payout details before requesting a payout' using hint = 'payout_account_missing';
  end if;

  -- Lock the pending rows so two requests can't both take them.
  perform 1 from public.settlements where creator_id = auth.uid() and status = 'pending' for update;
  select coalesce(sum(amount), 0) into settled
  from public.settlements
  where creator_id = auth.uid() and status = 'pending';

  if settled < 3000 then
    raise exception 'Payout requests start at 3,000 won (pending balance %)', settled using hint = 'below_minimum';
  end if;

  select * into tax from public.payout_tax(settled);

  insert into public.payouts (creator_id, gross_amount, income_tax, local_tax, net_amount, legal_name, bank_code, account_number)
  values (auth.uid(), tax.gross, tax.income_tax, tax.local_tax, tax.net, account.legal_name, account.bank_code, account.account_number)
  returning id into new_payout_id;

  update public.settlements
  set status = 'requested', payout_id = new_payout_id
  where creator_id = auth.uid() and status = 'pending';

  return query select new_payout_id, tax.gross, tax.net;
end;
$$;

revoke execute on function public.request_payout() from public, anon;
grant execute on function public.request_payout() to authenticated;

-- The operator marks a payout paid once the bank transfer is done; its settlements follow.
create or replace function public.mark_payout_paid(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_role_is('admin') then
    raise exception 'Only an admin can mark payouts paid';
  end if;

  update public.payouts
  set status = 'paid', paid_at = now(), paid_by = auth.uid()
  where id = p_payout_id and status = 'requested';
  if not found then
    raise exception 'Payout is not waiting for payment';
  end if;

  update public.settlements set status = 'paid' where payout_id = p_payout_id and status = 'requested';
end;
$$;

revoke execute on function public.mark_payout_paid(uuid) from public, anon;
grant execute on function public.mark_payout_paid(uuid) to authenticated;
