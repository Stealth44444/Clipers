import { describe, it, expect } from 'vitest';
import { countByStatus, creatorChecklist, cumulativeCountByDay, payoutRequest, settlementPeriodLabel, summarizeEarnings, viewTrend } from './creatorStats';

// 2026-10-01 10:00 KST (Thursday). Previous settlement week starts Monday 2026-09-21.
const NOW = new Date('2026-10-01T01:00:00Z');

describe('summarizeEarnings', () => {
  it('groups gross amounts by status and settlement week', () => {
    const summary = summarizeEarnings(
      [
        { amount: 1000, status: 'paid', period: '2026-09-07' },
        { amount: '2500', status: 'requested', period: '2026-09-14' },
        { amount: 4000, status: 'pending', period: '2026-09-21' },
        { amount: 300, status: 'pending', period: '2026-08-31' },
      ],
      NOW
    );
    expect(summary.total).toBe(7800);
    expect(summary.lastWeek).toBe(4000);
    expect(summary.thisMonth).toBe(0);
    expect(summary.unpaid).toBe(6800);
    expect(summary.byStatus).toEqual({
      pending: { amount: 4300, count: 2 },
      requested: { amount: 2500, count: 1 },
      paid: { amount: 1000, count: 1 },
    });
  });

  it('counts weeks starting in the current Korean month as this month', () => {
    const lateSeptember = new Date('2026-09-29T01:00:00Z');
    expect(summarizeEarnings([{ amount: 500, status: 'paid', period: '2026-09-07' }], lateSeptember).thisMonth).toBe(500);
  });
});

describe('creatorChecklist', () => {
  it('marks steps done from real activity counts', () => {
    expect(creatorChecklist({ applications: 1, clips: 0, settlements: 0 })).toEqual([
      { id: 'account', done: true },
      { id: 'apply', done: true },
      { id: 'submit', done: false },
      { id: 'settle', done: false },
    ]);
  });
});

describe('countByStatus', () => {
  it('counts rows per requested status, including zero counts', () => {
    expect(countByStatus([{ status: 'approved' }, { status: 'approved' }, { status: 'rejected' }], ['pending_review', 'approved', 'rejected'])).toEqual({
      pending_review: 0,
      approved: 2,
      rejected: 1,
    });
  });
});

describe('settlementPeriodLabel', () => {
  it('names the week by its Monday', () => {
    expect(settlementPeriodLabel('2026-09-21')).toBe('9월 21일 주');
  });
});

describe('viewTrend', () => {
  const series = [
    {
      clipId: 'a',
      snapshots: [
        { capturedAt: '2026-09-28T03:00:00Z', viewCount: 100 },
        { capturedAt: '2026-09-30T03:00:00Z', viewCount: 250 },
      ],
    },
    { clipId: 'b', snapshots: [{ capturedAt: '2026-09-29T20:00:00Z', viewCount: 50 }] },
  ];

  it('fills every Korean calendar day with carried-forward cumulative views', () => {
    const trend = viewTrend(series, 4, NOW);
    expect(trend.map((point) => point.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
    // clip b's snapshot at 09-29 20:00Z is 09-30 05:00 KST, so it lands on 09-30.
    expect(trend.map((point) => point.cumulative)).toEqual([100, 100, 300, 300]);
    expect(trend.map((point) => point.daily)).toEqual([100, 0, 200, 0]);
  });

  it('returns zeros when there are no snapshots', () => {
    expect(viewTrend([], 2, NOW)).toEqual([
      { date: '2026-09-30', cumulative: 0, daily: 0 },
      { date: '2026-10-01', cumulative: 0, daily: 0 },
    ]);
  });
});

describe('cumulativeCountByDay', () => {
  it('counts events up to the end of each Korean calendar day', () => {
    const days = ['2026-09-29', '2026-09-30', '2026-10-01'];
    // 09-29T16:00Z is 09-30 01:00 KST.
    const events = ['2026-09-28T03:00:00Z', '2026-09-29T16:00:00Z', '2026-10-01T01:00:00Z'];
    expect(cumulativeCountByDay(events, days)).toEqual([1, 2, 3]);
  });
});

describe('payoutRequest', () => {
  it('sums pending settlements into one payout and allows a request from 3,000원', () => {
    expect(
      payoutRequest([
        { amount: 2000, status: 'pending' },
        { amount: 1200.5, status: 'pending' },
        { amount: 9000, status: 'paid' },
      ])
    ).toEqual({ amount: 3200, tax: { gross: 3200, incomeTax: 0, localTax: 0, net: 3200 }, count: 2, canRequest: true, shortfall: 0 });
  });

  it('withholds on the whole payout once it is large enough', () => {
    expect(payoutRequest([{ amount: 20_000, status: 'pending' }, { amount: 20_000, status: 'pending' }]).tax).toEqual({
      gross: 40_000,
      incomeTax: 1_200,
      localTax: 120,
      net: 38_680,
    });
  });

  it('reports how much more is needed below the minimum', () => {
    expect(payoutRequest([{ amount: 1000, status: 'pending' }])).toMatchObject({ amount: 1000, count: 1, canRequest: false, shortfall: 2000 });
  });
});
