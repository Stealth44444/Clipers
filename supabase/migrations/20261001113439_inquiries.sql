-- Contact-form inquiries from the public site. Anyone may add one (the site uses the anon key); nobody can read,
-- change or delete them through the API: the ops team reads them in the dashboard and gets a Slack alert.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 1 and 100),
  contact_name text not null check (char_length(contact_name) between 1 and 50),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (phone is null or char_length(phone) <= 30),
  industry text not null check (char_length(industry) between 1 and 40),
  message text not null check (char_length(message) between 10 and 2000),
  source_path text check (source_path is null or char_length(source_path) <= 200),
  consented_at timestamptz not null
);

alter table public.inquiries enable row level security;

create policy inquiries_insert_public on public.inquiries
  for insert to anon, authenticated
  with check (true);

grant insert on public.inquiries to anon, authenticated;
