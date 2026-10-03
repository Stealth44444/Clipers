import type { ReactNode } from 'react';
import Link from 'next/link';
import { ButtonLink } from '@clipers/ui';
import JsonLd from '@/components/json-ld';
import RoleMenu from '@/components/role-menu';
import { COMPANY } from '@/lib/company';
import { appUrl, siteUrl } from '@/lib/urls';

/** The app's sign-up, opened for the role the page is for (the app pre-selects it; the visitor can still switch). */
export function signUpUrl(role: 'creator' | 'brand'): string {
  return appUrl(`/login?mode=sign-up&role=${role}`);
}

/** Creator sign-up: the creator landing, guides and the marketplace lead here. */
export const SIGN_UP = signUpUrl('creator');

/**
 * Light marketing frame shared by the audience landings (/ for creators, /brands for brands):
 * sticky nav with the role menu, then the page, then the footer. A page whose first screen is dark (overDark) starts
 * with a clear nav in white; the hero flips data-over-dark off once it scrolls out from under the nav.
 */
export default function LandingChrome({ path, cta, overDark = false, children }: { path: string; cta: ReactNode; overDark?: boolean; children: ReactNode }) {
  return (
    <div className="cl-landing">
      <header className="cl-landing-nav" data-over-dark={overDark || undefined}>
        <Link className="cl-landing-nav__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark-dark.svg" />
          {overDark && <img alt="" className="cl-landing-nav__logo-light" src="/logo/clipers-wordmark.svg" />}
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
          <ButtonLink href={signUpUrl(path === '/brands' ? 'brand' : 'creator')} size="sm" variant="primary">
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
          <Link href="/about">회사 소개</Link>
          <a href={appUrl('/terms')}>이용약관</a>
          <a href={appUrl('/privacy')}>개인정보 처리방침</a>
        </nav>
        <p>© 2026 Clipers</p>
        <div className="cl-landing-footer__company">
          <p>
            고객센터 <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
          <p>
            {COMPANY.legalName} · 대표 {COMPANY.representative} · 사업자등록번호 {COMPANY.registrationNumber} · {COMPANY.address}
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * FAQ list plus its FAQPage structured data. `compact` sits in a guide's reading column: a section-sized heading and
 * one column, instead of the landing's large title and two columns.
 */
export function LandingFaq({ items, path, compact = false }: { items: { q: string; a: string }[]; path: string; compact?: boolean }) {
  // Two independent stacks, so opening an answer only pushes down its own column.
  const half = compact ? items.length : Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)].filter((column) => column.length > 0);
  return (
    <section aria-labelledby="faq" className={compact ? 'cl-guide' : 'cl-landing-section'}>
      <div className={compact ? 'cl-guide__section' : undefined}>
        <h2 className={compact ? undefined : 'cl-landing-section__title'} id="faq">
          자주 묻는 질문
        </h2>
      </div>
      <div className="cl-faq" style={compact ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
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
