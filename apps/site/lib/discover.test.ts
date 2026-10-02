import { describe, expect, it } from 'vitest';
import { discoverUrl } from './discover';

describe('discoverUrl', () => {
  it('is the bare page without filters', () => {
    expect(discoverUrl()).toBe('/discover');
    expect(discoverUrl({ group: null, type: '', q: '' })).toBe('/discover');
  });

  it('keeps every filter in a fixed order', () => {
    expect(discoverUrl({ q: '여행', platform: 'tiktok', type: 'clipping', group: 'lifestyle' })).toBe(
      '/discover?group=lifestyle&type=clipping&platform=tiktok&q=%EC%97%AC%ED%96%89'
    );
  });
});
