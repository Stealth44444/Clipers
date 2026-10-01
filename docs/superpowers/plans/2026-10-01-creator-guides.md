# 크리에이터 가이드 (AEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/site`에 크리에이터 가이드 15개(`/guides/<slug>`)와 목록 페이지(`/guides`)를 만들고, 사이트맵·구조화 데이터·llms.txt·푸터(가이드 링크와 회사 정보)를 함께 맞춘다.

**Architecture:** 가이드는 타입이 정해진 데이터(`apps/site/lib/guides/*`)이고, 서버 컴포넌트 하나(`GuideArticle`)가 공통 틀로 그린다. 정책 숫자는 `@clipers/db` 상수에서 가져오고, FAQ는 기존 `CREATOR_FAQ`를 id로 참조한다. 데이터 무결성(슬러그·FAQ id·관련 링크·금지 문구)은 vitest로 고정한다.

**Tech Stack:** Next.js 15 App Router(서버 컴포넌트, `generateStaticParams`) · TypeScript · Vitest · 전역 CSS(`packages/ui/src/styles/components.css`) · pnpm + turbo

**Spec:** `docs/superpowers/specs/2026-10-01-creator-guides-aeo-design.md`

**공통 규칙 (모든 Task):**
- UI 문구는 존댓말 해요체. 대문자·영문 아이브로, STEP 카드, 체크 표시 나열, 장식, 위젯(계산기 등)은 쓰지 않는다.
- 브랜드 단가(`brandCpm`)는 가이드 어디에도 쓰지 않는다. 금액은 `DEFAULT_PRICING.creatorCpm`만.
- 평균 수익·후기·수익 보장, "저작권 걱정 없음"·"클레임 보호", 다른 플랫폼의 수익화 조건 숫자는 쓰지 않는다.
- 개발 서버가 켜져 있으면 `next build`를 돌리지 않는다(`.next`가 덮여 개발 서버가 깨진다). 빌드 전에 개발 서버를 끈다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `apps/site/package.json`, `apps/site/vitest.config.ts` | 수정·생성 | 사이트 패키지에 vitest |
| `apps/site/lib/creator-faq.ts` (+ `.test.ts`) | 수정·생성 | FAQ 항목에 `id`, `faqById` |
| `apps/site/lib/guides/facts.ts` (+ `.test.ts`) | 생성 | 정책 숫자 문구와 `earningsFor` |
| `apps/site/lib/guides/types.ts` | 생성 | `Guide` 타입 |
| `apps/site/lib/guides/common.ts` | 생성 | 모든 가이드 공통 "알아둘 점"·"시작하는 법" |
| `apps/site/lib/guides/topic.ts` · `situation.ts` · `problem.ts` · `platform.ts` | 생성 | 가이드 데이터 15개 |
| `apps/site/lib/guides/index.ts` (+ `.test.ts`) | 생성 | `GUIDES`, `GUIDE_GROUPS`, `guideBySlug` + 무결성 테스트 |
| `apps/site/lib/company.ts` | 생성 | 회사 정보 상수 |
| `apps/site/components/landing-chrome.tsx` | 수정 | 푸터에 가이드 링크·회사 정보 |
| `apps/site/components/guide-article.tsx` | 생성 | 가이드 공통 틀 |
| `apps/site/app/guides/page.tsx` · `apps/site/app/guides/[slug]/page.tsx` | 생성 | 목록·가이드 라우트 |
| `packages/ui/src/styles/components.css` | 수정 | `cl-guide*`, 푸터 회사 정보 스타일 |
| `apps/site/app/sitemap.ts` · `apps/site/app/llms.txt/route.ts` | 수정 | 가이드 반영 |

---

### Task 1: 사이트 패키지 테스트 환경 + FAQ id

**Files:**
- Modify: `apps/site/package.json`
- Create: `apps/site/vitest.config.ts`
- Modify: `apps/site/lib/creator-faq.ts`
- Test: `apps/site/lib/creator-faq.test.ts`

- [ ] **Step 1: vitest 추가**

`apps/site/package.json`의 `"test"`를 `"vitest run"`으로 바꾸고 devDependencies에 `"vitest": "^2.1.0"`을 추가한다. 그다음:

Run: `pnpm install`
Expected: 오류 없이 끝남(vitest는 이미 lockfile에 있음)

`apps/site/vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { environment: 'node' },
});
```

- [ ] **Step 2: 실패하는 테스트**

`apps/site/lib/creator-faq.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CREATOR_FAQ, faqById } from './creator-faq';

describe('CREATOR_FAQ', () => {
  it('gives every question a unique id', () => {
    const ids = CREATOR_FAQ.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'what-is-clipping', 'small-channel', 'others-videos', 'fees', 'how-much', 'per-clip-max',
      'min-views', 'budget-runs-out', 'when-paid', 'platforms', 'view-check', 'rejected',
    ]);
  });

  it('looks questions up by id', () => {
    expect(faqById('fees').q).toBe('가입비나 지원 비용이 있나요?');
    expect(() => faqById('nope')).toThrow('Unknown FAQ id: nope');
  });

  it('never states the brand rate', () => {
    expect(CREATOR_FAQ.some((item) => item.a.includes('1천 회당 3,000원'))).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @clipers/site test`
Expected: FAIL — `faqById` is not exported / `id` undefined

- [ ] **Step 4: 구현**

`apps/site/lib/creator-faq.ts`에서 타입을 `{ id: string; q: string; a: string }[]`로 바꾸고, 각 항목 맨 앞에 순서대로 `id`를 붙인다: `what-is-clipping`, `small-channel`, `others-videos`, `fees`, `how-much`, `per-clip-max`, `min-views`, `budget-runs-out`, `when-paid`, `platforms`, `view-check`, `rejected`. 파일 끝에 추가:

```ts
export function faqById(id: string): { id: string; q: string; a: string } {
  const item = CREATOR_FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown FAQ id: ${id}`);
  return item;
}
```

- [ ] **Step 5: 통과 확인 후 커밋**

Run: `pnpm --filter @clipers/site test`
Expected: PASS (3)

```bash
git add apps/site/package.json apps/site/vitest.config.ts apps/site/lib/creator-faq.ts apps/site/lib/creator-faq.test.ts pnpm-lock.yaml
git commit -m "test(site): vitest for the site; creator FAQ items get ids

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 정책 문구와 금액 계산 (`facts.ts`)

**Files:**
- Create: `apps/site/lib/guides/facts.ts`
- Test: `apps/site/lib/guides/facts.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'vitest';
import { MIN_VIEWS, RATE, REVIEW_HOURS, WITHDRAW_FROM, earnings, earningsFor } from './facts';

describe('guide facts', () => {
  it('words the public creator policy', () => {
    expect(RATE).toBe('800원');
    expect(MIN_VIEWS).toBe('1,000회');
    expect(REVIEW_HOURS).toBe('48시간');
    expect(WITHDRAW_FROM).toBe('3,000원');
  });

  it('pays nothing below the minimum and the creator rate above it', () => {
    expect(earningsFor(999)).toBe(0);
    expect(earningsFor(1_000)).toBe(800);
    expect(earningsFor(100_000)).toBe(80_000);
    expect(earningsFor(1_000_000)).toBe(800_000);
    expect(earnings(100_000)).toBe('80,000원');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site test -- facts`
Expected: FAIL — cannot find module './facts'

- [ ] **Step 3: 구현**

`apps/site/lib/guides/facts.ts`:

```ts
import { DEFAULT_PRICING, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { formatKRW } from '@clipers/ui';

// Public creator policy, worded once for the guides. Creator rate only: the brand rate is never public.

export const RATE = formatKRW(DEFAULT_PRICING.creatorCpm);
export const MIN_VIEWS = `${MIN_PAYOUT_VIEWS.toLocaleString('ko-KR')}회`;
export const REVIEW_HOURS = `${Math.max(...REVIEW_SLA_OPTIONS)}시간`;
export const WITHDRAW_FROM = formatKRW(MIN_WITHDRAWAL);

/** What a clip earns at the default creator rate (nothing until it reaches the minimum payout views). */
export function earningsFor(views: number): number {
  if (views < MIN_PAYOUT_VIEWS) return 0;
  return Math.floor((views / 1000) * DEFAULT_PRICING.creatorCpm);
}

export const earnings = (views: number) => formatKRW(earningsFor(views));
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `pnpm --filter @clipers/site test -- facts`
Expected: PASS

```bash
git add apps/site/lib/guides/facts.ts apps/site/lib/guides/facts.test.ts
git commit -m "feat(site): guide facts from the creator policy constants

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 가이드 데이터 15개 + 무결성 테스트

**Files:**
- Create: `apps/site/lib/guides/types.ts`, `common.ts`, `topic.ts`, `situation.ts`, `problem.ts`, `platform.ts`, `index.ts`
- Test: `apps/site/lib/guides/index.test.ts`

- [ ] **Step 1: 실패하는 무결성 테스트**

`apps/site/lib/guides/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CREATOR_FAQ } from '../creator-faq';
import { GUIDES, GUIDE_GROUPS, guideBySlug } from './index';

const text = (guide: (typeof GUIDES)[number]) =>
  [guide.title, guide.description, ...guide.answer, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])].join('\n');

describe('guides', () => {
  it('has 15 guides in four groups', () => {
    expect(GUIDES).toHaveLength(15);
    const count = (group: string) => GUIDES.filter((guide) => guide.group === group).length;
    expect([count('topic'), count('situation'), count('problem'), count('platform')]).toEqual([4, 6, 4, 1]);
    expect(GUIDE_GROUPS.map((group) => group.id)).toEqual(['topic', 'situation', 'problem', 'platform']);
  });

  it('uses unique, url-safe slugs', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('asks a question in every title and links only to real FAQs and guides', () => {
    const faqIds = new Set(CREATOR_FAQ.map((item) => item.id));
    for (const guide of GUIDES) {
      expect(guide.title.endsWith('?')).toBe(true);
      expect(guide.answer.length).toBeGreaterThanOrEqual(2);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guide.faqIds.length).toBeGreaterThanOrEqual(3);
      for (const id of guide.faqIds) expect(faqIds.has(id)).toBe(true);
      expect(guide.related).toHaveLength(3);
      for (const slug of guide.related) {
        expect(slug).not.toBe(guide.slug);
        expect(guideBySlug(slug)).toBeDefined();
      }
    }
  });

  it('never promises what we cannot keep', () => {
    const banned = ['1천 회당 3,000원', '저작권 걱정 없', '클레임 보호', '보장', '평균 수익', '월 수익'];
    for (const guide of GUIDES) for (const word of banned) expect(text(guide)).not.toContain(word);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site test -- guides`
Expected: FAIL — cannot find module './index'

- [ ] **Step 3: 타입과 공통 문구**

`apps/site/lib/guides/types.ts`:

```ts
export type GuideGroup = 'topic' | 'situation' | 'problem' | 'platform';

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type Guide = {
  slug: string;
  group: GuideGroup;
  /** The question as people ask it; also the h1. */
  title: string;
  /** Meta description (about 110 characters). */
  description: string;
  /** Two or three sentences an assistant can quote as the answer. */
  answer: string[];
  sections: GuideSection[];
  /** Views to tabulate at the default creator rate (the earnings guide only). */
  table?: number[];
  faqIds: string[];
  related: string[];
  /** ISO date of the last content change (Article dateModified). */
  updated: string;
};
```

`apps/site/lib/guides/common.ts`:

```ts
import { MIN_VIEWS, REVIEW_HOURS, WITHDRAW_FROM } from './facts';

// The same honest caveats and starting steps close every guide.

export const CAVEATS = [
  '조회수가 나와야 받아요. 영상을 올리기만 해서는 정산되지 않아요.',
  `영상 하나의 조회수가 ${MIN_VIEWS}를 넘어야 정산이 시작돼요. 그전 조회수도 함께 정산돼요.`,
  '영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요.',
  '캠페인 예산이 다 쓰이면 캠페인이 끝나고, 그 뒤에 늘어난 조회수는 정산되지 않아요.',
];

export const START_STEPS = [
  '캠페인 둘러보기에서 관심 분야와 플랫폼에 맞는 캠페인을 골라요.',
  '캠페인에 지원하고, 운영팀 승인을 받아요.',
  '요구사항에 맞춰 숏폼을 만들어 내 채널에 올리고 링크를 제출해요.',
  `${REVIEW_HOURS} 안에 검수를 받고, 통과한 영상은 조회수만큼 매주 정산돼요. ${WITHDRAW_FROM}부터 지급을 요청할 수 있어요.`,
];

export const UPDATED = '2026-10-01';
export const YOUTUBE_PARTNER_HELP = 'https://support.google.com/youtube/answer/72851';
export const YOUTUBE_MONETIZATION_POLICY = 'https://support.google.com/youtube/answer/1311392';
```

- [ ] **Step 4: 주제 가이드 4개**

`apps/site/lib/guides/topic.ts`:

```ts
import { UPDATED, YOUTUBE_PARTNER_HELP } from './common';
import { MIN_VIEWS, RATE, earnings } from './facts';
import type { Guide } from './types';

export const TOPIC_GUIDES: Guide[] = [
  {
    slug: 'earn-before-monetization',
    group: 'topic',
    title: '수익창출 전에도 쇼츠로 돈을 벌 수 있을까요?',
    description: '유튜브 수익창출 조건을 채우기 전에도, 캠페인에 참여해 올린 숏폼의 조회수만큼 받을 수 있어요. 구독자 조건 없이 새 채널로 시작하는 방법을 정리했어요.',
    answer: [
      '네. 유튜브 수익창출은 구독자 수와 시청 기준을 채워야 시작되지만, 그 전에도 캠페인에 참여해 숏폼을 올리면 조회수만큼 받을 수 있어요.',
      'Clipers는 구독자 조건이 없어서 새 채널도 바로 참여할 수 있어요.',
    ],
    sections: [
      {
        heading: '수익창출까지 시간이 걸리는 이유',
        paragraphs: [
          '유튜브 파트너 프로그램은 일정 수 이상의 구독자와 시청 시간 또는 쇼츠 조회수를 채워야 신청할 수 있어요. 새 채널이라면 이 기준을 채우는 데 시간이 걸릴 수 있어요.',
        ],
        links: [{ label: '유튜브 파트너 프로그램 기준 보기 (유튜브 고객센터)', href: YOUTUBE_PARTNER_HELP }],
      },
      {
        heading: '수익창출 전에도 돈이 되는 구조',
        paragraphs: [
          '브랜드나 아티스트, 크리에이터가 예산을 걸고 숏폼 제작을 요청하는 걸 캠페인이라고 해요. 캠페인에 참여해 영상을 올리면, 참여한 크리에이터들이 각자 영상의 조회수만큼 이 예산을 나눠 받아요.',
          '이 돈은 유튜브 광고 수익이 아니라 캠페인 예산에서 나와요. 그래서 내 채널의 수익창출 여부와 상관이 없어요.',
        ],
      },
      {
        heading: '올릴 소재도 정해져 있어요',
        paragraphs: [
          '캠페인마다 올릴 영상과 요구사항이 정해져 있어서, 무엇을 올릴지 고민하지 않고 꾸준히 올릴 수 있어요. 새 채널 초반에 업로드를 이어 가기에도 좋아요.',
        ],
      },
      {
        heading: '얼마나 받나요',
        paragraphs: [
          `1천 회당 ${RATE}인 캠페인이라면 조회수 10만 회에 ${earnings(100_000)}이에요. 영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 정산이 시작돼요.`,
        ],
        links: [{ label: '조회수별 금액 보기', href: '/guides/shorts-earnings-calculator' }],
      },
    ],
    faqIds: ['small-channel', 'fees', 'when-paid'],
    related: ['shorts-earnings-calculator', 'monetization-rejected', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'what-is-clipping',
    group: 'topic',
    title: '클리핑 부업이란 뭔가요?',
    description: '클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리고, 조회수만큼 받는 부업이에요. 캠페인 구조와 편집 방법, 저작권까지 정리했어요.',
    answer: [
      '클리핑은 캠페인이 정해 준 영상을 내 방식대로 편집해 숏폼으로 올리고, 조회수만큼 받는 부업이에요.',
      '직접 찍지 않아도 되고, 편집 앱만 다룰 줄 알면 시작할 수 있어요.',
    ],
    sections: [
      {
        heading: '클리핑은 이렇게 돌아가요',
        paragraphs: [
          '브랜드나 아티스트, 크리에이터가 예산을 걸고 캠페인을 열어요. 참여한 크리에이터들은 각자 올린 영상의 조회수만큼 이 예산을 나눠 받고, 예산이 다 쓰이면 캠페인이 끝나요.',
        ],
      },
      {
        heading: '어떤 영상을 편집하나요',
        paragraphs: [
          '스트리머 방송, 신제품 영상, 게임 플레이처럼 쓸 수 있는 영상은 캠페인마다 달라요. 캠페인 안내에 쓸 수 있는 영상과 요구사항이 적혀 있어요.',
        ],
      },
      {
        heading: '편집은 내 방식대로',
        paragraphs: ['캠페인 요구사항만 지키면 나머지 편집은 자유예요. 이런 편집을 많이 해요.'],
        list: [
          '가장 재밌는 구간만 잘라 세로 영상으로 만들기',
          '자막 넣기',
          '첫 화면에 "POV:" 같은 훅 문구 넣기',
          '순서를 바꿔 이야기처럼 이어 붙이기',
        ],
      },
      {
        heading: '저작권은요',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요. 허락 없이 남의 영상을 편집해 올리는 것과는 달라요.'],
        links: [{ label: '쇼츠 짜깁기와 저작권 알아보기', href: '/guides/copyright-safe-clipping' }],
      },
    ],
    faqIds: ['what-is-clipping', 'others-videos', 'rejected'],
    related: ['faceless-shortform', 'copyright-safe-clipping', 'earn-before-monetization'],
    updated: UPDATED,
  },
  {
    slug: 'shorts-earnings-calculator',
    group: 'topic',
    title: '쇼츠 조회수 10만 회면 얼마를 받을까요?',
    description: `Clipers 캠페인 기준으로 쇼츠 조회수별 받는 금액을 정리했어요. 1천 회당 ${RATE}이면 10만 회에 ${earnings(100_000)}이에요.`,
    answer: [
      'Clipers 캠페인은 조회수 1천 회당 받는 금액이 미리 정해져 있어요.',
      `1천 회당 ${RATE}이면 1만 회에 ${earnings(10_000)}, 10만 회에 ${earnings(100_000)}, 100만 회에 ${earnings(1_000_000)}이에요. 클립당 최대 금액과 캠페인 예산 안에서 받아요.`,
    ],
    table: [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000],
    sections: [
      {
        heading: '계산 방법',
        paragraphs: ['받는 금액은 검증된 조회수를 1,000으로 나눈 뒤 1천 회당 금액을 곱한 값이에요. 1천 회당 금액은 캠페인마다 다르고, 지원하기 전에 공개돼요.'],
      },
      {
        heading: `${MIN_VIEWS}부터 정산돼요`,
        paragraphs: [`영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 그전 조회수까지 모두 정산되고, 그 뒤로 늘어난 조회수는 매주 이어서 정산돼요.`],
      },
      {
        heading: '유튜브 광고 수익과는 달라요',
        paragraphs: ['이 금액은 유튜브 광고 수익이 아니라 캠페인 예산에서 나와요. 그래서 수익창출 전 채널도 같은 기준으로 받아요.'],
      },
      {
        heading: '받을 수 있는 금액에는 상한이 있어요',
        paragraphs: ['영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요. 또 캠페인 예산이 다 쓰이면 캠페인이 끝나요.'],
      },
    ],
    faqIds: ['how-much', 'per-clip-max', 'min-views'],
    related: ['earn-before-monetization', 'platforms', 'is-it-legit'],
    updated: UPDATED,
  },
  {
    slug: 'faceless-shortform',
    group: 'topic',
    title: '얼굴 안 나오는 숏폼으로도 돈을 벌 수 있나요?',
    description: '클리핑 캠페인은 정해진 영상을 편집해 올리기 때문에 얼굴을 드러내지 않아도 돼요. 얼굴 없이 숏폼으로 수익을 내는 방법을 정리했어요.',
    answer: [
      '네. 클리핑 캠페인은 캠페인이 정해 준 영상을 편집해 올리기 때문에 얼굴을 드러내지 않아도 돼요.',
      '캡컷 같은 편집 앱만 다룰 줄 알면 시작할 수 있고, 올린 영상의 조회수만큼 받아요.',
    ],
    sections: [
      {
        heading: '얼굴 없이 할 수 있는 숏폼',
        paragraphs: ['클리핑은 캠페인이 정해 준 영상을 편집해 올리는 일이라 내 얼굴이 나올 일이 없어요. 소개 캠페인도 요구사항에 따라 손이나 제품만 나오게 찍을 수 있어요.'],
      },
      {
        heading: '필요한 건 편집 앱 하나',
        paragraphs: ['휴대폰이나 컴퓨터의 편집 앱으로 자르고 자막을 넣을 수 있으면 충분해요. 따로 촬영 장비를 갖출 필요는 없어요.'],
      },
      {
        heading: '올리고 링크만 제출해요',
        paragraphs: ['편집한 영상은 내 채널에 올리고, 영상 링크를 제출하면 운영팀이 검수해요. 검수를 통과한 영상은 조회수만큼 정산돼요.'],
      },
    ],
    faqIds: ['small-channel', 'others-videos', 'platforms'],
    related: ['what-is-clipping', 'side-job-office-workers', 'side-job-stay-at-home-parents'],
    updated: UPDATED,
  },
];
```

- [ ] **Step 5: 상황별 가이드 6개**

`apps/site/lib/guides/situation.ts`:

```ts
import { UPDATED } from './common';
import { WITHDRAW_FROM } from './facts';
import type { Guide } from './types';

export const SITUATION_GUIDES: Guide[] = [
  {
    slug: 'side-job-office-workers',
    group: 'situation',
    title: '직장인·프리랜서가 퇴근 후에 할 만한 숏폼 부업이 있을까요?',
    description: '정해진 근무 시간 없이, 퇴근 후나 주말에 원하는 캠페인만 골라 숏폼을 올리고 조회수만큼 받는 방법이에요. 얼굴을 드러내지 않아도 돼요.',
    answer: [
      '퇴근 후나 주말에 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      'Clipers 캠페인은 정해진 근무 시간이 없어서 원하는 캠페인만 골라 할 수 있고, 클리핑은 얼굴을 드러내지 않아도 돼요.',
    ],
    sections: [
      {
        heading: '시간은 내가 정해요',
        paragraphs: [
          '출근도 회의도 없어요. 열려 있는 캠페인 중 하고 싶은 것만 골라 지원하고, 시간이 날 때 편집해 올리면 돼요.',
          '다만 캠페인은 예산이 다 쓰이면 끝나요. 관심 있는 캠페인은 일찍 참여하는 게 좋아요.',
        ],
      },
      {
        heading: '얼굴이 알려질 걱정이 적어요',
        paragraphs: [
          '클리핑은 정해진 영상을 편집해 올리는 일이라 얼굴이 나오지 않아요. 회사에 알려지는 게 걱정된다면 클리핑 캠페인부터 시작해 보세요.',
          '회사 취업규칙에 겸업 규정이 있다면 먼저 확인하세요.',
        ],
      },
      {
        heading: '본업과 함께 하기 좋은 단위',
        paragraphs: ['영상 하나 단위로 참여해요. 시간이 되는 만큼만 올리고, 한 캠페인에 여러 영상을 올릴 수도 있어요.'],
      },
    ],
    faqIds: ['small-channel', 'when-paid', 'per-clip-max'],
    related: ['faceless-shortform', 'video-editors', 'shorts-earnings-calculator'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-stay-at-home-parents',
    group: 'situation',
    title: '전업주부·육아 중에 집에서 할 수 있는 부업이 있을까요?',
    description: '휴대폰 편집 앱으로 숏폼을 만들어 올리고 조회수만큼 받는 재택 부업이에요. 정해진 근무 시간이 없어 아이 재우고 남는 시간에 짬짬이 할 수 있어요.',
    answer: [
      '집에서 휴대폰으로 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      '정해진 근무 시간이 없어서 짬짬이 할 수 있고, 가입과 지원은 무료예요.',
    ],
    sections: [
      {
        heading: '휴대폰 하나로 할 수 있어요',
        paragraphs: ['휴대폰 편집 앱으로 영상을 자르고 자막을 넣은 뒤, 내 채널에 올리고 링크를 제출하면 돼요. 컴퓨터가 없어도 시작할 수 있어요.'],
      },
      {
        heading: '짬짬이 해도 괜찮아요',
        paragraphs: ['정해진 근무 시간이 없어요. 아이를 재우고 남는 시간이나 집안일 사이사이에 영상 하나씩 만들어 올리면 돼요.'],
      },
      {
        heading: '돈이 들지 않아요',
        paragraphs: [`가입과 캠페인 지원은 무료예요. 정산된 금액이 ${WITHDRAW_FROM} 이상이 되면 지급을 요청할 수 있어요.`],
      },
      {
        heading: '처음이라면',
        paragraphs: ['캠페인마다 무엇을 만들지 요구사항이 정해져 있어요. 반려되더라도 무엇을 고치면 되는지 사유를 알려 드리니, 고쳐서 다시 올리면 돼요.'],
      },
    ],
    faqIds: ['fees', 'when-paid', 'rejected'],
    related: ['faceless-shortform', 'side-job-seniors', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-students',
    group: 'situation',
    title: '대학생·취준생이 돈 들이지 않고 할 수 있는 부업이 있을까요?',
    description: '가입비 없이, 수업과 공부 사이에 숏폼을 편집해 올리고 조회수만큼 받는 부업이에요. 올린 영상은 내 채널에 남아 편집 실력을 보여 주는 기록이 돼요.',
    answer: [
      '가입비나 장비 없이 숏폼을 편집해 올리고, 조회수만큼 받는 방법이 있어요.',
      '수업과 공부 사이 시간에 할 수 있고, 올린 영상은 내 채널에 남아요.',
    ],
    sections: [
      {
        heading: '시작하는 데 돈이 들지 않아요',
        paragraphs: ['가입과 캠페인 지원은 무료예요. 휴대폰이나 노트북의 편집 앱만 있으면 돼요.'],
      },
      {
        heading: '시간표에 맞춰 할 수 있어요',
        paragraphs: ['출근 시간이 없어서 공강이나 시험 기간을 피해 원하는 때에 영상을 올리면 돼요.'],
      },
      {
        heading: '편집 실력이 쌓여요',
        paragraphs: ['캠페인 요구사항에 맞춰 편집하다 보면 실전 경험이 쌓여요. 올린 영상은 내 채널에 남아 편집 실력을 보여 주는 기록이 돼요.'],
      },
    ],
    faqIds: ['fees', 'small-channel', 'how-much'],
    related: ['video-editors', 'what-is-clipping', 'shorts-earnings-calculator'],
    updated: UPDATED,
  },
  {
    slug: 'video-editors',
    group: 'situation',
    title: '편집 실력으로 외주 말고 수익을 낼 수 있을까요?',
    description: '클라이언트와 수정 요청을 주고받는 외주 대신, 캠페인 요구사항에 맞춰 편집해 올리고 조회수만큼 받는 방법이에요.',
    answer: [
      '캠페인 요구사항에 맞춰 편집해 내 채널에 올리고, 조회수만큼 받는 방법이 있어요.',
      '클라이언트와 시안을 주고받지 않고, 편집이 잘될수록 조회수와 함께 받는 금액도 커지는 구조예요.',
    ],
    sections: [
      {
        heading: '외주와 무엇이 다른가요',
        paragraphs: ['클라이언트와 시안과 수정 요청을 주고받지 않아요. 캠페인에 적힌 요구사항대로 편집해 올리면 운영팀이 검수해요.'],
      },
      {
        heading: '편집 실력이 금액으로 이어져요',
        paragraphs: ['받는 금액은 조회수에 따라 정해져요. 잘 만든 영상일수록 더 많이 받을 수 있어요. 다만 영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요.'],
      },
      {
        heading: '여러 캠페인을 함께 할 수 있어요',
        paragraphs: ['캠페인마다 따로 지원하고, 승인된 캠페인이라면 동시에 여러 개를 진행할 수 있어요.'],
      },
    ],
    faqIds: ['how-much', 'per-clip-max', 'rejected'],
    related: ['side-job-students', 'existing-shorts-channels', 'what-is-clipping'],
    updated: UPDATED,
  },
  {
    slug: 'existing-shorts-channels',
    group: 'situation',
    title: '이미 쇼츠·릴스 채널을 운영 중인데 추가 수익을 낼 수 있을까요?',
    description: '운영 중인 숏폼 채널에 캠페인 영상을 올리고 조회수만큼 받는 방법이에요. 수익창출 전 채널도 참여할 수 있어요.',
    answer: [
      '운영 중인 채널에 캠페인 영상을 올리고, 그 영상의 조회수만큼 받을 수 있어요.',
      '수익창출 여부와 상관없이 참여할 수 있어서, 아직 수익창출 전인 채널에도 맞아요.',
    ],
    sections: [
      {
        heading: '내 채널이 그대로 수익원이 돼요',
        paragraphs: ['캠페인 영상은 내 채널에 올려요. 그 영상의 조회수만큼 캠페인 예산에서 받기 때문에, 플랫폼 광고 수익과 별개로 수입이 생겨요.'],
      },
      {
        heading: '채널 성격에 맞는 캠페인을 골라요',
        paragraphs: ['캠페인 둘러보기에서 분야와 플랫폼으로 골라 볼 수 있어요. 채널을 보는 사람들이 좋아할 만한 캠페인을 고르면 돼요.'],
      },
      {
        heading: '올릴 소재 걱정을 덜어요',
        paragraphs: ['캠페인마다 올릴 영상과 요구사항이 정해져 있어서, 소재가 떨어진 날에도 꾸준히 올릴 수 있어요.'],
      },
    ],
    faqIds: ['small-channel', 'platforms', 'view-check'],
    related: ['earn-before-monetization', 'platforms', 'monetization-rejected'],
    updated: UPDATED,
  },
  {
    slug: 'side-job-seniors',
    group: 'situation',
    title: '중장년·은퇴 후에 스마트폰으로 할 수 있는 일이 있을까요?',
    description: '스마트폰 편집 앱으로 숏폼을 만들어 올리고 조회수만큼 받는 일이에요. 캠페인마다 무엇을 만들지 정해져 있어 편집을 처음 배우는 분도 시작할 수 있어요.',
    answer: [
      '스마트폰 편집 앱으로 숏폼을 만들어 올리고, 조회수만큼 받는 일이 있어요.',
      '캠페인마다 무엇을 만들지 요구사항이 정해져 있어서, 편집을 처음 배우는 분도 시작할 수 있어요.',
    ],
    sections: [
      {
        heading: '스마트폰으로 할 수 있어요',
        paragraphs: ['스마트폰 편집 앱으로 영상을 자르고 자막을 넣은 뒤 올리면 돼요. 영상 링크 제출도 스마트폰으로 할 수 있어요.'],
      },
      {
        heading: '편집이 처음이어도 괜찮아요',
        paragraphs: ['캠페인에 무엇을 만들지 적혀 있어서 막막하지 않아요. 처음에는 구간을 자르고 자막을 넣는 것부터 시작해 보세요.'],
      },
      {
        heading: '반려되면 이유를 알려 드려요',
        paragraphs: ['영상이 반려되면 무엇을 고치면 되는지 사유를 알려 드려요. 고쳐서 다시 올릴 수 있고, 사유가 납득되지 않으면 이의제기를 보낼 수 있어요.'],
      },
    ],
    faqIds: ['fees', 'rejected', 'when-paid'],
    related: ['side-job-stay-at-home-parents', 'faceless-shortform', 'is-it-legit'],
    updated: UPDATED,
  },
];
```

- [ ] **Step 6: 문제별 가이드 4개**

`apps/site/lib/guides/problem.ts`:

```ts
import { COMPANY } from '../company';
import { UPDATED, YOUTUBE_MONETIZATION_POLICY } from './common';
import { MIN_VIEWS, RATE, WITHDRAW_FROM } from './facts';
import type { Guide } from './types';

export const PROBLEM_GUIDES: Guide[] = [
  {
    slug: 'fan-edits',
    group: 'problem',
    title: '좋아하는 아이돌·스트리머 영상으로 돈을 벌 수 있을까요?',
    description: '아티스트나 스트리머가 직접 캠페인을 열면, 그 영상을 편집해 올리고 조회수만큼 받을 수 있어요. 팬 편집을 수익으로 잇는 방법과 주의할 점을 정리했어요.',
    answer: [
      '아티스트나 스트리머(또는 소속사·레이블)가 직접 캠페인을 열었다면, 그 영상을 편집해 올리고 조회수만큼 받을 수 있어요.',
      '허락 없이 올리는 팬 편집과 달리, 캠페인 영상은 원작자가 사용을 허락한 영상이에요.',
    ],
    sections: [
      {
        heading: '팬 편집이 수익이 되는 경우',
        paragraphs: ['좋아하는 아티스트나 스트리머의 캠페인이 열려 있을 때만 가능해요. 캠페인 둘러보기에서 지금 열린 캠페인을 확인해 보세요.'],
      },
      {
        heading: '허락 없는 팬 편집과의 차이',
        paragraphs: ['Clipers에서 정산되는 건 캠페인에 참여해 올린 영상뿐이에요. 허락 없이 올린 편집 영상은 정산 대상이 아니에요.'],
      },
      {
        heading: '하던 편집 그대로',
        paragraphs: ['직캠을 자르고, 자막을 넣고, 명장면을 이어 붙이던 편집 실력을 그대로 쓰면 돼요. 캠페인 요구사항만 지키면 나머지는 자유예요.'],
      },
    ],
    faqIds: ['others-videos', 'what-is-clipping', 'how-much'],
    related: ['what-is-clipping', 'copyright-safe-clipping', 'video-editors'],
    updated: UPDATED,
  },
  {
    slug: 'monetization-rejected',
    group: 'problem',
    title: '유튜브 수익창출이 거절됐어요, 다른 방법이 있을까요?',
    description: '유튜브 수익창출 심사와 별개로, 캠페인에 참여해 올린 숏폼의 조회수만큼 받는 방법이 있어요. 수익창출이 거절된 채널도 지원할 수 있어요.',
    answer: [
      '유튜브 수익창출과 별개로, 캠페인에 참여해 숏폼을 올리고 조회수만큼 받는 방법이 있어요.',
      '이 돈은 캠페인 예산에서 나오기 때문에, 수익창출이 거절된 채널도 캠페인에 지원할 수 있어요.',
    ],
    sections: [
      {
        heading: '거절 사유부터 확인하세요',
        paragraphs: ['유튜브는 재사용된 콘텐츠 등 여러 이유로 수익창출을 거절할 수 있어요. 다시 신청하려면 유튜브 안내를 따르는 게 가장 정확해요.'],
        links: [{ label: '유튜브 채널 수익 창출 정책 보기 (유튜브 고객센터)', href: YOUTUBE_MONETIZATION_POLICY }],
      },
      {
        heading: '수익창출과 별개로 받는 돈',
        paragraphs: [`캠페인에 참여해 올린 영상은 조회수만큼 캠페인 예산에서 받아요. 1천 회당 ${RATE}인 캠페인이라면 영상 하나가 ${MIN_VIEWS}를 넘는 순간부터 정산돼요.`],
      },
      {
        heading: '알아둘 점',
        paragraphs: ['Clipers는 캠페인 예산으로 정산할 뿐, 유튜브 수익창출 심사에는 영향을 주지 않아요. 클리핑 영상이 유튜브 수익창출 대상이 되는지는 유튜브 정책에 따라요.'],
      },
    ],
    faqIds: ['small-channel', 'how-much', 'view-check'],
    related: ['earn-before-monetization', 'existing-shorts-channels', 'is-it-legit'],
    updated: UPDATED,
  },
  {
    slug: 'is-it-legit',
    group: 'problem',
    title: '조회수 부업, 믿을 수 있는 곳은 어떻게 고르나요?',
    description: '조회수로 돈을 주는 부업을 고를 때 확인할 다섯 가지 기준과, Clipers가 각 기준을 어떻게 지키는지 정리했어요.',
    answer: [
      '가입비를 받는지, 받을 금액을 미리 공개하는지, 지급 기준이 분명한지, 반려 사유를 알려 주는지, 운영 회사 정보를 공개하는지 확인하세요.',
      'Clipers는 가입비가 없고, 1천 회당 금액과 지급 기준을 미리 공개해요.',
    ],
    sections: [
      {
        heading: '가입비나 교육비를 먼저 요구하지 않나요',
        paragraphs: ['돈을 벌게 해 준다며 먼저 돈을 받는 곳은 조심하세요. Clipers는 가입과 캠페인 지원이 무료예요.'],
      },
      {
        heading: '받을 금액을 미리 공개하나요',
        paragraphs: ['Clipers는 캠페인마다 조회수 1천 회당 받는 금액을 지원하기 전에 공개해요.'],
      },
      {
        heading: '지급 기준이 분명한가요',
        paragraphs: [`영상 하나의 조회수가 ${MIN_VIEWS}를 넘으면 정산이 시작되고, 매주 정산돼요. 정산된 금액이 ${WITHDRAW_FROM} 이상이면 지급을 요청할 수 있어요.`],
      },
      {
        heading: '반려되면 이유를 알려 주나요',
        paragraphs: ['Clipers는 반려할 때 사유를 알려 드리고, 사유가 납득되지 않으면 이의제기를 보낼 수 있어요.'],
      },
      {
        heading: '운영 회사를 확인할 수 있나요',
        paragraphs: [`Clipers는 대표 ${COMPANY.representative}, 사업자등록번호 ${COMPANY.registrationNumber}로 운영돼요. 모든 페이지 하단에서 회사 정보를 확인할 수 있어요.`],
      },
    ],
    faqIds: ['fees', 'when-paid', 'rejected'],
    related: ['shorts-earnings-calculator', 'what-is-clipping', 'monetization-rejected'],
    updated: UPDATED,
  },
  {
    slug: 'copyright-safe-clipping',
    group: 'problem',
    title: '쇼츠 짜깁기, 저작권 괜찮을까요?',
    description: '허락 없이 남의 영상을 잘라 올리면 저작권 문제가 생길 수 있어요. 원작자가 허락한 영상으로 클리핑하는 방법을 정리했어요.',
    answer: [
      '허락 없이 남의 영상을 잘라 올리면 저작권 침해 신고나 채널 경고를 받을 수 있어요.',
      'Clipers의 클리핑 캠페인은 원작자가 사용을 허락한 영상만 다뤄요.',
    ],
    sections: [
      {
        heading: '허락 없는 짜깁기의 위험',
        paragraphs: ['방송이나 다른 크리에이터의 영상을 허락 없이 올리면 저작권 침해 신고를 받거나, 영상이 내려가거나, 채널에 경고가 쌓일 수 있어요.'],
      },
      {
        heading: '허락받은 영상으로 하는 방법',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상으로 열려요. 캠페인에 참여해 그 영상을 편집해 올리면 돼요.'],
      },
      {
        heading: '그래도 지켜야 할 것',
        paragraphs: ['캠페인에 적힌 요구사항과 사용 범위를 지켜 주세요. 이 안내는 법률 자문이 아니에요. 개별 상황은 전문가와 확인하세요.'],
      },
    ],
    faqIds: ['others-videos', 'what-is-clipping', 'rejected'],
    related: ['what-is-clipping', 'fan-edits', 'monetization-rejected'],
    updated: UPDATED,
  },
];
```

- [ ] **Step 7: 플랫폼 가이드 1개**

`apps/site/lib/guides/platform.ts`:

```ts
import { UPDATED } from './common';
import type { Guide } from './types';

export const PLATFORM_GUIDES: Guide[] = [
  {
    slug: 'platforms',
    group: 'platform',
    title: '쇼츠·릴스·틱톡, 어느 플랫폼에 올려도 돈을 받을 수 있나요?',
    description: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼에 올린 영상의 조회수만큼 받을 수 있어요. 플랫폼별 조회수 확인 방법을 정리했어요.',
    answer: [
      '네. 플랫폼 자체의 수익화 조건과 상관없이, 캠페인에 참여해 올린 영상의 조회수만큼 받을 수 있어요.',
      '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼에 올릴 수 있고, 캠페인마다 올릴 수 있는 플랫폼이 정해져 있어요.',
    ],
    sections: [
      {
        heading: '유튜브 쇼츠',
        paragraphs: ['영상 링크를 제출하면 조회수를 자동으로 가져와요. 따로 화면 캡처를 올리지 않아도 돼요.'],
      },
      {
        heading: '틱톡 · 인스타그램 릴스 · 페이스북',
        paragraphs: ['영상 링크를 제출하고, 조회수가 보이는 화면 캡처를 올리면 운영팀이 확인해요.'],
      },
      {
        heading: 'X · 네이버 클립 · 카카오 숏폼',
        paragraphs: ['같은 방식이에요. 링크와 조회수 화면 캡처를 제출하면 운영팀이 확인해요.'],
      },
      {
        heading: '어느 플랫폼부터 시작할까요',
        paragraphs: ['캠페인마다 올릴 수 있는 플랫폼이 달라요. 캠페인 둘러보기에서 내가 쓰는 플랫폼으로 골라 볼 수 있어요.'],
        links: [{ label: '캠페인 둘러보기', href: '/discover' }],
      },
    ],
    faqIds: ['platforms', 'view-check', 'min-views'],
    related: ['shorts-earnings-calculator', 'existing-shorts-channels', 'earn-before-monetization'],
    updated: UPDATED,
  },
];
```

- [ ] **Step 8: 회사 정보 상수와 인덱스**

`apps/site/lib/company.ts` (Task 3에서 `problem.ts`가 쓰므로 여기서 만든다):

```ts
// Operator details shown in the footer and the trust guide. Add the legal name and a contact email once they are settled
// (support@clipers.page after the domain is bought).
export const COMPANY = {
  representative: '안준성',
  registrationNumber: '544-87-03492',
  address: '경기도 용인시 수지구 풍덕천로129번길 16-5 에이52호(풍덕천동, 선용빌딩)',
};
```

`apps/site/lib/guides/index.ts`:

```ts
import { PLATFORM_GUIDES } from './platform';
import { PROBLEM_GUIDES } from './problem';
import { SITUATION_GUIDES } from './situation';
import { TOPIC_GUIDES } from './topic';
import type { Guide, GuideGroup } from './types';

export type { Guide, GuideGroup, GuideSection } from './types';

export const GUIDE_GROUPS: { id: GuideGroup; label: string }[] = [
  { id: 'topic', label: '시작하기' },
  { id: 'situation', label: '상황별' },
  { id: 'problem', label: '고민별' },
  { id: 'platform', label: '플랫폼' },
];

export const GUIDES: Guide[] = [...TOPIC_GUIDES, ...SITUATION_GUIDES, ...PROBLEM_GUIDES, ...PLATFORM_GUIDES];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
```

- [ ] **Step 9: 통과 확인 후 커밋**

Run: `pnpm --filter @clipers/site test`
Expected: PASS (creator-faq 3, facts 2, guides 4)

```bash
git add apps/site/lib/company.ts apps/site/lib/guides
git commit -m "feat(site): fifteen creator guides as data, with integrity tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 푸터 — 가이드 링크와 회사 정보

**Files:**
- Modify: `apps/site/components/landing-chrome.tsx`
- Modify: `packages/ui/src/styles/components.css` (`.cl-landing-footer` 블록 근처, 914행)

- [ ] **Step 1: 푸터 수정**

`landing-chrome.tsx` 맨 위 import에 `import { COMPANY } from '@/lib/company';`를 추가하고, 푸터를 다음으로 바꾼다:

```tsx
      <footer className="cl-landing-footer">
        <img alt="Clipers" src="/logo/clipers-wordmark-dark.svg" />
        <nav aria-label="하단 메뉴">
          <Link href="/">크리에이터</Link>
          <Link href="/brands">브랜드</Link>
          <Link href="/discover">캠페인 둘러보기</Link>
          <Link href="/guides">가이드</Link>
          <a href={appUrl('/terms')}>이용약관</a>
          <a href={appUrl('/privacy')}>개인정보 처리방침</a>
        </nav>
        <p>© 2026 Clipers</p>
        <p className="cl-landing-footer__company">
          대표 {COMPANY.representative} · 사업자등록번호 {COMPANY.registrationNumber} · {COMPANY.address}
        </p>
      </footer>
```

- [ ] **Step 2: 스타일**

`components.css`의 `.cl-landing-footer p { margin-left: auto; }` 바로 아래에 추가:

```css
/* Operator details: a quiet full-width line under the footer row */
.cl-landing-footer p.cl-landing-footer__company { flex-basis: 100%; margin-left: 0; color: var(--color-text-subtle); font-size: var(--font-size-1); line-height: 1.6; }
```

- [ ] **Step 3: 타입 검사 후 커밋**

Run: `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"`
Expected: 출력 없음

```bash
git add apps/site/components/landing-chrome.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): footer links the guides and shows the operator details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 가이드 공통 틀 `GuideArticle`

**Files:**
- Create: `apps/site/components/guide-article.tsx`
- Modify: `packages/ui/src/styles/components.css` (파일 끝에 추가)

- [ ] **Step 1: 컴포넌트**

`apps/site/components/guide-article.tsx`:

```tsx
import Link from 'next/link';
import { ButtonLink, formatKRW } from '@clipers/ui';
import CampaignCard from '@/components/campaign-card';
import JsonLd from '@/components/json-ld';
import { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import type { MarketCampaign } from '@/lib/campaigns';
import { faqById } from '@/lib/creator-faq';
import { CAVEATS, START_STEPS } from '@/lib/guides/common';
import { RATE, earningsFor } from '@/lib/guides/facts';
import { guideBySlug, type Guide } from '@/lib/guides';
import { siteUrl } from '@/lib/urls';

// One guide, in a calm reading column: the question, a quotable answer, the body, honest caveats, how to start,
// open campaigns, the FAQ and related guides. Everything comes from the guide data; no widgets.

export default function GuideArticle({ guide, campaigns }: { guide: Guide; campaigns: MarketCampaign[] }) {
  const path = `/guides/${guide.slug}`;
  return (
    <>
      <article className="cl-guide">
        <p className="cl-guide__crumbs">
          <Link href="/guides">가이드</Link>
        </p>
        <h1 className="cl-guide__title">{guide.title}</h1>
        <p className="cl-guide__updated">
          <time dateTime={guide.updated}>{guide.updated.split('-').join('. ')}.</time> 업데이트
        </p>
        <div className="cl-guide__answer">
          {guide.answer.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>

        {guide.table && (
          <table className="cl-guide__table">
            <caption>1천 회당 {RATE} 캠페인 기준</caption>
            <thead>
              <tr>
                <th scope="col">조회수</th>
                <th scope="col">받는 금액</th>
              </tr>
            </thead>
            <tbody>
              {guide.table.map((views) => (
                <tr key={views}>
                  <td>{views.toLocaleString('ko-KR')}회</td>
                  <td>{formatKRW(earningsFor(views))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {guide.sections.map((section) => (
          <section className="cl-guide__section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.links?.map((link) =>
              link.href.startsWith('/') ? (
                <Link className="cl-link" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ) : (
                <a className="cl-link" href={link.href} key={link.href} rel="noopener" target="_blank">
                  {link.label}
                </a>
              )
            )}
          </section>
        ))}

        <section className="cl-guide__section">
          <h2>알아둘 점</h2>
          <ul>
            {CAVEATS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="cl-guide__section">
          <h2>시작하는 법</h2>
          <ol>
            {START_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="cl-guide__actions">
            <ButtonLink href={SIGN_UP} size="lg" variant="primary">
              무료로 시작하기
            </ButtonLink>
            <ButtonLink href="/discover" size="lg" variant="secondary">
              캠페인 둘러보기
            </ButtonLink>
          </div>
        </section>
      </article>

      {campaigns.length > 0 && (
        <section aria-labelledby="guide-campaigns" className="cl-guide-campaigns">
          <h2 id="guide-campaigns">지금 참여할 수 있는 캠페인</h2>
          <div className="cl-guide-campaigns__grid">
            {campaigns.map((campaign) => (
              <CampaignCard campaign={campaign} key={campaign.id} />
            ))}
          </div>
        </section>
      )}

      <LandingFaq items={guide.faqIds.map(faqById)} path={path} />

      <nav aria-labelledby="guide-related" className="cl-guide cl-guide__related">
        <h2 id="guide-related">함께 보면 좋은 가이드</h2>
        <ul>
          {guide.related.map((slug) => {
            const related = guideBySlug(slug)!;
            return (
              <li key={slug}>
                <Link href={`/guides/${slug}`}>{related.title}</Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.description,
          inLanguage: 'ko-KR',
          datePublished: guide.updated,
          dateModified: guide.updated,
          mainEntityOfPage: siteUrl(path),
          author: { '@type': 'Organization', name: 'Clipers', url: siteUrl('/') },
          publisher: { '@type': 'Organization', name: 'Clipers', url: siteUrl('/') },
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: 스타일**

`components.css` 파일 끝에 추가:

```css
/* ---------- guides (creator AEO): a calm reading column ---------- */
.cl-guide { width: min(680px, 100% - 40px); margin: 0 auto; padding: 56px 0 24px; }
.cl-guide__crumbs { color: var(--color-text-subtle); font-size: var(--font-size-2); }
.cl-guide__crumbs a:hover { color: var(--color-text); }
.cl-guide__title { margin-top: var(--space-3); font-size: clamp(30px, 4.6vw, 42px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.2; text-wrap: balance; }
.cl-guide__updated { margin-top: var(--space-3); color: var(--color-text-subtle); font-size: var(--font-size-1); }
.cl-guide__answer { display: grid; gap: var(--space-2); margin-top: var(--space-6); color: var(--color-text); font-size: 18px; letter-spacing: -0.01em; line-height: 1.75; }
.cl-guide__section { margin-top: var(--space-8); }
.cl-guide__section h2 { margin-bottom: var(--space-3); font-size: var(--font-size-6); font-weight: 600; letter-spacing: -0.02em; }
.cl-guide__section p, .cl-guide__section li { color: var(--color-text-muted); font-size: 17px; line-height: 1.75; }
.cl-guide__section p + p { margin-top: var(--space-3); }
.cl-guide__section ul, .cl-guide__section ol { display: grid; gap: var(--space-2); margin: var(--space-3) 0 0; padding-left: 1.3em; }
.cl-guide__section .cl-link { display: inline-block; margin-top: var(--space-3); }
.cl-guide__actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-5); }
.cl-guide__table { width: 100%; margin-top: var(--space-6); border-collapse: collapse; border-radius: 12px; overflow: hidden; background: var(--color-panel); font-variant-numeric: tabular-nums; }
.cl-guide__table caption { margin-bottom: var(--space-2); color: var(--color-text-subtle); font-size: var(--font-size-1); text-align: left; caption-side: top; }
.cl-guide__table th, .cl-guide__table td { padding: var(--space-3) var(--space-4); text-align: left; }
.cl-guide__table th { color: var(--color-text-subtle); font-size: var(--font-size-1); font-weight: 500; }
.cl-guide__table tbody tr + tr td { box-shadow: inset 0 1px 0 var(--gray-a3); }
.cl-guide__table td:last-child { font-weight: 600; }
.cl-guide-campaigns { width: min(960px, 100% - 40px); margin: 64px auto 0; }
.cl-guide-campaigns h2 { margin-bottom: var(--space-4); font-size: var(--font-size-6); font-weight: 600; letter-spacing: -0.02em; }
.cl-guide-campaigns__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
.cl-guide__related { padding-bottom: 96px; }
.cl-guide__related h2 { margin-bottom: var(--space-3); font-size: var(--font-size-5); font-weight: 600; }
.cl-guide__related ul { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.cl-guide__related a { display: block; padding: var(--space-3) var(--space-4); border-radius: 12px; background: var(--color-panel); font-size: var(--font-size-3); font-weight: 500; }
.cl-guide__related a:hover { background: var(--gray-a3); }
.cl-guides { width: min(760px, 100% - 40px); margin: 0 auto; padding: 56px 0 96px; }
.cl-guides h1 { font-size: clamp(30px, 4.6vw, 42px); font-weight: 600; letter-spacing: -0.03em; }
.cl-guides__lead { margin-top: var(--space-3); color: var(--color-text-muted); font-size: 17px; line-height: 1.7; }
.cl-guides__group { margin-top: var(--space-8); }
.cl-guides__group h2 { margin-bottom: var(--space-3); color: var(--color-text-subtle); font-size: var(--font-size-2); font-weight: 500; }
.cl-guides__group ul { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.cl-guides__group a { display: grid; gap: 4px; padding: var(--space-4); border-radius: 12px; background: var(--color-panel); }
.cl-guides__group a:hover { background: var(--gray-a3); }
.cl-guides__group strong { font-size: var(--font-size-3); font-weight: 600; }
.cl-guides__group span { color: var(--color-text-muted); font-size: var(--font-size-2); line-height: 1.6; }
@media (max-width: 860px) {
  .cl-guide-campaigns__grid { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 3: 타입 검사 후 커밋**

Run: `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"`
Expected: 출력 없음

```bash
git add apps/site/components/guide-article.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): guide article layout — answer, body, caveats, campaigns, FAQ, related

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 라우트 `/guides`와 `/guides/[slug]`

**Files:**
- Create: `apps/site/app/guides/page.tsx`
- Create: `apps/site/app/guides/[slug]/page.tsx`

- [ ] **Step 1: 가이드 페이지**

`apps/site/app/guides/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuideArticle from '@/components/guide-article';
import LandingChrome from '@/components/landing-chrome';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { GUIDES, guideBySlug } from '@/lib/guides';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: `${guide.title} — Clipers`,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: 'article' },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const campaigns = (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 3);
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <GuideArticle campaigns={campaigns} guide={guide} />
    </LandingChrome>
  );
}
```

- [ ] **Step 2: 목록 페이지**

`apps/site/app/guides/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import LandingChrome from '@/components/landing-chrome';
import { GUIDES, GUIDE_GROUPS } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Clipers 가이드 — 숏폼으로 조회수만큼 받는 법',
  description: '수익창출 전 쇼츠 수익, 클리핑 부업, 상황별 숏폼 부업, 플랫폼별 정산까지 크리에이터가 자주 묻는 질문에 답했어요.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  return (
    <LandingChrome cta="무료로 시작하기" path="/guides">
      <div className="cl-guides">
        <h1>Clipers 가이드</h1>
        <p className="cl-guides__lead">숏폼으로 조회수만큼 받는 방법을 상황과 고민별로 정리했어요.</p>
        {GUIDE_GROUPS.map((group) => (
          <section className="cl-guides__group" key={group.id}>
            <h2>{group.label}</h2>
            <ul>
              {GUIDES.filter((guide) => guide.group === group.id).map((guide) => (
                <li key={guide.slug}>
                  <Link href={`/guides/${guide.slug}`}>
                    <strong>{guide.title}</strong>
                    <span>{guide.answer[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LandingChrome>
  );
}
```

- [ ] **Step 3: 동작 확인**

개발 서버(사이트, 3001)가 떠 있는 상태에서:

Run: `for s in guides guides/what-is-clipping guides/shorts-earnings-calculator guides/nope; do printf "$s -> "; curl -s -o /dev/null -m 120 -w "%{http_code}\n" http://localhost:3001/$s; done`
Expected: `guides -> 200`, `guides/what-is-clipping -> 200`, `guides/shorts-earnings-calculator -> 200`, `guides/nope -> 404`

Run: `curl -s -m 120 http://localhost:3001/guides/shorts-earnings-calculator | grep -o '"@type":"\(Article\|FAQPage\)"' | sort -u`
Expected: `"@type":"Article"`과 `"@type":"FAQPage"` 두 줄

Run: `curl -s -m 120 http://localhost:3001/guides/shorts-earnings-calculator | grep -o "80,000원" | head -1`
Expected: `80,000원`

- [ ] **Step 4: 커밋**

```bash
git add apps/site/app/guides
git commit -m "feat(site): /guides and fifteen guide pages with Article and FAQ structured data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 사이트맵과 llms.txt

**Files:**
- Modify: `apps/site/app/sitemap.ts`
- Modify: `apps/site/app/llms.txt/route.ts`

- [ ] **Step 1: 사이트맵**

`sitemap.ts`에 `import { GUIDES } from '@/lib/guides';`를 추가하고 반환 배열의 `/discover` 줄 뒤에 넣는다:

```ts
    { url: siteUrl('/guides'), changeFrequency: 'weekly', priority: 0.8 },
    ...GUIDES.map((guide) => ({ url: siteUrl(`/guides/${guide.slug}`), lastModified: guide.updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
```

- [ ] **Step 2: llms.txt**

`llms.txt/route.ts`에 `import { GUIDES, GUIDE_GROUPS } from '@/lib/guides';`를 추가하고, `'## 자주 묻는 질문 (크리에이터)',` 줄 바로 앞에 넣는다:

```ts
    '## 가이드',
    ...GUIDE_GROUPS.flatMap((group) => [
      `### ${group.label}`,
      ...GUIDES.filter((guide) => guide.group === group.id).map(
        (guide) => `- [${guide.title}](${siteUrl(`/guides/${guide.slug}`)}): ${guide.answer.join(' ')}`
      ),
      '',
    ]),
```

`'## 페이지'` 목록에 한 줄 추가:

```ts
    `- [가이드](${siteUrl('/guides')}): 수익창출 전 수익, 클리핑 부업, 상황별·고민별 안내, 플랫폼별 정산`,
```

- [ ] **Step 3: 확인 후 커밋**

Run: `curl -s -m 120 http://localhost:3001/sitemap.xml | grep -o "/guides/[a-z-]*" | sort -u | wc -l`
Expected: `15`

Run: `curl -s -m 120 http://localhost:3001/llms.txt | grep -c "](http://localhost:3001/guides/"`
Expected: `15`

```bash
git add apps/site/app/sitemap.ts apps/site/app/llms.txt/route.ts
git commit -m "feat(site): guides in the sitemap and llms.txt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 전체 확인

- [ ] **Step 1: 금지 문구·브랜드 단가**

Run: `rg -n "brandCpm" apps/site/lib/guides apps/site/components/guide-article.tsx apps/site/app/guides`
Expected: 결과 없음

- [ ] **Step 2: 테스트와 타입**

Run: `pnpm test` 그리고 `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"`
Expected: 테스트 모두 통과, 타입 오류 출력 없음

- [ ] **Step 3: 화면 확인**

`/guides`, `/guides/side-job-stay-at-home-parents`, `/guides/shorts-earnings-calculator`를 1440×900과 390px에서 연다(playwright 스크린샷).
- 질문형 제목, 한 줄 답, 본문, 알아둘 점, 시작하는 법, 캠페인 카드(있을 때), FAQ, 관련 가이드 순서
- 표: 1,000회 800원 … 1,000,000회 800,000원
- 푸터에 "가이드" 링크와 회사 정보 줄
- 가로 스크롤 없음(`document.documentElement.scrollWidth`가 화면 폭과 같음)

- [ ] **Step 4: 빌드 (개발 서버를 끈 뒤)**

사이트 개발 서버를 끄고 실행한다.

Run: `pnpm --filter @clipers/site build`
Expected: `✓ Compiled successfully`, 라우트 목록에 `/guides`와 `● /guides/[slug]`(15개 경로)

빌드 후 `.next`를 지우고 개발 서버를 다시 띄운다: `rm -rf apps/site/.next` 후 `cd apps/site && npx next dev -p 3001`.
