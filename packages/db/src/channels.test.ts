import { describe, expect, it } from 'vitest';
import { descriptionHasCode, newVerificationCode, parseChannelUrl } from './channels';

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
