import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, MeshGradient } from '@clipers/ui';
import CompareTable from '@/components/brand/compare-table';
import HorizonHero from '@/components/brand/horizon-hero';
import ReachStory from '@/components/brand/reach-story';
import ControlsBento from '@/components/brand/controls-bento';
import StartCard, { CONTACT } from '@/components/brand/start-card';
import UseCases from '@/components/brand/use-cases';
import VerifyFlow from '@/components/brand/verify-flow';
import ViewsStory from '@/components/brand/views-story';
import LandingChrome, { LandingFaq, signUpUrl } from '@/components/landing-chrome';
import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';

// Brand landing. Design: docs/superpowers/specs/2026-10-01-brand-page-redesign-design.md, the reach section and the
// merged bento in 2026-10-02-brand-reach-section-design.md.
// Order follows what a buyer asks: will it waste money → can it go further → how is it different → does it fit us →
// how much work, and can we control it → are the views real → how do we start. The brand rate is never shown, and no
// visual pairs a won amount with views (that pair would reveal it).

export const metadata: Metadata = {
  title: '브랜드 · Clipers — 바이럴을 운에 맡기지 마세요',
  description: '숏폼 크리에이터 수십, 수백 명이 브랜드를 각자의 영상으로 퍼뜨리고, 예산은 검수를 통과한 영상의 검증된 조회수에만 쓰여요. 캠페인은 100만 원부터 열 수 있어요.',
  alternates: { canonical: '/brands' },
};

export default function BrandsPage() {
  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <HorizonHero signUpHref={signUpUrl('brand')} />
      <ViewsStory />
      <ReachStory />
      <CompareTable />
      <UseCases />
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
          <ButtonLink href={signUpUrl('brand')} size="lg" variant="primary">
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
