import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu, Gamepad2, Music, Plane, Sparkles, UtensilsCrossed } from 'lucide-react';
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL } from '@clipers/db';
import { ButtonLink, LineChart, PlatformIcon, Rail, StatusDot, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import EarningsPhone from '@/components/earnings-phone';
import KindsShowcase from '@/components/kinds-showcase';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { loadLiveCampaigns } from '@/lib/campaigns';

// Creator landing (the front door; brands have /brands). Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md.
// Feature cards: copy top-left, a crop of the real app UI bleeding off the bottom-right edge. No invented totals or testimonials.

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

// Illustrative cumulative views for the analytics crop (two weeks).
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

const SUBMISSIONS = [
  { platform: 'youtube_shorts', title: '여름밤 후렴 챌린지', url: 'youtube.com/shorts/x8Kd2Qm4', status: <StatusDot pulse tone="yellow">검수 대기</StatusDot> },
  { platform: 'tiktok', title: '데일리 립 3초 발색', url: 'tiktok.com/@haru/video/7412…', status: <StatusDot tone="green">승인</StatusDot> },
  { platform: 'instagram_reels', title: '러닝화 첫 10km', url: 'instagram.com/reel/C9x…', status: <StatusDot pulse tone="blue">조회수 집계 중</StatusDot> },
];

export default async function HomePage() {
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 8);
  const rate = DEFAULT_PRICING.creatorCpm;

  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <section className="cl-landing-hero cl-landing-hero--split">
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
          올린 만큼, 투명하게 받아요
        </h2>
        <div className="cl-features">
          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>1,000회부터 정산</h3>
              <p>영상 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <div className="cl-shot__figures">
                  <p>
                    <span>누적 조회수</span>
                    <strong>48,200</strong>
                  </p>
                  <p>
                    <span>정산 예정</span>
                    <strong>{formatKRW(Math.floor(48.2 * rate))}</strong>
                  </p>
                </div>
                <LineChart label="조회수 예시" points={VIEW_SERIES} unit="회" variant="minimal" />
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>링크만 내면 끝</h3>
              <p>내 계정에 올리고 링크를 제출하세요. 운영팀이 72시간 안에 검수해요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">제출한 영상</p>
                <ul className="cl-shot__rows">
                  {SUBMISSIONS.map((row) => (
                    <li key={row.url}>
                      <PlatformIcon platform={row.platform} size={20} />
                      <span className="cl-shot__row-text">
                        <span>{row.title}</span>
                        <small>{row.url}</small>
                      </span>
                      {row.status}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>좋아하는 분야에서</h3>
              <p>관심 분야의 캠페인만 골라 지원해요. 1천 회당 받는 금액이 먼저 공개돼요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">관심 분야</p>
                <div className="cl-shot__topics">
                  {TOPICS.map((topic) => (
                    <span data-on={topic.on ?? false} key={topic.label}>
                      {topic.icon}
                      {topic.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>{formatKRW(MIN_WITHDRAWAL)}부터 지급 요청</h3>
              <p>매주 정산된 금액이 쌓이고, {formatKRW(MIN_WITHDRAWAL)}이 넘으면 언제든 지급을 요청할 수 있어요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">정산 내역</p>
                <dl className="cl-shot__ledger">
                  <div>
                    <dt>9월 22일 주</dt>
                    <dd>+{formatKRW(12_400)}</dd>
                  </div>
                  <div>
                    <dt>9월 29일 주</dt>
                    <dd>+{formatKRW(26_160)}</dd>
                  </div>
                </dl>
                <div className="cl-shot__total">
                  <span>
                    지급 요청 가능 <strong>{formatKRW(38_560)}</strong>
                  </span>
                  <span className={buttonClass({ variant: 'primary', size: 'sm' })}>지급 요청</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="kinds-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="kinds-title">
          만들고 싶은 영상으로 골라요
        </h2>
        <KindsShowcase />
      </section>

      <LandingFaq items={FAQ} path="/" />

      <section className="cl-landing-cta">
        <h2>좋아하는 콘텐츠로, 오늘부터 수익을</h2>
        <p className="cl-landing-cta__facts">
          조회수 1,000회부터 정산 · {formatKRW(MIN_WITHDRAWAL)}부터 지급 요청 · 가입과 지원은 무료
        </p>
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
