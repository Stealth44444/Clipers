import type { ClipSnapshotSeries } from './anomalyDetection';
import { payoutTax } from '../payouts';
import { MIN_WITHDRAWAL } from '../pricing';
import { getPreviousWeekPeriod } from './settlement';

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SettlementStatus = 'pending' | 'requested' | 'paid';

export type EarningsSettlement = {
  amount: number | string;
  status: string;
  period: string;
};

export type EarningsSummary = {
  total: number;
  unpaid: number;
  lastWeek: number;
  thisMonth: number;
  byStatus: Record<SettlementStatus, { amount: number; count: number }>;
};

/** Korean calendar date (YYYY-MM-DD) of an instant. */
export function seoulDateKey(date: Date): string {
  return new Date(date.getTime() + KOREA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Amounts are gross (before withholding). `period` is the KST Monday of the settled week. */
export function summarizeEarnings(settlements: EarningsSettlement[], now: Date = new Date()): EarningsSummary {
  const lastWeekPeriod = getPreviousWeekPeriod(now).period;
  const currentMonth = seoulDateKey(now).slice(0, 7);
  const byStatus: EarningsSummary['byStatus'] = {
    pending: { amount: 0, count: 0 },
    requested: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
  };
  let total = 0;
  let lastWeek = 0;
  let thisMonth = 0;

  for (const settlement of settlements) {
    const amount = Number(settlement.amount);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    if (settlement.period === lastWeekPeriod) lastWeek += amount;
    if (settlement.period.startsWith(currentMonth)) thisMonth += amount;
    const bucket = byStatus[settlement.status as SettlementStatus];
    if (bucket) {
      bucket.amount += amount;
      bucket.count += 1;
    }
  }

  return { total, unpaid: byStatus.pending.amount + byStatus.requested.amount, lastWeek, thisMonth, byStatus };
}

export type CreatorChecklistStep = { id: 'account' | 'apply' | 'submit' | 'settle'; done: boolean };

export function creatorChecklist(counts: { applications: number; clips: number; settlements: number }): CreatorChecklistStep[] {
  return [
    { id: 'account', done: true },
    { id: 'apply', done: counts.applications > 0 },
    { id: 'submit', done: counts.clips > 0 },
    { id: 'settle', done: counts.settlements > 0 },
  ];
}

export function countByStatus<Status extends string>(rows: { status: string }[], statuses: readonly Status[]): Record<Status, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<Status, number>;
  for (const row of rows) {
    if (row.status in counts) counts[row.status as Status] += 1;
  }
  return counts;
}

export function settlementPeriodLabel(period: string): string {
  const [, month, day] = period.split('-').map(Number);
  return `${month}월 ${day}일 주`;
}

export type ViewTrendPoint = { date: string; cumulative: number; daily: number };

/**
 * Cumulative views per Korean calendar day for the last `days` days (ending today), carrying each clip's
 * latest snapshot forward. `daily` is the day-over-day increase, never negative.
 */
export function viewTrend(series: ClipSnapshotSeries[], days: number, now: Date = new Date()): ViewTrendPoint[] {
  const clips = series.map(({ snapshots }) =>
    snapshots
      .map((snapshot) => ({ at: new Date(snapshot.capturedAt).getTime(), views: snapshot.viewCount }))
      .filter((snapshot) => Number.isFinite(snapshot.at) && Number.isFinite(snapshot.views) && snapshot.views >= 0)
      .sort((left, right) => left.at - right.at)
  );

  const todayStartUtc = Date.parse(`${seoulDateKey(now)}T00:00:00Z`);
  const cumulativeAt = (dayStartUtc: number) => {
    const dayEnd = dayStartUtc + DAY_MS - KOREA_OFFSET_MS;
    return clips.reduce((sum, snapshots) => {
      let latest = 0;
      for (const snapshot of snapshots) {
        if (snapshot.at >= dayEnd) break;
        latest = snapshot.views;
      }
      return sum + latest;
    }, 0);
  };

  let previous = cumulativeAt(todayStartUtc - days * DAY_MS);
  return Array.from({ length: days }, (_, index) => {
    const dayStartUtc = todayStartUtc - (days - 1 - index) * DAY_MS;
    const cumulative = cumulativeAt(dayStartUtc);
    const point = { date: new Date(dayStartUtc).toISOString().slice(0, 10), cumulative, daily: Math.max(0, cumulative - previous) };
    previous = cumulative;
    return point;
  });
}

/** Running total of events (ISO timestamps) at the end of each KST day in `dayKeys` (YYYY-MM-DD, ascending). */
export function cumulativeCountByDay(events: string[], dayKeys: string[]): number[] {
  const eventDays = events.map((event) => seoulDateKey(new Date(event))).sort();
  let index = 0;
  return dayKeys.map((day) => {
    while (index < eventDays.length && eventDays[index] <= day) index += 1;
    return index;
  });
}

/** What a creator could request right now: all pending settlements as one payout, and its withholding (mirrors request_payout()). */
export function payoutRequest(settlements: { amount: number | string; status: string }[]) {
  const pending = settlements.filter((settlement) => settlement.status === 'pending');
  const settled = pending.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const tax = payoutTax(settled);
  return { amount: tax.gross, tax, count: pending.length, canRequest: settled >= MIN_WITHDRAWAL, shortfall: Math.max(0, MIN_WITHDRAWAL - settled) };
}
