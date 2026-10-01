-- Phase 2: NOT a migration yet. Move into supabase/migrations and apply only after the site and app that read
-- campaign_finances / campaign_payout_limits() are deployed; applied earlier, the deployed code loses campaign data.
-- Close columns the public API should never have served (found 2026-10-01, docs/legal/README.md section 4).
-- Supabase grants every role SELECT on whole tables; RLS limits rows, not columns. So table SELECT is revoked and only
-- the columns each role needs are granted back.
--
-- 1. campaigns.total_budget and brand_cpm: the brand's budget and rate are confidential, and under the direct-contract
--    structure (Clipers buys from creators, sells to brands) they would expose the company's margin. Brands and admins
--    read them through campaign_finances; the public market gets each campaign's creator payout limit from
--    campaign_payout_limits() (mirrors creatorPayoutCap in packages/db/src/pricing.ts, enforced by pricing.test.ts).
-- 2. profiles: the public sees a name and a role, not onboarding answers.
-- 3. clips, settlements: the public sees what the market shows, not review or payout internals.

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
