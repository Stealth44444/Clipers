-- Pre-launch cleanup from the Supabase advisors (2026-10-02).

-- 1. Trigger functions were callable as /rest/v1/rpc/*. Triggers don't need EXECUTE to fire, so nobody needs it.
revoke execute on function public.enforce_campaign_pricing() from public, anon, authenticated;
revoke execute on function public.propagate_creator_cpm() from public, anon, authenticated;
revoke execute on function public.require_billing_before_deposit() from public, anon, authenticated;
revoke execute on function public.sync_platform_rate_cpm() from public, anon, authenticated;

-- 2. The creator insert policy checked "approved for some live campaign", not this clip's campaign.
--    prepare_clip_submission() already enforced the right campaign; the policy now says the same thing.
drop policy clips_creator_insert_own on public.clips;
create policy clips_creator_insert_own on public.clips
  for insert with check (
    creator_id = auth.uid()
    and status = 'pending_review'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
    and public.current_role_is('creator')
    and exists (
      select 1
      from public.campaigns c
      join public.campaign_applications ca on ca.campaign_id = c.id
      where c.id = clips.campaign_id
        and c.status = 'live'
        and clips.platform = any (c.allowed_platforms)
        and ca.creator_id = auth.uid()
        and ca.status = 'approved'
    )
  );

-- 3. Foreign keys without a covering index (joins, RLS lookups and cascading deletes scan the table).
create index if not exists idx_campaign_applications_creator_id on public.campaign_applications (creator_id);
create index if not exists idx_campaign_applications_reviewed_by on public.campaign_applications (reviewed_by);
create index if not exists idx_campaign_escrow_confirmed_by on public.campaign_escrow (confirmed_by);
create index if not exists idx_campaigns_brand_id on public.campaigns (brand_id);
create index if not exists idx_clip_disputes_clip_id on public.clip_disputes (clip_id);
create index if not exists idx_clip_disputes_creator_id on public.clip_disputes (creator_id);
create index if not exists idx_clip_disputes_resolved_by on public.clip_disputes (resolved_by);
create index if not exists idx_clips_campaign_id on public.clips (campaign_id);
create index if not exists idx_clips_creator_id on public.clips (creator_id);
create index if not exists idx_clips_reviewed_by on public.clips (reviewed_by);
create index if not exists idx_manual_view_reports_clip_id on public.manual_view_reports (clip_id);
create index if not exists idx_manual_view_reports_creator_id on public.manual_view_reports (creator_id);
create index if not exists idx_manual_view_reports_reviewed_by on public.manual_view_reports (reviewed_by);
create index if not exists idx_payouts_paid_by on public.payouts (paid_by);
create index if not exists idx_pii_access_logs_actor_id on public.pii_access_logs (actor_id);
create index if not exists idx_settlements_campaign_id on public.settlements (campaign_id);
create index if not exists idx_settlements_creator_id on public.settlements (creator_id);
create index if not exists idx_view_snapshots_clip_id on public.view_snapshots (clip_id, captured_at);
