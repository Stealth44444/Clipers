import type { Metadata } from 'next';
// Pretendard ships with the app (split into unicode-range subsets, font-display: swap) instead of a render-blocking
// stylesheet from a CDN.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Clipers',
  description: '브랜드·크리에이터·운영자용 Clipers 워크스페이스',
  // Signed-in workspace: keep it out of search and answer engines (the public site is apps/site).
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
