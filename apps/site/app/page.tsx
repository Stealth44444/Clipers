import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Eye, ScanSearch, UserRound } from 'lucide-react';
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS } from '@clipers/db';
import { ButtonLink, MeshGradient, Rail, StatusDot, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import CampaignTypes from '@/components/campaign-types';
import ClippingStage from '@/components/clipping-stage';
import EarningsPhone from '@/components/earnings-phone';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import NotificationStack from '@/components/notification-stack';
import RotatingHeadline from '@/components/rotating-headline';
import { loadLiveCampaigns } from '@/lib/campaigns';
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

const rateExample = `예를 들어 1천 회당 ${formatKRW(DEFAULT_PRICING.creatorCpm)}인 캠페인이라면, 조회수 10만 회에 ${formatKRW(DEFAULT_PRICING.creatorCpm * 100)}이에요.`;

const FAQ = [
  { q: '클리핑이 뭔가요?', a: '캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리는 일이에요. 올린 영상의 조회수만큼 정산돼요.' },
  {
    q: '구독자가 적거나 새 채널이어도 되나요?',
    a: '네. 구독자 수나 수익창출 여부와 상관없이 누구나 지원할 수 있어요. 캠페인마다 운영팀이 지원을 확인한 뒤 승인해요.',
  },
  { q: '남의 영상을 올려도 괜찮은가요?', a: '클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요. 캠페인에 적힌 요구사항에 맞춰 편집해 주세요.' },
  { q: '가입비나 지원 비용이 있나요?', a: '없어요. 가입과 캠페인 지원은 무료예요.' },
  {
    q: '얼마를 받나요?',
    a: `캠페인마다 조회수 1천 회당 받는 금액이 먼저 공개돼요. 검수를 통과한 영상의 검증된 조회수에 그 금액을 곱해 정산돼요. ${rateExample}`,
  },
  {
    q: '조회수가 얼마나 나와야 정산되나요?',
    a: '영상 하나의 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.',
  },
  { q: '언제 돈을 받을 수 있나요?', a: '정산된 금액이 3,000원 이상이면 지급을 요청할 수 있어요.' },
  { q: '어떤 플랫폼에 올리면 되나요?', a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.' },
  { q: '조회수는 어떻게 확인하나요?', a: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처를 제출하면 운영팀이 확인해요.' },
];

// Below this many live campaigns the rail looks empty, so the section stays hidden (one desktop row of cards).
const MIN_LANDING_CAMPAIGNS = 4;

const BARS = [0.12, 0.22, 0.36, 0.52, 0.7, 0.92];

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
          <p className="cl-landing-hero__lead">알리고 싶은 영상이 있는 곳과 크리에이터를 이어 드려요. 숏폼으로 만들어 올리면, 새 채널이어도 조회수만큼 받아요.</p>
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
            클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리는 일이에요. 자르고, 자막을 넣고, 순서를 바꾸는 것까지 자유예요.
          </p>
          <p className="cl-clipping__lead">캠페인은 영상을 알리고 싶은 쪽이 예산을 걸고 여는 요청이에요. 올린 영상의 조회수만큼 이 예산에서 받아요.</p>
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


      <LandingFaq items={FAQ} path="/" />

      <section className="cl-cta-card">
        <h2>
          수익창출을 기다리지 말고,
          <br />
          오늘부터 받으세요
        </h2>
        <p className="cl-cta-card__lead">가입과 지원은 무료예요. 새 채널로도 지금 바로 시작할 수 있어요.</p>
        <ul className="cl-cta-card__facts">
          <li>
            <UserRound aria-hidden size={18} /> 구독자 조건 없음
          </li>
          <li>
            <Eye aria-hidden size={18} /> 조회수 1,000회부터 정산
          </li>
          <li>
            <ScanSearch aria-hidden size={18} /> 48시간 안에 검수
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
