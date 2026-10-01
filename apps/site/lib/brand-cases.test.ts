import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_CASES, CASE_CLIPS, clipMedia } from './brand-cases';

const publicDir = path.resolve(__dirname, '../public');

describe('BRAND_CASES', () => {
  it('has the three cases in order with five clips each', () => {
    expect(BRAND_CASES.map((item) => item.id)).toEqual(['launch', 'music', 'channel']);
    for (const item of BRAND_CASES) expect(item.clips).toHaveLength(5);
  });

  it('has counts that add up and a clip waiting for review', () => {
    for (const item of BRAND_CASES) {
      expect(item.counts.pending + item.counts.approved).toBe(item.counts.all);
      expect(item.clips.some((clip) => clip.pending)).toBe(true);
    }
  });

  it('plays every clip exactly once across the cases', () => {
    const used = BRAND_CASES.flatMap((item) => item.clips.map((clip) => clip.clip));
    expect([...used].sort()).toEqual([...CASE_CLIPS].sort());
  });

  it('gives the launch case the fashion and car clips and the channel case the game highlights', () => {
    expect(BRAND_CASES[0].clips.every((clip) => /^(fashion|car)-/.test(clip.clip))).toBe(true);
    expect(BRAND_CASES[2].clips.every((clip) => clip.clip.startsWith('hoops'))).toBe(true);
  });
});

describe('clipMedia', () => {
  it('points at a video and poster that ship with the site', () => {
    for (const clip of CASE_CLIPS) {
      const { src, poster } = clipMedia(clip);
      expect(existsSync(path.join(publicDir, src))).toBe(true);
      expect(existsSync(path.join(publicDir, poster))).toBe(true);
    }
  });
});
