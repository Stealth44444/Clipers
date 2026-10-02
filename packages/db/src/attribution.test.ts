import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_MAX_LENGTH, attributionFromParams, attributionToParams, captureAttribution, withAttribution } from './attribution';

const now = new Date('2026-10-02T09:00:00.000Z');

describe('captureAttribution', () => {
  it('keeps the utm and ref query, the referrer host and the landing page', () => {
    const url = new URL('https://clipers.example/brands?utm_source=instagram&utm_medium=paid&utm_campaign=oct&ref=minji&x=1');
    expect(captureAttribution(url, 'https://www.instagram.com/p/abc', now)).toEqual({
      utm_source: 'instagram',
      utm_medium: 'paid',
      utm_campaign: 'oct',
      ref: 'minji',
      referrer_host: 'www.instagram.com',
      landing_path: '/brands',
      landed_at: '2026-10-02T09:00:00.000Z',
    });
  });

  it('leaves out a referrer from the site itself, and an empty or broken one', () => {
    const url = new URL('https://clipers.example/');
    expect(captureAttribution(url, 'https://clipers.example/guides', now).referrer_host).toBeUndefined();
    expect(captureAttribution(url, '', now).referrer_host).toBeUndefined();
    expect(captureAttribution(url, 'not a url', now).referrer_host).toBeUndefined();
  });

  it('trims and cuts every value', () => {
    const url = new URL(`https://clipers.example/?utm_source=${'x'.repeat(500)}&utm_term=%20%20`);
    const attribution = captureAttribution(url, '', now);
    expect(attribution.utm_source).toHaveLength(ATTRIBUTION_MAX_LENGTH);
    expect(attribution.utm_term).toBeUndefined();
  });
});

describe('attribution parameters', () => {
  const attribution = captureAttribution(new URL('https://clipers.example/brands?utm_source=naver'), 'https://search.naver.com/x', now);

  it('round-trips through a_* query parameters', () => {
    expect(attributionFromParams(attributionToParams(attribution))).toEqual(attribution);
  });

  it('is null without a landing page', () => {
    expect(attributionFromParams(new URLSearchParams('a_utm_source=naver'))).toBeNull();
    expect(attributionFromParams(new URLSearchParams(''))).toBeNull();
  });

  it('appends to a link without touching its own query or hash', () => {
    const href = withAttribution('http://localhost:3000/login?mode=sign-up&role=brand#top', attribution);
    const url = new URL(href);
    expect(url.searchParams.get('mode')).toBe('sign-up');
    expect(url.searchParams.get('role')).toBe('brand');
    expect(url.searchParams.get('a_utm_source')).toBe('naver');
    expect(url.searchParams.get('a_referrer_host')).toBe('search.naver.com');
    expect(url.searchParams.get('a_landing_path')).toBe('/brands');
    expect(url.hash).toBe('#top');
  });
});
