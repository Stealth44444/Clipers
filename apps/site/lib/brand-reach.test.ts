import { describe, expect, it } from 'vitest';
import { PLATFORMS } from '@clipers/db';
import { hitProbability } from './views-math';
import { FEED_CLIP, FEED_VIEWS_FROM, HIT_PERCENT, HOOP_CLIPS, RANKED_CLIPS, climbViews, compactViews } from './brand-reach';

describe('reach scenes', () => {
  it('quotes the hit chance from the model', () => {
    expect(HIT_PERCENT).toBe(Math.round(hitProbability(10) * 100));
    expect(HIT_PERCENT).toBe(89);
  });

  it('uses real platforms', () => {
    const platforms = new Set<string>(PLATFORMS.map((platform) => platform.value));
    for (const clip of [FEED_CLIP, ...HOOP_CLIPS]) expect(platforms.has(clip.platform)).toBe(true);
    for (const row of RANKED_CLIPS) expect(platforms.has(row.platform)).toBe(true);
  });

  it('ranks the list by views, led by the clip the phones showed', () => {
    const views = RANKED_CLIPS.map((row) => row.views);
    expect([...views].sort((a, b) => b - a)).toEqual(views);
    const hit = HOOP_CLIPS.find((clip) => clip.hit);
    expect(hit).toBeDefined();
    expect(RANKED_CLIPS[0]).toMatchObject({ title: hit?.caption, views: hit?.views, platform: hit?.platform });
  });

  it('climbs from the start to the clip views and holds', () => {
    expect(climbViews(0)).toBe(FEED_VIEWS_FROM);
    expect(climbViews(1)).toBe(FEED_CLIP.views);
    expect(climbViews(2)).toBe(FEED_CLIP.views);
    expect(climbViews(0.5)).toBeGreaterThan(FEED_VIEWS_FROM);
    expect(climbViews(0.5)).toBeLessThan(FEED_CLIP.views);
  });

  it('writes views like the apps do', () => {
    expect(compactViews(482_000)).toBe('48.2만');
    expect(compactViews(314_000)).toBe('31.4만');
    expect(compactViews(8_400)).toBe('8,400');
  });
});
