import { describe, expect, it } from 'vitest';
import { KEY_PATTERN, indexNowBody, sitemapUrls } from './indexnow.mjs';

describe('IndexNow', () => {
  it('reads every <loc> from a sitemap', () => {
    const xml = '<urlset><url><loc>https://clipers.co.kr/</loc></url><url><loc> https://clipers.co.kr/guides </loc></url></urlset>';
    expect(sitemapUrls(xml)).toEqual(['https://clipers.co.kr/', 'https://clipers.co.kr/guides']);
  });

  it('builds a body for this host only, with the key file location', () => {
    const body = indexNowBody('https://clipers.co.kr', 'abcd1234abcd1234', [
      'https://clipers.co.kr/guides',
      'https://elsewhere.example/page',
    ]);
    expect(body).toEqual({
      host: 'clipers.co.kr',
      key: 'abcd1234abcd1234',
      keyLocation: 'https://clipers.co.kr/indexnow.txt',
      urlList: ['https://clipers.co.kr/guides'],
    });
  });

  it('accepts only protocol-valid keys', () => {
    expect(KEY_PATTERN.test('abcd1234abcd1234')).toBe(true);
    expect(KEY_PATTERN.test('short')).toBe(false);
    expect(KEY_PATTERN.test('has space in it!')).toBe(false);
  });
});
