import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Eye, Link2, Wallet } from 'lucide-react';
import { Avatar, ButtonLink, PlatformIcon, Rail, StatusDot, buttonClass, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import ProductTour from '@/components/product-tour';
import { loadLiveCampaigns } from '@/lib/campaigns';

// Creator landing (the front door; brands have /brands). Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md.

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
  { q: '어떤 플랫폼에 올리면 되나요?', a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.' },
  { q: '조회수는 어떻게 확인하나요?', a: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처를 제출하면 운영팀이 확인해요.' },
  { q: '아무나 참여할 수 있나요?', a: '캠페인마다 지원하고, 운영팀이 승인하면 영상을 올릴 수 있어요.' },
];

export default async function HomePage() {
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 8);

  return (
    <LandingChrome cta="무료로 시작하기" path="/">
      <section className="cl-landing-hero">
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
        <div className="cl-bento">
          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <ul className="cl-mock-list">
                <li>
                  <Avatar name="여름밤 챌린지" size="sm" />
                  <span>신곡 &apos;여름밤&apos; 후렴 챌린지</span>
                  <em>1천 회당 {formatKRW(800)}</em>
                </li>
                <li>
                  <Avatar name="데일리 뷰티" size="sm" />
                  <span>데일리 립 3초 발색</span>
                  <em>1천 회당 {formatKRW(800)}</em>
                </li>
              </ul>
            </div>
            <h3>
              <Compass aria-hidden size={18} /> 관심 분야에서 고르기
            </h3>
            <p>음악, 게임, 뷰티처럼 관심 있는 분야의 캠페인을 골라 지원해요. 1천 회당 받는 금액이 먼저 공개돼요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <div className="cl-mock-review">
                <PlatformIcon platform="youtube_shorts" size={22} />
                <div>
                  <p className="cl-mock-review__title">youtube.com/shorts/…</p>
                  <p className="cl-mock-review__meta">신곡 &apos;여름밤&apos; 후렴 챌린지</p>
                </div>
                <span className="cl-mock-review__status">
                  <StatusDot pulse tone="yellow">
                    검수 대기
                  </StatusDot>
                </span>
              </div>
            </div>
            <h3>
              <Link2 aria-hidden size={18} /> 링크만 제출
            </h3>
            <p>내 계정에 영상을 올리고 링크를 제출하면 끝이에요. 운영팀이 정해진 시간 안에 검수해요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <dl className="cl-mock-stats">
                <div>
                  <dt>검증 조회수</dt>
                  <dd>48,200</dd>
                </div>
                <div>
                  <dt>정산 예정</dt>
                  <dd>{formatKRW(38_560)}</dd>
                </div>
              </dl>
            </div>
            <h3>
              <Eye aria-hidden size={18} /> 1,000회부터 정산
            </h3>
            <p>영상 조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 이후 늘어난 조회수도 매주 이어서 정산돼요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <div className="cl-mock-payout">
                <p>
                  받을 금액 <strong>{formatKRW(38_560)}</strong>
                </p>
                <span aria-hidden className={buttonClass({ variant: 'primary', size: 'sm' })}>
                  지급 요청
                </span>
              </div>
            </div>
            <h3>
              <Wallet aria-hidden size={18} /> 3,000원부터 지급 요청
            </h3>
            <p>정산된 금액이 3,000원을 넘으면 언제든 지급을 요청할 수 있어요.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="tour-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="tour-title">
          지원부터 지급까지
        </h2>
        <p className="cl-landing-section__lead">크리에이터가 실제로 보는 화면이에요.</p>
        <ProductTour audience="creator" />
      </section>

      <section className="cl-landing-section cl-audiences">
        <article className="cl-audience">
          <h2>좋아하는 콘텐츠로 수익을</h2>
          <p className="cl-audience__lead">마음에 드는 캠페인에 지원하고 영상을 올리면, 검수를 통과한 영상의 조회수만큼 매주 정산돼요.</p>
          <dl className="cl-figures">
            <div>
              <dt>1,000회</dt>
              <dd>조회수부터 정산</dd>
            </div>
            <div>
              <dt>3,000원</dt>
              <dd>부터 지급 요청</dd>
            </div>
            <div>
              <dt>무료</dt>
              <dd>가입과 지원</dd>
            </div>
          </dl>
          <ButtonLink href={SIGN_UP} variant="primary">
            무료로 시작하기
          </ButtonLink>
        </article>
        <article className="cl-audience">
          <h2>브랜드라면</h2>
          <p className="cl-audience__lead">예산과 조건만 정하면 크리에이터들이 영상을 올려요. 검증된 조회수만큼만 예산이 쓰여요.</p>
          <dl className="cl-figures">
            <div>
              <dt>100만 원</dt>
              <dd>부터 캠페인 시작</dd>
            </div>
            <div>
              <dt>7개</dt>
              <dd>숏폼 플랫폼</dd>
            </div>
            <div>
              <dt>24~72시간</dt>
              <dd>안에 영상 검수</dd>
            </div>
          </dl>
          <ButtonLink href="/brands" variant="secondary">
            브랜드 안내 보기
          </ButtonLink>
        </article>
      </section>

      <LandingFaq items={FAQ} path="/" />

      <section className="cl-landing-cta">
        <h2>좋아하는 콘텐츠로, 오늘부터 수익을</h2>
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
