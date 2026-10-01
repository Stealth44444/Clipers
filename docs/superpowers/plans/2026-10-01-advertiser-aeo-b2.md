# 광고주 AEO B2 — 광고주 가이드 16개 · 양쪽 연결 · 크리에이터 가이드 간결화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 가이드 틀에 `audience`(크리에이터/광고주)를 더해 광고주 가이드 16개를 추가하고, 반대편 가이드를 서로 잇고, 크리에이터 가이드의 공통 부분을 2줄씩으로 줄인다.

**Architecture:** `Guide`에 `audience`, `counterpart?`, `industry?`를 추가하고 `GUIDE_GROUPS`에 audience를 붙인다. FAQ는 audience에 따라 `CREATOR_FAQ`/`ADVERTISER_FAQ`에서 찾는다(`guideFaqs`). `GuideArticle`은 audience에 따라 공통 블록과 버튼만 바꾸고 나머지 틀은 같다. 무결성은 기존 테스트를 확장해 고정한다.

**Tech Stack:** Next.js 15 · TypeScript · Vitest

**Spec:** `docs/superpowers/specs/2026-10-01-advertiser-aeo-design.md` §4·§5·§6·§7

**공통 규칙:** 해요체. 광고주 가이드에는 단가("1천 회당", 크리에이터 단가 금액, 브랜드 단가 금액)를 쓰지 않는다. 지어낸 성과·사례·보장 없음. 음악 캠페인은 준비 중. 다른 세션의 커밋되지 않은 변경은 내 커밋에 넣지 않는다. 개발 서버가 켜진 폴더에서 `next build` 금지(분리된 작업 폴더에서). 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: 데이터 구조 확장 + 크리에이터 가이드 간결화 + 연결

**Files:**
- Modify: `apps/site/lib/guides/types.ts`, `index.ts`, `common.ts`, `facts.ts`, `topic.ts`, `situation.ts`, `problem.ts`, `platform.ts`
- Test: `apps/site/lib/guides/index.test.ts`

- [ ] **Step 1: 테스트를 새 구조로 바꾸기 (실패하게)**

`apps/site/lib/guides/index.test.ts` 전체:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { INQUIRY_INDUSTRIES } from '../inquiry';
import { GUIDES, GUIDE_GROUPS, guideBySlug, guideFaqs } from './index';

const text = (guide: (typeof GUIDES)[number]) =>
  [guide.title, guide.description, ...guide.answer, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])].join('\n');
const creators = GUIDES.filter((guide) => guide.audience === 'creator');
const advertisers = GUIDES.filter((guide) => guide.audience === 'advertiser');
const count = (group: string) => GUIDES.filter((guide) => guide.group === group).length;

describe('guides', () => {
  it('has 15 creator and 16 advertiser guides in their groups', () => {
    expect(creators).toHaveLength(15);
    expect(advertisers).toHaveLength(16);
    expect([count('topic'), count('situation'), count('problem'), count('platform')]).toEqual([4, 6, 4, 1]);
    expect([count('industry'), count('advertiser-problem')]).toEqual([11, 5]);
    expect(GUIDE_GROUPS.map((group) => `${group.audience}:${group.id}`)).toEqual([
      'creator:topic', 'creator:situation', 'creator:problem', 'creator:platform', 'advertiser:industry', 'advertiser:advertiser-problem',
    ]);
  });

  it('uses unique, url-safe slugs', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('asks a question in every title and links only to real FAQs and guides', () => {
    for (const guide of GUIDES) {
      expect(guide.title.endsWith('?')).toBe(true);
      expect(guide.answer.length).toBeGreaterThanOrEqual(2);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guideFaqs(guide)).toHaveLength(guide.faqIds.length);
      expect(guide.faqIds.length).toBeGreaterThanOrEqual(3);
      expect(guide.related).toHaveLength(3);
      for (const slug of guide.related) {
        expect(slug).not.toBe(guide.slug);
        expect(guideBySlug(slug)?.audience).toBe(guide.audience);
      }
    }
  });

  it('pairs counterparts across audiences', () => {
    for (const guide of GUIDES.filter((item) => item.counterpart)) {
      const other = guideBySlug(guide.counterpart!);
      expect(other).toBeDefined();
      expect(other!.audience).not.toBe(guide.audience);
    }
    expect(GUIDES.filter((item) => item.counterpart).length).toBeGreaterThanOrEqual(9);
  });

  it('gives every industry guide a contact-form industry', () => {
    for (const guide of GUIDES.filter((item) => item.group === 'industry')) {
      expect(INQUIRY_INDUSTRIES).toContain(guide.industry);
    }
  });

  it('never promises what we cannot keep', () => {
    const banned = ['1천 회당 3,000원', '저작권 걱정 없', '클레임 보호', '보장', '평균 수익', '월 수익'];
    for (const guide of GUIDES) for (const word of banned) expect(text(guide)).not.toContain(word);
  });

  it('keeps per-view rates off the advertiser guides', () => {
    for (const guide of advertisers) {
      expect(text(guide)).not.toContain('1천 회당');
      expect(text(guide)).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
      expect(text(guide)).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
    }
  });
});
```

Run: `pnpm --filter @clipers/site test -- guides`
Expected: FAIL — `guideFaqs` is not exported / audience undefined

- [ ] **Step 2: 타입**

`apps/site/lib/guides/types.ts` 전체:

```ts
export type GuideAudience = 'creator' | 'advertiser';

export type GuideGroup = 'topic' | 'situation' | 'problem' | 'platform' | 'industry' | 'advertiser-problem';

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type Guide = {
  slug: string;
  audience: GuideAudience;
  group: GuideGroup;
  /** The question as people ask it; also the h1. */
  title: string;
  /** Meta description (about 110 characters). */
  description: string;
  /** Two or three sentences an assistant can quote as the answer. */
  answer: string[];
  sections: GuideSection[];
  /** Views to tabulate at the default creator rate (the creator earnings guide only). */
  table?: number[];
  /** FAQ ids from the audience's FAQ (creator → CREATOR_FAQ, advertiser → ADVERTISER_FAQ). */
  faqIds: string[];
  related: string[];
  /** The matching guide for the other audience, linked at the end. */
  counterpart?: string;
  /** Industry guides: preselects the contact form's industry (one of INQUIRY_INDUSTRIES). */
  industry?: string;
  /** ISO date of the last content change (Article dateModified). */
  updated: string;
};
```

- [ ] **Step 3: 공통 문구 간결화와 광고주 공통 문구**

`apps/site/lib/guides/facts.ts` 끝에 추가:

```ts
export const MIN_BUDGET = `${(MIN_CAMPAIGN_BUDGET / 10_000).toLocaleString('ko-KR')}만 원`;
```

그리고 첫 줄 import를 `import { DEFAULT_PRICING, MIN_CAMPAIGN_BUDGET, MIN_PAYOUT_VIEWS, MIN_WITHDRAWAL, REVIEW_SLA_OPTIONS } from '@clipers/db';`로 바꾼다.

`apps/site/lib/guides/common.ts`의 `CAVEATS`와 `START_STEPS`를 바꾸고 `ADVERTISER_NOTES`를 더한다(import도 맞춘다):

```ts
import { MIN_BUDGET, MIN_VIEWS, REVIEW_HOURS, WITHDRAW_FROM } from './facts';

// Short shared blocks that close every guide: two lines each, so each guide's own answer stays the bulk of the page.

export const CAVEATS = [
  `조회수가 나와야 받고, 영상 하나의 조회수가 ${MIN_VIEWS}를 넘어야 정산이 시작돼요.`,
  '영상 하나로 받을 수 있는 최대 금액은 캠페인마다 다르고, 예산이 다 쓰이면 캠페인이 끝나요.',
];

export const START_STEPS = [
  '캠페인을 골라 지원하고, 승인되면 요구사항대로 만들어 내 채널에 올린 뒤 링크를 제출해요.',
  `${REVIEW_HOURS} 안에 검수를 받고, 통과한 영상은 조회수만큼 매주 정산돼요. ${WITHDRAW_FROM}부터 지급을 요청할 수 있어요.`,
];

export const ADVERTISER_NOTES = [
  `캠페인은 ${MIN_BUDGET}부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여요.`,
  '캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 확인할 수 있어요.',
];
```

(`UPDATED`, `YOUTUBE_*` 상수는 그대로 둔다.)

- [ ] **Step 4: 크리에이터 데이터에 audience와 counterpart**

`topic.ts`·`situation.ts`·`problem.ts`·`platform.ts`의 모든 가이드 객체에서 `group: '...',` 줄 바로 앞에 `audience: 'creator',`를 넣는다:

Run: `sed -i "s/^    group: '\(topic\|situation\|problem\|platform\)',/    audience: 'creator',\n    group: '\1',/" apps/site/lib/guides/topic.ts apps/site/lib/guides/situation.ts apps/site/lib/guides/problem.ts apps/site/lib/guides/platform.ts && grep -c "audience: 'creator'" apps/site/lib/guides/{topic,situation,problem,platform}.ts`
Expected: `topic.ts:4`, `situation.ts:6`, `problem.ts:4`, `platform.ts:1`

counterpart 추가(각 객체의 `related: [...]` 줄 다음에 한 줄):
- `what-is-clipping` → `counterpart: 'clipping-marketing',`
- `fan-edits` → `counterpart: 'for-streamers',`
- `copyright-safe-clipping` → `counterpart: 'for-broadcasters',`
- `is-it-legit` → `counterpart: 'verified-views',`

- [ ] **Step 5: 인덱스**

`apps/site/lib/guides/index.ts` 전체:

```ts
import { advertiserFaqById } from '../advertiser-faq';
import { faqById } from '../creator-faq';
import { ADVERTISER_PROBLEM_GUIDES } from './advertiser-problem';
import { INDUSTRY_GUIDES } from './industry';
import { PLATFORM_GUIDES } from './platform';
import { PROBLEM_GUIDES } from './problem';
import { SITUATION_GUIDES } from './situation';
import { TOPIC_GUIDES } from './topic';
import type { Guide, GuideAudience, GuideGroup } from './types';

export type { Guide, GuideAudience, GuideGroup, GuideSection } from './types';

export const GUIDE_AUDIENCES: { id: GuideAudience; label: string }[] = [
  { id: 'creator', label: '크리에이터' },
  { id: 'advertiser', label: '광고주' },
];

export const GUIDE_GROUPS: { id: GuideGroup; audience: GuideAudience; label: string }[] = [
  { id: 'topic', audience: 'creator', label: '시작하기' },
  { id: 'situation', audience: 'creator', label: '상황별' },
  { id: 'problem', audience: 'creator', label: '고민별' },
  { id: 'platform', audience: 'creator', label: '플랫폼' },
  { id: 'industry', audience: 'advertiser', label: '업종별' },
  { id: 'advertiser-problem', audience: 'advertiser', label: '고민별' },
];

export const GUIDES: Guide[] = [
  ...TOPIC_GUIDES,
  ...SITUATION_GUIDES,
  ...PROBLEM_GUIDES,
  ...PLATFORM_GUIDES,
  ...INDUSTRY_GUIDES,
  ...ADVERTISER_PROBLEM_GUIDES,
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** A guide's FAQ entries, from its audience's FAQ. */
export function guideFaqs(guide: Guide): { id: string; q: string; a: string }[] {
  return guide.faqIds.map((id) => (guide.audience === 'advertiser' ? advertiserFaqById(id) : faqById(id)));
}
```

(Task 2에서 `industry.ts`·`advertiser-problem.ts`를 만들기 전까지 이 파일은 import 오류가 난다. Task 2까지 끝낸 뒤 테스트한다.)

---

### Task 2: 광고주 가이드 16개

**Files:**
- Create: `apps/site/lib/guides/industry.ts`, `apps/site/lib/guides/advertiser-problem.ts`

- [ ] **Step 1: 업종별 11개**

`apps/site/lib/guides/industry.ts`:

```ts
import { UPDATED } from './common';
import { MIN_BUDGET } from './facts';
import type { Guide } from './types';

export const INDUSTRY_GUIDES: Guide[] = [
  {
    slug: 'for-brands',
    audience: 'advertiser',
    group: 'industry',
    industry: '브랜드·소비재·D2C',
    title: '신제품을 숏폼으로 빠르게 알리려면 어떻게 하나요?',
    description: '캠페인을 열면 여러 크리에이터가 제품 소개 숏폼과 편집 숏폼을 올리고, 검증된 조회수만큼만 예산이 쓰여요. 신제품 출시에 맞춰 숏폼을 모으는 방법을 정리했어요.',
    answer: [
      '캠페인을 열면 여러 크리에이터가 제품을 소개하는 숏폼이나, 제공한 영상을 편집한 숏폼을 올려요.',
      '검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여서, 반응이 없는 영상에는 예산이 나가지 않아요.',
    ],
    sections: [
      {
        heading: '소개 캠페인과 클리핑 캠페인',
        paragraphs: [
          '소개 캠페인은 크리에이터가 제품이나 서비스를 자기 스타일로 소개하는 숏폼을 찍는 방식이에요. 클리핑 캠페인은 광고 영상이나 촬영본을 제공하면 크리에이터들이 숏폼으로 편집해 올리는 방식이에요.',
          '어느 쪽이든 여러 크리에이터가 각자 다른 버전을 만들어요.',
        ],
      },
      {
        heading: '출시 일정에 맞춰요',
        paragraphs: ['캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 공개돼요. 출시일보다 여유 있게 캠페인을 만들어 두세요. 올라온 영상은 24시간이나 48시간 안에 검수해요.'],
      },
      {
        heading: '꼭 지킬 것은 요구사항으로',
        paragraphs: ['꼭 넣어야 할 문구와 태그, 피해야 할 표현을 요구사항에 적어 두면 운영팀이 검수할 때 그대로 확인해요. 요구사항을 지키지 않은 영상에는 예산이 쓰이지 않아요.'],
      },
    ],
    faqIds: ['cost', 'expected-views', 'review-time'],
    related: ['for-startups', 'viral-without-influencers', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-broadcasters',
    audience: 'advertiser',
    group: 'industry',
    industry: '방송국·OTT·제작사',
    title: '예능·드라마 클립을 숏폼으로 더 퍼뜨리려면?',
    description: '방송 영상으로 클리핑 캠페인을 열면 여러 크리에이터가 하이라이트를 숏폼으로 편집해 각자 채널에 올려요. 방영 전후에 클립을 퍼뜨리는 방법을 정리했어요.',
    answer: [
      '방송 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 하이라이트를 골라 숏폼으로 편집해 각자 채널에 올려요.',
      '공식 채널 하나가 아니라 여러 계정에서 함께 퍼지고, 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '쓸 수 있는 영상과 범위를 정해요',
        paragraphs: ['어떤 회차와 장면을 써도 되는지, 길이와 출처 표기는 어떻게 할지 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '방영 전후에 맞춰요',
        paragraphs: ['예고편으로 방영 전에, 방영 직후에는 하이라이트로 이어서 캠페인을 열 수 있어요. 검수 시간을 24시간으로 고르면 올라온 영상을 더 빨리 확인해요.'],
      },
      {
        heading: '사람이 직접 검수해요',
        paragraphs: ['올라온 영상은 운영팀이 요구사항대로인지 직접 확인해요. 통과한 영상만 정산되고, 그 영상의 검증된 조회수만큼만 예산이 쓰여요.'],
      },
    ],
    faqIds: ['creators', 'review-time', 'view-verification'],
    related: ['repurpose-longform', 'clipping-marketing', 'verified-views'],
    counterpart: 'copyright-safe-clipping',
    updated: UPDATED,
  },
  {
    slug: 'for-film',
    audience: 'advertiser',
    group: 'industry',
    industry: '영화 제작·배급사',
    title: '개봉 전 영화를 숏폼으로 홍보하려면?',
    description: '예고편과 공개 클립으로 클리핑 캠페인을 열면, 개봉 전부터 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요. 개봉일에 맞춰 캠페인을 여는 방법을 정리했어요.',
    answer: [
      '예고편과 공개 클립으로 클리핑 캠페인을 열면, 개봉 전부터 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요.',
      '검증된 조회수만큼만 예산이 쓰이고, 남은 예산은 실시간으로 볼 수 있어요.',
    ],
    sections: [
      {
        heading: '개봉일에서 거꾸로 일정을 잡아요',
        paragraphs: ['캠페인은 입금이 확인된 뒤 공개돼요. 개봉일보다 여유 있게 캠페인을 열어 두면, 개봉 전까지 숏폼이 쌓여요.'],
      },
      {
        heading: '스포일러 범위는 요구사항으로',
        paragraphs: ['써도 되는 장면과 피해야 할 장면, 공개해도 되는 정보를 요구사항에 적어 두세요. 운영팀이 검수할 때 확인해요.'],
      },
      {
        heading: '올릴 플랫폼을 골라요',
        paragraphs: ['유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼 중에서 캠페인마다 고를 수 있어요.'],
      },
    ],
    faqIds: ['start-time', 'platforms', 'budget-exhausted'],
    related: ['for-broadcasters', 'repurpose-longform', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-music',
    audience: 'advertiser',
    group: 'industry',
    industry: '음반사·기획사·아티스트',
    title: '신곡과 무대 영상을 숏폼으로 퍼뜨리려면?',
    description: '무대나 뮤직비디오 영상으로 클리핑 캠페인을 열면, 직캠과 무대 편집에 익숙한 크리에이터들이 숏폼으로 퍼뜨려요. 음원을 쓰는 음악 캠페인은 준비 중이에요.',
    answer: [
      '무대나 뮤직비디오 영상으로 클리핑 캠페인을 열면, 직캠과 무대 편집에 익숙한 크리에이터들이 숏폼으로 퍼뜨려요.',
      '음원을 배경음으로 쓰는 음악 캠페인은 준비하고 있어요.',
    ],
    sections: [
      {
        heading: '무대와 뮤직비디오 클립',
        paragraphs: ['어떤 무대와 뮤직비디오, 어느 구간을 써도 되는지 요구사항에 적어 두면 크리에이터들이 그 안에서 편집해요.'],
      },
      {
        heading: '팬 편집자들과 만나는 곳',
        paragraphs: ['이미 무대와 직캠을 편집해 올리던 크리에이터들이 공식 캠페인으로 참여할 수 있어요. 허락받은 영상으로 편집하고, 조회수만큼 예산을 나눠 받아요.'],
      },
      {
        heading: '음악 캠페인은 준비 중이에요',
        paragraphs: ['음원을 배경음으로 쓰거나 챌린지를 여는 음악 캠페인은 준비하고 있어요. 지금은 무대와 뮤직비디오 영상을 편집하는 클리핑 캠페인으로 열 수 있어요.'],
      },
    ],
    faqIds: ['music', 'creators', 'cost'],
    related: ['for-streamers', 'clipping-marketing', 'viral-without-influencers'],
    counterpart: 'fan-edits',
    updated: UPDATED,
  },
  {
    slug: 'for-streamers',
    audience: 'advertiser',
    group: 'industry',
    industry: '스트리머·유튜버',
    title: '내 방송 클립을 여러 채널에서 퍼뜨리려면?',
    description: '방송 영상으로 클리핑 캠페인을 열면, 클립 크리에이터들이 하이라이트를 쇼츠로 편집해 각자 채널에 올려요. 비용은 검증된 조회수만큼만 나가요.',
    answer: [
      '방송 영상으로 클리핑 캠페인을 열면, 클립 크리에이터들이 하이라이트를 쇼츠로 편집해 각자 채널에 올려요.',
      '내 방송을 아직 모르는 시청자에게 닿는 통로가 늘어나고, 비용은 검증된 조회수만큼만 나가요.',
    ],
    sections: [
      {
        heading: '쓸 방송과 구간을 정해요',
        paragraphs: ['어떤 방송과 다시보기를 써도 되는지, 피해야 할 장면이 있는지 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '내 채널을 알리는 요구사항',
        paragraphs: ['영상 안이나 설명에 내 채널 이름을 넣도록 요구사항에 적을 수 있어요. 운영팀이 검수할 때 확인해요.'],
      },
      {
        heading: '비용은 조회수만큼만',
        paragraphs: ['검증된 조회수만큼만 예산이 쓰이고, 클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 한 영상이 예산을 독차지하지 않아요.'],
      },
    ],
    faqIds: ['cost', 'clip-cap', 'creators'],
    related: ['for-music', 'clipping-marketing', 'repurpose-longform'],
    counterpart: 'fan-edits',
    updated: UPDATED,
  },
  {
    slug: 'for-games',
    audience: 'advertiser',
    group: 'industry',
    industry: '게임사',
    title: '게임 출시와 업데이트를 숏폼으로 알리려면?',
    description: '트레일러와 플레이 영상으로 클리핑 캠페인을 열거나, 크리에이터가 직접 플레이하며 소개하는 소개 캠페인을 열 수 있어요. 검증된 조회수만큼만 예산이 쓰여요.',
    answer: [
      '트레일러와 플레이 영상으로 클리핑 캠페인을 열거나, 크리에이터가 직접 플레이하며 소개하는 소개 캠페인을 열 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '출시와 업데이트 시점에 맞춰요',
        paragraphs: ['캠페인은 입금이 확인된 뒤 공개돼요. 출시일이나 업데이트일보다 여유 있게 열어 두세요.'],
      },
      {
        heading: '클리핑과 소개 캠페인 고르기',
        paragraphs: ['트레일러와 플레이 영상이 있다면 클리핑 캠페인, 크리에이터의 플레이 반응을 보여 주고 싶다면 소개 캠페인이 맞아요.'],
      },
      {
        heading: '올릴 플랫폼을 골라요',
        paragraphs: ['게임 이용자가 많은 플랫폼을 캠페인마다 골라 올리게 할 수 있어요.'],
      },
    ],
    faqIds: ['start-time', 'platforms', 'expected-views'],
    related: ['for-streamers', 'for-startups', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'for-startups',
    audience: 'advertiser',
    group: 'industry',
    industry: '앱·스타트업·커뮤니티',
    title: '적은 예산으로 앱·서비스를 숏폼으로 알리려면?',
    description: `캠페인은 ${MIN_BUDGET}부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여서 작은 예산으로도 시작할 수 있어요. 앱과 서비스를 숏폼으로 알리는 방법을 정리했어요.`,
    answer: [
      `캠페인은 ${MIN_BUDGET}부터 열 수 있고, 검증된 조회수만큼만 예산이 쓰여서 작은 예산으로도 시작할 수 있어요.`,
      '크리에이터들이 서비스를 소개하는 숏폼이나, 서비스 속 재밌는 순간을 편집한 숏폼을 올려요.',
    ],
    sections: [
      {
        heading: '작게 시작해요',
        paragraphs: ['캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 확인할 수 있어요. 작은 예산으로 먼저 열어 보고 반응을 본 뒤 다음 캠페인을 정하면 돼요.'],
      },
      {
        heading: '클립당 상한으로 예산을 나눠요',
        paragraphs: ['클립 하나가 받을 수 있는 금액에 상한을 두면, 한 영상에 예산이 몰리지 않고 여러 영상에 나눠 쓰여요.'],
      },
      {
        heading: '서비스 속 순간을 클립으로',
        paragraphs: ['커뮤니티의 재밌는 글, 앱을 쓰는 화면, 이용 장면처럼 서비스 안의 순간을 영상으로 제공하면 크리에이터들이 숏폼으로 편집해요.'],
      },
    ],
    faqIds: ['min-budget', 'expected-views', 'clip-cap'],
    related: ['for-brands', 'pay-per-view', 'viral-without-influencers'],
    updated: UPDATED,
  },
  {
    slug: 'for-content-ip',
    audience: 'advertiser',
    group: 'industry',
    industry: '웹툰·출판·교육',
    title: '웹툰·책·강의를 숏폼으로 소개하려면?',
    description: '작품 장면이나 강의 핵심을 편집하는 클리핑 캠페인, 직접 읽거나 들어 보고 소개하는 소개 캠페인으로 숏폼을 모을 수 있어요.',
    answer: [
      '작품 장면이나 강의 핵심을 편집하는 클리핑 캠페인, 직접 읽거나 들어 보고 소개하는 소개 캠페인으로 숏폼을 모을 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '웹툰과 웹소설',
        paragraphs: ['써도 되는 컷과 회차, 줄거리를 어디까지 공개할지 요구사항에 적어 두면 크리에이터들이 그 안에서 숏폼으로 만들어요.'],
      },
      {
        heading: '책',
        paragraphs: ['소개 캠페인으로 크리에이터가 책을 읽고 자기 말로 소개하는 숏폼을 모을 수 있어요.'],
      },
      {
        heading: '강의',
        paragraphs: ['강의 영상의 핵심 장면을 제공하면 크리에이터들이 짧게 편집해 올려요. 써도 되는 구간은 요구사항으로 정해요.'],
      },
    ],
    faqIds: ['cost', 'creators', 'review-time'],
    related: ['repurpose-longform', 'clipping-marketing', 'for-brands'],
    updated: UPDATED,
  },
  {
    slug: 'for-live-events',
    audience: 'advertiser',
    group: 'industry',
    industry: '스포츠·공연·페스티벌',
    title: '경기·공연·페스티벌 영상을 숏폼으로 퍼뜨리려면?',
    description: '하이라이트와 현장 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요. 일정에 맞춰 캠페인을 여는 방법을 정리했어요.',
    answer: [
      '하이라이트와 현장 영상으로 클리핑 캠페인을 열면, 여러 크리에이터가 숏폼으로 편집해 퍼뜨려요.',
      '검수 시간을 24시간으로 고르면 올라온 영상을 더 빨리 확인해요.',
    ],
    sections: [
      {
        heading: '일정에 맞춰요',
        paragraphs: ['티켓 오픈 전, 개막 직전, 경기나 공연 직후처럼 알리고 싶은 시점에 맞춰 캠페인을 열어요. 캠페인은 입금이 확인된 뒤 공개돼요.'],
      },
      {
        heading: '쓸 수 있는 영상의 범위',
        paragraphs: ['중계권이나 공연 영상의 사용 범위가 정해져 있다면, 써도 되는 영상과 구간을 요구사항에 분명히 적어 주세요.'],
      },
      {
        heading: '빠른 검수',
        paragraphs: ['검수 시간을 24시간으로 고르면 올라온 영상을 하루 안에 확인해요. 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.'],
      },
    ],
    faqIds: ['review-time', 'start-time', 'platforms'],
    related: ['for-broadcasters', 'repurpose-longform', 'verified-views'],
    updated: UPDATED,
  },
  {
    slug: 'for-local-tourism',
    audience: 'advertiser',
    group: 'industry',
    industry: '지자체·관광',
    title: '지역과 관광지를 숏폼으로 알리려면?',
    description: '관광 영상을 편집하는 클리핑 캠페인이나, 다녀온 경험을 소개하는 소개 캠페인으로 지역을 알리는 숏폼을 모을 수 있어요. 검증된 조회수만큼만 예산이 쓰여요.',
    answer: [
      '관광 영상을 편집하는 클리핑 캠페인이나, 다녀온 경험을 소개하는 소개 캠페인으로 지역을 알리는 숏폼을 모을 수 있어요.',
      '검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '클리핑과 소개 캠페인',
        paragraphs: ['홍보 영상이나 촬영본이 있다면 클리핑 캠페인으로, 크리에이터의 시선으로 보여 주고 싶다면 소개 캠페인으로 열 수 있어요.'],
      },
      {
        heading: '계절과 축제 일정에 맞춰요',
        paragraphs: ['꽃 피는 시기, 축제, 성수기처럼 알리고 싶은 때에 맞춰 캠페인을 열어요. 캠페인은 입금이 확인된 뒤 공개돼요.'],
      },
      {
        heading: '계약과 서류는 먼저 상담해요',
        paragraphs: ['계약이나 정산 서류가 필요하면 상담 문의로 먼저 알려 주세요. 진행 방법을 안내해 드려요.'],
        links: [{ label: '상담 문의', href: '/contact?from=/guides/for-local-tourism' }],
      },
    ],
    faqIds: ['min-budget', 'cost', 'leftover'],
    related: ['for-live-events', 'for-brands', 'viral-without-influencers'],
    updated: UPDATED,
  },
  {
    slug: 'for-agencies',
    audience: 'advertiser',
    group: 'industry',
    industry: '에이전시·MCN',
    title: '고객사 숏폼 바이럴을 클리핑 캠페인으로 운영하려면?',
    description: '고객사별로 캠페인을 열고, 캠페인마다 검증된 조회수와 받은 영상, 사용한 예산을 확인하며 운영할 수 있어요. 대행 조건은 상담 문의로 안내해 드려요.',
    answer: [
      '고객사별로 캠페인을 열고, 캠페인마다 검증된 조회수와 받은 영상, 사용한 예산을 확인하며 운영할 수 있어요.',
      '대행 조건은 상담 문의로 알려 주시면 안내해 드려요.',
    ],
    sections: [
      {
        heading: '캠페인 단위로 운영해요',
        paragraphs: ['고객사의 목표에 맞춰 캠페인마다 예산, 올릴 플랫폼, 요구사항, 검수 시간을 따로 정할 수 있어요.'],
      },
      {
        heading: '대시보드에서 보는 것',
        paragraphs: ['캠페인마다 사용한 예산, 예상 조회수, 검증된 조회수, 받은 영상을 확인할 수 있어요. 고객사 보고에 그대로 쓸 수 있는 숫자예요.'],
      },
      {
        heading: '대행 조건은 상담으로',
        paragraphs: ['여러 고객사를 함께 운영하거나 별도 조건이 필요하면 상담 문의로 알려 주세요.'],
        links: [{ label: '상담 문의', href: '/contact?from=/guides/for-agencies' }],
      },
    ],
    faqIds: ['view-verification', 'budget-exhausted', 'leftover'],
    related: ['clipping-marketing', 'verified-views', 'pay-per-view'],
    updated: UPDATED,
  },
];
```

- [ ] **Step 2: 고민별 5개**

`apps/site/lib/guides/advertiser-problem.ts`:

```ts
import { UPDATED } from './common';
import type { Guide } from './types';

export const ADVERTISER_PROBLEM_GUIDES: Guide[] = [
  {
    slug: 'clipping-marketing',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '클리핑 마케팅이란 뭔가요?',
    description: '클리핑 마케팅은 예산을 걸고 영상을 제공하면, 여러 크리에이터가 숏폼으로 편집해 올리고 조회수만큼 예산을 나눠 받는 방식이에요. 구조와 장점을 정리했어요.',
    answer: [
      '클리핑 마케팅은 예산을 걸고 영상을 제공하면, 여러 크리에이터가 그 영상을 숏폼으로 편집해 올리고 조회수만큼 예산을 나눠 받는 방식이에요.',
      '광고 영상 한 편을 내보내는 대신, 여러 계정에서 여러 버전의 숏폼이 퍼져요.',
    ],
    sections: [
      {
        heading: '이렇게 돌아가요',
        paragraphs: ['예산과 요구사항을 정해 캠페인을 열면 크리에이터들이 지원하고, 운영팀이 승인한 크리에이터가 숏폼을 올려요. 검수를 통과한 영상의 검증된 조회수만큼 예산이 쓰이고, 예산이 다 쓰이면 캠페인이 끝나요.'],
      },
      {
        heading: '광고 한 편과 다른 점',
        paragraphs: ['한 편의 광고를 송출하는 대신, 여러 크리에이터가 각자의 채널과 스타일로 서로 다른 버전을 만들어요. 그중 반응이 오는 영상의 조회수만큼만 예산이 쓰여요.'],
      },
      {
        heading: '허락한 영상으로만',
        paragraphs: ['클리핑 캠페인은 원작자가 사용을 허락한 영상으로 열려요. 써도 되는 영상과 범위는 요구사항으로 정해요.'],
      },
    ],
    faqIds: ['cost', 'creators', 'view-verification'],
    related: ['pay-per-view', 'viral-without-influencers', 'repurpose-longform'],
    counterpart: 'what-is-clipping',
    updated: UPDATED,
  },
  {
    slug: 'pay-per-view',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '광고비를 조회수만큼만 쓰는 방법이 있나요?',
    description: '클리핑 캠페인은 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요. 예산이 쓰이는 방식과 미리 확인하는 방법을 정리했어요.',
    answer: [
      '클리핑 캠페인은 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요.',
      '조회수가 나오지 않으면 예산도 쓰이지 않고, 남은 예산은 실시간으로 볼 수 있어요.',
    ],
    sections: [
      {
        heading: '예산이 쓰이는 순서',
        paragraphs: ['영상이 올라오면 운영팀이 검수하고, 통과한 영상의 조회수를 플랫폼별로 확인한 뒤에 그만큼 예산이 쓰여요. 검수를 통과하지 못한 영상에는 예산이 쓰이지 않아요.'],
      },
      {
        heading: '한 영상에 몰리지 않게',
        paragraphs: ['클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 예산이 여러 영상에 나눠 쓰여요.'],
      },
      {
        heading: '미리 확인해요',
        paragraphs: ['캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 보여 드려요. 다 못 쓴 예산은 캠페인을 마친 뒤 상담 문의로 요청하면 환불받거나 다음 캠페인으로 옮길 수 있어요.'],
      },
    ],
    faqIds: ['cost', 'expected-views', 'leftover'],
    related: ['verified-views', 'clipping-marketing', 'for-startups'],
    updated: UPDATED,
  },
  {
    slug: 'viral-without-influencers',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '인플루언서 섭외 없이 숏폼 바이럴을 할 수 있나요?',
    description: '캠페인을 열면 크리에이터들이 직접 지원하고, 운영팀이 승인한 크리에이터만 참여해요. 섭외와 정산 없이 여러 크리에이터의 숏폼을 모으는 방법이에요.',
    answer: [
      '캠페인을 열면 크리에이터들이 직접 지원해요. 운영팀이 승인한 크리에이터만 참여하고, 정산과 지급은 Clipers가 맡아요.',
      '한 명을 섭외하는 대신 여러 크리에이터가 각자 다른 버전을 올려요.',
    ],
    sections: [
      {
        heading: '섭외 대신 지원과 승인',
        paragraphs: ['한 명씩 연락하고 조건을 맞추는 대신, 캠페인을 열어 두면 크리에이터들이 지원해요. 운영팀이 지원을 확인하고 승인한 사람만 영상을 올려요.'],
      },
      {
        heading: '여러 크리에이터, 여러 버전',
        paragraphs: ['참여한 크리에이터마다 자기 채널과 스타일로 숏폼을 만들어요. 반응이 오는 영상의 조회수만큼 예산이 쓰여요.'],
      },
      {
        heading: '정산과 지급은 Clipers가',
        paragraphs: ['크리에이터마다 조회수를 확인하고 정산해 지급하는 일은 Clipers가 맡아요. 광고주는 캠페인 하나의 예산만 관리하면 돼요.'],
      },
    ],
    faqIds: ['creators', 'cost', 'platforms'],
    related: ['clipping-marketing', 'for-brands', 'pay-per-view'],
    updated: UPDATED,
  },
  {
    slug: 'repurpose-longform',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '롱폼 영상을 숏폼으로 재활용하려면?',
    description: '가진 롱폼 영상으로 클리핑 캠페인을 열면, 크리에이터들이 구간을 골라 숏폼으로 편집해 올려요. 한 편의 롱폼에서 여러 버전의 숏폼이 나와요.',
    answer: [
      '가진 롱폼 영상으로 클리핑 캠페인을 열면, 크리에이터들이 구간을 골라 숏폼으로 편집해 올려요.',
      '한 편의 롱폼에서 여러 버전의 숏폼이 나오고, 검증된 조회수만큼만 예산이 쓰여요.',
    ],
    sections: [
      {
        heading: '어떤 롱폼이 맞나요',
        paragraphs: ['방송, 웨비나, 인터뷰, 브이로그, 강의처럼 이미 찍어 둔 긴 영상이라면 무엇이든 클리핑 캠페인의 재료가 될 수 있어요.'],
      },
      {
        heading: '쓸 수 있는 범위를 정해요',
        paragraphs: ['써도 되는 구간과 피해야 할 내용, 출처 표기 방법을 요구사항에 적어 두면 돼요.'],
      },
      {
        heading: '여러 버전이 생겨요',
        paragraphs: ['크리에이터마다 다른 구간과 다른 편집으로 숏폼을 만들어서, 한 편의 롱폼이 여러 개의 숏폼으로 퍼져요.'],
      },
    ],
    faqIds: ['cost', 'review-time', 'platforms'],
    related: ['for-broadcasters', 'clipping-marketing', 'for-content-ip'],
    updated: UPDATED,
  },
  {
    slug: 'verified-views',
    audience: 'advertiser',
    group: 'advertiser-problem',
    title: '숏폼 바이럴 조회수, 믿을 수 있나요?',
    description: 'Clipers는 올라온 영상을 사람이 검수하고, 조회수를 플랫폼별로 확인한 뒤에만 예산을 써요. 비정상적으로 늘어난 조회수는 따로 확인해요.',
    answer: [
      'Clipers는 올라온 영상을 사람이 검수하고, 조회수를 플랫폼별로 확인한 뒤에만 예산을 써요.',
      '짧은 시간에 비정상적으로 늘어난 조회수는 따로 확인하고, 걸러진 조회수에는 예산이 쓰이지 않아요.',
    ],
    sections: [
      {
        heading: '사람이 검수해요',
        paragraphs: ['올라온 영상은 운영팀이 요구사항대로인지 직접 확인해요. 통과한 영상만 정산 대상이 돼요.'],
      },
      {
        heading: '플랫폼별로 확인해요',
        paragraphs: ['유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 크리에이터가 낸 화면 캡처를 운영팀이 대조해요.'],
      },
      {
        heading: '급증은 따로 봐요',
        paragraphs: ['짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요. 걸러진 조회수에는 예산이 쓰이지 않아요.'],
      },
    ],
    faqIds: ['view-verification', 'creators', 'cost'],
    related: ['pay-per-view', 'clipping-marketing', 'for-agencies'],
    counterpart: 'is-it-legit',
    updated: UPDATED,
  },
];
```

- [ ] **Step 3: 통과 확인 후 커밋 (Task 1·2 함께)**

Run: `pnpm --filter @clipers/site test` 그리고 `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"`
Expected: 테스트 모두 통과, 타입 오류는 `guide-article.tsx`(Task 3에서 고침) 외에는 없음. `guide-article.tsx`가 `faqById`를 직접 쓰고 있어 오류가 나지 않더라도 Task 3에서 `guideFaqs`로 바꾼다.

```bash
git add apps/site/lib/guides
git commit -m "feat(site): sixteen advertiser guides; guides gain audience, counterparts and industries; creator closing blocks cut to two lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 화면 — 가이드 본문·라우트·목록

**Files:**
- Modify: `apps/site/components/guide-article.tsx`, `apps/site/app/guides/[slug]/page.tsx`, `apps/site/app/guides/page.tsx`
- Modify: `packages/ui/src/styles/components.css` (파일 끝)

- [ ] **Step 1: `GuideArticle`을 audience별로**

`guide-article.tsx`에서:
1. import 변경: `import { faqById } from '@/lib/creator-faq';` 삭제, `import { ADVERTISER_NOTES, CAVEATS, START_STEPS } from '@/lib/guides/common';`, `import { guideBySlug, guideFaqs, type Guide } from '@/lib/guides';`
2. 컴포넌트 시작에 `const advertiser = guide.audience === 'advertiser';`와 `const counterpart = guide.counterpart ? guideBySlug(guide.counterpart) : undefined;`, `const contactHref = `/contact?from=${path}${guide.industry ? `&industry=${encodeURIComponent(guide.industry)}` : ''}`;`
3. "알아둘 점" 섹션과 "시작하는 법" 섹션을 다음으로 바꾼다:

```tsx
        {advertiser ? (
          <section className="cl-guide__section">
            <h2>시작하기 전에</h2>
            <ul>
              {ADVERTISER_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="cl-guide__actions">
              <ButtonLink href={SIGN_UP} size="lg" variant="primary">
                캠페인 시작하기
              </ButtonLink>
              <ButtonLink href={contactHref} size="lg" variant="secondary">
                상담 문의
              </ButtonLink>
            </div>
          </section>
        ) : (
          <>
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
              <ul>
                {START_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div className="cl-guide__actions">
                <ButtonLink href={SIGN_UP} size="lg" variant="primary">
                  무료로 시작하기
                </ButtonLink>
                <ButtonLink href="/discover" size="lg" variant="secondary">
                  캠페인 둘러보기
                </ButtonLink>
              </div>
            </section>
          </>
        )}

        {counterpart && (
          <p className="cl-guide__counterpart">
            {advertiser ? '크리에이터라면' : '광고주라면'}{' '}
            <Link href={`/guides/${counterpart.slug}`}>{counterpart.title}</Link>
          </p>
        )}
```

4. 캠페인 카드 블록 조건을 `{!advertiser && campaigns.length > 0 && (`로.
5. FAQ: `<LandingFaq compact items={guideFaqs(guide)} path={path} />`
6. 관련 가이드 제목 그대로.

- [ ] **Step 2: 가이드 라우트**

`apps/site/app/guides/[slug]/page.tsx`의 본문 함수를 다음으로 바꾼다(메타데이터 함수는 그대로):

```tsx
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const advertiser = guide.audience === 'advertiser';
  const campaigns = advertiser ? [] : (await loadLiveCampaigns()).sort((left, right) => right.remainingBudget - left.remainingBudget).slice(0, 3);
  return (
    <LandingChrome cta={advertiser ? '캠페인 시작하기' : '무료로 시작하기'} path={advertiser ? '/brands' : '/guides'}>
      <GuideArticle campaigns={campaigns} guide={guide} />
    </LandingChrome>
  );
}
```

- [ ] **Step 3: 목록 페이지를 audience별로**

`apps/site/app/guides/page.tsx`: import에 `GUIDE_AUDIENCES` 추가, 설명을 `'크리에이터의 숏폼 부업과 수익, 광고주의 숏폼 바이럴과 클리핑 마케팅까지 자주 묻는 질문에 답했어요.'`로, 리드를 `'크리에이터와 광고주가 자주 묻는 질문에 답했어요.'`로 바꾸고, 묶음 목록을 다음으로 바꾼다:

```tsx
        {GUIDE_AUDIENCES.map((audience) => (
          <div className="cl-guides__audience" key={audience.id}>
            <h2>{audience.label}</h2>
            {GUIDE_GROUPS.filter((group) => group.audience === audience.id).map((group) => (
              <section className="cl-guides__group" key={group.id}>
                <h3>{group.label}</h3>
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
        ))}
```

- [ ] **Step 4: 스타일**

`components.css` 끝에 추가(다른 세션의 커밋되지 않은 변경이 이 파일에 있으면 기다린 뒤 진행):

```css
/* guides hub: two audiences; counterpart line at the end of a guide */
.cl-guides__audience { margin-top: var(--space-9, 56px); }
.cl-guides__audience > h2 { font-size: var(--font-size-6); font-weight: 600; letter-spacing: -0.02em; }
.cl-guides__group h3 { margin-bottom: var(--space-3); color: var(--color-text-subtle); font-size: var(--font-size-2); font-weight: 500; }
.cl-guide__counterpart { margin-top: var(--space-7); padding: var(--space-4) var(--space-5); border-radius: 12px; background: var(--color-panel); color: var(--color-text-muted); font-size: var(--font-size-3); }
.cl-guide__counterpart a { color: var(--color-text); font-weight: 600; }
.cl-guide__counterpart a:hover { text-decoration: underline; }
```

(`.cl-guides__group h2` 규칙은 그대로 둬도 된다. 목록 묶음 제목이 이제 h3이다.)

- [ ] **Step 5: 확인 후 커밋**

1. 타입 오류 없음.
2. `curl`로 광고주 가이드 16개, 크리에이터 가이드 15개가 모두 200.
3. `curl -s http://localhost:3001/guides/for-music | grep -o '크리에이터라면'` → 한 줄, `/guides/fan-edits`에는 `광고주라면`.
4. `/guides/for-games`의 상담 문의 링크가 `/contact?from=/guides/for-games&industry=` + 인코딩된 `게임사`.
5. 광고주 가이드 HTML에 `1천 회당`이 없음: `for s in for-brands pay-per-view verified-views; do curl -s http://localhost:3001/guides/$s | grep -c "1천 회당"; done` → 모두 0.
6. playwright로 `/guides`, `/guides/for-streamers`, `/guides/side-job-students`를 1440·390px에서 확인, 가로 스크롤 없음.

```bash
git add apps/site/components/guide-article.tsx apps/site/app/guides packages/ui/src/styles/components.css
git commit -m "feat(site): advertiser guides render with brand chrome, notes and a contact button; hub split by audience; counterpart links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: llms.txt — 가이드를 audience별로

**Files:**
- Modify: `apps/site/app/llms.txt/route.ts`

- [ ] **Step 1: 크리에이터 가이드 목록은 크리에이터 묶음만, 광고주 가이드 목록은 광고주 섹션에**

`'## 가이드',` 블록의 `GUIDE_GROUPS.flatMap(` 을 `GUIDE_GROUPS.filter((group) => group.audience === 'creator').flatMap(` 으로 바꾸고 제목을 `'## 가이드 (크리에이터)'`로 바꾼다.

`'## 자주 묻는 질문 (광고주)',` 줄 바로 앞에 넣는다:

```ts
    '## 가이드 (광고주)',
    ...GUIDE_GROUPS.filter((group) => group.audience === 'advertiser').flatMap((group) => [
      `### ${group.label}`,
      ...GUIDES.filter((guide) => guide.group === group.id).map(
        (guide) => `- [${guide.title}](${siteUrl(`/guides/${guide.slug}`)}): ${guide.answer.join(' ')}`
      ),
      '',
    ]),
```

- [ ] **Step 2: 확인 후 커밋**

Run: `curl -s http://localhost:3001/llms.txt | grep -c "](http://localhost:3001/guides/"` → `31`
Run: `curl -s http://localhost:3001/llms.txt | awk '/^## 가이드 \(광고주\)/{f=1} /^## 자주 묻는 질문 \(광고주\)/{f=0} f' | grep -c "1천 회당"` → `0`
Run: `curl -s http://localhost:3001/sitemap.xml | grep -o "/guides/[a-z-]*" | sort -u | wc -l` → `31`

```bash
git add apps/site/app/llms.txt/route.ts
git commit -m "feat(site): llms.txt lists creator and advertiser guides in their own sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 전체 확인

- [ ] `pnpm test` 전부 통과, 타입 오류 없음.
- [ ] 분리된 작업 폴더에서 `pnpm --filter @clipers/site build` 성공, `/guides/[slug]`에 31개 경로.
- [ ] 작업 폴더 삭제(`Remove-Item -LiteralPath "\\?\<path>" -Recurse -Force`, `git worktree prune`).
