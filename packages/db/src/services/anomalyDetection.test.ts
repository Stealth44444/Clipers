import { describe, it, expect } from 'vitest';
import { getViewSpikeFlags } from './anomalyDetection';

describe('getViewSpikeFlags', () => {
  it('flags a clip whose views tripled within the default 1 hour window', () => {
    const flags = getViewSpikeFlags([
      {
        clipId: 'clip-1',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10_000 },
          { capturedAt: '2026-01-01T00:30:00Z', viewCount: 35_000 },
        ],
      },
    ]);

    expect(flags).toEqual([
      { clipId: 'clip-1', previousViewCount: 10_000, currentViewCount: 35_000, hoursBetween: 0.5 },
    ]);
  });

  it('flags a large absolute jump even below the multiplier for a small baseline', () => {
    const flags = getViewSpikeFlags([
      {
        clipId: 'clip-2',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 100 },
          { capturedAt: '2026-01-01T00:10:00Z', viewCount: 60_000 },
        ],
      },
    ]);

    expect(flags).toHaveLength(1);
    expect(flags[0].clipId).toBe('clip-2');
  });

  it('does not flag steady, proportionate growth', () => {
    const flags = getViewSpikeFlags([
      {
        clipId: 'clip-3',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10_000 },
          { capturedAt: '2026-01-01T01:00:00Z', viewCount: 12_000 },
        ],
      },
    ]);

    expect(flags).toEqual([]);
  });

  it('ignores jumps spread across longer than the window', () => {
    const flags = getViewSpikeFlags([
      {
        clipId: 'clip-4',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10_000 },
          { capturedAt: '2026-01-02T00:00:00Z', viewCount: 100_000 },
        ],
      },
    ]);

    expect(flags).toEqual([]);
  });

  it('ignores invalid or decreasing snapshots', () => {
    const flags = getViewSpikeFlags([
      {
        clipId: 'clip-5',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 50_000 },
          { capturedAt: 'not-a-date', viewCount: 10 },
          { capturedAt: '2026-01-01T00:20:00Z', viewCount: 10_000 },
        ],
      },
    ]);

    expect(flags).toEqual([]);
  });

  it('respects custom thresholds', () => {
    const flags = getViewSpikeFlags(
      [
        {
          clipId: 'clip-6',
          snapshots: [
            { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10_000 },
            { capturedAt: '2026-01-01T00:30:00Z', viewCount: 15_000 },
          ],
        },
      ],
      { spikeMultiplier: 1.4, minAbsoluteJump: 1_000_000 }
    );

    expect(flags).toHaveLength(1);
  });
});
