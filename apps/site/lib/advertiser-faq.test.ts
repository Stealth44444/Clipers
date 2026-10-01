import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { ADVERTISER_FAQ, advertiserFaqById } from './advertiser-faq';

describe('ADVERTISER_FAQ', () => {
  it('has twelve questions with unique ids', () => {
    const ids = ADVERTISER_FAQ.map((item) => item.id);
    expect(ids).toEqual([
      'min-budget', 'cost', 'expected-views', 'clip-cap', 'budget-exhausted', 'leftover',
      'start-time', 'review-time', 'creators', 'view-verification', 'platforms', 'music',
    ]);
  });

  it('looks questions up by id', () => {
    expect(advertiserFaqById('min-budget').a).toBe('캠페인은 100만 원부터 열 수 있어요. 금액은 부가세 별도이고, 상한은 없어요.');
    expect(advertiserFaqById('review-time').a).toContain('24시간이나 48시간');
    expect(() => advertiserFaqById('nope')).toThrow('Unknown advertiser FAQ id: nope');
  });

  it('never states a per-view rate', () => {
    const text = ADVERTISER_FAQ.map((item) => item.q + item.a).join('\n');
    expect(text).not.toContain('1천 회당');
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
  });
});
