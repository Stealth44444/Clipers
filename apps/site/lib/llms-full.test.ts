import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { GUIDES, guideFaqs } from './guides';
import { guidesFullText } from './llms-full';

const url = (path: string) => `https://clipers.co.kr${path}`;

describe('guidesFullText', () => {
  it('carries every guide with its address, answer, sections and FAQ', () => {
    const text = guidesFullText(GUIDES, url);
    for (const guide of GUIDES) {
      expect(text).toContain(`## ${guide.title}`);
      expect(text).toContain(url(`/guides/${guide.slug}`));
      expect(text).toContain(guide.answer[0]);
      expect(text).toContain(`### ${guide.sections[0].heading}`);
      expect(text).toContain(guideFaqs(guide)[0].q);
    }
  });

  it('carries glossary terms, named claims, data rows and sources', () => {
    const text = guidesFullText(GUIDES, url);
    for (const guide of GUIDES) {
      for (const term of guide.terms ?? []) expect(text).toContain(`**${term.term}**: ${term.definition}`);
      for (const claim of guide.claims ?? []) expect(text).toContain(claim.text);
      for (const row of guide.rows ?? []) expect(text).toContain(row.value);
      for (const source of guide.sources ?? []) expect(text).toContain(source.url);
    }
  });

  it('keeps per-view rates out of the advertiser guides', () => {
    for (const guide of GUIDES.filter((item) => item.audience === 'advertiser')) {
      const text = guidesFullText([guide], url);
      expect(text).not.toContain('1천 회당');
      expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
      expect(text).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
    }
  });
});
