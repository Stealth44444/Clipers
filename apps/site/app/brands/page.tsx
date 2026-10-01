import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, MeshGradient } from '@clipers/ui';
import CompareTable from '@/components/brand/compare-table';
import HorizonHero from '@/components/brand/horizon-hero';
import ControlsBento from '@/components/brand/controls-bento';
import SolutionCards from '@/components/brand/solution-cards';
import StartCard, { CONTACT } from '@/components/brand/start-card';
import UseCases from '@/components/brand/use-cases';
import VerifyFlow from '@/components/brand/verify-flow';
import ViewsStory from '@/components/brand/views-story';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';
import { loadShowcaseVideos } from '@/lib/youtube-showcase';

// Brand landing. Design: docs/superpowers/specs/2026-10-01-brand-page-redesign-design.md.
// Order follows what a buyer asks: will it waste money → how is it different → how much work → does it fit us →
// can we control it → are the views real → how do we start. The brand rate is never shown, and no visual pairs a
// won amount with views (that pair would reveal it).

export const revalidate = 300;

export const metadata: Metadata = {
  title: '브랜드 · Clipers — 조회수가 난 만큼만 예산을 쓰는 숏폼 캠페인',
  description: '크리에이터들이 각자 숏폼을 만들어 올리고, 예산은 검수를 통과한 영상의 검증된 조회수에만 쓰여요. 캠페인은 100만 원부터 열 수 있어요.',
  alternates: { canonical: '/brands' },
};

export default async function BrandsPage() {
  const showcaseVideos = await loadShowcaseVideos();

  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <HorizonHero signUpHref={SIGN_UP} />
      <ViewsStory />

      <section aria-label="함께 쓰는 플랫폼" className="cl-landing-logos">
        <LogoWall />
      </section>

      <CompareTable />
      <SolutionCards />
      <UseCases videos={showcaseVideos} />
      <ControlsBento />
      <VerifyFlow />
      <StartCard />

      <LandingFaq items={ADVERTISER_FAQ} path="/brands" />
      <p className="cl-faq-more">
        업종별 활용법은 <Link href="/guides#advertiser">광고주 가이드</Link>에서 볼 수 있어요.
      </p>

      <section className="cl-closing">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--closing">
          <MeshGradient />
        </div>
        <h2 className="cl-closing__title">
          <span>다음 숏폼 캠페인을,</span> <span>오늘 열어 보세요</span>
        </h2>
        <p className="cl-closing__lead">캠페인은 100만 원부터 열 수 있어요. 예산은 검증된 조회수에만 쓰여요.</p>
        <div className="cl-closing__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href={CONTACT} size="lg" variant="secondary">
            상담 문의
          </ButtonLink>
        </div>
      </section>
    </LandingChrome>
  );
}
