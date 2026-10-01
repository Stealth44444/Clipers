import { describe, expect, it } from 'vitest';
import { MIN_VIEWS, RATE, REVIEW_HOURS, WITHDRAW_FROM, earnings, earningsFor } from './facts';

describe('guide facts', () => {
  it('words the public creator policy', () => {
    expect(RATE).toBe('800원');
    expect(MIN_VIEWS).toBe('1,000회');
    expect(REVIEW_HOURS).toBe('48시간');
    expect(WITHDRAW_FROM).toBe('3,000원');
  });

  it('pays nothing below the minimum and the creator rate above it', () => {
    expect(earningsFor(999)).toBe(0);
    expect(earningsFor(1_000)).toBe(800);
    expect(earningsFor(100_000)).toBe(80_000);
    expect(earningsFor(1_000_000)).toBe(800_000);
    expect(earnings(100_000)).toBe('80,000원');
  });
});
