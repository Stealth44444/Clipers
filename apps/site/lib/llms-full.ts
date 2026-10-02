import { guideFaqs } from './guides';
import type { Guide } from './guides';

// llms-full.txt: every guide in one Markdown file, so an answer engine can read the whole library without crawling.
// Same words as the pages; the rate rules of the guide tests apply here too.

const AUDIENCE = { advertiser: '광고주', creator: '크리에이터' } as const;

export function guidesFullText(guides: Guide[], siteUrl: (path: string) => string): string {
  const lines = [
    '# Clipers 가이드 전문',
    '',
    '> Clipers는 광고주가 연 숏폼 캠페인에 크리에이터가 참여하고, 검수를 통과한 영상의 검증된 조회수만큼 정산하는 국내 플랫폼입니다. 아래는 사이트의 모든 가이드 본문입니다.',
    '',
  ];
  for (const guide of guides) {
    lines.push(`## ${guide.title}`, '', `- 주소: ${siteUrl(`/guides/${guide.slug}`)}`, `- 대상: ${AUDIENCE[guide.audience]}`, `- 마지막 수정: ${guide.updated}`, '');
    lines.push(guide.answer.join(' '), '');
    for (const section of guide.sections) {
      lines.push(`### ${section.heading}`, '', ...section.paragraphs.flatMap((paragraph) => [paragraph, '']));
      if (section.list) lines.push(...section.list.map((item) => `- ${item}`), '');
    }
    lines.push('### 자주 묻는 질문', '', ...guideFaqs(guide).map((faq) => `- **${faq.q}** ${faq.a}`), '');
  }
  return lines.join('\n');
}
