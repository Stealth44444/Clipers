import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_CASES, CASE_CLIPS, CASE_LOOKS, clipMedia, clipSource } from './brand-cases';

const publicDir = path.resolve(__dirname, '../public');

describe('BRAND_CASES', () => {
  it('has the six cases in order with four clips each', () => {
    expect(BRAND_CASES.map((item) => item.id)).toEqual(['launch', 'app', 'music', 'film', 'tourism', 'channel']);
    for (const item of BRAND_CASES) expect(item.clips).toHaveLength(4);
  });

  it('has counts that add up and a clip waiting for review', () => {
    for (const item of BRAND_CASES) {
      expect(item.counts.pending + item.counts.approved).toBe(item.counts.all);
      expect(item.clips.some((clip) => clip.pending)).toBe(true);
    }
  });

  it('uses every clip, and never the same clip twice in one case', () => {
    const used = new Set(BRAND_CASES.flatMap((item) => item.clips.map((clip) => clip.clip)));
    expect([...used].sort()).toEqual([...CASE_CLIPS].sort());
    for (const item of BRAND_CASES) expect(new Set(item.clips.map((clip) => clip.clip)).size).toBe(item.clips.length);
  });

  it('cuts one source several ways in a clipping campaign, and mixes sources in the others', () => {
    for (const item of BRAND_CASES) {
      const sources = new Set(item.clips.map((clip) => clipSource(clip.clip)));
      if (item.kind === '클리핑 캠페인') expect(sources.size).toBe(1);
      else expect(sources.size).toBeGreaterThan(1);
    }
  });

  it('finishes the four clips of a case in four different styles, with short captions', () => {
    for (const item of BRAND_CASES) {
      expect(new Set(item.clips.map((clip) => clip.look)).size).toBe(item.clips.length);
      for (const clip of item.clips) {
        expect(CASE_LOOKS).toContain(clip.look);
        expect(clip.caption.length).toBeLessThanOrEqual(14);
      }
    }
  });

  it('keeps a creator with their clip across campaigns', () => {
    const owner = new Map<string, string>();
    for (const item of BRAND_CASES) {
      for (const clip of item.clips) {
        const seen = owner.get(clip.clip);
        if (seen) expect(clip.creator).toBe(seen);
        owner.set(clip.clip, clip.creator);
      }
    }
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
