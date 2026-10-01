-- Close columns the public API should never have served (found 2026-10-01, docs/legal/README.md section 4).
-- Supabase grants every role SELECT on whole tables; RLS limits rows, not columns. So table SELECT is revoked and only
-- the columns each role needs are granted back. Reads moved to campaign_finances / campaign_payout_limits() first
-- (20261001123839_campaign_finances).

-- 1. Campaign money
revoke select on public.campaigns from anon, authenticated;
grant select (
  id, brand_id, track, title, content_type, category, review_sla_hours, allowed_platforms, status, created_at,
  cover_image_url, content_requirements, creator_cpm, description, reference_links
) on public.campaigns to anon, authenticated;

-- 2. Profiles: signed-in users still read their own full profile (and admins everyone's) through RLS.
revoke select on public.profiles from anon;
grant select (id, display_name, role) on public.profiles to anon;

-- 3. Clips and settlements as the public market uses them.
revoke select on public.clips from anon;
grant select (id, campaign_id, creator_id, platform, url, status, submitted_at) on public.clips to anon;

revoke select on public.settlements from anon;
grant select (id, campaign_id, creator_id, amount) on public.settlements to anon;
