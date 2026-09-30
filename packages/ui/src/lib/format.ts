const WON = new Intl.NumberFormat('ko-KR');
const COMPACT = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatKRW(value: number): string {
  return `${WON.format(Math.round(value))}원`;
}

export function formatCompactNumber(value: number): string {
  return COMPACT.format(value);
}
