import type { Metadata } from 'next';
import JsonLd from '@/components/json-ld';
import { siteUrl } from '@/lib/urls';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl('/')),
  title: { default: 'Clipers — 조회수로 정산받는 숏폼 캠페인 플랫폼', template: '%s' },
  description:
    '브랜드는 예산을 걸고, 크리에이터는 숏폼을 올리고, 검증된 조회수만큼 정산되는 클리핑 캠페인 플랫폼. 유튜브 쇼츠·틱톡·릴스 등 국내 숏폼 플랫폼 지원.',
  applicationName: 'Clipers',
  openGraph: { type: 'website', siteName: 'Clipers', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl('/')}#organization`,
      name: 'Clipers',
      url: siteUrl('/'),
      logo: siteUrl('/logo/clipers-mark.svg'),
      description: '검증된 조회수 기반으로 정산하는 국내 숏폼 클리핑 캠페인 플랫폼',
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl('/')}#website`,
      name: 'Clipers',
      url: siteUrl('/'),
      inLanguage: 'ko-KR',
      publisher: { '@id': `${siteUrl('/')}#organization` },
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
      <head>
        <link crossOrigin="anonymous" href="https://cdn.jsdelivr.net" rel="preconnect" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <JsonLd data={ORGANIZATION} />
      </body>
    </html>
  );
}
