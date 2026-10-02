import type { SettlementPeriod } from './settlement';

/**
 * Whether a clip of a possibly stopped campaign is settled for `period` (terms 제11조 2항): only clips approved by the
 * time of the stop, and only through the week the campaign was stopped in.
 */
export function includeInSettlement(reviewedAt: string | null, stoppedAt: string | null, period: SettlementPeriod): boolean {
  if (!stoppedAt) return true;
  const stopped = Date.parse(stoppedAt);
  if (period.startAt.getTime() > stopped) return false;
  if (reviewedAt && Date.parse(reviewedAt) > stopped) return false;
  return true;
}
