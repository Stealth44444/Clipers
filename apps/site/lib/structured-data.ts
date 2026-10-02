import { ORGANIZATION_ID } from './company';
import type { Guide } from './guides';
import { siteUrl } from './urls';

// schema.org nodes shared by pages. No prices anywhere: the brand rate is private, and the creator rate shown next to
// it would reveal the margin.

export function brandServiceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Clipers 숏폼 클리핑 캠페인',
    serviceType: '숏폼 바이럴 마케팅',
    description: '광고주가 연 캠페인에 크리에이터가 숏폼을 올리고, 검수를 통과한 영상의 검증된 조회수만큼만 비용을 내는 서비스',
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'Country', name: 'KR' },
    audience: { '@type': 'BusinessAudience' },
    url: siteUrl('/brands'),
  };
}

export function guideListJsonLd(guides: Guide[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Clipers 가이드',
    itemListElement: guides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: siteUrl(`/guides/${guide.slug}`),
      name: guide.title,
    })),
  };
}
