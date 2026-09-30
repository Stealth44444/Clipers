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

      const openingViews = openingSnapshot?.viewCount ?? (reviewedAt >= periodStart ? 0 : null);
      if (openingViews === null) continue;

      const verifiedViews = Math.max(0, closingSnapshot.viewCount - openingViews);
      const clipBudgetRemaining = Math.max(
        0,
        input.perClipCap - input.previouslySettledClipAmount
      );
      const rawAmount = (verifiedViews / 1000) * input.cpmRate;
      const amount = Math.round(
        Math.min(rawAmount, clipBudgetRemaining, budgetRemaining) * 100
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
    }
  }

  return drafts;
}
