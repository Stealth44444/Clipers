const WON = new Intl.NumberFormat('ko-KR');
const COMPACT = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatKRW(value: number): string {
  return `${WON.format(Math.round(value))}원`;
}

export function formatCompactNumber(value: number): string {
  return COMPACT.format(value);
}

export function greetingFor(now: Date): string {
  const hour = (now.getUTCHours() + 9) % 24;
  if (hour >= 5 && hour < 12) return '좋은 아침이에요';
  if (hour >= 12 && hour < 18) return '좋은 오후예요';
  if (hour >= 18 && hour < 23) return '좋은 저녁이에요';
  return '편안한 밤이에요';
}
