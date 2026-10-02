import { describe, expect, it } from 'vitest';
import { siteVerification } from './verification';

describe('siteVerification', () => {
  it('emits nothing without values', () => {
    expect(siteVerification({})).toBeUndefined();
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: '' })).toBeUndefined();
  });

  it('puts Google in its own field and Naver and Bing under other', () => {
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: 'g-token' })).toEqual({ google: 'g-token' });
    expect(siteVerification({ NAVER_SITE_VERIFICATION: 'n-token', BING_SITE_VERIFICATION: 'b-token' })).toEqual({
      other: { 'naver-site-verification': 'n-token', 'msvalidate.01': 'b-token' },
    });
  });
});
