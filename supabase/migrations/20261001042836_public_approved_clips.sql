-- The marketplace (anonymous) shows top clips and view charts for live campaigns, which needs the approved
-- clips themselves (their view_snapshots were already public). Only approved clips of live self-serve campaigns.
create policy clips_public_select_approved_live on public.clips
  for select
  using (status = 'approved' and public.is_live_self_serve_campaign(campaign_id));
