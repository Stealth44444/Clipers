import { describe, expect, it } from 'vitest';
import { isCanonicalHost } from './canonical-host';

const SITE = 'https://clipers.co.kr/';

describe('isCanonicalHost', () => {
  it('accepts the public host in any case, with or without a port', () => {
    expect(isCanonicalHost('clipers.co.kr', SITE)).toBe(true);
    expect(isCanonicalHost('Clipers.co.kr', SITE)).toBe(true);
    expect(isCanonicalHost('clipers.co.kr:443', SITE)).toBe(true);
  });

  it('rejects vercel.app and preview hosts', () => {
    expect(isCanonicalHost('clipers-site.vercel.app', SITE)).toBe(false);
    expect(isCanonicalHost('clipers-site-abc123-team.vercel.app', SITE)).toBe(false);
    expect(isCanonicalHost('www.clipers.co.kr', SITE)).toBe(false);
  });

  it('lets local development through', () => {
    expect(isCanonicalHost('localhost:3001', SITE)).toBe(true);
    expect(isCanonicalHost('127.0.0.1:3001', SITE)).toBe(true);
  });

  it('treats a missing host header as canonical', () => {
    expect(isCanonicalHost(null, SITE)).toBe(true);
  });
});
