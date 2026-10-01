import type { Metadata } from 'next';
import Link from 'next/link';
import LandingChrome from '@/components/landing-chrome';
import { GUIDES, GUIDE_GROUPS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Clipers 가이드 — 숏폼으로 조회수만큼 받는 법',
  description: '수익창출 전 쇼츠 수익, 클리핑 부업, 상황별 숏폼 부업, 플랫폼별 정산까지 크리에이터가 자주 묻는 질문에 답했어요.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <div className="cl-guides">
        <h1>Clipers 가이드</h1>
        <p className="cl-guides__lead">숏폼으로 조회수만큼 받는 방법을 상황과 고민별로 정리했어요.</p>
        {GUIDE_GROUPS.map((group) => (
          <section className="cl-guides__group" key={group.id}>
            <h2>{group.label}</h2>
            <ul>
              {GUIDES.filter((guide) => guide.group === group.id).map((guide) => (
                <li key={guide.slug}>
                  <Link href={`/guides/${guide.slug}`}>
                    <strong>{guide.title}</strong>
                    <span>{guide.answer[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LandingChrome>
  );
}
