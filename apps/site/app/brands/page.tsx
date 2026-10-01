import type { Metadata } from 'next';
import { Activity, Eye, Gauge, Layers, ScanSearch, UserCheck, WalletCards } from 'lucide-react';
import { PLATFORMS } from '@clipers/db';
import { Avatar, ButtonLink, DeviceFrame, PlatformIcon, ProgressBar, StatusDot } from '@clipers/ui';
import ClipStream from '@/components/clip-stream';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import ProductTour from '@/components/product-tour';
import VerifyFlow from '@/components/verify-flow';

// Brand landing. Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md. The brand rate is never shown.

export const metadata: Metadata = {
  title: '브랜드 · Clipers — 숏폼으로, 브랜드를 어디에나',
  description: '예산과 조건만 정하면 크리에이터들이 숏폼을 올려요. 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰이는 숏폼 클리핑 캠페인.',
  alternates: { canonical: '/brands' },
};

const FAQ = [
  { q: '최소 예산이 있나요?', a: '캠페인은 100만 원부터 열 수 있어요. 상한은 없어요.' },
  { q: '비용은 어떻게 계산되나요?', a: '검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요. 조회수가 나오지 않으면 예산도 쓰이지 않아요.' },
  {
    q: '어떤 플랫폼을 지원하나요?',
    a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 쇼츠예요. 캠페인마다 올릴 플랫폼을 고를 수 있어요.',
  },
  {
    q: '조회수는 어떻게 확인하나요?',
    a: '유튜브는 조회수를 자동으로 수집하고, 다른 플랫폼은 크리에이터가 낸 화면 캡처를 운영팀이 대조해요. 짧은 시간에 비정상적으로 늘어난 조회수는 따로 확인해요.',
  },
  { q: '캠페인은 언제 시작되나요?', a: '캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 바로 공개돼요.' },
  { q: '어떤 크리에이터가 참여하나요?', a: '크리에이터는 캠페인마다 지원하고, 운영팀이 승인한 사람만 영상을 올릴 수 있어요.' },
];

const REEL = [
  'linear-gradient(160deg, #163a2a, #58b982)',
  'linear-gradient(160deg, #14152e, #4c5bd4)',
  'linear-gradient(160deg, #3a1424, #e0688a)',
  'linear-gradient(160deg, #2b1d0f, #d98b3a)',
  'linear-gradient(160deg, #1d1033, #8a5cf0)',
  'linear-gradient(160deg, #102a2e, #2a9fa8)',
];

export default function BrandsPage() {
  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <section className="cl-landing-hero cl-landing-hero--visual">
        <h1 className="cl-landing-hero__title">
          숏폼으로,
          <br />
          브랜드를 어디에나
        </h1>
        <p className="cl-landing-hero__lead">예산과 조건만 정하면 크리에이터들이 영상을 올려요. 검증된 조회수만큼만 예산이 쓰여요.</p>
        <div className="cl-landing-hero__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="secondary">
            진행 중인 캠페인 보기
          </ButtonLink>
        </div>
        <ClipStream />
      </section>

      <section aria-label="함께 쓰는 플랫폼" className="cl-landing-logos">
        <LogoWall />
      </section>

      <section aria-labelledby="trio-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="trio-title">
          정하기만 하면, 나머지는 Clipers가
        </h2>
        <div className="cl-trio">
          <article className="cl-trio__card">
            <div aria-hidden className="cl-trio__visual">
              <div className="cl-mock-form">
                <div className="cl-mock-form__field">
                  총 예산
                  <span className="cl-mock-field">3,000,000원</span>
                </div>
                <div className="cl-mock-form__field">
                  올릴 플랫폼
                  <span className="cl-mock-form__platforms">
                    {PLATFORMS.slice(0, 5).map((platform, index) => (
                      <span data-on={index < 3} key={platform.value}>
                        <PlatformIcon platform={platform.value} size={16} />
                      </span>
                    ))}
                  </span>
                </div>
                <div className="cl-mock-form__field">
                  꼭 지킬 조건
                  <span className="cl-mock-field">
                    <span className="cl-mock-field__text">후렴 15초 이상 · #여름밤챌린지</span>
                    <span className="cl-mock-field__caret" />
                  </span>
                </div>
              </div>
            </div>
            <h3>예산과 조건만 정하세요</h3>
            <p>예산, 올릴 플랫폼, 꼭 지켜야 할 조건만 정하면 캠페인 준비가 끝나요.</p>
          </article>

          <article className="cl-trio__card">
            <div aria-hidden className="cl-trio__visual cl-trio__visual--reel">
              <div className="cl-reel">
                {[...REEL, ...REEL].map((background, index) => (
                  <DeviceFrame key={index} statusBar={false}>
                    <div className="cl-clip-screen" style={{ background, animationDelay: `${-index * 1.3}s` }}>
                      <span className="cl-clip-screen__lines">
                        <i />
                        <i />
                      </span>
                      <span className="cl-clip-screen__progress" style={{ animationDelay: `${-index * 2.1}s` }} />
                    </div>
                  </DeviceFrame>
                ))}
              </div>
            </div>
            <h3>크리에이터가 만들어요</h3>
            <p>지원한 크리에이터 중 운영팀이 승인한 사람만 영상을 만들어 올려요.</p>
          </article>

          <article className="cl-trio__card">
            <div aria-hidden className="cl-trio__visual">
              <div className="cl-mock-board">
                <p className="cl-mock-board__row">
                  검증 조회수 <strong>1,210,000</strong>
                </p>
                <p className="cl-mock-board__row">
                  남은 예산 <strong>285만원</strong>
                </p>
                <ProgressBar label="예산 사용 예시" value={0.05} />
                <div className="cl-mock-board__list">
                  <StatusDot tone="green">영상 12개 승인</StatusDot>
                  <StatusDot pulse tone="yellow">
                    3개 검수 중
                  </StatusDot>
                  <StatusDot pulse tone="blue">
                    조회수 집계 중
                  </StatusDot>
                </div>
              </div>
            </div>
            <h3>나머지는 Clipers가</h3>
            <p>검수, 조회수 집계, 크리에이터 정산과 지급까지 Clipers가 맡아요.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="verify-title" className="cl-landing-section">
        <div className="cl-verify">
          <div className="cl-verify__head">
            <h2 id="verify-title">검증된 조회수만 정산에 쓰여요</h2>
            <p>모든 조회수는 세 번 확인을 거쳐요. 걸러진 조회수에는 예산이 쓰이지 않아요.</p>
          </div>
          <VerifyFlow />
          <dl className="cl-verify__facts">
            <div>
              <dt>
                <ScanSearch aria-hidden size={18} /> 사람이 직접 검수
              </dt>
              <dd>올라온 영상은 운영팀이 정해진 시간 안에 요구사항대로인지 확인해요.</dd>
            </div>
            <div>
              <dt>
                <Eye aria-hidden size={18} /> 플랫폼에 맞춘 확인
              </dt>
              <dd>유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 화면 캡처와 대조해요.</dd>
            </div>
            <div>
              <dt>
                <Activity aria-hidden size={18} /> 급증은 따로
              </dt>
              <dd>짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="features-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="features-title">
          예산은 조회수에만
        </h2>
        <div className="cl-bento">
          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <div className="cl-mock-budget">
                <p>
                  남은 예산 <strong>285만원</strong> / 300만원
                </p>
                <ProgressBar label="예산 사용 예시" value={0.05} />
              </div>
            </div>
            <h3>
              <Gauge aria-hidden size={18} /> 쓴 만큼만 차감
            </h3>
            <p>검증된 조회수만큼만 예산이 줄어요. 남은 예산은 언제든 실시간으로 보여요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <div className="cl-mock-budget">
                <p>
                  클립 하나당 최대 <strong>30만원</strong>
                </p>
                <ProgressBar label="클립 상한 예시" value={0.62} />
              </div>
            </div>
            <h3>
              <WalletCards aria-hidden size={18} /> 클립당 상한
            </h3>
            <p>영상 하나가 예산을 독차지하지 않도록 클립마다 받을 수 있는 금액에 상한을 둘 수 있어요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <ul className="cl-mock-list">
                <li>
                  <Avatar name="하루" size="sm" />
                  <span>하루 · 음악</span>
                  <em>
                    <StatusDot tone="green">승인</StatusDot>
                  </em>
                </li>
                <li>
                  <Avatar name="민지" size="sm" />
                  <span>민지 · 뷰티</span>
                  <em>
                    <StatusDot pulse tone="yellow">
                      검토 중
                    </StatusDot>
                  </em>
                </li>
              </ul>
            </div>
            <h3>
              <UserCheck aria-hidden size={18} /> 승인한 크리에이터만
            </h3>
            <p>크리에이터는 캠페인마다 지원하고, 운영팀 승인을 받은 사람만 영상을 올려요.</p>
          </article>

          <article className="cl-bento__card">
            <div className="cl-bento__visual">
              <div className="cl-mock-logos">
                {PLATFORMS.map((platform) => (
                  <PlatformIcon key={platform.value} platform={platform.value} size={28} />
                ))}
              </div>
            </div>
            <h3>
              <Layers aria-hidden size={18} /> 7개 숏폼 플랫폼
            </h3>
            <p>한 캠페인으로 국내에서 많이 쓰는 숏폼 플랫폼에 한 번에 퍼뜨려요.</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="tour-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="tour-title">
          캠페인이 열리고 정산되기까지
        </h2>
        <p className="cl-landing-section__lead">브랜드와 크리에이터가 실제로 보는 화면이에요.</p>
        <ProductTour />
      </section>

      <section className="cl-landing-section cl-audiences">
        <article className="cl-audience">
          <h2>다음 캠페인을 Clipers에서</h2>
          <p className="cl-audience__lead">
            예산과 플랫폼, 꼭 지켜야 할 조건만 정하면 돼요. 입금이 확인되면 캠페인이 공개되고, 검증된 조회수만큼만 예산이 쓰여요.
          </p>
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
          <ButtonLink href={SIGN_UP} variant="primary">
            캠페인 시작하기
          </ButtonLink>
        </article>
        <article className="cl-audience">
          <h2>크리에이터라면</h2>
          <p className="cl-audience__lead">열려 있는 캠페인에 지원하고 영상을 올리세요. 검수를 통과한 영상은 검증된 조회수만큼 정산돼요.</p>
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
          <ButtonLink href="/" variant="secondary">
            크리에이터 안내 보기
          </ButtonLink>
        </article>
      </section>

      <LandingFaq items={FAQ} path="/brands" />

      <section className="cl-landing-cta">
        <h2>다음 캠페인을 Clipers에서 시작하세요</h2>
        <div className="cl-landing-hero__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="secondary">
            진행 중인 캠페인 보기
          </ButtonLink>
        </div>
      </section>
    </LandingChrome>
  );
}
