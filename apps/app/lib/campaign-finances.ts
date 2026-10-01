import { fetchAllRowsIn } from '@clipers/db';
import type { getSupabaseServerClient } from './supabase-server';

type ServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;
export type CampaignFinance = { total_budget: number; brand_cpm: number; creator_cpm: number };

/**
 * Budget and brand rate of the given campaigns. campaigns.total_budget and brand_cpm can't be read through the API;
 * the campaign_finances view returns them only to the campaign's brand and to admins.
 */
export async function loadCampaignFinances(supabase: ServerClient, campaignIds: string[]): Promise<Map<string, CampaignFinance>> {
  const rows = await fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
    supabase.from('campaign_finances').select('campaign_id, total_budget, brand_cpm, creator_cpm').in('campaign_id', ids).order('campaign_id').range(from, to)
  );
  return new Map(
    rows.map((row) => [
      row.campaign_id as string,
      { total_budget: Number(row.total_budget), brand_cpm: Number(row.brand_cpm), creator_cpm: Number(row.creator_cpm) },
    ])
  );
}
