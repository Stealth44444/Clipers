import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Coins, Eye, ScanSearch, Wallet } from 'lucide-react';
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS } from '@clipers/db';
import { ButtonLink, MeshGradient, Rail, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import CampaignTypes from '@/components/campaign-types';
import EarningsPhone from '@/components/earnings-phone';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { loadLiveCampaigns } from '@/lib/campaigns';

// Creator landing (the front door; brands have /brands). Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md.
// Sections below the hero follow the contentrewards.com creator page (kept by request). No invented totals or testimonials.

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Clipers — 숏폼 올리고, 조회수만큼 받으세요',
  description: '열려 있는 숏폼 캠페인에 지원하고 영상을 올리세요. 검수를 통과한 영상은 검증된 조회수만큼 정산돼요. 가입과 지원은 무료예요.',
  alternates: { canonical: '/' },
};

const FAQ = [
  { q: '가입비나 지원 비용이 있나요?', a: '없어요. 가입과 캠페인 지원은 무료예요.' },
  { q: '얼마를 받나요?', a: '캠페인마다 조회수 1천 회당 받는 금액이 먼저 공개돼요. 검수를 통과한 영상의 검증된 조회수에 그 금액을 곱해 정산돼요.' },
  {
    q: '조회수가 얼마나 나와야 정산되나요?',
    a: '영상 하나의 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.',
  },
  { q: '언제 돈을 받을 수 있나요?', a: '정산된 금액이 3,000원 이상이면 지급을 요청할 수 있어요.' },
  { q: '어떤 플랫폼에 올리면 되나요?', a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 쇼츠예요. 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.' },
  { q: '조회수는 어떻게 확인하나요?', a: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처를 제출하면 운영팀이 확인해요.' },
  { q: '아무나 참여할 수 있나요?', a: '캠페인마다 지원하고, 운영팀이 승인하면 영상을 올릴 수 있어요.' },
];




const BARS = [0.12, 0.22, 0.36, 0.52, 0.7, 0.92];

export default async function HomePage() {
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 8);
  const rate = DEFAULT_PRICING.creatorCpm;

  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <section className="cl-landing-hero cl-landing-hero--split">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--split">
          <MeshGradient />
        </div>
        <div className="cl-landing-hero__copy">
          <h1 className="cl-landing-hero__title">
            숏폼 올리고,
            <br />
            조회수만큼 받으세요
          </h1>
          <p className="cl-landing-hero__lead">열려 있는 캠페인에 지원하고 영상을 올리세요. 검수를 통과한 영상은 검증된 조회수만큼 정산돼요.</p>
          <div className="cl-landing-hero__actions">
            <ButtonLink href={SIGN_UP} size="lg" variant="primary">
              무료로 시작하기
            </ButtonLink>
            <ButtonLink href="/discover" size="lg" variant="secondary">
              캠페인 둘러보기
            </ButtonLink>
          </div>
        </div>
        <EarningsPhone minViews={MIN_PAYOUT_VIEWS} rate={rate} />
      </section>

      <section aria-label="함께 쓰는 플랫폼" className="cl-landing-logos">
        <LogoWall />
      </section>

      {campaigns.length > 0 && (
        <section className="cl-landing-section cl-landing-campaigns">
          <Rail
            description={
              <>
                남은 예산이 많은 캠페인부터 보여요.{' '}
                <Link className="cl-link" href="/discover">
                  모든 캠페인 보기
                </Link>
              </>
            }
            title="지금 모집 중인 캠페인"
          >
            {campaigns.map((campaign) => (
              <CampaignCard campaign={campaign} key={campaign.id} />
            ))}
          </Rail>
        </section>
      )}

      <section aria-labelledby="features-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="features-title">
          간단하고, 투명하게
        </h2>
        <div className="cl-bento5">
          <article className="cl-bento5__card cl-bento5__card--tall">
            <div aria-hidden className="cl-bento5__visual">
              <div className="cl-mock-withdraw">
                <p className="cl-mock-withdraw__amount">{formatKRW(38_560)}</p>
                <p className="cl-mock-withdraw__title">받을 금액이 있어요</p>
                <p className="cl-mock-withdraw__body">3,000원이 넘으면 언제든 지급을 요청할 수 있어요.</p>
                <span className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>지급 요청</span>
                <svg className="cl-mock-withdraw__cursor" height="26" viewBox="0 0 16 22" width="19">
                  <path d="M1 1v17.5l4.6-4.4 3.1 7 2.9-1.3-3-6.8h6.2z" fill="#000" stroke="#fff" strokeLinejoin="round" strokeWidth="1.4" />
                </svg>
              </div>
            </div>
            <h3>간단하게</h3>
            <p>캠페인을 고르고, 영상을 올리고, 정산받으면 끝이에요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <ul className="cl-mock-menu">
                <li>
                  분야 <ChevronRight size={15} />
                </li>
                <li>
                  플랫폼 <ChevronRight size={15} />
                </li>
                <li>정렬</li>
                <li>남은 예산 순</li>
              </ul>
            </div>
            <h3>자유롭게</h3>
            <p>관심 있는 분야와 내가 쓰는 플랫폼에 맞는 캠페인만 골라요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <div className="cl-mock-ring">
                <span>72시간</span>
              </div>
            </div>
            <h3>빠르게</h3>
            <p>올린 영상은 72시간 안에 검수하고, 통과하면 바로 조회수 집계가 시작돼요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <div className="cl-mock-bars">
                {BARS.map((height) => (
                  <span key={height} style={{ height: `${height * 100}%` }} />
                ))}
              </div>
            </div>
            <h3>끝없이</h3>
            <p>영상을 더 올리고 조회수가 늘수록 더 받아요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <div className="cl-mock-chips">
                <span>
                  <Wallet size={16} /> <b>{formatKRW(38_560)}</b> 정산
                </span>
                <span>
                  <Coins size={16} /> <b>{formatKRW(800)}</b> 1천 회당
                </span>
                <span>
                  <Eye size={16} /> <b>4.8만</b> 조회수
                </span>
              </div>
            </div>
            <h3>투명하게</h3>
            <p>조회수와 정산 금액, 지급 내역을 한곳에서 확인해요.</p>
          </article>
        </div>
        <div className="cl-landing-section__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            크리에이터로 시작하기
          </ButtonLink>
        </div>
      </section>

      <CampaignTypes />

      <LandingFaq items={FAQ} path="/" />

      <section className="cl-cta-card">
        <h2>
          좋아하는 콘텐츠로,
          <br />
          오늘부터 수익을
        </h2>
        <p className="cl-cta-card__lead">가입과 캠페인 지원은 무료예요. 마음에 드는 캠페인부터 시작해 보세요.</p>
        <ul className="cl-cta-card__facts">
          <li>
            <Eye aria-hidden size={18} /> 조회수 1,000회부터 정산
          </li>
          <li>
            <Wallet aria-hidden size={18} /> 3,000원부터 지급 요청
          </li>
          <li>
            <ScanSearch aria-hidden size={18} /> 72시간 안에 검수
          </li>
        </ul>
        <div className="cl-cta-card__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            무료로 시작하기
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="secondary">
            캠페인 둘러보기
          </ButtonLink>
        </div>
      </section>
    </LandingChrome>
  );
}
