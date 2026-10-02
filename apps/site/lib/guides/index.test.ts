import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { INQUIRY_INDUSTRIES } from '../inquiry';
import { GUIDES, GUIDE_GROUPS, guideBySlug, guideFaqs } from './index';

const text = (guide: (typeof GUIDES)[number]) =>
  [guide.title, guide.description, ...guide.answer, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])].join('\n');
const creators = GUIDES.filter((guide) => guide.audience === 'creator');
const advertisers = GUIDES.filter((guide) => guide.audience === 'advertiser');
const count = (group: string) => GUIDES.filter((guide) => guide.group === group).length;

// Advertiser guides per group, in question-map order (awareness → platform → compare → cost → execution → terms → data).
const ADVERTISER_COUNTS: Record<string, number> = {
  pillar: 0,
  'advertiser-platform': 7,
  compare: 9,
  cost: 2,
  industry: 11,
  'advertiser-problem': 5,
  execution: 3,
  glossary: 0,
  data: 0,
};

describe('guides', () => {
  it('has 15 creator guides and the advertiser guides of the question map, in its order', () => {
    expect(creators).toHaveLength(15);
    expect([count('topic'), count('situation'), count('problem'), count('platform')]).toEqual([4, 6, 4, 1]);
    for (const [group, expected] of Object.entries(ADVERTISER_COUNTS)) expect(count(group), group).toBe(expected);
    expect(advertisers).toHaveLength(Object.values(ADVERTISER_COUNTS).reduce((sum, value) => sum + value, 0));
    expect(GUIDE_GROUPS.map((group) => `${group.audience}:${group.id}`)).toEqual([
      'creator:topic', 'creator:situation', 'creator:problem', 'creator:platform',
      ...Object.keys(ADVERTISER_COUNTS).map((group) => `advertiser:${group}`),
    ]);
  });

  it('uses unique, url-safe slugs', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('asks a question in every title and links only to real FAQs and guides', () => {
    for (const guide of GUIDES) {
      expect(guide.title.endsWith('?')).toBe(true);
      expect(guide.answer.length).toBeGreaterThanOrEqual(2);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guideFaqs(guide)).toHaveLength(guide.faqIds.length);
      expect(guide.faqIds.length).toBeGreaterThanOrEqual(3);
      expect(guide.related).toHaveLength(3);
      for (const slug of guide.related) {
        expect(slug).not.toBe(guide.slug);
        expect(guideBySlug(slug)?.audience).toBe(guide.audience);
      }
    }
  });

  it('pairs counterparts across audiences', () => {
    for (const guide of GUIDES.filter((item) => item.counterpart)) {
      const other = guideBySlug(guide.counterpart!);
      expect(other).toBeDefined();
      expect(other!.audience).not.toBe(guide.audience);
    }
    expect(GUIDES.filter((item) => item.counterpart).length).toBeGreaterThanOrEqual(9);
  });

  it('gives every industry guide a contact-form industry', () => {
    for (const guide of GUIDES.filter((item) => item.group === 'industry')) {
      expect(INQUIRY_INDUSTRIES).toContain(guide.industry);
    }
  });

  it('never promises what we cannot keep', () => {
    const banned = ['1천 회당 3,000원', '저작권 걱정 없', '클레임 보호', '보장', '평균 수익', '월 수익', '15%'];
    for (const guide of GUIDES) for (const word of banned) expect(text(guide)).not.toContain(word);
  });

  it('keeps per-view rates off the advertiser guides', () => {
    for (const guide of advertisers) {
      expect(text(guide)).not.toContain('1천 회당');
      expect(text(guide)).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
      expect(text(guide)).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
    }
  });

  it('keeps titles and descriptions unique and within search snippet lengths', () => {
    for (const guide of GUIDES) {
      expect(`${guide.title} — Clipers`.length).toBeLessThanOrEqual(60);
      expect(guide.description.length).toBeGreaterThanOrEqual(60);
      expect(guide.description.length).toBeLessThanOrEqual(160);
    }
    expect(new Set(GUIDES.map((guide) => guide.title)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((guide) => guide.description)).size).toBe(GUIDES.length);
  });

  it('records when every guide was last fact-checked', () => {
    for (const guide of GUIDES) expect(guide.reviewed, guide.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('backs comparisons, data and named claims with dated https sources', () => {
    for (const guide of GUIDES) {
      const sources = guide.sources ?? [];
      for (const source of sources) {
        expect(source.url.startsWith('https://'), source.url).toBe(true);
        expect(source.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (guide.group === 'compare' || guide.group === 'data') expect(sources.length, guide.slug).toBeGreaterThan(0);
      for (const claim of guide.claims ?? []) expect(sources[claim.source], `${guide.slug}: ${claim.text}`).toBeDefined();
      for (const row of guide.rows ?? []) expect(sources[row.source], `${guide.slug}: ${row.label}`).toBeDefined();
      if (guide.claims?.length) expect(typeof guide.legalReviewed, guide.slug).toBe('boolean');
      if (guide.group === 'glossary') expect(guide.terms?.length ?? 0).toBeGreaterThanOrEqual(10);
    }
  });

  it('compares by structure, never by judgment, and keeps named claims flagged for legal review', () => {
    const judgments = ['저렴', '비싸', '느리', '더 낫', '최고', '최악', '압도'];
    for (const guide of GUIDES.filter((item) => item.group === 'compare')) {
      const body = [text(guide), ...(guide.claims ?? []).map((claim) => claim.text)].join('\n');
      for (const word of judgments) expect(body, `${guide.slug}: ${word}`).not.toContain(word);
    }
    expect(GUIDES.filter((guide) => guide.claims?.length).length).toBe(ADVERTISER_COUNTS.compare > 0 ? 6 : 0);
  });

  it('links only to pages that exist', () => {
    const routes = new Set(['/', '/brands', '/discover', '/guides', '/contact', '/about']);
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        for (const link of section.links ?? []) {
          if (link.href.startsWith('https://')) continue;
          const pathname = link.href.split(/[?#]/)[0];
          if (pathname.startsWith('/guides/')) expect(guideBySlug(pathname.slice('/guides/'.length))).toBeDefined();
          else expect(routes.has(pathname)).toBe(true);
        }
      }
    }
  });
});
