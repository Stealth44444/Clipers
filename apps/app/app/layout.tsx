import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clipers App',
  description: '브랜드·크리에이터·운영자용 Clipers 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
