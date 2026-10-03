import { describe, expect, it } from 'vitest';
import { channelPlatformOf, descriptionHasCode, newVerificationCode, parseChannelUrl } from './channels';

describe('parseChannelUrl', () => {
  it.each([
    ['https://www.youtube.com/@Clipers_KR', 'https://www.youtube.com/@clipers_kr', { handle: '@clipers_kr' }],
    ['https://m.youtube.com/@clipers_kr/shorts', 'https://www.youtube.com/@clipers_kr', { handle: '@clipers_kr' }],
    ['https://youtube.com/@%ED%81%B4%EB%A6%AC%ED%8D%BC%EC%8A%A4', 'https://www.youtube.com/@클리퍼스', { handle: '@클리퍼스' }],
    [
      'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
      'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
      { channelId: 'UCabcdefghijklmnopqrstuv' },
    ],
  ])('normalizes the YouTube channel %s', (input, url, youtube) => {
    expect(parseChannelUrl('youtube_shorts', input)).toEqual({ url, youtube });
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/c/legacyname',
    'http://www.youtube.com/@clipers_kr',
    'https://youtube.com.evil.example/@clipers_kr',
    'not a url',
  ])('rejects %s as a YouTube channel', (input) => {
    expect(parseChannelUrl('youtube_shorts', input)).toBeNull();
  });

  it('normalizes other platforms to one url per account', () => {
    expect(parseChannelUrl('tiktok', 'https://www.tiktok.com/@Clipers/?lang=ko')).toEqual({ url: 'https://tiktok.com/@clipers', youtube: null });
    expect(parseChannelUrl('x', 'https://twitter.com/Clipers')).toEqual({ url: 'https://x.com/clipers', youtube: null });
    expect(parseChannelUrl('instagram_reels', 'https://instagram.com/clipers/')).toEqual({ url: 'https://instagram.com/clipers', youtube: null });
  });

  it('keeps the path case where the platform may care', () => {
    expect(parseChannelUrl('naver_clip', 'https://clip.naver.com/Abc123')).toEqual({ url: 'https://clip.naver.com/Abc123', youtube: null });
  });

  it('rejects a url from the wrong platform or without an account path', () => {
    expect(parseChannelUrl('tiktok', 'https://instagram.com/clipers')).toBeNull();
    expect(parseChannelUrl('instagram_reels', 'https://instagram.com/')).toBeNull();
    expect(parseChannelUrl('unknown', 'https://example.com/clipers')).toBeNull();
  });
});

describe('channelPlatformOf', () => {
  it.each([
    ['https://www.youtube.com/@clipers_kr', 'youtube_shorts'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube_shorts'],
    ['https://www.tiktok.com/@clipers', 'tiktok'],
    ['https://instagram.com/clipers/', 'instagram_reels'],
    ['https://www.facebook.com/clipers', 'facebook'],
    ['https://twitter.com/Clipers', 'x'],
    ['https://x.com/clipers', 'x'],
    ['https://clip.naver.com/@clipers', 'naver_clip'],
    ['https://tv.kakao.com/channel/123', 'kakao_shorts'],
  ])('reads the platform of %s from its host, whatever the path', (input, platform) => {
    expect(channelPlatformOf(input)).toBe(platform);
  });

  it.each(['https://youtube.com.evil.example/@clipers', 'https://example.com/clipers', 'youtube.com/@clipers', 'mailto:team@tiktok.com', 'not a url', ''])(
    'has no platform for %s',
    (input) => {
      expect(channelPlatformOf(input)).toBeNull();
    }
  );

  it('names the platform every parsable account url belongs to', () => {
    for (const [platform, url] of [
      ['youtube_shorts', 'https://www.youtube.com/@clipers_kr'],
      ['tiktok', 'https://www.tiktok.com/@clipers'],
      ['naver_clip', 'https://clip.naver.com/Abc123'],
    ] as const) {
      expect(parseChannelUrl(platform, url)).not.toBeNull();
      expect(channelPlatformOf(url)).toBe(platform);
    }
  });
});

describe('newVerificationCode', () => {
  it('builds CLIPERS- plus five unambiguous characters', () => {
    expect(newVerificationCode(() => 0)).toBe('CLIPERS-AAAAA');
    expect(newVerificationCode()).toMatch(/^CLIPERS-[A-HJKMNP-Z2-9]{5}$/);
  });
});

describe('descriptionHasCode', () => {
  it('finds the code anywhere in the text, ignoring case', () => {
    expect(descriptionHasCode('채널 소개\nclipers-7k3q9 입니다', 'CLIPERS-7K3Q9')).toBe(true);
    expect(descriptionHasCode('CLIPERS-7K3Q8', 'CLIPERS-7K3Q9')).toBe(false);
    expect(descriptionHasCode(null, 'CLIPERS-7K3Q9')).toBe(false);
  });
});
