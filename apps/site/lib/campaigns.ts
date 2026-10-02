import {
  cumulativeCountByDay,
  fetchAllRows,
  fetchAllRowsIn,
  rankCreatorEarnings,
  seoulDateKey,
  viewTrend,
  type RankedCreatorEarning,
} from '@clipers/db';
import { getSupabaseServerClient } from './supabase-server';

// Public marketplace data. Anonymous RLS only exposes live self-serve campaigns and their approved clips.
// The brand's budget and rate are not readable here: campaign_payout_limits() gives each campaign's creator payout
// limit (what creators can be paid in total), and the market shows that, never the brand's money.

export type MarketCampaign = {
  id: string;
  title: string;
  category: string;
  contentType: string;
  coverImageUrl: string | null;
  platforms: string[];
  brandName: string;
  /** Creator rate per 1,000 views (what creators are told). */
  creatorCpm: number;
  /** Total creators can be paid on this campaign. */
  payoutLimit: number;
  payoutPaid: number;
  payoutRemaining: number;
  usageRatio: number;
  participantCount: number;
  createdAt: string;
};

type CampaignRow = {
  id: string;
  title: string;
  category: string;
  content_type: string;
  cover_image_url: string | null;
  allowed_platforms: string[];
  creator_cpm: number;
  created_at: string;
  brand: { display_name: string } | null;
};

const CAMPAIGN_FIELDS =
  'id, title, category, content_type, cover_image_url, allowed_platforms, creator_cpm, created_at, brand:profiles!campaigns_brand_id_fkey(display_name)';

function toMarketCampaign(row: CampaignRow, payoutLimit: number, creatorPaid: number, participantCount: number): MarketCampaign {
  const payoutPaid = Math.min(payoutLimit, creatorPaid);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    contentType: row.content_type,
    coverImageUrl: row.cover_image_url,
    platforms: row.allowed_platforms,
    brandName: row.brand?.display_name ?? '브랜드',
    creatorCpm: Number(row.creator_cpm),
    payoutLimit,
    payoutPaid,
    payoutRemaining: Math.max(0, payoutLimit - payoutPaid),
    usageRatio: payoutLimit > 0 ? payoutPaid / payoutLimit : 0,
    participantCount,
    createdAt: row.created_at,
  };
}

async function payoutLimitsByCampaign(campaignIds: string[]): Promise<Map<string, number>> {
  if (campaignIds.length === 0) return new Map();
  const { data } = await getSupabaseServerClient().rpc('campaign_payout_limits', { p_campaign_ids: campaignIds });
  return new Map(((data ?? []) as { campaign_id: string; payout_limit: number | string }[]).map((row) => [row.campaign_id, Number(row.payout_limit)]));
}

async function participantsByCampaign(campaignIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (campaignIds.length === 0) return counts;
  const supabase = getSupabaseServerClient();
  const rows = await fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
    supabase.from('campaign_applications').select('campaign_id').in('campaign_id', ids).order('id').range(from, to)
  );
  for (const row of rows) counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
  return counts;
}

async function creatorPaidByCampaign(campaignIds: string[]): Promise<Map<string, number>> {
  const paid = new Map<string, number>();
  if (campaignIds.length === 0) return paid;
  const supabase = getSupabaseServerClient();
  const rows = await fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
    supabase.from('settlements').select('campaign_id, amount').in('campaign_id', ids).order('id').range(from, to)
  );
  for (const row of rows) paid.set(row.campaign_id, (paid.get(row.campaign_id) ?? 0) + Number(row.amount));
  return paid;
}

export async function loadLiveCampaigns(): Promise<MarketCampaign[]> {
  const { data } = await getSupabaseServerClient()
    .from('campaigns')
    .select(CAMPAIGN_FIELDS)
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as CampaignRow[];
  const ids = rows.map((row) => row.id);
  const [limits, paid, participants] = await Promise.all([payoutLimitsByCampaign(ids), creatorPaidByCampaign(ids), participantsByCampaign(ids)]);
  return rows.map((row) => toMarketCampaign(row, limits.get(row.id) ?? 0, paid.get(row.id) ?? 0, participants.get(row.id) ?? 0));
}

export type TopClip = { id: string; url: string; campaignTitle: string; viewCount: number };

export async function loadTopClips(campaignIds: string[], limit = 12): Promise<TopClip[]> {
  if (campaignIds.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const clipRows = (await fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
    supabase
      .from('clips')
      .select('id, url, campaign:campaigns!clips_campaign_id_fkey(title)')
      .eq('status', 'approved')
      .in('campaign_id', ids)
      .order('id')
      .range(from, to)
  )) as unknown as { id: string; url: string; campaign: { title: string } | null }[];
  if (clipRows.length === 0) return [];

  // Newest first within each chunk; a clip's snapshots always share a chunk, so the first one seen is its latest.
  const snapshots = await fetchAllRowsIn(clipRows.map((clip) => clip.id), (ids) => (from, to) =>
    supabase
      .from('view_snapshots')
      .select('clip_id, view_count')
      .in('clip_id', ids)
      .order('captured_at', { ascending: false })
      .order('id')
      .range(from, to)
  );
  const latest = new Map<string, number>();
  for (const row of snapshots) if (!latest.has(row.clip_id)) latest.set(row.clip_id, Number(row.view_count));

  return clipRows
    .map((clip) => ({ id: clip.id, url: clip.url, campaignTitle: clip.campaign?.title ?? '캠페인', viewCount: latest.get(clip.id) ?? 0 }))
    .filter((clip) => clip.viewCount > 0)
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, limit);
}

export type CampaignDetail = MarketCampaign & {
  description: string | null;
  requirements: string | null;
  referenceLinks: string[];
  reviewSlaHours: number;
  /** Clips one creator may submit per day (null: no limit). */
  dailyClipLimit: number | null;
  /** Per-platform creator payout cap for a single clip. */
  clipCaps: { platform: string; maxPayout: number }[];
  leaderboard: RankedCreatorEarning[];
  averageEarning: number;
  /** Daily KST series from the campaign's first activity (capped at 90 days). */
  activity: { date: string; views: number; submissions: number }[];
};

export async function loadCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('campaigns')
    .select(`${CAMPAIGN_FIELDS}, description, content_requirements, reference_links, review_sla_hours, daily_clip_limit`)
    .eq('id', id)
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as CampaignRow & {
    description: string | null;
    content_requirements: string | null;
    reference_links: string[];
    review_sla_hours: number;
    daily_clip_limit: number | null;
  };

  const [limits, rates, participants, settlements, approvedClips] = await Promise.all([
    payoutLimitsByCampaign([id]),
    supabase.from('campaign_platform_rates').select('platform, max_payout').eq('campaign_id', id),
    participantsByCampaign([id]),
    fetchAllRows((from, to) =>
      supabase
        .from('settlements')
        .select('creator_id, amount, creator:profiles!settlements_creator_id_fkey(display_name)')
        .eq('campaign_id', id)
        .order('id')
        .range(from, to)
    ),
    fetchAllRows((from, to) => supabase.from('clips').select('id, submitted_at').eq('campaign_id', id).eq('status', 'approved').order('id').range(from, to)),
  ]);

  const settlementRows = settlements as unknown as { creator_id: string; amount: number; creator: { display_name: string } | null }[];
  const ranked = rankCreatorEarnings(
    settlementRows.map((settlement) => ({
      creatorId: settlement.creator_id,
      creatorName: settlement.creator?.display_name ?? '크리에이터',
      amount: Number(settlement.amount),
    }))
  );
  const creatorPaid = settlementRows.reduce((sum, settlement) => sum + Number(settlement.amount), 0);

  const clips = approvedClips;
  const byClip = new Map<string, { capturedAt: string; viewCount: number }[]>();
  const snapshotRows = await fetchAllRowsIn(clips.map((clip) => clip.id), (ids) => (from, to) =>
    supabase.from('view_snapshots').select('clip_id, view_count, captured_at').in('clip_id', ids).order('id').range(from, to)
  );
  for (const snapshot of snapshotRows) {
    byClip.set(snapshot.clip_id, [...(byClip.get(snapshot.clip_id) ?? []), { capturedAt: snapshot.captured_at, viewCount: Number(snapshot.view_count) }]);
  }
  const firstActivity = [row.created_at, ...clips.map((clip) => clip.submitted_at)].map((value) => seoulDateKey(new Date(value))).sort()[0];
  const daysSinceStart = Math.round((Date.parse(seoulDateKey(new Date())) - Date.parse(firstActivity)) / 86_400_000) + 1;
  const trend = viewTrend([...byClip.entries()].map(([clipId, snapshots]) => ({ clipId, snapshots })), Math.min(90, Math.max(14, daysSinceStart)));
  const submissions = cumulativeCountByDay(clips.map((clip) => clip.submitted_at), trend.map((point) => point.date));
  const activity = trend.map((point, index) => ({ date: point.date, views: point.cumulative, submissions: submissions[index] }));

  return {
    ...toMarketCampaign(row, limits.get(id) ?? 0, creatorPaid, participants.get(id) ?? 0),
    description: row.description,
    requirements: row.content_requirements,
    referenceLinks: row.reference_links ?? [],
    reviewSlaHours: row.review_sla_hours,
    dailyClipLimit: row.daily_clip_limit,
    clipCaps: (rates.data ?? []).map((rate) => ({ platform: rate.platform, maxPayout: Number(rate.max_payout) })),
    leaderboard: ranked.slice(0, 3),
    averageEarning: ranked.length > 0 ? Math.round(creatorPaid / ranked.length) : 0,
    activity,
  };
}
