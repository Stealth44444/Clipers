import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows, fetchAllRowsIn } from '../paging';
import { budgetUsage, campaignPricing, creatorCampaignCap, creatorPayoutCap } from '../pricing';
import { getCampaignsToClose } from './campaignClosure';
import { includeInSettlement } from './campaignStop';
import { err, ok, type ServiceResult } from './errors';
import { findPlatformRate, type PlatformRate } from './platformRate';
import { calculateWeeklySettlementDrafts, settlementPeriodsToRun, type SettlementPeriod, type WeeklySettlementInput } from './settlement';

// Creates one week's settlements from approved clips and their view snapshots, then closes campaigns whose budget
// is spent. Shared by the weekly cron (service role) and the operator's button (admin session); the
// settlement_runs row claims the week first, so the two can't settle the same week twice.

export type SettlementRunSource = 'cron' | 'admin';

export type SettlementRunSummary = {
  period: string;
  settlements: number;
  closedCampaigns: number;
  /** Someone else had already claimed this week. */
  alreadyRun: boolean;
};

type ApprovedClip = {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: string;
  reviewed_at: string | null;
};

type FinanceRow = { campaign_id: string; total_budget: number | string; brand_cpm: number | string; creator_cpm: number | string };

type RateRow = { campaign_id: string; platform: string; cpm_rate: number | string; max_payout: number | string };
type SnapshotRow = { clip_id: string; view_count: number | string; captured_at: string };
type SettledRow = { clip_id: string; campaign_id: string; creator_id: string; amount: number | string; period: string };
type StopRow = { id: string; stopped_at: string | null };
type PaidRow = { campaign_id: string; amount: number | string };

async function settle(supabase: SupabaseClient, period: SettlementPeriod): Promise<{ settlements: number; closedCampaigns: number }> {
  const clips = (await fetchAllRows((from, to) =>
    supabase
      .from('clips')
      .select('id, campaign_id, creator_id, platform, reviewed_at')
      .eq('status', 'approved')
      .order('id')
      .range(from, to)
  )) as unknown as ApprovedClip[];
  if (clips.length === 0) return { settlements: 0, closedCampaigns: 0 };

  const campaignIds = [...new Set(clips.map((clip) => clip.campaign_id))];
  const clipIds = clips.map((clip) => clip.id);
  // Budgets and brand rates are not readable through campaigns; campaign_finances serves admins and the service role.
  const [financeRows, rateRows, snapshots, settled, stopRows] = await Promise.all([
    fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
      supabase.from('campaign_finances').select('campaign_id, total_budget, brand_cpm, creator_cpm').in('campaign_id', ids).order('campaign_id').range(from, to)
    ) as Promise<FinanceRow[]>,
    fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
      supabase.from('campaign_platform_rates').select('campaign_id, platform, cpm_rate, max_payout').in('campaign_id', ids).order('campaign_id').order('platform').range(from, to)
    ) as Promise<RateRow[]>,
    fetchAllRowsIn(clipIds, (ids) => (from, to) =>
      supabase
        .from('view_snapshots')
        .select('clip_id, view_count, captured_at')
        .in('clip_id', ids)
        .lt('captured_at', period.endAt.toISOString())
        .order('id')
        .range(from, to)
    ) as Promise<SnapshotRow[]>,
    fetchAllRowsIn(clipIds, (ids) => (from, to) =>
      supabase.from('settlements').select('clip_id, campaign_id, creator_id, amount, period').in('clip_id', ids).order('id').range(from, to)
    ) as Promise<SettledRow[]>,
    fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
      supabase.from('campaigns').select('id, stopped_at').in('id', ids).order('id').range(from, to)
    ) as Promise<StopRow[]>,
  ]);

  const finances = new Map(financeRows.map((row) => [row.campaign_id, row]));
  const stoppedAt = new Map(stopRows.map((row) => [row.id, row.stopped_at]));
  const ratesByCampaign = new Map<string, PlatformRate[]>();
  for (const row of rateRows) {
    const rates = ratesByCampaign.get(row.campaign_id) ?? [];
    rates.push({ platform: row.platform, cpmRate: Number(row.cpm_rate), minPayout: 0, maxPayout: Number(row.max_payout) });
    ratesByCampaign.set(row.campaign_id, rates);
  }
  const snapshotsByClip = new Map<string, WeeklySettlementInput['snapshots']>();
  for (const row of snapshots) {
    const list = snapshotsByClip.get(row.clip_id) ?? [];
    list.push({ capturedAt: row.captured_at, viewCount: Number(row.view_count) });
    snapshotsByClip.set(row.clip_id, list);
  }
  const earlier = settled.filter((row) => row.period < period.period);
  const thisWeek = settled.filter((row) => row.period === period.period);
  const settledThisWeek = new Set(thisWeek.map((row) => row.clip_id));
  // A retried week keeps what it already created; that money is spent from the budget too.
  const spentBefore = [...earlier, ...thisWeek];
  const sum = (rows: SettledRow[]) => rows.reduce((total, row) => total + Number(row.amount), 0);

  const inputs = clips.flatMap((clip): WeeklySettlementInput[] => {
    const rate = findPlatformRate(ratesByCampaign.get(clip.campaign_id) ?? [], clip.platform);
    const finance = finances.get(clip.campaign_id);
    if (!finance || !rate || settledThisWeek.has(clip.id)) return [];
    if (!includeInSettlement(clip.reviewed_at, stoppedAt.get(clip.campaign_id) ?? null, period)) return [];
    return [
      {
        clipId: clip.id,
        campaignId: clip.campaign_id,
        creatorId: clip.creator_id,
        reviewedAt: clip.reviewed_at,
        cpmRate: rate.cpmRate,
        perClipCap: rate.maxPayout,
        // Creators can only be paid the creator-rate share of the brand's budget.
        campaignBudget: creatorPayoutCap(Number(finance.total_budget), campaignPricing(finance)),
        previouslySettledClipAmount: sum(earlier.filter((row) => row.clip_id === clip.id)),
        previouslySettledCampaignAmount: sum(spentBefore.filter((row) => row.campaign_id === clip.campaign_id)),
        // One creator can take at most a share of the brand's budget from a campaign.
        creatorCap: creatorCampaignCap(Number(finance.total_budget)),
        previouslySettledCreatorAmount: sum(
          spentBefore.filter((row) => row.campaign_id === clip.campaign_id && row.creator_id === clip.creator_id)
        ),
        snapshots: snapshotsByClip.get(clip.id) ?? [],
      },
    ];
  });

  const drafts = calculateWeeklySettlementDrafts(inputs, period);
  if (drafts.length > 0) {
    const { error } = await supabase.from('settlements').insert(
      drafts.map((draft) => ({
        creator_id: draft.creatorId,
        campaign_id: draft.campaignId,
        clip_id: draft.clipId,
        amount: draft.amount,
        verified_views: draft.verifiedViews,
        withholding_amount: 0,
        status: 'pending' as const,
        period: draft.period,
      }))
    );
    if (error) throw new Error(error.message);
  }

  const newlySettled = new Map<string, number>();
  for (const draft of drafts) newlySettled.set(draft.campaignId, (newlySettled.get(draft.campaignId) ?? 0) + draft.amount);
  const budgets = new Map(inputs.map((input) => [input.campaignId, input]));
  const toClose = getCampaignsToClose(
    [...budgets.values()].map((input) => ({
      campaignId: input.campaignId,
      totalBudget: input.campaignBudget,
      totalSettledAmount: input.previouslySettledCampaignAmount + (newlySettled.get(input.campaignId) ?? 0),
    }))
  );
  if (toClose.length > 0) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'closed', finalized_at: new Date().toISOString() })
      .in('id', toClose)
      .eq('status', 'live');
    if (error) throw new Error(error.message);
  }

  return { settlements: drafts.length, closedCampaigns: toClose.length };
}

/**
 * Fixes the leftover of campaigns stopped before this week ended. Runs after the week is settled, so a campaign's
 * last settled week is the week it was stopped in; finalize_campaign() does nothing for one already fixed.
 */
async function finalizeStoppedCampaigns(supabase: SupabaseClient, period: SettlementPeriod): Promise<void> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('status', 'closed')
    .is('finalized_at', null)
    .not('stopped_at', 'is', null)
    .lt('stopped_at', period.endAt.toISOString());
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 0) return;

  const [financeRows, paidRows] = await Promise.all([
    fetchAllRowsIn(ids, (slice) => (from, to) =>
      supabase.from('campaign_finances').select('campaign_id, total_budget, brand_cpm, creator_cpm').in('campaign_id', slice).order('campaign_id').range(from, to)
    ) as Promise<FinanceRow[]>,
    fetchAllRowsIn(ids, (slice) => (from, to) =>
      supabase.from('settlements').select('campaign_id, amount').in('campaign_id', slice).order('id').range(from, to)
    ) as Promise<PaidRow[]>,
  ]);
  const paid = new Map<string, number>();
  for (const row of paidRows) paid.set(row.campaign_id, (paid.get(row.campaign_id) ?? 0) + Number(row.amount));

  for (const finance of financeRows) {
    const { remaining } = budgetUsage(Number(finance.total_budget), paid.get(finance.campaign_id) ?? 0, campaignPricing(finance));
    const { error: rpcError } = await supabase.rpc('finalize_campaign', {
      p_campaign_id: finance.campaign_id,
      p_leftover: Math.max(0, Math.floor(remaining)),
    });
    if (rpcError) throw new Error(rpcError.message);
  }
}

/** Settles one week, unless that week was already claimed. */
export async function runWeeklySettlement(
  supabase: SupabaseClient,
  period: SettlementPeriod,
  source: SettlementRunSource
): Promise<ServiceResult<SettlementRunSummary>> {
  const { error: claimError } = await supabase.from('settlement_runs').insert({ period: period.period, source });
  if (claimError) {
    if (claimError.code === '23505') return ok({ period: period.period, settlements: 0, closedCampaigns: 0, alreadyRun: true });
    return err('db_error', claimError.message);
  }

  try {
    const result = await settle(supabase, period);
    await finalizeStoppedCampaigns(supabase, period);
    await supabase
      .from('settlement_runs')
      .update({ settlement_count: result.settlements, finished_at: new Date().toISOString() })
      .eq('period', period.period);
    return ok({ period: period.period, ...result, alreadyRun: false });
  } catch (error) {
    // Release the claim so the week can be tried again. Settlements already inserted stay; the retry skips them.
    await supabase.from('settlement_runs').delete().eq('period', period.period);
    return err('settlement_failed', error instanceof Error ? error.message : String(error));
  }
}

/** Settles every completed week not yet settled, oldest first, stopping at the first failure. */
export async function runPendingSettlements(
  supabase: SupabaseClient,
  source: SettlementRunSource,
  now: Date = new Date()
): Promise<ServiceResult<SettlementRunSummary[]>> {
  const { data, error } = await supabase.from('settlement_runs').select('period').order('period', { ascending: false }).limit(1);
  if (error) return err('db_error', error.message);

  const summaries: SettlementRunSummary[] = [];
  for (const period of settlementPeriodsToRun(data?.[0]?.period ?? null, now)) {
    const result = await runWeeklySettlement(supabase, period, source);
    if (!result.ok) return err(result.code, `${period.period} 주 정산 중 오류: ${result.message}`);
    summaries.push(result.data);
  }
  return ok(summaries);
}
