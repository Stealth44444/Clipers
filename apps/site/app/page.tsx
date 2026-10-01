import type { Metadata } from 'next';
import Link from 'next/link';
import { Clapperboard, Cpu, Gamepad2, Music, Plane, Scissors, Sparkles, UtensilsCrossed } from 'lucide-react';
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL } from '@clipers/db';
import { ButtonLink, DeviceFrame, LineChart, PlatformIcon, Rail, StatusDot, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import EarningsPhone from '@/components/earnings-phone';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { loadLiveCampaigns } from '@/lib/campaigns';

// Creator landing (the front door; brands have /brands). Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md.
// No invented payout totals, user counts or testimonials.

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
  {
    q: '어떤 플랫폼에 올리면 되나요?',
    a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 쇼츠예요. 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.',
  },
  { q: '조회수는 어떻게 확인하나요?', a: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처를 제출하면 운영팀이 확인해요.' },
  { q: '아무나 참여할 수 있나요?', a: '캠페인마다 지원하고, 운영팀이 승인하면 영상을 올릴 수 있어요.' },
];

// Illustrative cumulative views for the analytics card (two weeks).
const VIEW_SERIES = [0, 0.4, 1.1, 2.3, 4.2, 6.8, 10.1, 14.6, 19.8, 25.2, 31.0, 36.4, 41.5, 45.3, 48.2].map((thousands, index) => ({
  label: `9/${index + 15}`,
  detail: `9월 ${index + 15}일`,
  value: Math.round(thousands * 1000),
}));

const TOPICS = [
  { label: '음악', icon: <Music size={18} />, on: true },
  { label: '게임', icon: <Gamepad2 size={18} /> },
  { label: '뷰티', icon: <Sparkles size={18} />, on: true },
  { label: '푸드', icon: <UtensilsCrossed size={18} /> },
  { label: '여행', icon: <Plane size={18} /> },
  { label: '테크', icon: <Cpu size={18} /> },
];

export default async function HomePage() {
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 8);
  const rate = DEFAULT_PRICING.creatorCpm;

  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <section className="cl-landing-hero cl-landing-hero--visual">
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
          올린 만큼, 투명하게 받아요
        </h2>
        <div className="cl-bento cl-bento-x">
          <article className="cl-bento__card">
            <div aria-hidden className="cl-bento__visual">
              <div className="cl-mock-chart">
                <p className="cl-mock-chart__head">
                  <span>
                    누적 조회수 <strong>48,200</strong>
                  </span>
                  <span>
                    정산 예정 <strong>{formatKRW(Math.floor(48.2 * rate))}</strong>
                  </span>
                </p>
                <LineChart label="조회수 예시" points={VIEW_SERIES} unit="회" variant="minimal" />
              </div>
            </div>
            <h3>1,000회부터 정산</h3>
            <p>영상 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.</p>
          </article>

          <article className="cl-bento__card">
            <div aria-hidden className="cl-bento__visual">
              <div className="cl-mock-submit">
                <div className="cl-mock-field">
                  <PlatformIcon platform="youtube_shorts" size={18} />
                  <span className="cl-mock-field__text">youtube.com/shorts/x8Kd2Qm4</span>
                  <span className="cl-mock-field__caret" />
                </div>
                <StatusDot pulse tone="yellow">
                  검수 대기
                </StatusDot>
              </div>
            </div>
            <h3>링크만 제출</h3>
            <p>내 계정에 올리고 링크를 내면 끝이에요. 운영팀이 72시간 안에 확인해요.</p>
          </article>

          <article className="cl-bento__card">
            <div aria-hidden className="cl-bento__visual">
              <div className="cl-mock-topics">
                {TOPICS.map((topic) => (
                  <span data-on={topic.on ?? false} key={topic.label}>
                    {topic.icon}
                    {topic.label}
                  </span>
                ))}
              </div>
            </div>
            <h3>관심 분야에서 고르기</h3>
            <p>좋아하는 분야의 캠페인만 골라 지원해요. 1천 회당 받는 금액이 먼저 공개돼요.</p>
          </article>

          <article className="cl-bento__card">
            <div aria-hidden className="cl-bento__visual">
              <dl className="cl-mock-ledger">
                <div>
                  <dt>9월 22일 주 정산</dt>
                  <dd>+{formatKRW(12_400)}</dd>
                </div>
                <div>
                  <dt>9월 29일 주 정산</dt>
                  <dd>+{formatKRW(26_160)}</dd>
                </div>
                <div className="cl-mock-ledger__total">
                  <dt>지급 요청 가능</dt>
                  <dd>
                    {formatKRW(38_560)}
                    <span className={buttonClass({ variant: 'primary', size: 'sm' })}>지급 요청</span>
                  </dd>
                </div>
              </dl>
            </div>
            <h3>{formatKRW(MIN_WITHDRAWAL)}부터 지급 요청</h3>
            <p>매주 정산된 금액이 쌓이고, {formatKRW(MIN_WITHDRAWAL)}이 넘으면 언제든 지급을 요청할 수 있어요.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="kinds-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="kinds-title">
          만들고 싶은 영상으로 골라요
        </h2>
        <div className="cl-kinds3">
          <article className="cl-kind">
            <div aria-hidden className="cl-kind__visual">
              <div className="cl-cut">
                {Array.from({ length: 14 }, (_, index) => (
                  <i key={index} />
                ))}
                <span className="cl-cut__window" />
              </div>
              <span className="cl-cut__time">15초 구간 고르는 중</span>
            </div>
            <h3>
              <Scissors aria-hidden size={18} /> 클리핑
            </h3>
            <p>브랜드가 준 긴 영상에서 좋은 장면을 골라 짧게 편집해 올려요.</p>
          </article>

          <article className="cl-kind">
            <div aria-hidden className="cl-kind__visual">
              <div className="cl-rec">
                <DeviceFrame statusBar={false}>
                  <div className="cl-clip-screen">
                    <span className="cl-rec__dot">녹화 중</span>
                    <span className="cl-rec__product" />
                    <span className="cl-clip-screen__progress" />
                  </div>
                </DeviceFrame>
              </div>
            </div>
            <h3>
              <Clapperboard aria-hidden size={18} /> UGC
            </h3>
            <p>제품과 서비스를 직접 써 보고, 내 말투로 소개하는 영상을 만들어요.</p>
          </article>

          <article className="cl-kind">
            <div aria-hidden className="cl-kind__visual">
              <div className="cl-wave">
                <div className="cl-wave__bars">
                  {Array.from({ length: 22 }, (_, index) => (
                    <i key={index} style={{ animationDelay: `${-((index * 37) % 11) / 10}s` }} />
                  ))}
                </div>
                <span className="cl-wave__title">
                  <Music size={14} /> 여름밤 · 후렴 15초
                </span>
              </div>
            </div>
            <h3>
              <Music aria-hidden size={18} /> 음악
            </h3>
            <p>신곡과 음원을 내 영상에 쓰고, 노래가 퍼진 만큼 받아요.</p>
          </article>
        </div>
      </section>

      <LandingFaq items={FAQ} path="/" />

      <section className="cl-landing-cta">
        <h2>좋아하는 콘텐츠로, 오늘부터 수익을</h2>
        <p className="cl-landing-cta__facts">조회수 1,000회부터 정산 · {formatKRW(MIN_WITHDRAWAL)}부터 지급 요청 · 가입과 지원은 무료</p>
        <div className="cl-landing-hero__actions">
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
