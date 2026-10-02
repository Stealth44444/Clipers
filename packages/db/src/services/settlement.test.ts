import { describe, expect, it } from 'vitest';
import {
  calculateWeeklySettlementDrafts,
  getPreviousWeekPeriod,
  settlementPeriodFor,
  settlementPeriodsToRun,
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
    creatorCap: 100_000,
    previouslySettledCreatorAmount: 0,
    // A clip that has been paid before, so only this week's growth is due.
    previouslySettledClipAmount: 100,
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

describe('settlementPeriodFor', () => {
  it('builds the same week getPreviousWeekPeriod does', () => {
    expect(settlementPeriodFor('2026-09-21')).toEqual(PERIOD);
  });
});

describe('settlementPeriodsToRun', () => {
  const now = new Date('2026-10-14T03:00:00.000Z'); // Wednesday; last completed week starts 2026-10-05

  it('runs only last week when nothing has been settled yet', () => {
    expect(settlementPeriodsToRun(null, now).map((period) => period.period)).toEqual(['2026-10-05']);
  });

  it('catches up every missed week, oldest first', () => {
    expect(settlementPeriodsToRun('2026-09-21', now).map((period) => period.period)).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('has nothing to do once last week is settled', () => {
    expect(settlementPeriodsToRun('2026-10-05', now)).toEqual([]);
  });

  it('works through a long gap twelve weeks at a time, oldest first', () => {
    const periods = settlementPeriodsToRun('2026-01-05', now);
    expect(periods).toHaveLength(12);
    expect(periods[0].period).toBe('2026-01-12');
  });
});

describe('calculateWeeklySettlementDrafts', () => {
  it('stops a creator at their campaign cap across clips, leaving other creators alone', () => {
    // Each clip earns 200 this week. creator-1 has 450 - 100 = 350 left: clip a takes 200, clip b the last 150.
    const drafts = calculateWeeklySettlementDrafts(
      [
        createInput({ clipId: 'a', creatorCap: 450, previouslySettledCreatorAmount: 100 }),
        createInput({ clipId: 'b', creatorCap: 450, previouslySettledCreatorAmount: 100 }),
        createInput({ clipId: 'c', creatorId: 'creator-2', creatorCap: 450 }),
      ],
      PERIOD
    );
    expect(drafts.map((draft) => [draft.clipId, draft.amount])).toEqual([
      ['a', 200],
      ['b', 150],
      ['c', 200],
    ]);
  });

  it('pays nothing more once a creator has reached the cap', () => {
    expect(calculateWeeklySettlementDrafts([createInput({ creatorCap: 500, previouslySettledCreatorAmount: 500 })], PERIOD)).toEqual([]);
  });

  it('pays only what is left under the creator cap', () => {
    const [draft] = calculateWeeklySettlementDrafts([createInput({ creatorCap: 160, previouslySettledCreatorAmount: 100 })], PERIOD);
    expect(draft.amount).toBe(60);
  });

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

  it('does not pay a never-paid clip until it reaches 1,000 verified views', () => {
    const input = createInput({
      previouslySettledClipAmount: 0,
      reviewedAt: '2026-09-22T00:00:00.000Z',
      snapshots: [{ capturedAt: '2026-09-23T00:00:00.000Z', viewCount: 800 }],
    });
    expect(calculateWeeklySettlementDrafts([input], PERIOD)).toEqual([]);
  });

  it('carries earlier unpaid views over once a clip crosses 1,000 views', () => {
    const input = createInput({
      previouslySettledClipAmount: 0,
      snapshots: [
        { capturedAt: '2026-09-20T14:00:00.000Z', viewCount: 800 },
        { capturedAt: '2026-09-25T00:00:00.000Z', viewCount: 1500 },
      ],
    });
    expect(calculateWeeklySettlementDrafts([input], PERIOD)[0]).toMatchObject({ verifiedViews: 1500, amount: 150 });
  });

  it('keeps paying weekly growth below 1,000 views once a clip has been paid', () => {
    const input = createInput({
      snapshots: [
        { capturedAt: '2026-09-20T14:00:00.000Z', viewCount: 2000 },
        { capturedAt: '2026-09-25T00:00:00.000Z', viewCount: 2300 },
      ],
    });
    expect(calculateWeeklySettlementDrafts([input], PERIOD)[0]).toMatchObject({ verifiedViews: 300, amount: 30 });
  });
});
