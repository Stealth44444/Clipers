-- Sends queued notification emails every 5 minutes through /api/cron/notification-emails (see the notifications spec).
-- Apply only once that route is deployed: before then each call answers 404 and the watchdog posts it to Slack.
-- Uses private.call_cron_endpoint and the Vault secrets from 20261002103028_cron_jobs.sql.

-- Times are UTC. A named schedule replaces the job of the same name, so re-running this file is safe.
select cron.schedule('clipers-notification-emails', '*/5 * * * *', $$select private.call_cron_endpoint('/api/cron/notification-emails')$$);
