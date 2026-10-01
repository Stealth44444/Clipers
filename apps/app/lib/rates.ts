import { formatKRW } from '@clipers/ui';

/** "1천 회당 500원" or "1천 회당 300원~800원" for a campaign's per-platform CPM rates. */
export function cpmRangeLabel(rates: Array<number | string>): string | null {
  const values = rates.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `1천 회당 ${min === max ? formatKRW(min) : `${formatKRW(min)}~${formatKRW(max)}`}`;
}
