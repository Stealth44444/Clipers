import { describe, expect, it } from 'vitest';
import { CREATOR_FAQ, faqById } from './creator-faq';

describe('CREATOR_FAQ', () => {
  it('gives every question a unique id', () => {
    const ids = CREATOR_FAQ.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'what-is-clipping', 'small-channel', 'others-videos', 'fees', 'how-much', 'per-clip-max', 'daily-limit',
      'min-views', 'budget-runs-out', 'when-paid', 'platforms', 'which-videos', 'view-check', 'rejected',
    ]);
  });

  it('looks questions up by id', () => {
    expect(faqById('fees').q).toBe('가입비나 지원 비용이 있나요?');
    expect(() => faqById('nope')).toThrow('Unknown FAQ id: nope');
  });

  it('never states the brand rate or the size of the per-person cap', () => {
    expect(CREATOR_FAQ.some((item) => item.a.includes('1천 회당 3,000원'))).toBe(false);
    expect(CREATOR_FAQ.some((item) => (item.q + item.a).includes('15%'))).toBe(false);
  });
});
