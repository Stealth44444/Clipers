# 광고주 AEO B1 — FAQ 모듈 · 상담 문의 폼 · 신뢰 데이터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 광고주 FAQ를 공용 모듈로 만들어 브랜드 페이지·llms.txt에 쓰고, `/contact` 상담 문의 폼(DB 저장 + 슬랙 알림)을 만들고, 사이트 Organization 구조화 데이터에 회사 정보를 넣는다.

**Architecture:** FAQ와 문의 입력 검증은 순수 TypeScript 모듈(테스트 포함). 문의는 서버 액션이 검증 → Supabase `inquiries`에 공개 키로 insert(RLS가 insert만 허용) → 슬랙 알림(있을 때만). 화면은 클라이언트 폼 컴포넌트가 `useActionState`로 서버 액션을 부른다.

**Tech Stack:** Next.js 15 App Router(서버 액션) · React 19 `useActionState` · Supabase(Postgres, RLS) · Vitest · `@clipers/ui`의 `Field`/`Input`/`Select`/`Textarea`/`Button`

**Spec:** `docs/superpowers/specs/2026-10-01-advertiser-aeo-design.md` §2·§3·§5

**공통 규칙:** 해요체. 브랜드 단가·크리에이터 단가를 광고주 쪽에 쓰지 않는다("1천 회당" 금지). 개발 서버가 켜져 있으면 메인 폴더에서 `next build`를 돌리지 않는다. 다른 세션의 커밋되지 않은 변경은 내 커밋에 넣지 않는다(`git add`는 내가 바꾼 파일만). 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `apps/site/lib/advertiser-faq.ts` (+ `.test.ts`) | 생성 | 광고주 FAQ 12개, `advertiserFaqById` |
| `apps/site/lib/inquiry.ts` (+ `.test.ts`) | 생성 | 업종 목록, 입력 검증 `validateInquiry`, 슬랙 문구 `inquirySlackText` |
| `supabase/migrations/<version>_inquiries.sql` | 생성 | `inquiries` 테이블 + insert 전용 RLS |
| `apps/site/app/contact/actions.ts` | 생성 | 서버 액션 `submitInquiry` |
| `apps/site/components/contact-form.tsx` | 생성 | 문의 폼(클라이언트) |
| `apps/site/app/contact/page.tsx` | 생성 | `/contact` 페이지 |
| `packages/ui/src/styles/components.css` | 수정 | `cl-contact*` 스타일 |
| `apps/site/app/brands/page.tsx` | 수정 | FAQ 모듈 사용, CTA에 상담 문의 |
| `apps/site/app/layout.tsx` | 수정 | Organization에 주소·사업자등록번호 |
| `apps/site/app/llms.txt/route.ts`, `apps/site/app/sitemap.ts` | 수정 | 광고주 FAQ·상담 문의 반영 |
| `apps/site/.env.local` | 수정(커밋 안 함) | `SLACK_WEBHOOK_URL` |

---

### Task 1: 광고주 FAQ 모듈

**Files:**
- Create: `apps/site/lib/advertiser-faq.ts`
- Test: `apps/site/lib/advertiser-faq.test.ts`
- Modify: `apps/site/app/brands/page.tsx:17-27`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { ADVERTISER_FAQ, advertiserFaqById } from './advertiser-faq';

describe('ADVERTISER_FAQ', () => {
  it('has twelve questions with unique ids', () => {
    const ids = ADVERTISER_FAQ.map((item) => item.id);
    expect(ids).toEqual([
      'min-budget', 'cost', 'expected-views', 'clip-cap', 'budget-exhausted', 'leftover',
      'start-time', 'review-time', 'creators', 'view-verification', 'platforms', 'music',
    ]);
  });

  it('looks questions up by id', () => {
    expect(advertiserFaqById('min-budget').a).toBe('캠페인은 100만 원부터 열 수 있어요. 상한은 없어요.');
    expect(advertiserFaqById('review-time').a).toContain('24시간이나 48시간');
    expect(() => advertiserFaqById('nope')).toThrow('Unknown advertiser FAQ id: nope');
  });

  it('never states a per-view rate', () => {
    const text = ADVERTISER_FAQ.map((item) => item.q + item.a).join('\n');
    expect(text).not.toContain('1천 회당');
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site test -- advertiser-faq`
Expected: FAIL — Failed to load url ./advertiser-faq

- [ ] **Step 3: 구현**

`apps/site/lib/advertiser-faq.ts`:

```ts
import { MIN_CAMPAIGN_BUDGET, REVIEW_SLA_OPTIONS } from '@clipers/db';

// Advertiser FAQ, shared by the brand landing (and its FAQPage data), the advertiser guides and /llms.txt.
// No per-view rate of either side: the brand rate is never public, and both together would reveal the spread.

const minBudget = `${(MIN_CAMPAIGN_BUDGET / 10_000).toLocaleString('ko-KR')}만 원`;
const hours = REVIEW_SLA_OPTIONS.map((value) => `${value}시간`).join('이나 ');

export const ADVERTISER_FAQ: { id: string; q: string; a: string }[] = [
  { id: 'min-budget', q: '최소 예산이 있나요?', a: `캠페인은 ${minBudget}부터 열 수 있어요. 상한은 없어요.` },
  { id: 'cost', q: '비용은 어떻게 계산되나요?', a: '검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰여요. 조회수가 나오지 않으면 예산도 쓰이지 않아요.' },
  {
    id: 'expected-views',
    q: '예산으로 조회수가 얼마나 나오나요?',
    a: '캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 보여 드려요. 실제 조회수는 올라온 영상의 반응에 따라 달라져요.',
  },
  {
    id: 'clip-cap',
    q: '영상 하나에 예산이 몰리지는 않나요?',
    a: '클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 한 영상이 예산을 독차지하지 않아요.',
  },
  {
    id: 'budget-exhausted',
    q: '예산이 다 쓰이면 어떻게 되나요?',
    a: '검증된 조회수만큼 예산이 다 쓰이면 캠페인이 끝나요. 남은 예산은 언제든 실시간으로 확인할 수 있어요.',
  },
  {
    id: 'leftover',
    q: '다 못 쓴 예산은 어떻게 되나요?',
    a: '캠페인을 마친 뒤 상담 문의로 요청하면, 쓰지 않은 예산을 환불받거나 다음 캠페인으로 옮길 수 있어요.',
  },
  { id: 'start-time', q: '캠페인은 언제 시작되나요?', a: '캠페인을 만들고 예산을 입금하면, 운영팀이 입금을 확인한 뒤 바로 공개돼요.' },
  {
    id: 'review-time',
    q: '올라온 영상은 얼마나 빨리 검수하나요?',
    a: `캠페인을 만들 때 ${hours} 중에서 고를 수 있어요. 운영팀이 그 안에 요구사항대로인지 확인해요.`,
  },
  { id: 'creators', q: '어떤 크리에이터가 참여하나요?', a: '크리에이터는 캠페인마다 지원하고, 운영팀이 승인한 사람만 영상을 올릴 수 있어요.' },
  {
    id: 'view-verification',
    q: '조회수는 어떻게 확인하나요?',
    a: '유튜브는 조회수를 자동으로 수집하고, 다른 플랫폼은 크리에이터가 낸 화면 캡처를 운영팀이 대조해요. 짧은 시간에 비정상적으로 늘어난 조회수는 따로 확인해요.',
  },
  {
    id: 'platforms',
    q: '어떤 플랫폼을 지원하나요?',
    a: '유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼이에요. 캠페인마다 올릴 플랫폼을 고를 수 있어요.',
  },
  {
    id: 'music',
    q: '음원을 쓰는 음악 캠페인도 열 수 있나요?',
    a: '음원을 배경음으로 쓰는 음악 캠페인은 준비하고 있어요. 지금은 무대나 뮤직비디오 영상을 편집하는 클리핑 캠페인으로 열 수 있어요.',
  },
];

export function advertiserFaqById(id: string): { id: string; q: string; a: string } {
  const item = ADVERTISER_FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown advertiser FAQ id: ${id}`);
  return item;
}
```

참고: `MIN_CAMPAIGN_BUDGET`이 1,000,000이면 `minBudget`은 `100만 원`. `REVIEW_SLA_OPTIONS`가 `[24, 48]`이면 `hours`는 `24시간이나 48시간`.

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site test -- advertiser-faq`
Expected: PASS (3)

- [ ] **Step 5: 브랜드 페이지가 모듈을 쓰게**

`apps/site/app/brands/page.tsx`에서 `const FAQ = [ … ];` 블록(17~27행)을 지우고, import에 `import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';`를 더한 뒤 `<LandingFaq items={FAQ} path="/brands" />`를 `<LandingFaq items={ADVERTISER_FAQ} path="/brands" />`로 바꾼다.

Run: `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"`
Expected: 출력 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/site/lib/advertiser-faq.ts apps/site/lib/advertiser-faq.test.ts apps/site/app/brands/page.tsx
git commit -m "feat(site): advertiser FAQ module (12), used on the brand page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 문의 입력 검증 `inquiry.ts`

**Files:**
- Create: `apps/site/lib/inquiry.ts`
- Test: `apps/site/lib/inquiry.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'vitest';
import { INQUIRY_INDUSTRIES, inquirySlackText, validateInquiry } from './inquiry';

const valid = {
  company: '오토랩',
  contactName: '김담당',
  email: 'team@autolab.kr',
  phone: '',
  industry: '브랜드·소비재·D2C',
  message: '신차 런칭 영상으로 클리핑 캠페인을 열고 싶어요.',
  consent: 'on',
  website: '',
};

describe('validateInquiry', () => {
  it('accepts a complete inquiry and trims it', () => {
    const result = validateInquiry({ ...valid, company: '  오토랩  ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.company).toBe('오토랩');
      expect(result.value.phone).toBeNull();
    }
  });

  it('reports each problem in Korean', () => {
    const result = validateInquiry({ ...valid, company: '', email: 'not-an-email', industry: '우주', message: '짧아요', consent: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        company: '회사·기관명을 입력해 주세요.',
        email: '이메일 주소를 확인해 주세요.',
        industry: '업종을 골라 주세요.',
        message: '문의 내용을 10자 이상 적어 주세요.',
        consent: '개인정보 수집·이용에 동의해 주세요.',
      });
    }
  });

  it('flags the honeypot as spam without listing it as an error', () => {
    const result = validateInquiry({ ...valid, website: 'http://spam.example' });
    expect(result).toEqual({ ok: false, spam: true, errors: {} });
  });

  it('lists the advertiser industries plus 기타', () => {
    expect(INQUIRY_INDUSTRIES).toHaveLength(12);
    expect(INQUIRY_INDUSTRIES.at(-1)).toBe('기타');
  });
});

describe('inquirySlackText', () => {
  it('summarises the inquiry for the ops channel', () => {
    const result = validateInquiry(valid);
    if (!result.ok) throw new Error('expected valid');
    expect(inquirySlackText(result.value)).toContain('새 상담 문의 — 오토랩 (브랜드·소비재·D2C)');
    expect(inquirySlackText(result.value)).toContain('team@autolab.kr');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site test -- inquiry`
Expected: FAIL — Failed to load url ./inquiry

- [ ] **Step 3: 구현**

`apps/site/lib/inquiry.ts`:

```ts
// Contact-form input, checked the same way on every submit. `website` is a honeypot: people never see it, bots fill it.

export const INQUIRY_INDUSTRIES = [
  '브랜드·소비재·D2C',
  '방송국·OTT·제작사',
  '영화 제작·배급사',
  '음반사·기획사·아티스트',
  '스트리머·유튜버',
  '게임사',
  '앱·스타트업·커뮤니티',
  '웹툰·출판·교육',
  '스포츠·공연·페스티벌',
  '지자체·관광',
  '에이전시·MCN',
  '기타',
] as const;

export const INQUIRY_LIMITS = { company: 100, contactName: 50, email: 200, phone: 30, message: 2000 } as const;

export type InquiryField = 'company' | 'contactName' | 'email' | 'phone' | 'industry' | 'message' | 'consent';

export type Inquiry = {
  company: string;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string;
  message: string;
};

export type InquiryResult =
  | { ok: true; value: Inquiry }
  | { ok: false; spam?: true; errors: Partial<Record<InquiryField, string>> };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function validateInquiry(input: Record<string, unknown>): InquiryResult {
  if (text(input.website)) return { ok: false, spam: true, errors: {} };

  const value: Inquiry = {
    company: text(input.company),
    contactName: text(input.contactName),
    email: text(input.email),
    phone: text(input.phone) || null,
    industry: text(input.industry),
    message: text(input.message),
  };
  const errors: Partial<Record<InquiryField, string>> = {};

  if (!value.company) errors.company = '회사·기관명을 입력해 주세요.';
  else if (value.company.length > INQUIRY_LIMITS.company) errors.company = `회사·기관명은 ${INQUIRY_LIMITS.company}자 이하로 적어 주세요.`;

  if (!value.contactName) errors.contactName = '담당자 이름을 입력해 주세요.';
  else if (value.contactName.length > INQUIRY_LIMITS.contactName) errors.contactName = `담당자 이름은 ${INQUIRY_LIMITS.contactName}자 이하로 적어 주세요.`;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > INQUIRY_LIMITS.email) errors.email = '이메일 주소를 확인해 주세요.';

  if (value.phone && value.phone.length > INQUIRY_LIMITS.phone) errors.phone = '전화번호를 확인해 주세요.';

  if (!(INQUIRY_INDUSTRIES as readonly string[]).includes(value.industry)) errors.industry = '업종을 골라 주세요.';

  if (value.message.length < 10) errors.message = '문의 내용을 10자 이상 적어 주세요.';
  else if (value.message.length > INQUIRY_LIMITS.message) errors.message = `문의 내용은 ${INQUIRY_LIMITS.message.toLocaleString('ko-KR')}자 이하로 적어 주세요.`;

  if (text(input.consent) !== 'on') errors.consent = '개인정보 수집·이용에 동의해 주세요.';

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function inquirySlackText(inquiry: Inquiry): string {
  return [
    `:incoming_envelope: 새 상담 문의 — ${inquiry.company} (${inquiry.industry})`,
    `담당자: ${inquiry.contactName} · ${inquiry.email}${inquiry.phone ? ` · ${inquiry.phone}` : ''}`,
    inquiry.message,
  ].join('\n');
}
```

- [ ] **Step 4: 통과 확인 후 커밋**

Run: `pnpm --filter @clipers/site test -- inquiry`
Expected: PASS (5)

```bash
git add apps/site/lib/inquiry.ts apps/site/lib/inquiry.test.ts
git commit -m "feat(site): contact inquiry validation, industries and the ops message

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `inquiries` 테이블 (insert 전용 RLS)

**Files:**
- Create: `supabase/migrations/<적용 버전>_inquiries.sql`

- [ ] **Step 1: SQL**

```sql
-- Contact-form inquiries from the public site. Anyone may add one (the site uses the anon key); nobody can read,
-- change or delete them through the API: the ops team reads them in the dashboard and gets a Slack alert.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 1 and 100),
  contact_name text not null check (char_length(contact_name) between 1 and 50),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (phone is null or char_length(phone) <= 30),
  industry text not null check (char_length(industry) between 1 and 40),
  message text not null check (char_length(message) between 10 and 2000),
  source_path text check (source_path is null or char_length(source_path) <= 200),
  consented_at timestamptz not null
);

alter table public.inquiries enable row level security;

create policy inquiries_insert_public on public.inquiries
  for insert to anon, authenticated
  with check (true);

grant insert on public.inquiries to anon, authenticated;
```

- [ ] **Step 2: 적용 (사용자 확인 후)**

운영 DB 변경이므로 사용자에게 적용해도 되는지 확인한 뒤 Supabase MCP `apply_migration`(name `inquiries`)으로 적용한다. 결과의 버전으로 파일을 `supabase/migrations/<version>_inquiries.sql`에 저장한다.

- [ ] **Step 3: 권한 확인**

Supabase MCP `execute_sql`로 확인한다:

```sql
select polname, polcmd, polroles::regrole[] from pg_policy where polrelid = 'public.inquiries'::regclass;
```

Expected: `inquiries_insert_public`, `polcmd = a`(insert) 하나만.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/*_inquiries.sql
git commit -m "feat(db): inquiries table; the public can add, not read

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 서버 액션 + 문의 폼 + `/contact`

**Files:**
- Create: `apps/site/app/contact/actions.ts`, `apps/site/components/contact-form.tsx`, `apps/site/app/contact/page.tsx`
- Modify: `packages/ui/src/styles/components.css` (파일 끝)
- Modify: `apps/site/.env.local` (커밋하지 않음)

- [ ] **Step 1: 서버 액션**

`apps/site/app/contact/actions.ts`:

```ts
'use server';

import { sendSlackNotification } from '@clipers/db';
import { inquirySlackText, validateInquiry, type InquiryField } from '@/lib/inquiry';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type ContactState = { status: 'idle' | 'error' | 'done'; errors: Partial<Record<InquiryField, string>>; message?: string };

export async function submitInquiry(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const result = validateInquiry(Object.fromEntries(formData));
  // A filled honeypot gets the same thank-you a person would, and nothing is stored.
  if (!result.ok && result.spam) return { status: 'done', errors: {} };
  if (!result.ok) return { status: 'error', errors: result.errors, message: '입력한 내용을 확인해 주세요.' };

  const inquiry = result.value;
  const sourcePath = String(formData.get('sourcePath') ?? '').slice(0, 200) || null;
  // Insert only: the inquiries table lets the public add rows but never read them back, so no .select() here.
  const { error } = await getSupabaseServerClient().from('inquiries').insert({
    company: inquiry.company,
    contact_name: inquiry.contactName,
    email: inquiry.email,
    phone: inquiry.phone,
    industry: inquiry.industry,
    message: inquiry.message,
    source_path: sourcePath,
    consented_at: new Date().toISOString(),
  });
  if (error) return { status: 'error', errors: {}, message: '문의를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.' };

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) await sendSlackNotification(webhook, inquirySlackText(inquiry));

  return { status: 'done', errors: {} };
}
```

- [ ] **Step 2: 폼 컴포넌트**

`apps/site/components/contact-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Select, StatusDot, Textarea } from '@clipers/ui';
import { submitInquiry, type ContactState } from '@/app/contact/actions';
import { INQUIRY_INDUSTRIES, INQUIRY_LIMITS } from '@/lib/inquiry';

const INITIAL: ContactState = { status: 'idle', errors: {} };

export default function ContactForm({ sourcePath, industry }: { sourcePath?: string; industry?: string }) {
  const [state, action, pending] = useActionState(submitInquiry, INITIAL);

  if (state.status === 'done') {
    return (
      <div className="cl-contact__done" role="status">
        <StatusDot tone="green">문의를 받았어요</StatusDot>
        <p>영업일 기준으로 이메일로 답해 드릴게요.</p>
      </div>
    );
  }

  const error = (field: keyof ContactState['errors']) => state.errors[field] ?? null;

  return (
    <form action={action} className="cl-contact__form" noValidate>
      <input name="sourcePath" type="hidden" value={sourcePath ?? ''} />
      {/* Honeypot: hidden from people and screen readers; bots fill every field. */}
      <div aria-hidden className="cl-contact__trap">
        <label>
          웹사이트
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
      </div>

      <div className="cl-contact__row">
        <Field error={error('company')} htmlFor="contact-company" label="회사·기관명">
          <Input autoComplete="organization" id="contact-company" maxLength={INQUIRY_LIMITS.company} name="company" required />
        </Field>
        <Field error={error('contactName')} htmlFor="contact-name" label="담당자 이름">
          <Input autoComplete="name" id="contact-name" maxLength={INQUIRY_LIMITS.contactName} name="contactName" required />
        </Field>
      </div>
      <div className="cl-contact__row">
        <Field error={error('email')} htmlFor="contact-email" label="이메일">
          <Input autoComplete="email" id="contact-email" maxLength={INQUIRY_LIMITS.email} name="email" required type="email" />
        </Field>
        <Field error={error('phone')} hint="선택" htmlFor="contact-phone" label="전화번호">
          <Input autoComplete="tel" id="contact-phone" maxLength={INQUIRY_LIMITS.phone} name="phone" type="tel" />
        </Field>
      </div>
      <Field error={error('industry')} htmlFor="contact-industry" label="업종">
        <Select defaultValue={industry ?? ''} id="contact-industry" name="industry" required>
          <option disabled value="">
            업종을 골라 주세요
          </option>
          {INQUIRY_INDUSTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </Field>
      <Field error={error('message')} htmlFor="contact-message" label="문의 내용">
        <Textarea
          id="contact-message"
          maxLength={INQUIRY_LIMITS.message}
          name="message"
          placeholder="알리고 싶은 영상이나 제품, 생각 중인 일정과 예산을 적어 주시면 더 빠르게 답해 드릴 수 있어요."
          required
          rows={6}
        />
      </Field>

      <label className="cl-contact__consent">
        <input name="consent" required type="checkbox" />
        <span>
          개인정보 수집·이용에 동의해요. <small>수집 항목: 회사·기관명, 담당자 이름, 이메일, 전화번호(선택) · 목적: 상담 문의 답변 · 보유 기간: 답변 후 1년 뒤 삭제. 동의하지 않으면 문의를 남길 수 없어요.</small>
        </span>
      </label>
      {error('consent') && <p className="cl-field__error">{error('consent')}</p>}

      {state.status === 'error' && state.message && (
        <p className="cl-contact__message" role="alert">
          {state.message}
        </p>
      )}
      <Button disabled={pending} size="lg" type="submit" variant="primary">
        {pending ? '보내는 중…' : '문의 보내기'}
      </Button>
    </form>
  );
}
```

`@clipers/ui`의 `Button`이 `size`, `variant`, `disabled`, `type`을 받는지 `packages/ui/src/components/Button.tsx`에서 확인한다(17행 `Button({ variant, size, block, className, icon, iconEnd, children, type = 'button', ...rest })` — `disabled`는 `...rest`로 전달됨).

- [ ] **Step 3: 페이지**

`apps/site/app/contact/page.tsx`:

```tsx
import type { Metadata } from 'next';
import ContactForm from '@/components/contact-form';
import LandingChrome from '@/components/landing-chrome';
import { INQUIRY_INDUSTRIES } from '@/lib/inquiry';

export const metadata: Metadata = {
  title: '상담 문의 — Clipers',
  description: '숏폼 클리핑 캠페인의 구성, 예산, 일정이 궁금하면 남겨 주세요. 운영팀이 이메일로 답해 드려요.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ industry?: string; from?: string }> }) {
  const { industry, from } = await searchParams;
  const knownIndustry = industry && (INQUIRY_INDUSTRIES as readonly string[]).includes(industry) ? industry : undefined;
  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <div className="cl-contact">
        <h1>상담 문의</h1>
        <p className="cl-contact__lead">캠페인 구성, 예산, 일정이 궁금하면 남겨 주세요. 운영팀이 이메일로 답해 드려요.</p>
        <ContactForm industry={knownIndustry} sourcePath={from?.startsWith('/') ? from : '/contact'} />
      </div>
    </LandingChrome>
  );
}
```

- [ ] **Step 4: 스타일**

`components.css` 파일 끝에 추가(다른 세션의 커밋되지 않은 변경이 이 파일에 있으면, 그쪽이 커밋될 때까지 기다린 뒤 진행):

```css
/* ---------- contact (advertiser inquiries) ---------- */
.cl-contact { width: min(640px, 100% - 40px); margin: 0 auto; padding: 56px 0 96px; }
.cl-contact h1 { font-size: clamp(30px, 4.6vw, 42px); font-weight: 600; letter-spacing: -0.03em; }
.cl-contact__lead { margin-top: var(--space-3); color: var(--color-text-muted); font-size: 17px; line-height: 1.7; }
.cl-contact__form { position: relative; display: grid; gap: var(--space-4); margin-top: var(--space-7); }
.cl-contact__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.cl-contact__trap { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.cl-contact__consent { display: flex; align-items: flex-start; gap: var(--space-2); color: var(--color-text); font-size: var(--font-size-2); line-height: 1.6; cursor: pointer; }
.cl-contact__consent input { margin-top: 4px; accent-color: var(--brand-9); }
.cl-contact__consent small { display: block; color: var(--color-text-subtle); font-size: var(--font-size-1); }
.cl-contact__message { color: var(--tomato-11, #d13415); font-size: var(--font-size-2); }
.cl-contact__done { display: grid; gap: var(--space-2); margin-top: var(--space-7); padding: var(--space-6); border-radius: 16px; background: var(--color-panel); }
.cl-contact__done p { color: var(--color-text-muted); }
@media (max-width: 640px) {
  .cl-contact__row { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 5: 슬랙 환경변수**

`apps/app/.env.local`의 `SLACK_WEBHOOK_URL` 값을 `apps/site/.env.local`에 같은 이름으로 복사한다(값을 화면에 출력하지 않는다). `.env.local`은 커밋하지 않는다. 개발 서버를 다시 띄워 환경변수를 읽게 한다.

- [ ] **Step 6: 동작 확인**

1. `pnpm --filter @clipers/site exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"` → 출력 없음
2. 브라우저(playwright)로 `/contact`에서 빈 채로 제출 → 회사·이름·이메일·업종·문의·동의 오류 문구가 보임
3. 숨김 칸 `website`에 값을 넣고 제출 → "문의를 받았어요"가 보이고, Supabase `select count(*) from inquiries where company = '<테스트 회사명>'`이 0
4. 정상 입력(회사명 `테스트-삭제예정`) 제출 → "문의를 받았어요", `inquiries`에 1행, 슬랙 채널에 알림
5. 확인용 행은 Supabase MCP `execute_sql`로 지운다(사용자 확인 후): `delete from public.inquiries where company = '테스트-삭제예정';`
6. 1440·390px 화면 확인, 가로 스크롤 없음

- [ ] **Step 7: 커밋**

```bash
git add apps/site/app/contact apps/site/components/contact-form.tsx packages/ui/src/styles/components.css
git commit -m "feat(site): /contact — advertiser inquiries saved and sent to the ops channel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 브랜드 페이지 상담 문의 · Organization · llms.txt · 사이트맵

**Files:**
- Modify: `apps/site/app/brands/page.tsx` (마지막 CTA)
- Modify: `apps/site/app/layout.tsx` (ORGANIZATION)
- Modify: `apps/site/app/llms.txt/route.ts`, `apps/site/app/sitemap.ts`

- [ ] **Step 1: 브랜드 페이지 CTA**

마지막 `<section className="cl-landing-cta">`의 두 번째 버튼(`진행 중인 캠페인 보기`) 뒤에 추가:

```tsx
          <ButtonLink href="/contact?from=/brands" size="lg" variant="secondary">
            상담 문의
          </ButtonLink>
```

- [ ] **Step 2: Organization 구조화 데이터**

`layout.tsx`에 `import { COMPANY } from '@/lib/company';`를 추가하고, Organization 객체의 `description` 뒤에:

```ts
      address: { '@type': 'PostalAddress', streetAddress: COMPANY.address, addressLocality: '용인시', addressRegion: '경기도', addressCountry: 'KR' },
      taxID: COMPANY.registrationNumber,
      contactPoint: { '@type': 'ContactPoint', contactType: 'sales', url: siteUrl('/contact'), availableLanguage: 'ko' },
```

- [ ] **Step 3: llms.txt**

`route.ts`에 `import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';`를 추가하고, 기존 `'## 브랜드·아티스트'` 블록(세 줄)을 다음으로 바꾼다:

```ts
    '## 브랜드·아티스트·광고주',
    `- 캠페인은 ${formatKRW(MIN_CAMPAIGN_BUDGET)}부터 열 수 있고, 검수를 통과한 영상의 검증된 조회수만큼만 예산이 쓰입니다. 캠페인을 만들 때 예산을 넣으면 예상 조회수를 바로 보여 줍니다.`,
    `- 상담이 필요하면 [상담 문의](${siteUrl('/contact')})에 남기면 운영팀이 이메일로 답합니다.`,
    `- 자세한 안내: [브랜드 안내](${siteUrl('/brands')})`,
    '',
    '## 자주 묻는 질문 (광고주)',
    ...ADVERTISER_FAQ.flatMap((item) => [`### ${item.q}`, item.a, '']),
```

- [ ] **Step 4: 사이트맵**

`sitemap.ts`의 `/guides` 줄 앞에:

```ts
    { url: siteUrl('/contact'), changeFrequency: 'yearly', priority: 0.5 },
```

- [ ] **Step 5: 확인 후 커밋**

Run:
- `curl -s -m 120 http://localhost:3001/ | grep -o '"taxID":"544-87-03492"'` → 한 줄
- `curl -s -m 120 http://localhost:3001/llms.txt | grep -c "### "` → 크리에이터 FAQ 12 + 광고주 FAQ 12 + 가이드 묶음 수 이상
- `curl -s -m 120 http://localhost:3001/llms.txt | grep -n "1천 회당" ` → 크리에이터 섹션에만 있고 광고주 섹션(`## 브랜드·아티스트·광고주` 이후)에는 없음
- `curl -s -m 120 http://localhost:3001/sitemap.xml | grep -c "/contact"` → 1

```bash
git add apps/site/app/brands/page.tsx apps/site/app/layout.tsx apps/site/app/llms.txt/route.ts apps/site/app/sitemap.ts
git commit -m "feat(site): brand page links the contact form; operator details in Organization data; advertiser FAQ in llms.txt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 전체 확인

- [ ] `pnpm test` 전부 통과(사이트: creator-faq, advertiser-faq, inquiry, facts, guides).
- [ ] 타입 오류 없음.
- [ ] 분리된 작업 폴더(`git worktree add --detach <scratchpad>/build-wt HEAD`, `.env.local` 복사, `pnpm install --frozen-lockfile --prefer-offline`)에서 `pnpm --filter @clipers/site build` 성공, `/contact`가 라우트 목록에 있음. 끝나면 작업 폴더를 지운다(`Remove-Item -LiteralPath "\\?\<path>" -Recurse -Force` 후 `git worktree prune`).
