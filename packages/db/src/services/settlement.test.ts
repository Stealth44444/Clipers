import { describe, expect, it } from 'vitest';
import {
  calculateWeeklySettlementDrafts,
  getPreviousWeekPeriod,
  type WeeklySettlementInput,
} from './settlement';

const PERIOD = getPreviousWeekPeriod(new Date('2026-09-30T03:00:00.000Z'));

function createInput(overrides: Partial<WeeklySettlementInput> = {}): WeeklySettlementInput {
  return {
    clipId: 'clip-1',
    campaignId: 'campaign-1',
    creatorId: 'creator-1',
    reviewedAt: '2026-08-01T00:00:00.000Z',
    cpmRate: 100,
    perClipCap: 500,
    campaignBudget: 1000,
    previouslySettledClipAmount: 0,
    previouslySettledCampaignAmount: 0,
    snapshots: [
      { capturedAt: '2026-09-20T14:00:00.000Z', viewCount: 1000 },
      { capturedAt: '2026-09-23T00:00:00.000Z', viewCount: 1500 },
      { capturedAt: '2026-09-27T14:00:00.000Z', viewCount: 3000 },
      { capturedAt: '2026-09-27T16:00:00.000Z', viewCount: 9000 },
    ],
    ...overrides,
  };
}

describe('getPreviousWeekPeriod', () => {
  it('returns the previous completed Monday-to-Monday week in Korea time', () => {
    expect(PERIOD.period).toBe('2026-09-21');
    expect(PERIOD.startAt.toISOString()).toBe('2026-09-20T15:00:00.000Z');
    expect(PERIOD.endAt.toISOString()).toBe('2026-09-27T15:00:00.000Z');
  });
});

describe('calculateWeeklySettlementDrafts', () => {
  it('pays only verified view growth captured during the period', () => {
    expect(calculateWeeklySettlementDrafts([createInput()], PERIOD)).toEqual([
      {
        clipId: 'clip-1',
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        period: '2026-09-21',
        verifiedViews: 2000,
        amount: 200,
      },
    ]);
  });

  it('uses zero opening views for a clip approved during the period', () => {
    const input = createInput({
      reviewedAt: '2026-09-22T00:00:00.000Z',
      snapshots: [{ capturedAt: '2026-09-23T00:00:00.000Z', viewCount: 1500 }],
    });

    expect(calculateWeeklySettlementDrafts([input], PERIOD)[0]).toMatchObject({
      verifiedViews: 1500,
      amount: 150,
    });
  });

  it('skips older clips without an opening snapshot', () => {
    const input = createInput({
      snapshots: [{ capturedAt: '2026-09-23T00:00:00.000Z', viewCount: 1500 }],
    });

    expect(calculateWeeklySettlementDrafts([input], PERIOD)).toEqual([]);
  });

  it('does not pay negative view changes and applies the remaining clip cap', () => {
    const decreased = createInput({
      snapshots: [
        { capturedAt: '2026-09-20T14:00:00.000Z', viewCount: 2000 },
        { capturedAt: '2026-09-23T00:00:00.000Z', viewCount: 1500 },
      ],
    });
    const capped = createInput({ previouslySettledClipAmount: 450 });

    expect(calculateWeeklySettlementDrafts([decreased], PERIOD)).toEqual([]);
    expect(calculateWeeklySettlementDrafts([capped], PERIOD)[0].amount).toBe(50);
  });

  it('allocates remaining campaign budget in stable clip-id order', () => {
    const later = createInput({ clipId: 'clip-b' });
    const earlier = createInput({ clipId: 'clip-a', campaignBudget: 250 });

    expect(calculateWeeklySettlementDrafts([later, earlier], PERIOD)).toEqual([
      expect.objectContaining({ clipId: 'clip-a', amount: 200 }),
      expect.objectContaining({ clipId: 'clip-b', amount: 50 }),
    ]);
  });
});