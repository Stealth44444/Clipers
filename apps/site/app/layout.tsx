import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import AttributionCarrier from '@/components/attribution-carrier';
import JsonLd from '@/components/json-ld';
import { COMPANY, ORGANIZATION_ID } from '@/lib/company';
import { siteUrl } from '@/lib/urls';
import { siteVerification } from '@/lib/verification';
// Pretendard ships with the site (split into unicode-range subsets, font-display: swap) instead of a render-blocking
// stylesheet from a CDN, which held the first paint by about 1.2 s on mobile (2026-10-02 Lighthouse).
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl('/')),
  title: { default: 'Clipers — 조회수로 정산받는 숏폼 캠페인 플랫폼', template: '%s' },
  description:
    '크리에이터가 숏폼을 올리면 검증된 조회수만큼 Clipers가 지급하는 클리핑 캠페인 플랫폼. 유튜브 쇼츠·틱톡·릴스 등 국내 숏폼 플랫폼 지원.',
  applicationName: 'Clipers',
  openGraph: { type: 'website', siteName: 'Clipers', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  verification: siteVerification({
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    NAVER_SITE_VERIFICATION: process.env.NAVER_SITE_VERIFICATION,
    BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION,
  }),
  alternates: { types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Clipers 가이드' }] } },
};

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'Clipers',
      legalName: COMPANY.legalName,
      url: siteUrl('/'),
      ...(COMPANY.sameAs.length > 0 ? { sameAs: COMPANY.sameAs } : {}),
      logo: siteUrl('/logo/clipers-mark.svg'),
      description: '검증된 조회수 기반으로 정산하는 국내 숏폼 클리핑 캠페인 플랫폼',
      address: { '@type': 'PostalAddress', streetAddress: COMPANY.address, addressLocality: '용인시', addressRegion: '경기도', addressCountry: 'KR' },
      taxID: COMPANY.registrationNumber,
      email: COMPANY.email,
      contactPoint: { '@type': 'ContactPoint', contactType: 'sales', url: siteUrl('/contact'), availableLanguage: 'ko' },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl('/')}#website`,
      name: 'Clipers',
      url: siteUrl('/'),
      inLanguage: 'ko-KR',
      publisher: { '@id': ORGANIZATION_ID },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl('/discover')}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <JsonLd data={ORGANIZATION} />
        <Analytics />
        <AttributionCarrier />
      </body>
    </html>
  );
}
