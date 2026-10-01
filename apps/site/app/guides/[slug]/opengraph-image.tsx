import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { GUIDES, guideBySlug } from '@/lib/guides';

// Share preview for each guide: the question itself on the landing's warm white, with the wordmark and a quiet
// audience label. Pretendard is bundled (assets/fonts) because the default font has no Korean glyphs.

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Clipers 가이드';

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  const [semibold, medium, wordmark] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Pretendard-SemiBold.otf')),
    readFile(join(process.cwd(), 'assets/fonts/Pretendard-Medium.otf')),
    readFile(join(process.cwd(), 'public/logo/clipers-wordmark-dark.svg')),
  ]);
  const label = guide?.audience === 'advertiser' ? 'Clipers 가이드 · 광고주' : 'Clipers 가이드 · 크리에이터';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#fffdfb',
          color: '#1f1a14',
          fontFamily: 'Pretendard',
        }}
      >
        <img alt="" height={52} src={`data:image/svg+xml;base64,${wordmark.toString('base64')}`} width={141} />
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.25, wordBreak: 'keep-all' }}>
          {guide?.title ?? 'Clipers 가이드'}
        </div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, color: '#8b8178' }}>{label}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: semibold, weight: 600, style: 'normal' },
        { name: 'Pretendard', data: medium, weight: 500, style: 'normal' },
      ],
    }
  );
}
