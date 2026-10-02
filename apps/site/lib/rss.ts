import type { Guide } from './guides';

// RSS 2.0 feed of the guides, newest first. Naver Search Advisor takes feeds as one of its collection hints.

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Guide dates are Korean calendar days (YYYY-MM-DD).
const rssDate = (day: string) => new Date(`${day}T00:00:00+09:00`).toUTCString();

export function guidesRss(guides: Guide[], siteUrl: (path: string) => string): string {
  const sorted = [...guides].sort((left, right) => right.updated.localeCompare(left.updated) || left.slug.localeCompare(right.slug));
  const items = sorted.map((guide) => {
    const link = siteUrl(`/guides/${guide.slug}`);
    return [
      '<item>',
      `<title>${escapeXml(guide.title)}</title>`,
      `<link>${link}</link>`,
      `<guid isPermaLink="true">${link}</guid>`,
      `<description>${escapeXml(guide.description)}</description>`,
      `<pubDate>${rssDate(guide.updated)}</pubDate>`,
      '</item>',
    ].join('');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>Clipers 가이드</title>',
    `<link>${siteUrl('/guides')}</link>`,
    '<description>숏폼 캠페인을 여는 광고주와 참여하는 크리에이터가 자주 묻는 질문에 답해요.</description>',
    '<language>ko</language>',
    sorted[0] ? `<lastBuildDate>${rssDate(sorted[0].updated)}</lastBuildDate>` : '',
    ...items,
    '</channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
