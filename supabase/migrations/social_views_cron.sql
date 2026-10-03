-- Collects TikTok and Reels views of connected accounts once a day through /api/cron/social-views (see the
-- social OAuth spec). Apply only once that route is deployed: before then each call answers 404 and the watchdog posts
-- it to Slack. Uses private.call_cron_endpoint and the Vault secrets from 20261002103028_cron_jobs.sql.

-- Times are UTC: 01:30 is 10:30 KST, after the YouTube collection at 10:00 and before Monday's settlement at 11:00.
select cron.schedule('clipers-social-views', '30 1 * * *', $$select private.call_cron_endpoint('/api/cron/social-views')$$);
