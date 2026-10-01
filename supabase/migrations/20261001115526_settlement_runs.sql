-- One row per settled week. The weekly cron and the operator's button both claim a week here before settling it,
-- so a week is never settled twice, and the latest row tells the next run which weeks were missed.

create table public.settlement_runs (
  period text primary key check (period ~ '^\d{4}-\d{2}-\d{2}$'),
  source text not null check (source in ('cron', 'admin', 'backfill')),
  settlement_count integer check (settlement_count >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.settlement_runs enable row level security;

create policy settlement_runs_admin_all on public.settlement_runs
  for all to authenticated
  using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

grant select, insert, update, delete on public.settlement_runs to authenticated;

-- Weeks settled before this table existed.
insert into public.settlement_runs (period, source, settlement_count, finished_at)
select period, 'backfill', count(*), now()
from public.settlements
group by period;
