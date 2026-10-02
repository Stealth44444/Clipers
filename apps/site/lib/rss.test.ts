import { describe, expect, it } from 'vitest';
import { GUIDES } from './guides';
import type { Guide } from './guides';
import { guidesRss } from './rss';

const url = (path: string) => `https://clipers.co.kr${path}`;

describe('guidesRss', () => {
  it('is an RSS 2.0 channel with one item per guide', () => {
    const xml = guidesRss(GUIDES, url);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml.match(/<item>/g)).toHaveLength(GUIDES.length);
    for (const guide of GUIDES) expect(xml).toContain(`<link>${url(`/guides/${guide.slug}`)}</link>`);
  });

  it('puts the newest guide first and escapes markup', () => {
    const base = GUIDES[0];
    const older: Guide = { ...base, slug: 'older', title: 'A & B <old>', updated: '2026-01-01' };
    const newer: Guide = { ...base, slug: 'newer', title: 'Newer', updated: '2026-09-01' };
    const xml = guidesRss([older, newer], url);
    expect(xml.indexOf('/guides/newer')).toBeLessThan(xml.indexOf('/guides/older'));
    expect(xml).toContain('<title>A &amp; B &lt;old&gt;</title>');
    expect(xml).toContain('<pubDate>Mon, 31 Aug 2026 15:00:00 GMT</pubDate>');
  });
});
