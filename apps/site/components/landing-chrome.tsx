import type { ReactNode } from 'react';
import Link from 'next/link';
import { ButtonLink } from '@clipers/ui';
import JsonLd from '@/components/json-ld';
import RoleMenu from '@/components/role-menu';
import { COMPANY } from '@/lib/company';
import { appUrl, siteUrl } from '@/lib/urls';

export const SIGN_UP = appUrl('/login?mode=sign-up');

/**
 * Light marketing frame shared by the audience landings (/ for creators, /brands for brands):
 * sticky nav with the role menu, then the page, then the footer.
 */
export default function LandingChrome({ path, cta, children }: { path: string; cta: ReactNode; children: ReactNode }) {
  return (
    <div className="cl-landing">
      <header className="cl-landing-nav">
        <Link className="cl-landing-nav__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark-dark.svg" />
        </Link>
        <nav aria-label="주요 메뉴" className="cl-landing-nav__links">
          <Link href="/discover">캠페인 둘러보기</Link>
          <RoleMenu current={path} />
          <a href="#faq">자주 묻는 질문</a>
        </nav>
        <div className="cl-landing-nav__actions">
          <ButtonLink href={appUrl('/login')} size="sm" variant="ghost">
            로그인
          </ButtonLink>
          <ButtonLink href={SIGN_UP} size="sm" variant="primary">
            {cta}
          </ButtonLink>
        </div>
      </header>

      <main>{children}</main>

      <footer className="cl-landing-footer">
        <img alt="Clipers" src="/logo/clipers-wordmark-dark.svg" />
        <nav aria-label="하단 메뉴">
          <Link href="/">크리에이터</Link>
          <Link href="/brands">브랜드</Link>
          <Link href="/discover">캠페인 둘러보기</Link>
          <Link href="/guides">가이드</Link>
          <a href={appUrl('/terms')}>이용약관</a>
          <a href={appUrl('/privacy')}>개인정보 처리방침</a>
        </nav>
        <p>© 2026 Clipers</p>
        <p className="cl-landing-footer__company">
          대표 {COMPANY.representative} · 사업자등록번호 {COMPANY.registrationNumber} · {COMPANY.address}
        </p>
      </footer>
    </div>
  );
}

/** FAQ list plus its FAQPage structured data. */
export function LandingFaq({ items, path }: { items: { q: string; a: string }[]; path: string }) {
  // Two independent stacks, so opening an answer only pushes down its own column.
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];
  return (
    <section aria-labelledby="faq" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="faq">
        자주 묻는 질문
      </h2>
      <div className="cl-faq">
        {columns.map((column, i) => (
          <div className="cl-faq__column" key={i}>
            {column.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        ))}
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          url: siteUrl(path),
          inLanguage: 'ko-KR',
          mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
        }}
      />
    </section>
  );
}
