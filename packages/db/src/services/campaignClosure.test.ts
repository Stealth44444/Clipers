import { describe, it, expect } from 'vitest';
import { getCampaignsToClose } from './campaignClosure';

describe('getCampaignsToClose', () => {
  it('closes a campaign whose settled amount reached the budget', () => {
    const result = getCampaignsToClose([
      { campaignId: 'c1', totalBudget: 1000, totalSettledAmount: 1000 },
    ]);
    expect(result).toEqual(['c1']);
  });

  it('closes a campaign whose settled amount exceeds the budget (rounding safety)', () => {
    const result = getCampaignsToClose([
      { campaignId: 'c1', totalBudget: 1000, totalSettledAmount: 1000.5 },
    ]);
    expect(result).toEqual(['c1']);
  });

  it('does not close a campaign still under budget', () => {
    const result = getCampaignsToClose([
      { campaignId: 'c1', totalBudget: 1000, totalSettledAmount: 999.99 },
    ]);
    expect(result).toEqual([]);
  });

  it('ignores campaigns with an invalid or non-positive budget', () => {
    const result = getCampaignsToClose([
      { campaignId: 'c1', totalBudget: 0, totalSettledAmount: 0 },
      { campaignId: 'c2', totalBudget: Number.NaN, totalSettledAmount: 100 },
      { campaignId: 'c3', totalBudget: -10, totalSettledAmount: 100 },
    ]);
    expect(result).toEqual([]);
  });

  it('returns multiple campaign ids in input order', () => {
    const result = getCampaignsToClose([
      { campaignId: 'c1', totalBudget: 100, totalSettledAmount: 50 },
      { campaignId: 'c2', totalBudget: 100, totalSettledAmount: 100 },
      { campaignId: 'c3', totalBudget: 100, totalSettledAmount: 150 },
    ]);
    expect(result).toEqual(['c2', 'c3']);
  });
});
