import { describe, it, expect } from 'vitest';
import { findPlatformRate } from './platformRate';

describe('findPlatformRate', () => {
  it('returns the matching platform rate', () => {
    const rates = [
      { platform: 'youtube_shorts', cpmRate: 1.5, minPayout: 15, maxPayout: 100 },
      { platform: 'tiktok', cpmRate: 1, minPayout: 10, maxPayout: 100 },
    ];
    expect(findPlatformRate(rates, 'tiktok')).toEqual({ platform: 'tiktok', cpmRate: 1, minPayout: 10, maxPayout: 100 });
  });

  it('returns null when no rate matches the platform', () => {
    const rates = [{ platform: 'youtube_shorts', cpmRate: 1.5, minPayout: 15, maxPayout: 100 }];
    expect(findPlatformRate(rates, 'tiktok')).toBeNull();
  });
});
