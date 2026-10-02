import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/json-ld';
import LandingChrome from '@/components/landing-chrome';
import { GUIDES, GUIDE_AUDIENCES, GUIDE_GROUPS } from '@/lib/guides';
import { guideListJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Clipers 가이드 — 숏폼으로 조회수만큼 받는 법',
  description: '크리에이터의 숏폼 부업과 수익, 광고주의 숏폼 바이럴과 클리핑 마케팅까지 자주 묻는 질문에 답했어요.',
  alternates: { canonical: '/guides', types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Clipers 가이드' }] } },
};

export default function GuidesPage() {
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <div className="cl-guides">
        <JsonLd data={guideListJsonLd(GUIDES)} />
        <h1>Clipers 가이드</h1>
        <p className="cl-guides__lead">크리에이터와 광고주가 자주 묻는 질문에 답했어요.</p>
        {/* Jump links instead of tabs: every guide stays in the page for people and crawlers alike. */}
        <nav aria-label="대상별 가이드" className="cl-guides__jump">
          {GUIDE_AUDIENCES.map((audience) => (
            <a href={`#${audience.id}`} key={audience.id}>
              <strong>{audience.label} 가이드</strong>
              <span>{GUIDES.filter((guide) => guide.audience === audience.id).length}개</span>
            </a>
          ))}
        </nav>
        {GUIDE_AUDIENCES.map((audience) => (
          <div className="cl-guides__audience" id={audience.id} key={audience.id}>
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
