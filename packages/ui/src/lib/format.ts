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

export function formatCompactKRW(value: number): string {
  return `${formatCompactNumber(value)}원`;
}

export function relativeTimeKo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return '방금';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
