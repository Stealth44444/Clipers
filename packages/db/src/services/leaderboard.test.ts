import { describe, it, expect } from 'vitest';
import { rankCreatorEarnings } from './leaderboard';

describe('rankCreatorEarnings', () => {
  it('ranks creators by total settlement amount, descending', () => {
    const result = rankCreatorEarnings([
      { creatorId: 'c1', creatorName: 'Alice', amount: 100 },
      { creatorId: 'c2', creatorName: 'Bob', amount: 300 },
      { creatorId: 'c1', creatorName: 'Alice', amount: 50 },
    ]);

    expect(result).toEqual([
      { rank: 1, creatorId: 'c2', creatorName: 'Bob', totalAmount: 300 },
      { rank: 2, creatorId: 'c1', creatorName: 'Alice', totalAmount: 150 },
    ]);
  });

  it('returns an empty array for no settlements', () => {
    expect(rankCreatorEarnings([])).toEqual([]);
  });
});
