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

  it('draws thumbnails from the matching showcase kind', () => {
    expect(BRAND_CASES.map((item) => item.showcase)).toEqual(['ugc', 'music', 'clipping']);
  });
});

describe('caseThumbnails', () => {
  it('puts real thumbnails first and fills the rest with clip posters', () => {
    expect(caseThumbnails([video('a'), video('b')], 5, 0)).toEqual([
      'https://i.ytimg.com/vi/a/maxresdefault.jpg',
      'https://i.ytimg.com/vi/b/maxresdefault.jpg',
      CLIP_POSTERS[0],
      CLIP_POSTERS[1],
      CLIP_POSTERS[2],
    ]);
  });

  it('uses posters only without videos, shifted per case', () => {
    expect(caseThumbnails(undefined, 5, 1)).toEqual([CLIP_POSTERS[1], CLIP_POSTERS[2], CLIP_POSTERS[3], CLIP_POSTERS[0], CLIP_POSTERS[1]]);
  });
});
