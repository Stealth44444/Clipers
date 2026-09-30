import { describe, it, expect } from 'vitest';
import { calculateClipAmount, calculateBudgetConsumed } from './budget';

describe('calculateClipAmount', () => {
  it('calculates CPM-based earnings for a clip', () => {
    expect(calculateClipAmount(10000, 2, 100)).toBe(20);
  });

  it('caps earnings at the per-clip cap', () => {
    expect(calculateClipAmount(1000000, 2, 100)).toBe(100);
  });
});

describe('calculateBudgetConsumed', () => {
  it('sums capped earnings across multiple clips', () => {
    const clips = [{ viewCount: 10000 }, { viewCount: 1000000 }];
    expect(calculateBudgetConsumed(clips, 2, 100)).toBe(120);
  });

  it('returns 0 for no clips', () => {
    expect(calculateBudgetConsumed([], 2, 100)).toBe(0);
  });
});
