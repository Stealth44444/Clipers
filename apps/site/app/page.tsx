import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS } from '@clipers/db';
import { Avatar, ButtonLink, MeshGradient, ProgressBar, Rail, StatusDot, buttonClass, formatCompactKRW, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import CampaignTypes from '@/components/campaign-types';
import ClippingStage from '@/components/clipping-stage';
import EarningsPhone from '@/components/earnings-phone';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import NotificationStack from '@/components/notification-stack';
import RotatingHeadline from '@/components/rotating-headline';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { CREATOR_FAQ } from '@/lib/creator-faq';
import { loadShowcaseVideos } from '@/lib/youtube-showcase';

// Creator landing (the front door; brands have /brands). Design: docs/superpowers/specs/2026-10-01-creator-page-messaging-design.md.
// Order follows what a newcomer asks: why me → what is clipping → what kinds → what's open → can I trust it.
// No invented totals or testimonials.

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Clipers — 구독자 0명부터, 숏폼 조회수만큼 받으세요',
  description: '구독자 수와 상관없이 캠페인에 참여하고, 올린 숏폼의 조회수만큼 정산받으세요. 가입과 지원은 무료예요.',
  alternates: { canonical: '/' },
};

// Below this many live campaigns the rail looks empty, so the section stays hidden (one desktop row of cards).
const MIN_LANDING_CAMPAIGNS = 4;

const BARS = [0.12, 0.22, 0.36, 0.52, 0.7, 0.92];

// The shared-budget example under the clipping copy, in the marketplace card's budget row. Static on purpose: a budget
// that moved with the payout beside it would let visitors work out the brand rate.
const POOL = { total: 5_000_000, remaining: 3_200_000, participants: 42, avatars: ['하린', '도윤', '서아', '민준'] };

export default async function HomePage() {
  const showcaseVideos = await loadShowcaseVideos();
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
            구독자 0명부터,
            <br />
            조회수만큼 받으세요
          </h1>
          <p className="cl-landing-hero__lead">
            숏폼을 올리면 조회수만큼 돈이 돼요.
            <br />
            새 채널이어도, 수익창출 전이어도요.
          </p>
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

      <section className="cl-landing-logos">
        <RotatingHeadline />
        <LogoWall />
      </section>

      <section aria-labelledby="clipping-title" className="cl-landing-section cl-clipping">
        <div className="cl-clipping__copy">
          <h2 className="cl-clipping__title" id="clipping-title">
            찍지 않아도,
            <br />
            편집만으로
          </h2>
          <p className="cl-clipping__lead">
            클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리는 일이에요. 자르고, 자막을 넣고, 순서를&nbsp;바꾸는 것까지 자유예요.
          </p>
          <p className="cl-clipping__lead">
            캠페인은 브랜드나 아티스트, 크리에이터가 예산을&nbsp;걸고&nbsp;여는 숏폼 제작 요청이에요. 참여한&nbsp;크리에이터들이 각자 올린 영상의 조회수만큼 예산을 나눠 받고,
            예산이 다 쓰이면 캠페인이 끝나요.
          </p>
          <div aria-hidden className="cl-clipping__pool">
            <div className="cl-clipping__pool-row">
              <span className="cl-ccard__budget">
                남은 예산 <strong>{formatCompactKRW(POOL.remaining)}</strong> / {formatCompactKRW(POOL.total)}
              </span>
              <span className="cl-clipping__pool-people">
                <span className="cl-clipping__pool-avatars">
                  {POOL.avatars.map((name) => (
                    <Avatar key={name} name={name} size="sm" />
                  ))}
                </span>
                참여 {POOL.participants}명
              </span>
            </div>
            <ProgressBar value={1 - POOL.remaining / POOL.total} />
          </div>
          <Link className="cl-link" href="/guides/what-is-clipping">
            클리핑 더 알아보기
          </Link>
        </div>
        <ClippingStage rate={rate} />
      </section>

      <CampaignTypes videos={showcaseVideos} />

      {campaigns.length >= MIN_LANDING_CAMPAIGNS && (
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
                <span className={buttonClass({ variant: 'primary', size: 'lg', block: true, className: 'cl-mock-withdraw__button' })}>
                  <span>지급 요청</span>
                  <span>요청 완료</span>
                </span>
                <span className="cl-mock-withdraw__toast">
                  <StatusDot tone="green">지급을 요청했어요</StatusDot>
                </span>
                <svg className="cl-mock-withdraw__cursor" height="26" viewBox="0 0 16 22" width="19">
                  <path d="M1 1v17.5l4.6-4.4 3.1 7 2.9-1.3-3-6.8h6.2z" fill="#000" stroke="#fff" strokeLinejoin="round" strokeWidth="1.4" />
                </svg>
              </div>
            </div>
            <h3>간단하게</h3>
            <p>정산된 금액이 3,000원을 넘으면, 버튼 한 번으로 지급을 요청해요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <ul className="cl-mock-menu">
                <li className="cl-mock-menu__focus" />
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
                <span>
                  <i>48시간</i>
                  <i>승인</i>
                </span>
              </div>
            </div>
            <h3>빠르게</h3>
            <p>올린 영상은 48시간 안에 검수하고, 통과하면 바로 조회수 집계가 시작돼요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <div className="cl-mock-bars">
                {BARS.map((height, index) => (
                  <span key={height} style={{ height: `${height * 100}%`, animationDelay: `${index * 0.12}s` }} />
                ))}
              </div>
            </div>
            <h3>끝없이</h3>
            <p>조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 그 뒤로 늘어난 조회수도 매주 이어서 받아요.</p>
          </article>

          <article className="cl-bento5__card">
            <div aria-hidden className="cl-bento5__visual">
              <NotificationStack />
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


      <LandingFaq items={CREATOR_FAQ} path="/" />
      <p className="cl-faq-more">
        더 궁금한 점은 <Link href="/guides#creator">크리에이터 가이드</Link>에서 찾아보세요.
      </p>

      <section className="cl-closing">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--closing">
          <MeshGradient />
        </div>
        <h2 className="cl-closing__title">
          <span>수익창출을 기다리지 말고,</span> <span>오늘부터 받으세요</span>
        </h2>
        <p className="cl-closing__lead">
          <span className="cl-phrase">가입과 지원은 무료예요.</span> <span className="cl-phrase">새 채널로도 지금 바로 시작할 수 있어요.</span>
        </p>
        <div className="cl-closing__actions">
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
