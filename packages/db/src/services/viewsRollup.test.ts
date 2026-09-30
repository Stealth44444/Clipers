import { describe, it, expect } from 'vitest';
import { rollupDailyViews } from './viewsRollup';

describe('rollupDailyViews', () => {
  it('carries forward the last known view count per clip across days', () => {
    const result = rollupDailyViews([
      {
        clipId: 'clip-1',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 100 },
          { capturedAt: '2026-01-03T00:00:00Z', viewCount: 300 },
        ],
      },
      {
        clipId: 'clip-2',
        snapshots: [{ capturedAt: '2026-01-02T00:00:00Z', viewCount: 50 }],
      },
    ]);

    expect(result).toEqual([
      { date: '2026-01-01', totalViews: 100 },
      { date: '2026-01-02', totalViews: 150 },
      { date: '2026-01-03', totalViews: 350 },
    ]);
  });

  it('returns an empty array when there are no snapshots', () => {
    expect(rollupDailyViews([])).toEqual([]);
  });

  it('ignores invalid snapshot entries', () => {
    const result = rollupDailyViews([
      {
        clipId: 'clip-1',
        snapshots: [
          { capturedAt: 'not-a-date', viewCount: 100 },
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10 },
        ],
      },
    ]);
    expect(result).toEqual([{ date: '2026-01-01', totalViews: 10 }]);
  });
});
