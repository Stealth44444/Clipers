import {
  budgetUsage,
  campaignPricing,
  rankCreatorEarnings,
  rollupDailyViews,
  type RankedCreatorEarning,
} from '@clipers/db';
import { getSupabaseServerClient } from './supabase-server';

// Public marketplace data. Anonymous RLS only exposes live self-serve campaigns and their approved clips.

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
  totalBudget: number;
  remainingBudget: number;
  usageRatio: number;
};

type CampaignRow = {
  id: string;
  title: string;
  category: string;
  content_type: string;
  cover_image_url: string | null;
  allowed_platforms: string[];
  total_budget: number;
  brand_cpm: number;
  creator_cpm: number;
  brand: { display_name: string } | null;
};

const CAMPAIGN_FIELDS =
  'id, title, category, content_type, cover_image_url, allowed_platforms, total_budget, brand_cpm, creator_cpm, brand:profiles!campaigns_brand_id_fkey(display_name)';

function toMarketCampaign(row: CampaignRow, creatorPaid: number): MarketCampaign {
  const totalBudget = Number(row.total_budget);
  const usage = budgetUsage(totalBudget, creatorPaid, campaignPricing(row));
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    contentType: row.content_type,
    coverImageUrl: row.cover_image_url,
    platforms: row.allowed_platforms,
    brandName: row.brand?.display_name ?? '브랜드',
    creatorCpm: Number(row.creator_cpm),
    totalBudget,
    remainingBudget: usage.remaining,
    usageRatio: usage.ratio,
  };
}

async function creatorPaidByCampaign(campaignIds: string[]): Promise<Map<string, number>> {
  const paid = new Map<string, number>();
  if (campaignIds.length === 0) return paid;
  const { data } = await getSupabaseServerClient().from('settlements').select('campaign_id, amount').in('campaign_id', campaignIds);
  for (const row of data ?? []) paid.set(row.campaign_id, (paid.get(row.campaign_id) ?? 0) + Number(row.amount));
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
  const paid = await creatorPaidByCampaign(rows.map((row) => row.id));
  return rows.map((row) => toMarketCampaign(row, paid.get(row.id) ?? 0));
}

export type TopClip = { id: string; url: string; campaignTitle: string; viewCount: number };

export async function loadTopClips(campaignIds: string[], limit = 12): Promise<TopClip[]> {
  if (campaignIds.length === 0) return [];
  const supabase = getSupabaseServerClient();
  const { data: clips } = await supabase
    .from('clips')
    .select('id, url, campaign:campaigns!clips_campaign_id_fkey(title)')
    .eq('status', 'approved')
    .in('campaign_id', campaignIds);
  const clipRows = (clips ?? []) as unknown as { id: string; url: string; campaign: { title: string } | null }[];
  if (clipRows.length === 0) return [];

  const { data: snapshots } = await supabase
    .from('view_snapshots')
    .select('clip_id, view_count')
    .in('clip_id', clipRows.map((clip) => clip.id))
    .order('captured_at', { ascending: false });
  const latest = new Map<string, number>();
  for (const row of snapshots ?? []) if (!latest.has(row.clip_id)) latest.set(row.clip_id, Number(row.view_count));

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
  participantCount: number;
  /** Per-platform creator payout cap for a single clip. */
  clipCaps: { platform: string; maxPayout: number }[];
  leaderboard: RankedCreatorEarning[];
  averageEarning: number;
  views: { date: string; totalViews: number }[];
};

export async function loadCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('campaigns')
    .select(`${CAMPAIGN_FIELDS}, description, content_requirements, reference_links, review_sla_hours`)
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
  };

  const [rates, applications, settlements, approvedClips] = await Promise.all([
    supabase.from('campaign_platform_rates').select('platform, max_payout').eq('campaign_id', id),
    supabase.from('campaign_applications').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
    supabase.from('settlements').select('creator_id, amount, creator:profiles!settlements_creator_id_fkey(display_name)').eq('campaign_id', id),
    supabase.from('clips').select('id').eq('campaign_id', id).eq('status', 'approved'),
  ]);

  const settlementRows = (settlements.data ?? []) as unknown as { creator_id: string; amount: number; creator: { display_name: string } | null }[];
  const ranked = rankCreatorEarnings(
    settlementRows.map((settlement) => ({
      creatorId: settlement.creator_id,
      creatorName: settlement.creator?.display_name ?? '크리에이터',
      amount: Number(settlement.amount),
    }))
  );
  const creatorPaid = settlementRows.reduce((sum, settlement) => sum + Number(settlement.amount), 0);

  const clipIds = (approvedClips.data ?? []).map((clip) => clip.id);
  let views: CampaignDetail['views'] = [];
  if (clipIds.length > 0) {
    const { data: snapshotRows } = await supabase.from('view_snapshots').select('clip_id, view_count, captured_at').in('clip_id', clipIds);
    const byClip = new Map<string, { capturedAt: string; viewCount: number }[]>();
    for (const snapshot of snapshotRows ?? []) {
      byClip.set(snapshot.clip_id, [...(byClip.get(snapshot.clip_id) ?? []), { capturedAt: snapshot.captured_at, viewCount: Number(snapshot.view_count) }]);
    }
    views = rollupDailyViews([...byClip.entries()].map(([clipId, snapshots]) => ({ clipId, snapshots })));
  }

  return {
    ...toMarketCampaign(row, creatorPaid),
    description: row.description,
    requirements: row.content_requirements,
    referenceLinks: row.reference_links ?? [],
    reviewSlaHours: row.review_sla_hours,
    participantCount: applications.count ?? 0,
    clipCaps: (rates.data ?? []).map((rate) => ({ platform: rate.platform, maxPayout: Number(rate.max_payout) })),
    leaderboard: ranked.slice(0, 3),
    averageEarning: ranked.length > 0 ? Math.round(creatorPaid / ranked.length) : 0,
    views,
  };
}
