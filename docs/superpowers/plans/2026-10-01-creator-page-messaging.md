# 크리에이터 페이지 메시지·구조 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 크리에이터 페이지(`/`)를 "구독자 0명부터, 조회수만큼 받으세요" 메시지로 다시 쓰고, 클리핑 설명 섹션을 새로 넣고, 그에 따라 검수 시간(최대 48시간)·소개 캠페인 라벨·카카오 숏폼 이름을 제품 전체에서 맞춘다.

**Architecture:** 기존 섹션과 컴포넌트는 그대로 두고 문구·순서만 바꾼다. 새 비주얼은 클라이언트 컴포넌트 `clipping-stage.tsx` 하나로 만들고, 기존 macOS 창(`cl-demo`)·`DeviceFrame`·`StatusDot`과 실제 클립(`public/media/clips/drive.mp4`)을 재사용한다. 정책 값(검수 시간 선택지, 플랫폼 이름)은 `@clipers/db`에서 테스트로 고정하고, DB에는 마이그레이션으로 상한을 건다.

**Tech Stack:** Next.js(App Router) · React · TypeScript · Vitest(`@clipers/db`) · Supabase(Postgres) · pnpm + turbo · 전역 CSS(`packages/ui/src/styles/components.css`)

**Spec:** `docs/superpowers/specs/2026-10-01-creator-page-messaging-design.md`

**공통 규칙 (모든 Task):**
- UI 문구는 존댓말 해요체. 대문자·영문 아이브로, 단계 번호, 체크 표시 나열, 장식용 그라디언트·위젯은 쓰지 않는다.
- 브랜드 단가(`brandCpm`)는 크리에이터 페이지에 절대 노출하지 않는다. 금액 계산은 `DEFAULT_PRICING.creatorCpm`만 쓴다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.

---

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `packages/db/src/campaignDraft.ts` | 수정 | 검수 시간 선택지 `[24, 48]` |
| `packages/db/src/campaignDraft.test.ts` | 수정 | 선택지 고정 테스트 |
| `supabase/migrations/20261001100000_review_sla_max_48.sql` | 생성 | 기존 72시간 캠페인을 48로 낮추고 상한 제약 추가 |
| `packages/db/src/platforms.ts` / `platforms.test.ts` | 수정 | "카카오 숏폼" 라벨 |
| `apps/site/components/logo-wall.tsx` | 수정 | 로고 대체 텍스트 "카카오 숏폼" |
| `apps/site/app/brands/page.tsx` | 수정 | 검수 48시간 문구, FAQ 카카오 이름 |
| `apps/app/lib/status.ts` | 수정 | `CREATOR_CONTENT_TYPE_LABEL` 추가 |
| `apps/app/app/creator/campaigns/page.tsx` | 수정 | 크리에이터 라벨 사용 |
| `apps/app/app/onboarding/onboarding-flow.tsx` | 수정 | 클리핑 정의·소개 라벨 |
| `apps/site/components/rotating-headline.tsx` | 수정 | `바뀌는 말 + 고정 뒷말` 구조 |
| `apps/site/components/campaign-types.tsx` | 수정 | 세 종류 문구, 소개 라벨 |
| `apps/site/components/clipping-stage.tsx` | 생성 | 클리핑 설명 비주얼(창 + 휴대폰 + 결과) |
| `packages/ui/src/styles/components.css` | 수정 | `cl-clip-*` 스타일 추가 |
| `apps/site/app/page.tsx` | 수정 | 메타·히어로·섹션 순서·벤토·FAQ·CTA·캠페인 표시 기준 |

---

### Task 1: 검수 시간 최대 48시간

**Files:**
- Modify: `packages/db/src/campaignDraft.ts:7`
- Test: `packages/db/src/campaignDraft.test.ts`
- Create: `supabase/migrations/20261001100000_review_sla_max_48.sql`
- Modify: `apps/site/app/brands/page.tsx:122`, `apps/site/app/brands/page.tsx:346`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/db/src/campaignDraft.test.ts`의 import에 `REVIEW_SLA_OPTIONS`를 추가하고, 파일 끝에 아래를 붙인다.

```ts
import {
  REVIEW_SLA_OPTIONS,
  campaignDraftErrors,
  campaignDraftProgress,
  clipCapToCreatorPayout,
  creatorPayoutToClipCap,
  emptyCampaignDraft,
  firstCampaignDraftError,
  type CampaignDraft,
} from './campaignDraft';
```

```ts
describe('REVIEW_SLA_OPTIONS', () => {
  it('caps review at 48 hours, which the creator page promises', () => {
    expect(REVIEW_SLA_OPTIONS).toEqual([24, 48]);
    expect(REVIEW_SLA_OPTIONS).toContain(Number(emptyCampaignDraft().reviewSlaHours));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db test -- campaignDraft`
Expected: FAIL — `expected [ 24, 48, 72 ] to deeply equal [ 24, 48 ]`

- [ ] **Step 3: 구현**

`packages/db/src/campaignDraft.ts:7`:

```ts
// The creator page promises review within 48 hours, so brands cannot pick longer.
export const REVIEW_SLA_OPTIONS = [24, 48] as const;
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db test -- campaignDraft`
Expected: PASS (모든 테스트)

- [ ] **Step 5: 마이그레이션 작성**

`supabase/migrations/20261001100000_review_sla_max_48.sql`:

```sql
-- Review happens within 48 hours at most (the creator page promises it). Mirrors REVIEW_SLA_OPTIONS in
-- packages/db/src/campaignDraft.ts. Campaigns created with 72 hours move down to 48.
update public.campaigns set review_sla_hours = 48 where review_sla_hours > 48;

alter table public.campaigns
  add constraint campaigns_review_sla_hours_max check (review_sla_hours <= 48);
```

- [ ] **Step 6: 적용 전 영향 확인 후 적용**

Supabase MCP `execute_sql`로 먼저 영향 행을 확인한다:

```sql
select id, title, status, review_sla_hours from public.campaigns where review_sla_hours > 48;
```

결과를 사용자에게 보고한다(바뀌는 캠페인 목록). 사용자가 확인하면 Supabase MCP `apply_migration`(name: `review_sla_max_48`, query: 위 SQL)으로 적용한다. 적용 후 다시 조회해 0행인지 확인한다.

- [ ] **Step 7: 브랜드 페이지 문구**

`apps/site/app/brands/page.tsx:122`:

```tsx
                      <small>올라온 지 48시간 안에</small>
```

`apps/site/app/brands/page.tsx:346`:

```tsx
              <dt>48시간</dt>
```

(바로 아래 `<dd>안에 영상 검수</dd>`는 그대로)

- [ ] **Step 8: 커밋**

```bash
git add packages/db/src/campaignDraft.ts packages/db/src/campaignDraft.test.ts supabase/migrations/20261001100000_review_sla_max_48.sql apps/site/app/brands/page.tsx
git commit -m "feat: review within 48 hours at most

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: "카카오 숏폼"으로 이름 통일

**Files:**
- Modify: `packages/db/src/platforms.ts:8`
- Test: `packages/db/src/platforms.test.ts`
- Modify: `apps/site/components/logo-wall.tsx:17`
- Modify: `apps/site/app/brands/page.tsx:20`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/db/src/platforms.test.ts`의 `describe('platformLabel')` 안에 추가:

```ts
  it('names Kakao by its official name', () => {
    expect(platformLabel('kakao_shorts')).toBe('카카오 숏폼');
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db test -- platforms`
Expected: FAIL — `expected '카카오 쇼츠' to be '카카오 숏폼'`

- [ ] **Step 3: 구현**

`packages/db/src/platforms.ts:8`:

```ts
  { value: 'kakao_shorts', label: '카카오 숏폼' },
```

`apps/site/components/logo-wall.tsx:17`:

```ts
  { src: '/platforms/kakao_shorts.png', label: '카카오 숏폼' },
```

`apps/site/app/brands/page.tsx:20`의 답에서 `카카오 쇼츠예요` → `카카오 숏폼이에요`:

```ts
  { q: '어떤 플랫폼을 지원하나요?', a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 플랫폼을 고를 수 있어요.' },
```

(크리에이터 FAQ는 Task 7에서 통째로 바꾼다.)

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db test`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/platforms.ts packages/db/src/platforms.test.ts apps/site/components/logo-wall.tsx apps/site/app/brands/page.tsx
git commit -m "fix: call Kakao's short-form platform 카카오 숏폼

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 크리에이터 화면의 UGC → "소개"

**Files:**
- Modify: `apps/app/lib/status.ts:23`
- Modify: `apps/app/app/creator/campaigns/page.tsx:19,125`
- Modify: `apps/app/app/onboarding/onboarding-flow.tsx:98-108`

브랜드·관리자 화면은 계속 `CONTENT_TYPE_LABEL`(UGC)을 쓴다. 이 앱에는 테스트 러너가 없으므로 타입 검사·빌드로 확인한다.

- [ ] **Step 1: 크리에이터용 라벨 추가**

`apps/app/lib/status.ts`의 `CONTENT_TYPE_LABEL` 아래:

```ts
export const CONTENT_TYPE_LABEL: Record<string, string> = { clipping: '클리핑', ugc: 'UGC' };
// Creators see plain words: "UGC" is marketer jargon, and these videos do not need the product to be used.
export const CREATOR_CONTENT_TYPE_LABEL: Record<string, string> = { clipping: '클리핑', ugc: '소개' };
```

- [ ] **Step 2: 크리에이터 캠페인 목록에서 사용**

`apps/app/app/creator/campaigns/page.tsx:19`:

```ts
import { APPLICATION_STATUS, CREATOR_CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
```

`apps/app/app/creator/campaigns/page.tsx:125`:

```tsx
                    meta={`${campaign.category} · ${CREATOR_CONTENT_TYPE_LABEL[campaign.content_type] ?? campaign.content_type}`}
```

같은 파일에 `CONTENT_TYPE_LABEL`이 다른 곳에서 쓰이는지 `rg -n CONTENT_TYPE_LABEL apps/app/app/creator`로 확인하고, 있으면 모두 `CREATOR_CONTENT_TYPE_LABEL`로 바꾼다.

- [ ] **Step 3: 온보딩 문구**

`apps/app/app/onboarding/onboarding-flow.tsx`의 첫 두 `ListRow`:

```tsx
              <ListRow
                description="캠페인이 정해 준 영상을 내 방식대로 편집해 올려요."
                icon={<Scissors {...ICON} />}
                title="클리핑"
                tone="brand"
              />
              <ListRow
                description="제품이나 서비스를 내 스타일대로 소개하는 영상을 찍어요."
                icon={<Clapperboard {...ICON} />}
                title="소개"
                tone="sky"
              />
```

- [ ] **Step 4: 타입 검사**

Run: `pnpm --filter @clipers/app exec tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/app/lib/status.ts apps/app/app/creator/campaigns/page.tsx apps/app/app/onboarding/onboarding-flow.tsx
git commit -m "feat(app): creators see 소개 instead of UGC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 로테이팅 제목을 "바뀌는 말 + 고정 뒷말"로

**Files:**
- Modify: `apps/site/components/rotating-headline.tsx`
- Modify: `packages/ui/src/styles/components.css:1435` (`.cl-rotator__lead` → `.cl-rotator__tail`)

- [ ] **Step 1: 컴포넌트 수정**

`apps/site/components/rotating-headline.tsx` 전체를 아래로 바꾼다(측정·전환 로직은 그대로, 상수와 마크업 순서만 바뀜).

```tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Section title above the creator logo wall: a phrase that rolls up to the next one, then a fixed tail that
// points at the platform marks below. The slot's width follows the active phrase so the centred line never jumps.
// Reduced motion shows one static sentence; screen readers always get the full sentence.

const PHRASES = ['새 채널이어도', '수익창출 전이어도', '숏폼이 처음이어도'];
const TAIL = '여기에 올리면 돼요';
const SENTENCE = `${PHRASES.join(', ')} ${TAIL}`;
const STEP_MS = 2600;

export default function RotatingHeadline() {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const phraseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState<number>();
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      return;
    }
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setActive((index) => (index + 1) % PHRASES.length), STEP_MS);
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const measure = () => setWidth(phraseRefs.current[active]?.offsetWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);

  if (still) return <h2 className="cl-rotator">{SENTENCE}</h2>;

  return (
    <h2 aria-label={SENTENCE} className="cl-rotator" ref={rootRef}>
      <span aria-hidden className="cl-rotator__slot" style={{ width }}>
        {PHRASES.map((phrase, index) => (
          <span
            className="cl-rotator__phrase"
            data-state={index === active ? 'active' : index === (active + PHRASES.length - 1) % PHRASES.length ? 'past' : 'next'}
            key={phrase}
            ref={(element) => {
              phraseRefs.current[index] = element;
            }}
          >
            {phrase}
          </span>
        ))}
      </span>{' '}
      <span aria-hidden className="cl-rotator__tail">
        {TAIL}
      </span>
    </h2>
  );
}
```

- [ ] **Step 2: CSS 클래스 이름 변경**

`packages/ui/src/styles/components.css:1435`:

```css
.cl-rotator__tail { color: var(--color-text-subtle); }
```

`rg -n "cl-rotator__lead" apps packages`로 다른 사용처가 없는지 확인한다(없어야 함).

- [ ] **Step 3: 타입 검사**

Run: `pnpm --filter @clipers/site exec tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/site/components/rotating-headline.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): logo wall title — new channels welcome, tail points at the platforms

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 캠페인 종류 문구 (클리핑 · 소개 · 음악)

**Files:**
- Modify: `apps/site/components/campaign-types.tsx:12-16`

- [ ] **Step 1: KINDS 문구 교체**

```tsx
const KINDS: { id: keyof typeof MOCK_CAMPAIGNS; label: string; icon: ReactNode; title: string; body: string }[] = [
  {
    id: 'clipping',
    label: '클리핑',
    icon: <Scissors size={26} />,
    title: '클리핑 캠페인.',
    body: '캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 만들어요. 얼굴을 드러내지 않아도, 편집만 할 줄 알면 시작할 수 있어요.',
  },
  {
    id: 'ugc',
    label: '소개',
    icon: <Clapperboard size={26} />,
    title: '소개 캠페인.',
    body: '제품이나 서비스를 내 스타일대로 소개하는 숏폼을 찍어요. 리뷰, 일상, 상황극 무엇이든 괜찮아요.',
  },
  {
    id: 'music',
    label: '음악',
    icon: <Music size={26} />,
    title: '음악 캠페인.',
    body: '정해진 음원을 배경음으로 쓰거나 챌린지에 참여해요. 춤, 립싱크, 브이로그 무엇이든 괜찮아요.',
  },
];
```

- [ ] **Step 2: 타입 검사**

Run: `pnpm --filter @clipers/site exec tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/site/components/campaign-types.tsx
git commit -m "feat(site): campaign kinds say who each one suits; UGC reads 소개

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 클리핑 설명 비주얼 `ClippingStage`

**Files:**
- Create: `apps/site/components/clipping-stage.tsx`
- Modify: `packages/ui/src/styles/components.css` (`.cl-earn` 블록 뒤, 1180행 근처에 추가)

구성: 왼쪽 macOS 창 안의 가로 플레이어(4분 10초짜리 영상 중 01:52–02:26 구간이 타임라인에 초록으로 선택됨) · 오른쪽 `DeviceFrame` 휴대폰에서 같은 장면이 세로로 재생 · 휴대폰 아래 "검수 통과"와 조회수·받을 금액. 두 화면은 같은 클립 `drive.mp4`를 쓴다(가로 화면은 `object-fit: cover`로 가운데를 잘라 보여줌). 단계 번호·화살표는 없다.

- [ ] **Step 1: 컴포넌트 작성**

`apps/site/components/clipping-stage.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { DeviceFrame, PlatformIcon, StatusDot, formatKRW } from '@clipers/ui';

// Clipping explainer visual: a campaign's long video plays in a macOS window with one stretch of its timeline
// selected, and the same stretch plays as a vertical short on the phone beside it; under the phone the short's
// views climb and its payout follows. Both screens play the same clip (the wide one is a centre crop).
// The rate comes from the server page as a plain number (the creator rate only).

const VIDEO = '/media/clips/drive.mp4';
const POSTER = '/media/clips/drive.jpg';
const LOOP_MS = 6000;
const PEAK_VIEWS = 42_000;
const STILL_VIEWS = 42_000;

// The long video is 4:10; the selected stretch is 1:52–2:26.
const DURATION_S = 250;
const RANGE_START_S = 112;
const RANGE_END_S = 146;

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const compact = (views: number) =>
  views >= 10_000 ? `${(views / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : views.toLocaleString('ko-KR');

export default function ClippingStage({ rate }: { rate: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [moving, setMoving] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMoving(false);
      return;
    }
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      setProgress(((now - start) % LOOP_MS) / LOOP_MS);
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      videoRefs.current.forEach((video) => {
        if (!video) return;
        if (entry.isIntersecting) {
          video.currentTime = 0;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
      if (entry.isIntersecting) {
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Views climb for 80% of the loop (slow start, like a clip catching on), then hold.
  const views = moving ? Math.round(PEAK_VIEWS * Math.pow(Math.min(1, progress / 0.8), 2.2)) : STILL_VIEWS;
  const payout = Math.floor((views / 1000) * rate);
  const playhead = RANGE_START_S + (RANGE_END_S - RANGE_START_S) * (moving ? progress : 0.4);
  const pct = (seconds: number) => `${(seconds / DURATION_S) * 100}%`;

  return (
    <div aria-label="긴 영상의 한 구간을 세로 숏폼으로 편집해 올린 예시" className="cl-clip-stage" ref={rootRef} role="img">
      <div aria-hidden className="cl-demo cl-clip-window">
        <div className="cl-demo__titlebar">
          <span className="cl-traffic">
            <span className="cl-traffic__close" />
            <span className="cl-traffic__minimize" />
            <span className="cl-traffic__zoom" />
          </span>
          <span className="cl-demo__title">신차 런칭 풀버전</span>
          <span />
        </div>
        <div className="cl-clip-window__body">
          <div className="cl-clip-window__player">
            <video
              className="cl-clip-window__media"
              loop
              muted
              playsInline
              poster={POSTER}
              preload="none"
              ref={(element) => {
                videoRefs.current[0] = element;
              }}
              src={VIDEO}
            />
          </div>
          <div className="cl-clip-window__timeline">
            <span className="cl-clip-window__range" style={{ left: pct(RANGE_START_S), width: pct(RANGE_END_S - RANGE_START_S) }} />
            <span className="cl-clip-window__playhead" style={{ left: pct(playhead) }} />
          </div>
          <p className="cl-clip-window__meta">
            <span className="cl-number">
              {clock(playhead)} / {clock(DURATION_S)}
            </span>
            <span>
              {clock(RANGE_START_S)} – {clock(RANGE_END_S)} 구간 선택
            </span>
          </p>
        </div>
      </div>

      <div aria-hidden className="cl-clip-stage__phone">
        <DeviceFrame>
          <div className="cl-short">
            <video
              className="cl-short__media"
              loop
              muted
              playsInline
              poster={POSTER}
              preload="none"
              ref={(element) => {
                videoRefs.current[1] = element;
              }}
              src={VIDEO}
            />
          </div>
        </DeviceFrame>
        <div className="cl-clip-stage__result">
          <StatusDot tone="green">검수 통과</StatusDot>
          <p className="cl-clip-stage__views">
            <PlatformIcon platform="naver_clip" size={16} />
            조회수 {compact(views)}
          </p>
          <p className="cl-clip-stage__payout">{formatKRW(payout)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 스타일 추가**

`packages/ui/src/styles/components.css`에서 `@media (max-width: 860px)` 안의 `.cl-earn__phone { width: 200px; }`가 있는 블록이 끝난 바로 뒤에 추가한다.

```css
/* ---------- clipping explainer (creator landing): long video in a macOS window → the same stretch as a short ---------- */
.cl-clipping__note { margin: calc(var(--space-4) * -1) auto var(--space-7); color: var(--color-text-subtle); font-size: var(--font-size-2); text-align: center; }
.cl-clip-stage { display: grid; grid-template-columns: minmax(0, 600px) 220px; align-items: center; justify-content: center; gap: 56px; }
.cl-clip-window { width: 100%; }
.cl-clip-window__body { display: grid; gap: var(--space-3); padding: var(--space-4); }
.cl-clip-window__player { aspect-ratio: 16 / 9; overflow: hidden; border-radius: 10px; background: #000; }
.cl-clip-window__media { display: block; width: 100%; height: 100%; object-fit: cover; }
.cl-clip-window__timeline { position: relative; height: 4px; border-radius: 2px; background: var(--gray-a4); }
.cl-clip-window__range { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--brand-9); }
.cl-clip-window__playhead { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4); transform: translate(-50%, -50%); }
.cl-clip-window__meta { display: flex; justify-content: space-between; gap: var(--space-3); color: var(--color-text-subtle); font-size: var(--font-size-1); font-variant-numeric: tabular-nums; }
.cl-clip-stage__phone { display: grid; justify-items: center; gap: var(--space-4); width: 220px; }
.cl-clip-stage__result { display: grid; justify-items: center; gap: var(--space-1); }
.cl-clip-stage__views { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-muted); font-size: var(--font-size-2); font-variant-numeric: tabular-nums; }
.cl-clip-stage__payout { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.035em; }
@media (max-width: 860px) {
  .cl-clip-stage { grid-template-columns: minmax(0, 1fr); justify-items: center; gap: var(--space-7); }
  .cl-clip-stage__phone { width: 200px; }
}
@media (prefers-reduced-motion: reduce) {
  .cl-clip-window__media { display: none; }
  .cl-clip-window__player { background: #000 url("/media/clips/drive.jpg") center / cover no-repeat; }
}
```

(가로 플레이어는 움직임 줄이기 설정에서 재생하지 않으므로 포스터 이미지를 배경으로 보여준다. 휴대폰 쪽 `.cl-short__media`는 기존 규칙대로 포스터가 보인다.)

- [ ] **Step 3: 타입 검사**

Run: `pnpm --filter @clipers/site exec tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/site/components/clipping-stage.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): clipping explainer visual — a long video's stretch becomes a short

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 크리에이터 페이지 재구성 (`apps/site/app/page.tsx`)

**Files:**
- Modify: `apps/site/app/page.tsx`

- [ ] **Step 1: import·상수·메타·FAQ**

import 줄에서 `ScanSearch`를 `UserRound`로 바꾸고(지급 요청 항목이 빠지므로 `Wallet`도 제거), `ClippingStage`를 추가한다.

```tsx
import { ChevronRight, Eye, ScanSearch, UserRound } from 'lucide-react';
```

```tsx
import ClippingStage from '@/components/clipping-stage';
```

파일 위쪽 주석 두 줄을 바꾼다.

```tsx
// Creator landing (the front door; brands have /brands). Design: docs/superpowers/specs/2026-10-01-creator-page-messaging-design.md.
// Order follows what a newcomer asks: why me → what is clipping → what kinds → what's open → can I trust it.
```

메타데이터:

```tsx
export const metadata: Metadata = {
  title: 'Clipers — 구독자 0명부터, 숏폼 조회수만큼 받으세요',
  description: '구독자 수와 상관없이 캠페인에 참여하고, 올린 숏폼의 조회수만큼 정산받으세요. 가입과 지원은 무료예요.',
  alternates: { canonical: '/' },
};
```

FAQ 목록 전체(금액 예시는 크리에이터 단가에서 계산):

```tsx
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
```

(`formatKRW`는 `80,000원`처럼 "원"까지 붙여 준다. 결과: "예를 들어 1천 회당 800원인 캠페인이라면, 조회수 10만 회에 80,000원이에요.")

- [ ] **Step 2: 히어로**

```tsx
          <h1 className="cl-landing-hero__title">
            구독자 0명부터,
            <br />
            조회수만큼 받으세요
          </h1>
          <p className="cl-landing-hero__lead">알리고 싶은 영상이 있는 곳과 크리에이터를 이어 드려요. 숏폼으로 만들어 올리면, 새 채널이어도 조회수만큼 받아요.</p>
```

- [ ] **Step 3: 섹션 순서 — 로고 월 다음에 클리핑 설명, 캠페인 종류, 모집 중 캠페인**

로고 월 `</section>` 바로 뒤에 클리핑 설명과 `<CampaignTypes>`를 놓고, 기존 모집 중 캠페인 블록을 그 아래로 옮기며 표시 조건을 바꾼다. 원래 벤토 뒤에 있던 `<CampaignTypes videos={showcaseVideos} />`는 지운다.

```tsx
      <section aria-labelledby="clipping-title" className="cl-landing-section cl-clipping">
        <h2 className="cl-landing-section__title" id="clipping-title">
          찍지 않아도, 편집만으로
        </h2>
        <p className="cl-landing-section__lead">
          클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리는 일이에요. 스트리머 방송, 신제품 영상, 게임 플레이처럼 쓸 수 있는 영상은
          캠페인마다 다르고, 자르고 자막을 넣고 순서를 바꾸는 편집은 자유예요.
        </p>
        <p className="cl-clipping__note">영상을 더 많은 사람에게 알리고 싶은 쪽이 조회수만큼 비용을 내요. Clipers에서는 이런 요청을 캠페인이라고 불러요.</p>
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
```

`.cl-landing-section__lead`에는 최대 폭이 없어서 두 문장짜리 본문이 1160px로 퍼진다. `packages/ui/src/styles/components.css`의 `.cl-clipping__note` 줄 바로 위에 추가한다:

```css
.cl-clipping .cl-landing-section__lead { max-width: 720px; line-height: 1.65; }
```

- [ ] **Step 4: 벤토 문구**

```tsx
            <h3>간단하게</h3>
            <p>정산된 금액이 3,000원을 넘으면, 버튼 한 번으로 지급을 요청해요.</p>
```

```tsx
                <span>
                  <i>48시간</i>
                  <i>승인</i>
                </span>
```

```tsx
            <h3>빠르게</h3>
            <p>올린 영상은 48시간 안에 검수하고, 통과하면 바로 조회수 집계가 시작돼요.</p>
```

```tsx
            <h3>끝없이</h3>
            <p>조회수가 1,000회를 넘으면 그전 조회수까지 모두 정산되고, 그 뒤로 늘어난 조회수도 매주 이어서 받아요.</p>
```

- [ ] **Step 5: 마지막 CTA 카드**

```tsx
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
```

(버튼 블록은 그대로)

- [ ] **Step 6: 타입 검사·린트**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` 그리고 `pnpm --filter @clipers/site lint`
Expected: 오류 없음 (사용하지 않는 `Wallet` import가 남아 있으면 지운다)

- [ ] **Step 7: 화면 확인**

Run: `pnpm --filter @clipers/site dev` 후 `http://localhost:3000/`을 1440×900과 390px 폭에서 확인한다.
- 순서: 히어로 → 로고 월 → 찍지 않아도, 편집만으로 → 캠페인 종류 → (4개 이상이면) 모집 중 캠페인 → 간단하고, 투명하게 → FAQ → CTA
- 로테이팅 제목이 바뀔 때 줄이 흔들리지 않는다
- 클리핑 비주얼: 창과 휴대폰의 영상이 함께 재생되고, 타임라인 재생 위치가 선택 구간 안에서만 움직이며, 금액이 조회수에 맞춰 오른다
- 390px에서 창이 위, 휴대폰이 아래로 쌓이고 가로 스크롤이 생기지 않는다
- OS의 동작 줄이기를 켜면 영상과 숫자가 멈춘 상태로 보인다
- 모집 중 캠페인: DB의 live 캠페인 수가 3개 이하이면 섹션이 없고, 4개 이상이면 보인다(현재 데이터로 어느 쪽인지 기록)

- [ ] **Step 8: 커밋**

```bash
git add apps/site/app/page.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): creator page leads with 구독자 0명부터 and explains clipping first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 전체 확인

- [ ] **Step 1: 남은 옛 문구 검색**

Run: `rg -n "72시간|24~72|카카오 쇼츠|UGC 캠페인|브랜드가 준 영상" apps packages --glob '!**/node_modules/**'`
Expected: 결과 없음 (브랜드·관리자 화면의 `CONTENT_TYPE_LABEL`의 `'UGC'`는 의도된 것이므로 위 패턴에 걸리지 않는다)

- [ ] **Step 2: 브랜드 단가 노출 검사**

Run: `rg -n "brandCpm" apps/site/app/page.tsx apps/site/components`
Expected: 결과 없음

- [ ] **Step 3: 전체 테스트·빌드**

Run: `pnpm test` 그리고 `pnpm --filter @clipers/site build` 그리고 `pnpm --filter @clipers/app build`
Expected: 모두 성공

- [ ] **Step 4: 결과 보고**

사용자에게 바뀐 섹션 순서, 모집 중 캠페인이 현재 보이는지 여부, 마이그레이션으로 바뀐 캠페인 수를 알린다.
