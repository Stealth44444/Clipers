import type { Metadata } from 'next';
import Link from 'next/link';
import LandingChrome from '@/components/landing-chrome';
import { GUIDES, GUIDE_AUDIENCES, GUIDE_GROUPS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Clipers 가이드 — 숏폼으로 조회수만큼 받는 법',
  description: '크리에이터의 숏폼 부업과 수익, 광고주의 숏폼 바이럴과 클리핑 마케팅까지 자주 묻는 질문에 답했어요.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <div className="cl-guides">
        <h1>Clipers 가이드</h1>
        <p className="cl-guides__lead">크리에이터와 광고주가 자주 묻는 질문에 답했어요.</p>
        {GUIDE_AUDIENCES.map((audience) => (
          <div className="cl-guides__audience" key={audience.id}>
            <h2>{audience.label}</h2>
            {GUIDE_GROUPS.filter((group) => group.audience === audience.id).map((group) => (
              <section className="cl-guides__group" key={group.id}>
                <h3>{group.label}</h3>
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
        ))}
      </div>
    </LandingChrome>
  );
}
