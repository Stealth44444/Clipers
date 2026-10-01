// Brands buy verified views at `brandCpm` per 1,000; creators are paid `creatorCpm` per 1,000; Clipers keeps the spread.
// Defaults and the minimum budget must match supabase/migrations (pricing.test.ts enforces this).

export type CampaignPricing = { brandCpm: number; creatorCpm: number };

export const DEFAULT_PRICING: CampaignPricing = { brandCpm: 3000, creatorCpm: 800 };
export const MIN_CAMPAIGN_BUDGET = 1_000_000;
/** A clip is paid only once it reaches this many verified views (1 CPM); earlier views carry over. */
export const MIN_PAYOUT_VIEWS = 1000;

export function expectedViews(budget: number, pricing: CampaignPricing): number {
  if (!(budget > 0) || !(pricing.brandCpm > 0)) return 0;
  return Math.floor((budget / pricing.brandCpm) * 1000);
}

/** Total amount creators can be paid out of a budget (the settlement budget cap). */
export function creatorPayoutCap(totalBudget: number, pricing: CampaignPricing): number {
  if (!(totalBudget > 0) || !(pricing.brandCpm > 0)) return 0;
  return Math.floor((totalBudget * pricing.creatorCpm) / pricing.brandCpm);
}

export function platformMargin(pricing: CampaignPricing): number {
  return pricing.brandCpm - pricing.creatorCpm;
}

/** Budget consumed by creator payouts, expressed in brand spend. */
export function budgetUsage(totalBudget: number, creatorPaid: number, pricing: CampaignPricing) {
  const spent = pricing.creatorCpm > 0 ? Math.min(totalBudget, Math.round((creatorPaid * pricing.brandCpm) / pricing.creatorCpm)) : 0;
  return { spent, remaining: totalBudget - spent, ratio: totalBudget > 0 ? spent / totalBudget : 0 };
}

export function campaignPricing(row: { brand_cpm: number | string; creator_cpm: number | string }): CampaignPricing {
  return { brandCpm: Number(row.brand_cpm), creatorCpm: Number(row.creator_cpm) };
}

/** Operator view of a campaign: brand spend, what reached creators, and the platform's spread. */
export function campaignEconomics(totalBudget: number, creatorPaid: number, pricing: CampaignPricing) {
  const { spent } = budgetUsage(totalBudget, creatorPaid, pricing);
  return { spent, creatorPaid, platformRevenue: Math.max(0, spent - creatorPaid) };
}
