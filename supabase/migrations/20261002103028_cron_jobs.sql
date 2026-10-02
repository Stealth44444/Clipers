-- Scheduled jobs run from the database (pg_cron + pg_net) instead of GitHub Actions, whose schedules ran hours late
-- and reported success when nothing was called.
--
-- Setup, once, in the SQL editor (values never go in a migration):
--   select vault.create_secret('https://<app host>', 'clipers_app_url');
--   select vault.create_secret('<CRON_SECRET of the app>', 'clipers_cron_secret');
--   select vault.create_secret('<Slack webhook URL>', 'clipers_slack_webhook');  -- failure alerts; optional
-- To change one later: select vault.update_secret(id, '<new value>') with the id from vault.secrets.
-- Check runs: select * from cron.job_run_details order by start_time desc limit 20;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Not exposed through the API: only cron jobs (running as postgres) use what's in here.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.cron_requests (
  request_id bigint primary key,
  path text not null,
  requested_at timestamptz not null default now(),
  checked_at timestamptz
);
-- No policies: only the owner (postgres, which the functions below run as) reads or writes it.
alter table private.cron_requests enable row level security;

/** Calls one of the app's /api/cron routes with the shared secret. pg_net is asynchronous: the answer is checked later. */
create or replace function private.call_cron_endpoint(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into app_url from vault.decrypted_secrets where name = 'clipers_app_url';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'clipers_cron_secret';
  if app_url is null or cron_secret is null then
    raise exception 'Vault secrets clipers_app_url and clipers_cron_secret are required';
  end if;

  request_id := net.http_get(
    url := rtrim(app_url, '/') || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 300000
  );
  insert into private.cron_requests (request_id, path) values (request_id, p_path);
  return request_id;
end;
$$;

/**
 * Posts to Slack when a call got a non-2xx answer or none at all (checked 10 minutes on, after the 5-minute timeout),
 * or when a job itself failed (missing secrets, for example). Without the Slack secret it only raises a warning.
 */
create or replace function private.report_cron_failures()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  failures text[];
  job_failures text[];
  webhook text;
begin
  with checked as (
    update private.cron_requests r
    set checked_at = now()
    from (
      select pending.request_id, response.status_code, response.error_msg
      from private.cron_requests pending
      left join net._http_response response on response.id = pending.request_id
      where pending.checked_at is null and pending.requested_at < now() - interval '10 minutes'
    ) answer
    where r.request_id = answer.request_id
    returning r.path, answer.status_code, answer.error_msg
  )
  select coalesce(
    array_agg(format('%s: %s', path, coalesce('HTTP ' || status_code, error_msg, '응답 없음')))
      filter (where status_code is null or status_code not between 200 and 299),
    '{}'
  )
  into failures
  from checked;

  select coalesce(array_agg(format('%s: %s', job.jobname, left(run.return_message, 200))), '{}')
  into job_failures
  from cron.job_run_details run
  join cron.job job on job.jobid = run.jobid
  where job.jobname like 'clipers-%' and run.status = 'failed' and run.end_time > now() - interval '15 minutes';

  failures := failures || job_failures;
  delete from private.cron_requests where requested_at < now() - interval '30 days';
  if cardinality(failures) = 0 then
    return;
  end if;

  select decrypted_secret into webhook from vault.decrypted_secrets where name = 'clipers_slack_webhook';
  if webhook is null then
    raise warning 'Scheduled jobs failed: %', array_to_string(failures, '; ');
    return;
  end if;

  perform net.http_post(
    url := webhook,
    body := jsonb_build_object('text', '정기 작업이 실패했어요.' || chr(10) || array_to_string(failures, chr(10)))
  );
end;
$$;

revoke all on function private.call_cron_endpoint(text) from public;
revoke all on function private.report_cron_failures() from public;

-- Times are UTC. A named schedule replaces the job of the same name, so re-running this file is safe.
select cron.schedule('clipers-youtube-views', '0 1 * * *', $$select private.call_cron_endpoint('/api/cron/youtube-views')$$); -- 10:00 KST
select cron.schedule('clipers-sla-escalations', '5 * * * *', $$select private.call_cron_endpoint('/api/cron/sla-escalations')$$);
select cron.schedule('clipers-weekly-settlements', '0 2 * * 1', $$select private.call_cron_endpoint('/api/cron/weekly-settlements')$$); -- Monday 11:00 KST, after the view sync
select cron.schedule('clipers-cron-watchdog', '*/15 * * * *', $$select private.report_cron_failures()$$);
