import { describe, expect, it } from 'vitest';
import { DAILY_CLIP_LIMIT_OPTIONS, dailyClipLimitLabel, kstDayStart, submissionsLeftToday } from './dailyClipLimit';

describe('daily clip limit', () => {
  it('offers 1, 2, 3, 5 or no limit', () => {
    expect(DAILY_CLIP_LIMIT_OPTIONS).toEqual([1, 2, 3, 5]);
    expect(dailyClipLimitLabel(3)).toBe('하루 3개');
    expect(dailyClipLimitLabel(null)).toBe('제한 없음');
  });

  it('starts the day at midnight Korea time', () => {
    expect(kstDayStart(new Date('2026-10-02T14:59:00.000Z')).toISOString()).toBe('2026-10-01T15:00:00.000Z');
    expect(kstDayStart(new Date('2026-10-02T15:00:00.000Z')).toISOString()).toBe('2026-10-02T15:00:00.000Z');
  });

  it('counts today’s pending and approved clips, not rejected or yesterday’s', () => {
    const now = new Date('2026-10-02T05:00:00.000Z');
    const clips = [
      { status: 'pending_review', submitted_at: '2026-10-02T01:00:00.000Z' },
      { status: 'approved', submitted_at: '2026-10-01T16:00:00.000Z' },
      { status: 'rejected', submitted_at: '2026-10-02T02:00:00.000Z' },
      { status: 'approved', submitted_at: '2026-10-01T14:00:00.000Z' },
    ];
    expect(submissionsLeftToday(3, clips, now)).toBe(1);
    expect(submissionsLeftToday(2, clips, now)).toBe(0);
    expect(submissionsLeftToday(null, clips, now)).toBeNull();
  });
});
