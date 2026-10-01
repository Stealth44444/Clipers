import { describe, it, expect } from 'vitest';
import { platformLabel, platformLabels } from './platforms';

describe('platformLabel', () => {
  it('returns the Korean label for a known platform', () => {
    expect(platformLabel('naver_clip')).toBe('네이버 클립');
  });

  it('names Kakao by its official name', () => {
    expect(platformLabel('kakao_shorts')).toBe('카카오 숏폼');
  });

  it('falls back to the raw value for an unknown platform', () => {
    expect(platformLabel('myspace')).toBe('myspace');
  });
});

describe('platformLabels', () => {
  it('joins labels in input order', () => {
    expect(platformLabels(['tiktok', 'youtube_shorts'])).toBe('틱톡, 유튜브 쇼츠');
  });
});
