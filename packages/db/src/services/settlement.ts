import { MIN_PAYOUT_VIEWS } from '../pricing';

export type SettlementSnapshot = {
  capturedAt: string;
  viewCount: number;
};

export type WeeklySettlementInput = {
  clipId: string;
  campaignId: string;
  creatorId: string;
  reviewedAt: string | null;
  cpmRate: number;
  perClipCap: number;
  campaignBudget: number;
  previouslySettledClipAmount: number;
  previouslySettledCampaignAmount: number;
  /** Most this creator can be paid from this campaign (creatorCampaignCap of the brand budget). */
  creatorCap: number;
  /** What this creator has already been paid from this campaign: earlier weeks plus this week's existing rows. */
  previouslySettledCreatorAmount: number;
  snapshots: SettlementSnapshot[];
};

export type WeeklySettlementDraft = {
  clipId: string;
  campaignId: string;
  creatorId: string;
  period: string;
  verifiedViews: number;
  amount: number;
};

export type SettlementPeriod = {
  period: string;
  startAt: Date;
  endAt: Date;
};

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getPreviousWeekPeriod(now: Date = new Date()): SettlementPeriod {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const seoulCalendarDate = new Date(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day')));
  const daysSinceMonday = (seoulCalendarDate.getUTCDay() + 6) % 7;
  const thisWeekMonday = seoulCalendarDate.getTime() - daysSinceMonday * DAY_MS;
  const previousMonday = thisWeekMonday - 7 * DAY_MS;
  const nextMonday = thisWeekMonday;

  return {
    period: new Date(previousMonday).toISOString().slice(0, 10),
    startAt: new Date(previousMonday - KOREA_OFFSET_MS),
    endAt: new Date(nextMonday - KOREA_OFFSET_MS),
  };
}

/** The Monday-to-Monday Korea-time week that starts on `monday` (YYYY-MM-DD). */
export function settlementPeriodFor(monday: string): SettlementPeriod {
  const start = Date.parse(`${monday}T00:00:00.000Z`);
  return {
    period: monday,
    startAt: new Date(start - KOREA_OFFSET_MS),
    endAt: new Date(start + 7 * DAY_MS - KOREA_OFFSET_MS),
  };
}

// Weeks settled per catch-up; a longer gap is worked through oldest first over several runs.
const MAX_CATCH_UP_WEEKS = 12;

/**
 * Completed weeks still to settle, oldest first: every week after the last one settled, up to last week.
 * Weeks run in order because each week's growth starts where the previous settled week ended.
 */
export function settlementPeriodsToRun(lastRunPeriod: string | null, now: Date = new Date()): SettlementPeriod[] {
  const latest = getPreviousWeekPeriod(now);
  if (!lastRunPeriod) return [latest];

  const periods: SettlementPeriod[] = [];
  for (let start = Date.parse(`${lastRunPeriod}T00:00:00.000Z`) + 7 * DAY_MS; start <= Date.parse(`${latest.period}T00:00:00.000Z`); start += 7 * DAY_MS) {
    periods.push(settlementPeriodFor(new Date(start).toISOString().slice(0, 10)));
  }
  return periods.slice(0, MAX_CATCH_UP_WEEKS);
}

export function calculateWeeklySettlementDrafts(
  inputs: WeeklySettlementInput[],
  period: SettlementPeriod
): WeeklySettlementDraft[] {
  const grouped = new Map<string, WeeklySettlementInput[]>();
  for (const input of inputs) {
    const campaignInputs = grouped.get(input.campaignId) ?? [];
    campaignInputs.push(input);
    grouped.set(input.campaignId, campaignInputs);
  }

  const drafts: WeeklySettlementDraft[] = [];
  const periodStart = period.startAt.getTime();
  const periodEnd = period.endAt.getTime();

  for (const campaignInputs of grouped.values()) {
    campaignInputs.sort((left, right) => left.clipId.localeCompare(right.clipId));
    const campaign = campaignInputs[0];
    let budgetRemaining = Math.max(
      0,
      campaign.campaignBudget - campaign.previouslySettledCampaignAmount
    );
    // Per creator in this campaign: what is left under their cap, shared by all of their clips this week.
    const creatorRemaining = new Map<string, number>();

    for (const input of campaignInputs) {
      if (
        !input.reviewedAt ||
        !Number.isFinite(input.cpmRate) ||
        input.cpmRate <= 0 ||
        !Number.isFinite(input.perClipCap) ||
        input.perClipCap <= 0
      ) {
        continue;
      }

      const reviewedAt = new Date(input.reviewedAt).getTime();
      if (!Number.isFinite(reviewedAt) || reviewedAt >= periodEnd) continue;

      const snapshots = input.snapshots
        .map((snapshot) => ({
          capturedAt: new Date(snapshot.capturedAt).getTime(),
          viewCount: snapshot.viewCount,
        }))
        .filter(
          (snapshot) =>
            Number.isFinite(snapshot.capturedAt) &&
            Number.isSafeInteger(snapshot.viewCount) &&
            snapshot.viewCount >= 0
        )
        .sort((left, right) => left.capturedAt - right.capturedAt);
      const openingSnapshot = snapshots.filter((snapshot) => snapshot.capturedAt < periodStart).at(-1);
      const closingSnapshot = snapshots
        .filter((snapshot) => snapshot.capturedAt >= periodStart && snapshot.capturedAt < periodEnd)
        .at(-1);

      if (!closingSnapshot) continue;

      // Minimum payout: a never-paid clip is settled only once it reaches MIN_PAYOUT_VIEWS, and then for
      // every view so far (earlier weeks below the threshold carry over). Paid clips settle weekly growth.
      const neverPaid = input.previouslySettledClipAmount <= 0;
      if (neverPaid && closingSnapshot.viewCount < MIN_PAYOUT_VIEWS) continue;
      const openingViews = neverPaid ? 0 : openingSnapshot?.viewCount ?? (reviewedAt >= periodStart ? 0 : null);
      if (openingViews === null) continue;

      const verifiedViews = Math.max(0, closingSnapshot.viewCount - openingViews);
      const clipBudgetRemaining = Math.max(
        0,
        input.perClipCap - input.previouslySettledClipAmount
      );
      if (!creatorRemaining.has(input.creatorId)) {
        creatorRemaining.set(input.creatorId, Math.max(0, input.creatorCap - input.previouslySettledCreatorAmount));
      }
      const creatorLeft = creatorRemaining.get(input.creatorId)!;
      const rawAmount = (verifiedViews / 1000) * input.cpmRate;
      const amount = Math.round(
        Math.min(rawAmount, clipBudgetRemaining, budgetRemaining, creatorLeft) * 100
      ) / 100;

      if (amount <= 0) continue;

      drafts.push({
        clipId: input.clipId,
        campaignId: input.campaignId,
        creatorId: input.creatorId,
        period: period.period,
        verifiedViews,
        amount,
      });
      budgetRemaining = Math.max(0, budgetRemaining - amount);
      creatorRemaining.set(input.creatorId, Math.max(0, creatorLeft - amount));
    }
  }

  return drafts;
}
