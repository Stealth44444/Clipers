import { describe, expect, it } from 'vitest';
import { BRAND_CASES, CLIP_POSTERS, caseThumbnails } from './brand-cases';
import type { ShowcaseVideo } from './youtube-showcase';

const video = (id: string): ShowcaseVideo => ({
  id,
  campaign: '',
  channel: '',
  channelId: '',
  thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
});

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

  it('draws thumbnails from the matching showcase kind, with fitting fallback posters', () => {
    expect(BRAND_CASES.map((item) => item.showcase)).toEqual(['ugc', 'music', 'clipping']);
    expect(BRAND_CASES[0].posters[0]).toBe(CLIP_POSTERS.beauty);
    expect(BRAND_CASES[2].posters[0]).toBe(CLIP_POSTERS.drive);
  });
});

describe('caseThumbnails', () => {
  const posters = [CLIP_POSTERS.beauty, CLIP_POSTERS.pet];

  it('puts real thumbnails first and fills the rest with the case posters', () => {
    expect(caseThumbnails([video('a'), video('b')], 5, posters)).toEqual([
      'https://i.ytimg.com/vi/a/maxresdefault.jpg',
      'https://i.ytimg.com/vi/b/maxresdefault.jpg',
      CLIP_POSTERS.beauty,
      CLIP_POSTERS.pet,
      CLIP_POSTERS.beauty,
    ]);
  });

  it('uses only the case posters without videos', () => {
    expect(caseThumbnails(undefined, 3, posters)).toEqual([CLIP_POSTERS.beauty, CLIP_POSTERS.pet, CLIP_POSTERS.beauty]);
  });
});
