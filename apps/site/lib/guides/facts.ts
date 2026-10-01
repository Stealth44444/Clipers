import { DEFAULT_PRICING, MIN_CAMPAIGN_BUDGET, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { formatKRW } from '@clipers/ui';

// Public creator policy, worded once for the guides. Creator rate only: the brand rate is never public.

export const RATE = formatKRW(DEFAULT_PRICING.creatorCpm);
export const MIN_VIEWS = `${MIN_PAYOUT_VIEWS.toLocaleString('ko-KR')}회`;
export const REVIEW_HOURS = `${Math.max(...REVIEW_SLA_OPTIONS)}시간`;
export const WITHDRAW_FROM = formatKRW(MIN_WITHDRAWAL);

/** What a clip earns at the default creator rate (nothing until it reaches the minimum payout views). */
export function earningsFor(views: number): number {
  if (views < MIN_PAYOUT_VIEWS) return 0;
  return Math.floor((views / 1000) * DEFAULT_PRICING.creatorCpm);
}

export const earnings = (views: number) => formatKRW(earningsFor(views));

export const MIN_BUDGET = `${(MIN_CAMPAIGN_BUDGET / 10_000).toLocaleString('ko-KR')}만 원`;
