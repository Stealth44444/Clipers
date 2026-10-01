import { cache } from 'react';
import { budgetUsage, campaignPricing, expectedViews, fetchAllRowsIn } from '@clipers/db';
import { getSession } from './session';

export type BrandCampaign = {
  id: string;
  title: string;
  status: string;
  category: string;
  content_type: string;
  total_budget: number;
  cover_image_url: string | null;
  allowed_platforms: string[];
  created_at: string;
  /** Budget consumed at the brand rate. Brands never see the creator rate or creator payouts. */
  spent: number;
  remaining: number;
  usageRatio: number;
  expectedViews: number;
  verifiedViews: number;
  clipCount: number;
};

/** The signed-in brand's campaigns with spend and clip counts, deduplicated per request. */
export const getBrandCampaigns = cache(async (): Promise<BrandCampaign[]> => {
  const { supabase, user } = await getSession();
  const { data: rows } = await supabase
    .from('campaigns')
    .select('id, title, status, category, content_type, total_budget, brand_cpm, creator_cpm, cover_image_url, allowed_platforms, created_at')
    .eq('brand_id', user.id)
    .order('created_at', { ascending: false });
  const campaigns = rows ?? [];
  if (campaigns.length === 0) return [];

  const ids = campaigns.map((campaign) => campaign.id);
  const [settlements, clips] = await Promise.all([
    fetchAllRowsIn(ids, (slice) => (from, to) =>
      supabase.from('settlements').select('campaign_id, amount, verified_views').in('campaign_id', slice).order('id').range(from, to)
    ),
    fetchAllRowsIn(ids, (slice) => (from, to) => supabase.from('clips').select('campaign_id').in('campaign_id', slice).order('id').range(from, to)),
  ]);

  const paid = new Map<string, number>();
  const views = new Map<string, number>();
  for (const row of settlements) {
    paid.set(row.campaign_id, (paid.get(row.campaign_id) ?? 0) + Number(row.amount));
    views.set(row.campaign_id, (views.get(row.campaign_id) ?? 0) + Number(row.verified_views));
  }
  const clipCounts = new Map<string, number>();
  for (const row of clips) clipCounts.set(row.campaign_id, (clipCounts.get(row.campaign_id) ?? 0) + 1);

  return campaigns.map((campaign) => {
    const pricing = campaignPricing(campaign);
    const totalBudget = Number(campaign.total_budget);
    const usage = budgetUsage(totalBudget, paid.get(campaign.id) ?? 0, pricing);
    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      category: campaign.category,
      content_type: campaign.content_type,
      total_budget: totalBudget,
      cover_image_url: campaign.cover_image_url,
      allowed_platforms: campaign.allowed_platforms,
      created_at: campaign.created_at,
      spent: usage.spent,
      remaining: usage.remaining,
      usageRatio: usage.ratio,
      expectedViews: expectedViews(totalBudget, pricing),
      verifiedViews: views.get(campaign.id) ?? 0,
      clipCount: clipCounts.get(campaign.id) ?? 0,
    };
  });
});
