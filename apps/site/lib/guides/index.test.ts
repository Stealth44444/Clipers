import { describe, expect, it } from 'vitest';
import { CREATOR_FAQ } from '../creator-faq';
import { GUIDES, GUIDE_GROUPS, guideBySlug } from './index';

const text = (guide: (typeof GUIDES)[number]) =>
  [guide.title, guide.description, ...guide.answer, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])].join('\n');

describe('guides', () => {
  it('has 15 guides in four groups', () => {
    expect(GUIDES).toHaveLength(15);
    const count = (group: string) => GUIDES.filter((guide) => guide.group === group).length;
    expect([count('topic'), count('situation'), count('problem'), count('platform')]).toEqual([4, 6, 4, 1]);
    expect(GUIDE_GROUPS.map((group) => group.id)).toEqual(['topic', 'situation', 'problem', 'platform']);
  });

  it('uses unique, url-safe slugs', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('asks a question in every title and links only to real FAQs and guides', () => {
    const faqIds = new Set(CREATOR_FAQ.map((item) => item.id));
    for (const guide of GUIDES) {
      expect(guide.title.endsWith('?')).toBe(true);
      expect(guide.answer.length).toBeGreaterThanOrEqual(2);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guide.faqIds.length).toBeGreaterThanOrEqual(3);
      for (const id of guide.faqIds) expect(faqIds.has(id)).toBe(true);
      expect(guide.related).toHaveLength(3);
      for (const slug of guide.related) {
        expect(slug).not.toBe(guide.slug);
        expect(guideBySlug(slug)).toBeDefined();
      }
    }
  });

  it('never promises what we cannot keep', () => {
    const banned = ['1천 회당 3,000원', '저작권 걱정 없', '클레임 보호', '보장', '평균 수익', '월 수익'];
    for (const guide of GUIDES) for (const word of banned) expect(text(guide)).not.toContain(word);
  });
});
