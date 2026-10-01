import { describe, expect, it } from 'vitest';
import { CREATOR_FAQ, faqById } from './creator-faq';

describe('CREATOR_FAQ', () => {
  it('gives every question a unique id', () => {
    const ids = CREATOR_FAQ.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'what-is-clipping', 'small-channel', 'others-videos', 'fees', 'how-much', 'per-clip-max',
      'min-views', 'budget-runs-out', 'when-paid', 'platforms', 'view-check', 'rejected',
    ]);
  });

  it('looks questions up by id', () => {
    expect(faqById('fees').q).toBe('가입비나 지원 비용이 있나요?');
    expect(() => faqById('nope')).toThrow('Unknown FAQ id: nope');
  });

  it('never states the brand rate', () => {
    expect(CREATOR_FAQ.some((item) => item.a.includes('1천 회당 3,000원'))).toBe(false);
  });
});
