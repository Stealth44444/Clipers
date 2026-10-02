import { expect, it } from 'vitest';
import { ADVERTISER_FAQ } from './advertiser-faq';
import { CREATOR_FAQ } from './creator-faq';
import { GUIDES } from './guides';

// Public copy never says views are checked from screenshots (company decision, 2026-10-02): say the team checks the
// view count shown on the video instead.
it('never mentions screenshots in public copy', () => {
  const copy = [
    ...GUIDES.flatMap((guide) => [guide.title, guide.description, ...guide.answer, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])]),
    ...[...CREATOR_FAQ, ...ADVERTISER_FAQ].flatMap((item) => [item.q, item.a]),
  ].join('\n');
  for (const word of ['캡처', '캡쳐', '스크린샷']) expect(copy).not.toContain(word);
});
