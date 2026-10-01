import type { Metadata } from 'next';
import Link from 'next/link';
import { PLATFORMS } from '@clipers/db';
import { Avatar, ButtonLink, DeviceFrame, MeshGradient, PlatformIcon, ProgressBar, StatusDot, buttonClass } from '@clipers/ui';
import BrandLiveWindow from '@/components/brand-live-window';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';

// Brand landing. Copy draft: docs/superpowers/specs/2026-10-01-landing-copy-draft.md. The brand rate is never shown,
// and no visual pairs spend with views (that pair would reveal it).

export const metadata: Metadata = {
  title: '브랜드 · Clipers — 숏폼으로, 브랜드를 어디에나',
  description: '예산과 조건만 정하면 크리에이터들이 숏폼을 올려요. 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰이는 숏폼 클리핑 캠페인.',
  alternates: { canonical: '/brands' },
};

const SCREENS = [
  'radial-gradient(60% 40% at 30% 28%, #e4f5a8cc, transparent 70%), linear-gradient(160deg, #163a2a, #58b982)',
  'radial-gradient(60% 40% at 70% 30%, #9ee6f2aa, transparent 70%), linear-gradient(160deg, #14152e, #4c5bd4)',
  'radial-gradient(60% 40% at 40% 30%, #ffd6b8aa, transparent 70%), linear-gradient(160deg, #3a1424, #e0688a)',
];

export default function BrandsPage() {
  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <section className="cl-landing-hero cl-landing-hero--window">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--window">
          <MeshGradient />
        </div>
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
        <BrandLiveWindow />
      </section>

      <section aria-label="함께 쓰는 플랫폼" className="cl-landing-logos">
        <LogoWall />
      </section>

      <section aria-labelledby="trio-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="trio-title">
          정하기만 하면, 나머지는 Clipers가
        </h2>
        <div className="cl-features cl-features--three">
          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>예산과 조건만 정하세요</h3>
              <p>예산, 올릴 플랫폼, 꼭 지켜야 할 조건만 정하면 캠페인 준비가 끝나요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <div className="cl-shot__field">
                  <span>총 예산</span>
                  <span className="cl-shot__input">3,000,000원</span>
                </div>
                <div className="cl-shot__field">
                  <span>올릴 플랫폼</span>
                  <span className="cl-shot__platforms">
                    {PLATFORMS.slice(0, 5).map((platform, index) => (
                      <span data-on={index < 3} key={platform.value}>
                        <PlatformIcon platform={platform.value} size={16} />
                      </span>
                    ))}
                  </span>
                </div>
                <div className="cl-shot__field">
                  <span>꼭 지킬 조건</span>
                  <span className="cl-shot__input">후렴 15초 이상 · #여름밤챌린지</span>
                </div>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>크리에이터가 만들어요</h3>
              <p>지원한 크리에이터 중 운영팀이 승인한 사람만 영상을 만들어 올려요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot cl-feature__shot--devices">
              {SCREENS.map((background) => (
                <DeviceFrame key={background} statusBar={false}>
                  <div className="cl-clip-screen" style={{ background }} />
                </DeviceFrame>
              ))}
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>나머지는 Clipers가</h3>
              <p>검수, 조회수 집계, 크리에이터 정산과 지급까지 Clipers가 맡아요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <ul className="cl-shot__rows">
                  <li>
                    <span className="cl-shot__row-text">
                      <span>영상 검수</span>
                      <small>올라온 지 48시간 안에</small>
                    </span>
                    <StatusDot pulse tone="yellow">
                      3개 검수 중
                    </StatusDot>
                  </li>
                  <li>
                    <span className="cl-shot__row-text">
                      <span>조회수 집계</span>
                      <small>매일</small>
                    </span>
                    <StatusDot pulse tone="blue">
                      집계 중
                    </StatusDot>
                  </li>
                  <li>
                    <span className="cl-shot__row-text">
                      <span>크리에이터 정산</span>
                      <small>매주</small>
                    </span>
                    <StatusDot tone="green">완료</StatusDot>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="verify-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="verify-title">
          검증된 조회수만 정산에 쓰여요
        </h2>
        <div className="cl-verify">
          <div aria-hidden className="cl-verify__shot">
            <div className="cl-shot cl-shot--review">
              <div className="cl-review__clip">
                <DeviceFrame statusBar={false}>
                  <div className="cl-clip-screen" style={{ background: SCREENS[0] }} />
                </DeviceFrame>
                <div>
                  <p className="cl-review__title">여름밤 후렴 챌린지</p>
                  <p className="cl-review__meta">
                    <Avatar name="하루" size="sm" />
                    하루 · 유튜브 쇼츠
                  </p>
                </div>
              </div>
              <dl className="cl-review__checks">
                <div>
                  <dt>요구사항</dt>
                  <dd>후렴 15초 이상 · #여름밤챌린지</dd>
                  <StatusDot tone="green">확인</StatusDot>
                </div>
                <div>
                  <dt>조회수</dt>
                  <dd>48,200회 · 자동 수집</dd>
                  <StatusDot tone="green">확인</StatusDot>
                </div>
                <div>
                  <dt>급증 감지</dt>
                  <dd>최근 24시간 증가 정상</dd>
                  <StatusDot tone="green">정상</StatusDot>
                </div>
              </dl>
              <div className="cl-review__actions">
                <span className={buttonClass({ variant: 'secondary', size: 'sm' })}>반려</span>
                <span className={buttonClass({ variant: 'primary', size: 'sm' })}>승인</span>
              </div>
            </div>
          </div>
          <div className="cl-verify__points">
            <div>
              <h3>사람이 직접 검수해요</h3>
              <p>올라온 영상은 운영팀이 정해진 시간 안에 요구사항대로인지 확인해요. 통과한 영상만 정산돼요.</p>
            </div>
            <div>
              <h3>플랫폼에 맞게 확인해요</h3>
              <p>유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 크리에이터가 낸 화면 캡처와 대조해요.</p>
            </div>
            <div>
              <h3>급증은 따로 봐요</h3>
              <p>짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요. 걸러진 조회수에는 예산이 쓰이지 않아요.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title" className="cl-landing-section">
        <h2 className="cl-landing-section__title" id="features-title">
          예산은 조회수에만
        </h2>
        <div className="cl-features">
          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>쓴 만큼만 줄어요</h3>
              <p>검증된 조회수만큼만 예산이 쓰이고, 남은 예산은 언제든 실시간으로 보여요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">남은 예산</p>
                <p className="cl-shot__big">
                  285만원 <small>/ 300만원</small>
                </p>
                <ProgressBar label="예산 사용 예시" value={0.05} />
                <dl className="cl-shot__ledger">
                  <div>
                    <dt>캠페인 기간</dt>
                    <dd>9월 15일 – 10월 15일</dd>
                  </div>
                  <div>
                    <dt>예산을 다 쓰면</dt>
                    <dd>캠페인 자동 종료</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>클립마다 상한을 둬요</h3>
              <p>영상 하나가 예산을 독차지하지 않도록, 클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">클립별 정산</p>
                <ul className="cl-shot__bars">
                  <li>
                    <span>하루 · 여름밤 후렴 챌린지</span>
                    <ProgressBar label="상한 대비" value={1} />
                    <StatusDot tone="gray">상한 도달</StatusDot>
                  </li>
                  <li>
                    <span>민지 · 여름밤 립싱크</span>
                    <ProgressBar label="상한 대비" value={0.64} />
                  </li>
                  <li>
                    <span>도윤 · 퇴근길 여름밤</span>
                    <ProgressBar label="상한 대비" value={0.31} />
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>승인한 크리에이터만</h3>
              <p>크리에이터는 캠페인마다 지원하고, 운영팀 승인을 받은 사람만 영상을 올려요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">지원한 크리에이터</p>
                <ul className="cl-shot__rows">
                  <li>
                    <Avatar name="하루" size="sm" />
                    <span className="cl-shot__row-text">
                      <span>하루</span>
                      <small>음악 · 유튜브 쇼츠</small>
                    </span>
                    <StatusDot tone="green">승인</StatusDot>
                  </li>
                  <li>
                    <Avatar name="민지" size="sm" />
                    <span className="cl-shot__row-text">
                      <span>민지</span>
                      <small>뷰티 · 인스타그램 릴스</small>
                    </span>
                    <StatusDot pulse tone="yellow">
                      검토 중
                    </StatusDot>
                  </li>
                  <li>
                    <Avatar name="도윤" size="sm" />
                    <span className="cl-shot__row-text">
                      <span>도윤</span>
                      <small>음악 · 틱톡</small>
                    </span>
                    <StatusDot tone="green">승인</StatusDot>
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article className="cl-feature">
            <div className="cl-feature__text">
              <h3>7개 숏폼 플랫폼에 한 번에</h3>
              <p>캠페인 하나로 국내에서 많이 쓰는 숏폼 플랫폼에 동시에 퍼뜨려요.</p>
            </div>
            <div aria-hidden className="cl-feature__shot">
              <div className="cl-shot">
                <p className="cl-shot__title">올릴 플랫폼</p>
                <ul className="cl-shot__platform-list">
                  {PLATFORMS.map((platform) => (
                    <li key={platform.value}>
                      <PlatformIcon platform={platform.value} size={18} />
                      {platform.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>
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
              <dt>48시간</dt>
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

      <LandingFaq items={ADVERTISER_FAQ} path="/brands" />
      <p className="cl-faq-more">
        업종별 활용법은 <Link href="/guides#advertiser">광고주 가이드</Link>에서 볼 수 있어요.
      </p>

      <section className="cl-landing-cta">
        <h2>다음 캠페인을 Clipers에서 시작하세요</h2>
        <div className="cl-landing-hero__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="secondary">
            진행 중인 캠페인 보기
          </ButtonLink>
          <ButtonLink href="/contact?from=/brands" size="lg" variant="secondary">
            상담 문의
          </ButtonLink>
        </div>
      </section>
    </LandingChrome>
  );
}
