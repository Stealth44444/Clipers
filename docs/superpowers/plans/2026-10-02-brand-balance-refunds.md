# 캠페인 중단 · 남은 금액 반환과 이월 · 입금액 불일치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브랜드가 화면에서 캠페인을 중단하면, 중단한 주까지만 정산한 뒤 남은 서비스 대금을 브랜드 잔액으로 확정한다. 브랜드는 잔액을 반환받거나(확정 후 1년 안, 공제 없음) 다음 캠페인에 쓴다. 운영자는 입금액이 안내 금액과 다를 때 부족분을 보류하고 초과분을 반환한다.

**Architecture:** 계산은 `@clipers/db`의 순수 함수에 둔다(`brandBalance.ts`, `services/campaignStop.ts`, 테스트 포함). DB 쪽은 새 열과 두 표(`brand_balance_entries`, `brand_refunds`), security definer 함수를 둔다(`stop_campaign`, `report_deposit`, `record_deposit`, `finalize_campaign`, `request_refund`, `mark_refund_paid`). 장부는 이 함수로만 쓴다. 주간 정산은 중단된 캠페인을 중단한 주까지만 정산하고, 끝에 남은 금액을 확정한다. 화면은 브랜드 캠페인 상세·예산 사용 내역, 운영자 입금 확인·반환이다.

**Tech Stack:** TypeScript · Vitest · Supabase(Postgres, plpgsql, RLS, 열 단위 권한) · Next.js(App Router, server actions)

**Spec:** `docs/superpowers/specs/2026-10-02-brand-balance-refunds-design.md`

**공통 규칙:**
- 브랜드 단가는 화면에 새로 노출하지 않는다.
- 화면 문구는 '환불'이 아니라 '반환'을 쓴다.
- 다른 세션의 커밋되지 않은 변경은 내 커밋에 넣지 않는다. 커밋 전에 `git status`로 확인하고, 섞여 있으면 내 파일만 `git add <path>`로 올린다.
- 운영 DB 변경(마이그레이션 적용)은 사용자 확인 후에만 한다.
- 푸시하지 않는다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.

---

### Task 1: 잔액·입금·반환 계산 (`brandBalance.ts`)

**Files:** Create `packages/db/src/brandBalance.ts` · Create `packages/db/src/brandBalance.test.ts` · Modify `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트** — `packages/db/src/brandBalance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  REFUND_WINDOW_MONTHS,
  balanceSummary,
  businessDaysSince,
  classifyDeposit,
  depositDue,
  maxCredit,
  refundTransferAmount,
  validateRefundRequest,
  type BalanceEntry,
} from './brandBalance';

const NOW = new Date('2026-10-02T03:00:00.000Z');
const FUTURE = '2027-10-01T00:00:00.000Z';
const PAST = '2026-09-01T00:00:00.000Z';
const leftover = (amount: number, refundableUntil: string): BalanceEntry => ({ kind: 'leftover', amount, refundableUntil });
const applied = (amount: number): BalanceEntry => ({ kind: 'applied', amount: -amount, refundableUntil: null });
const refunded = (amount: number): BalanceEntry => ({ kind: 'refunded', amount: -amount, refundableUntil: null });

describe('balanceSummary', () => {
  it('is empty without entries', () => {
    expect(balanceSummary([], NOW)).toEqual({ balance: 0, refundable: 0, campaignOnly: 0 });
  });

  it('lets a leftover inside its window be returned in full', () => {
    expect(balanceSummary([leftover(300_000, FUTURE)], NOW)).toEqual({ balance: 300_000, refundable: 300_000, campaignOnly: 0 });
  });

  it('keeps a leftover past its window for campaigns only', () => {
    expect(balanceSummary([leftover(300_000, PAST)], NOW)).toEqual({ balance: 300_000, refundable: 0, campaignOnly: 300_000 });
  });

  it('counts a leftover whose window ends right now as past it', () => {
    expect(balanceSummary([leftover(100_000, NOW.toISOString())], NOW).refundable).toBe(0);
  });

  it('takes spending from the expired part first', () => {
    // 300,000 expired + 200,000 fresh, 250,000 used: 50,000 of the expired part is left, so 200,000 can be returned.
    const entries = [leftover(300_000, PAST), leftover(200_000, FUTURE), applied(250_000)];
    expect(balanceSummary(entries, NOW)).toEqual({ balance: 250_000, refundable: 200_000, campaignOnly: 50_000 });
  });

  it('lets everything be returned once spending covered the expired part', () => {
    const entries = [leftover(100_000, PAST), leftover(200_000, FUTURE), applied(150_000)];
    expect(balanceSummary(entries, NOW)).toEqual({ balance: 150_000, refundable: 150_000, campaignOnly: 0 });
  });

  it('counts returned amounts as spent', () => {
    expect(balanceSummary([leftover(200_000, FUTURE), refunded(200_000)], NOW)).toEqual({ balance: 0, refundable: 0, campaignOnly: 0 });
  });
});

describe('deposit with balance', () => {
  it('uses the balance up to the service amount', () => {
    expect(maxCredit(300_000, 1_000_000)).toBe(300_000);
    expect(maxCredit(1_500_000, 1_000_000)).toBe(1_000_000);
    expect(maxCredit(0, 1_000_000)).toBe(0);
  });

  it('asks for the rest of the service amount plus its VAT', () => {
    expect(depositDue(1_000_000, 0)).toBe(1_100_000);
    expect(depositDue(1_000_000, 300_000)).toBe(770_000);
    expect(depositDue(1_000_000, 1_000_000)).toBe(0);
  });
});

describe('classifyDeposit', () => {
  it('tells short, exact and over deposits apart', () => {
    expect(classifyDeposit(1_100_000, 1_000_000)).toEqual({ kind: 'short', difference: 100_000 });
    expect(classifyDeposit(1_100_000, 1_100_000)).toEqual({ kind: 'exact', difference: 0 });
    expect(classifyDeposit(1_100_000, 1_150_000)).toEqual({ kind: 'over', difference: 50_000 });
    expect(classifyDeposit(0, 0)).toEqual({ kind: 'exact', difference: 0 });
  });
});

describe('refundTransferAmount', () => {
  it('returns the service amount and its VAT with nothing deducted', () => {
    expect(refundTransferAmount(300_000)).toBe(330_000);
    expect(refundTransferAmount(12_345)).toBe(13_579);
  });
});

describe('validateRefundRequest', () => {
  const valid = { amount: 100_000, bankCode: '004', accountNumber: '123-456-789012', accountHolder: ' 주식회사 예시 ' };

  it('normalises a valid request', () => {
    expect(validateRefundRequest(valid, 300_000)).toEqual({
      ok: true,
      data: { amount: 100_000, bankCode: '004', accountNumber: '123456789012', accountHolder: '주식회사 예시' },
    });
  });

  it('refuses amounts outside what can be returned', () => {
    expect(validateRefundRequest({ ...valid, amount: 0 }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, amount: 1.5 }, 300_000).ok).toBe(false);
    const over = validateRefundRequest({ ...valid, amount: 300_001 }, 300_000);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message).toContain('300,000원');
  });

  it('refuses an unknown bank, a bad account number or no holder', () => {
    expect(validateRefundRequest({ ...valid, bankCode: '999' }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, accountNumber: '12ab' }, 300_000).ok).toBe(false);
    expect(validateRefundRequest({ ...valid, accountHolder: '  ' }, 300_000).ok).toBe(false);
  });
});

describe('businessDaysSince', () => {
  // 2026-10-02 is a Friday. Public holidays are not taken out.
  const requested = '2026-10-02T01:00:00.000Z';

  it('counts weekdays after the request day, Korea time', () => {
    expect(businessDaysSince(requested, new Date('2026-10-02T09:00:00.000Z'))).toBe(0);
    expect(businessDaysSince(requested, new Date('2026-10-05T01:00:00.000Z'))).toBe(1);
    expect(businessDaysSince(requested, new Date('2026-10-09T01:00:00.000Z'))).toBe(5);
  });
});

describe('REFUND_WINDOW_MONTHS', () => {
  it('is one year', () => {
    expect(REFUND_WINDOW_MONTHS).toBe(12);
  });
});
```

Run: `pnpm --filter @clipers/db test -- brandBalance` → FAIL (module not found)

- [ ] **Step 2: 구현** — `packages/db/src/brandBalance.ts`:

```ts
// Brand balance: what is left of a stopped campaign's service amount, spent on a later campaign or returned.
// Amounts are service won without VAT; VAT is added only when money moves (depositAmount).
// brand_balance(), deposit_due() and the refund window in supabase/migrations mirror this file (brandBalance.test.ts).
import { depositAmount } from './billing';
import { BANKS } from './payouts';

/** A leftover can be returned for this many months after it is fixed; after that it can only go into a campaign. */
export const REFUND_WINDOW_MONTHS = 12;

export type BalanceEntryKind = 'leftover' | 'applied' | 'refunded';
/** One row of brand_balance_entries: leftovers are positive, spending and returns negative. */
export type BalanceEntry = { kind: BalanceEntryKind; amount: number; refundableUntil: string | null };
export type BalanceSummary = { balance: number; refundable: number; campaignOnly: number };

/**
 * The brand's balance and how much of it can still be returned. Spending is taken from leftovers past their window
 * first, which leaves the brand as much returnable money as possible.
 */
export function balanceSummary(entries: BalanceEntry[], now: Date = new Date()): BalanceSummary {
  let balance = 0;
  let expired = 0;
  let used = 0;
  for (const entry of entries) {
    balance += entry.amount;
    if (entry.kind === 'leftover') {
      if (entry.refundableUntil && Date.parse(entry.refundableUntil) <= now.getTime()) expired += entry.amount;
    } else {
      used -= entry.amount;
    }
  }
  const refundable = Math.max(0, balance - Math.max(0, expired - used));
  return { balance, refundable, campaignOnly: balance - refundable };
}

/** Most of the balance a campaign can use: all of it, up to the campaign's service amount. */
export function maxCredit(balance: number, serviceAmount: number): number {
  return Math.max(0, Math.min(balance, serviceAmount));
}

/** What the brand transfers after putting `credit` of its balance into a campaign: the rest plus its VAT. */
export function depositDue(serviceAmount: number, credit: number): number {
  return depositAmount(serviceAmount - credit);
}

export type DepositCheck = { kind: 'short' | 'exact' | 'over'; difference: number };

/** Compares what reached the bank account (VAT included) with what was due. */
export function classifyDeposit(due: number, received: number): DepositCheck {
  if (received < due) return { kind: 'short', difference: due - received };
  if (received > due) return { kind: 'over', difference: received - due };
  return { kind: 'exact', difference: 0 };
}

/** What Clipers transfers back for a returned service amount: the amount and its VAT, nothing deducted. */
export function refundTransferAmount(serviceAmount: number): number {
  return depositAmount(serviceAmount);
}

export type RefundRequestInput = { amount: number; bankCode: string; accountNumber: string; accountHolder: string };

/** Checks a return request against what can be returned and normalises the account number to digits. */
export function validateRefundRequest(
  input: RefundRequestInput,
  refundable: number
): { ok: true; data: RefundRequestInput } | { ok: false; message: string } {
  const accountNumber = input.accountNumber.replace(/[\s-]/g, '');
  const accountHolder = input.accountHolder.trim();

  if (!Number.isInteger(input.amount) || input.amount < 1) return { ok: false, message: '반환받을 금액을 입력해 주세요.' };
  if (input.amount > refundable) return { ok: false, message: `반환할 수 있는 금액은 ${refundable.toLocaleString('ko-KR')}원까지예요.` };
  if (!BANKS.some((bank) => bank.code === input.bankCode)) return { ok: false, message: '은행을 선택해 주세요.' };
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, message: '계좌번호를 숫자로 입력해 주세요.' };
  if (!accountHolder || accountHolder.length > 100) return { ok: false, message: '예금주를 입력해 주세요.' };
  return { ok: true, data: { amount: input.amount, bankCode: input.bankCode, accountNumber, accountHolder } };
}

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Weekdays after the day of `fromIso` up to today, Korea time (public holidays are not taken out). */
export function businessDaysSince(fromIso: string, now: Date = new Date()): number {
  const start = Math.floor((Date.parse(fromIso) + KOREA_OFFSET_MS) / DAY_MS);
  const end = Math.floor((now.getTime() + KOREA_OFFSET_MS) / DAY_MS);
  let days = 0;
  for (let day = start + 1; day <= end; day += 1) {
    const weekday = new Date(day * DAY_MS).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}
```

`packages/db/src/index.ts`의 `export * from './billing';` 아래에 추가:

```ts
export * from './brandBalance';
```

Run: `pnpm --filter @clipers/db test -- brandBalance` → PASS

- [ ] **Step 3: 커밋**

```bash
git add packages/db/src/brandBalance.ts packages/db/src/brandBalance.test.ts packages/db/src/index.ts
git commit -m "feat(db): brand balance, deposit and return calculations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 중단된 캠페인의 정산 범위 · 예산 소진 종료의 사용액

**Files:** Create `packages/db/src/services/campaignStop.ts` · Create `packages/db/src/services/campaignStop.test.ts` · Modify `packages/db/src/pricing.ts`, `packages/db/src/pricing.test.ts`, `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트** — `packages/db/src/services/campaignStop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { includeInSettlement } from './campaignStop';
import { settlementPeriodFor } from './settlement';

// Week of Monday 2026-09-21 (Korea time): 2026-09-20T15:00Z to 2026-09-27T15:00Z.
const STOP_WEEK = settlementPeriodFor('2026-09-21');
const NEXT_WEEK = settlementPeriodFor('2026-09-28');
const STOPPED_AT = '2026-09-23T05:00:00.000Z';

describe('includeInSettlement', () => {
  it('settles every clip of a campaign that was not stopped', () => {
    expect(includeInSettlement('2026-09-25T00:00:00.000Z', null, NEXT_WEEK)).toBe(true);
  });

  it('settles clips approved before the stop, through the week of the stop', () => {
    expect(includeInSettlement('2026-09-22T00:00:00.000Z', STOPPED_AT, STOP_WEEK)).toBe(true);
    expect(includeInSettlement(STOPPED_AT, STOPPED_AT, STOP_WEEK)).toBe(true);
  });

  it('stops settling from the week after the stop', () => {
    expect(includeInSettlement('2026-09-22T00:00:00.000Z', STOPPED_AT, NEXT_WEEK)).toBe(false);
  });

  it('never settles a clip approved after the stop', () => {
    expect(includeInSettlement('2026-09-23T06:00:00.000Z', STOPPED_AT, STOP_WEEK)).toBe(false);
  });

  it('leaves clips without a review time to the settlement rules', () => {
    expect(includeInSettlement(null, STOPPED_AT, STOP_WEEK)).toBe(true);
  });
});
```

`packages/db/src/pricing.test.ts`의 `describe('budgetUsage', ...)` 안에 추가:

```ts
  it('counts a campaign closed by its budget as fully spent, rounding leftovers included', () => {
    // 1,000,000 won buys a 266,666 won creator cap; that converts back to 999,998 won.
    expect(budgetUsage(1_000_000, 266_666, DEFAULT_PRICING)).toEqual({ spent: 999_998, remaining: 2, ratio: 0.999998 });
    expect(budgetUsage(1_000_000, 266_666, DEFAULT_PRICING, true)).toEqual({ spent: 1_000_000, remaining: 0, ratio: 1 });
  });
```

Run: `pnpm --filter @clipers/db test -- campaignStop pricing` → FAIL (module not found; 4th argument ignored)

- [ ] **Step 2: 구현** — `packages/db/src/services/campaignStop.ts`:

```ts
import type { SettlementPeriod } from './settlement';

/**
 * Whether a clip of a possibly stopped campaign is settled for `period` (terms 제11조 2항): only clips approved by the
 * time of the stop, and only through the week the campaign was stopped in.
 */
export function includeInSettlement(reviewedAt: string | null, stoppedAt: string | null, period: SettlementPeriod): boolean {
  if (!stoppedAt) return true;
  const stopped = Date.parse(stoppedAt);
  if (period.startAt.getTime() > stopped) return false;
  if (reviewedAt && Date.parse(reviewedAt) > stopped) return false;
  return true;
}
```

`packages/db/src/pricing.ts`의 `budgetUsage`를 바꾼다:

```ts
/**
 * Budget consumed by creator payouts, expressed in brand spend. A campaign closed because its budget ran out
 * (`exhausted`) counts as fully spent: the creator cap is cut to the won, so converting back can leave a few won.
 */
export function budgetUsage(totalBudget: number, creatorPaid: number, pricing: CampaignPricing, exhausted = false) {
  const converted = pricing.creatorCpm > 0 ? Math.min(totalBudget, Math.round((creatorPaid * pricing.brandCpm) / pricing.creatorCpm)) : 0;
  const spent = exhausted ? totalBudget : converted;
  return { spent, remaining: totalBudget - spent, ratio: totalBudget > 0 ? spent / totalBudget : 0 };
}
```

`packages/db/src/index.ts`의 `export * from './services/campaignClosure';` 아래에 추가:

```ts
export * from './services/campaignStop';
```

Run: `pnpm --filter @clipers/db test -- campaignStop pricing` → PASS

- [ ] **Step 3: 커밋**

```bash
git add packages/db/src/services/campaignStop.ts packages/db/src/services/campaignStop.test.ts packages/db/src/pricing.ts packages/db/src/pricing.test.ts packages/db/src/index.ts
git commit -m "feat(db): a stopped campaign settles only through its stop week; a campaign closed by its budget is fully spent

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: DB — 열, 장부·반환 표, 함수

**Files:** Create `supabase/migrations/<version>_brand_balance_refunds.sql` (버전은 적용할 때 MCP가 돌려준 값) · Modify `packages/db/src/brandBalance.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `brandBalance.test.ts` 맨 위 import에 `readdirSync, readFileSync`, `fileURLToPath`를 추가하고, 파일 끝에 붙인다:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const migrations = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .join('\n');

describe('migration mirrors brandBalance.ts', () => {
  it('uses the same refund window, deposit math and refundable rule', () => {
    const sql = migrations();
    expect(sql).toContain(`now() + interval '${REFUND_WINDOW_MONTHS} months'`);
    expect(sql).toContain('select (greatest(0, p_service) + floor(greatest(0, p_service) / 10))::integer');
    expect(sql).toContain('greatest(0, balance - greatest(0, expired - used))');
  });
});
```

(import 문은 파일 맨 위로 옮긴다.) Run: `pnpm --filter @clipers/db test -- brandBalance` → FAIL (문자열 없음)

- [ ] **Step 2: 마이그레이션 작성** — `supabase/migrations/brand_balance_refunds.sql`(임시 이름, Step 4에서 버전을 붙인다):

```sql
-- Stopping campaigns, the brand balance (leftovers of stopped campaigns) and returns of it, and deposits that don't
-- match what was asked. Design: docs/superpowers/specs/2026-10-02-brand-balance-refunds-design.md.
-- deposit_due(), brand_balance() and the refund window mirror packages/db/src/brandBalance.ts (brandBalance.test.ts).
-- Ledger amounts are service won without VAT. Only the functions below write the ledger and the refunds.

-- 1. Campaign stop and leftover fixing
alter table public.campaigns
  add column stopped_at timestamptz,
  add column finalized_at timestamptz;

grant select (stopped_at, finalized_at) on public.campaigns to authenticated;

-- 2. Deposits: what reached the bank account so far (VAT included) and how much balance the campaign used
alter table public.campaign_escrow
  add column received_amount numeric(12, 0) not null default 0 check (received_amount >= 0),
  add column credit_applied numeric(12, 0) not null default 0 check (credit_applied >= 0);

-- 3. Returns: a brand's request for its balance, or an over-deposit sent back to the account it came from
create type public.refund_kind as enum ('leftover', 'over_deposit');
create type public.refund_status as enum ('requested', 'paid');

create table public.brand_refunds (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.profiles(id) on delete restrict,
  kind public.refund_kind not null,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  service_amount integer check (service_amount > 0),
  transfer_amount integer not null check (transfer_amount > 0),
  bank_code text check (bank_code ~ '^\d{3}$'),
  account_number text check (account_number ~ '^\d{6,20}$'),
  account_holder text check (char_length(account_holder) between 1 and 100),
  status public.refund_status not null default 'requested',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  constraint brand_refunds_paid_at check ((status = 'paid') = (paid_at is not null)),
  constraint brand_refunds_shape check (
    (kind = 'leftover' and campaign_id is null and service_amount is not null
      and bank_code is not null and account_number is not null and account_holder is not null)
    or (kind = 'over_deposit' and campaign_id is not null and service_amount is null
      and bank_code is null and account_number is null and account_holder is null)
  )
);

create index brand_refunds_brand_idx on public.brand_refunds (brand_id, requested_at desc);
create index brand_refunds_status_idx on public.brand_refunds (status, requested_at);
create index brand_refunds_paid_by_idx on public.brand_refunds (paid_by);
create unique index brand_refunds_one_open_leftover on public.brand_refunds (brand_id) where kind = 'leftover' and status = 'requested';
create unique index brand_refunds_one_over_deposit on public.brand_refunds (campaign_id) where kind = 'over_deposit';

alter table public.brand_refunds enable row level security;

create policy brand_refunds_select_own_or_admin on public.brand_refunds
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.brand_refunds from anon, authenticated;
grant select on public.brand_refunds to authenticated;

-- 4. Ledger
create type public.balance_entry_kind as enum ('leftover', 'applied', 'refunded');

create table public.brand_balance_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.profiles(id) on delete restrict,
  kind public.balance_entry_kind not null,
  amount integer not null,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  refund_id uuid references public.brand_refunds(id) on delete restrict,
  refundable_until timestamptz,
  created_at timestamptz not null default now(),
  constraint brand_balance_entries_shape check (
    (kind = 'leftover' and amount > 0 and campaign_id is not null and refund_id is null and refundable_until is not null)
    or (kind = 'applied' and amount < 0 and campaign_id is not null and refund_id is null and refundable_until is null)
    or (kind = 'refunded' and amount < 0 and campaign_id is null and refund_id is not null and refundable_until is null)
  )
);

create index brand_balance_entries_brand_idx on public.brand_balance_entries (brand_id, created_at desc);
create index brand_balance_entries_refund_idx on public.brand_balance_entries (refund_id);
create unique index brand_balance_one_leftover on public.brand_balance_entries (campaign_id) where kind = 'leftover';
create unique index brand_balance_one_applied on public.brand_balance_entries (campaign_id) where kind = 'applied';

alter table public.brand_balance_entries enable row level security;

create policy brand_balance_entries_select_own_or_admin on public.brand_balance_entries
  for select to authenticated
  using (brand_id = auth.uid() or public.current_role_is('admin'));

revoke all on public.brand_balance_entries from anon, authenticated;
grant select on public.brand_balance_entries to authenticated;

-- 5. Shared math (mirrors depositAmount and balanceSummary)
create or replace function public.deposit_due(p_service numeric)
returns integer
language sql
immutable
set search_path = public
as $$
  select (greatest(0, p_service) + floor(greatest(0, p_service) / 10))::integer
$$;

create or replace function public.brand_balance(p_brand_id uuid, out balance integer, out refundable integer)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      coalesce(sum(amount), 0) as balance,
      coalesce(sum(amount) filter (where kind = 'leftover' and refundable_until <= now()), 0) as expired,
      coalesce(-sum(amount) filter (where kind in ('applied', 'refunded')), 0) as used
    from public.brand_balance_entries
    where brand_id = p_brand_id
  )
  select balance::integer, greatest(0, balance - greatest(0, expired - used))::integer from totals
$$;

revoke execute on function public.deposit_due(numeric) from public, anon;
grant execute on function public.deposit_due(numeric) to authenticated;
revoke execute on function public.brand_balance(uuid) from public, anon, authenticated;

-- 6. The brand stops its live campaign: off the market at once, pending clips rejected (terms 제11조 2항)
create or replace function public.stop_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaigns
  set status = 'closed', stopped_at = now()
  where id = p_campaign_id and brand_id = auth.uid() and status = 'live';
  if not found then
    raise exception 'Only a live campaign of yours can be stopped' using hint = 'not_stoppable';
  end if;

  update public.clips
  set status = 'rejected', rejection_reason = '광고주가 캠페인을 중단했어요', reviewed_at = now()
  where campaign_id = p_campaign_id and status = 'pending_review';
end;
$$;

revoke execute on function public.stop_campaign(uuid) from public, anon;
grant execute on function public.stop_campaign(uuid) to authenticated;

-- 7. The brand reports its deposit, optionally paying part of the budget from its balance
create or replace function public.report_deposit(p_campaign_id uuid, p_credit integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
  available integer;
begin
  if p_credit is null or p_credit < 0 then
    raise exception 'Credit must be zero or more' using hint = 'invalid_credit';
  end if;

  select * into target from public.campaigns
  where id = p_campaign_id and brand_id = auth.uid() and status = 'draft'
  for update;
  if target.id is null then
    raise exception 'Only a draft campaign of yours can report a deposit' using hint = 'not_draft';
  end if;

  if p_credit > 0 then
    -- One balance change at a time per brand.
    perform 1 from public.profiles where id = auth.uid() for update;
    select balance into available from public.brand_balance(auth.uid());
    if p_credit > least(available, target.total_budget) then
      raise exception 'Credit exceeds the balance or the budget' using hint = 'credit_too_large';
    end if;
    insert into public.brand_balance_entries (brand_id, kind, amount, campaign_id)
    values (auth.uid(), 'applied', -p_credit, p_campaign_id);
  end if;

  update public.campaign_escrow set credit_applied = p_credit where campaign_id = p_campaign_id;
  -- require_billing_before_deposit still refuses this without tax invoice details.
  update public.campaigns set status = 'pending_escrow' where id = p_campaign_id;
end;
$$;

revoke execute on function public.report_deposit(uuid, integer) from public, anon;
grant execute on function public.report_deposit(uuid, integer) to authenticated;

-- 8. The operator records money seen in the bank account. Short: keep waiting. Enough: confirm (the escrow trigger
-- makes the campaign live). Over: confirm and queue the excess to go back.
create or replace function public.record_deposit(p_campaign_id uuid, p_amount integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
  escrow public.campaign_escrow;
  due integer;
  received integer;
begin
  if not public.current_role_is('admin') then
    raise exception 'Only an admin can record deposits';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be zero or more' using hint = 'invalid_amount';
  end if;

  select * into target from public.campaigns where id = p_campaign_id and status = 'pending_escrow' for update;
  if target.id is null then
    raise exception 'Campaign is not waiting for a deposit' using hint = 'not_pending';
  end if;
  select * into escrow from public.campaign_escrow where campaign_id = p_campaign_id for update;

  due := public.deposit_due(target.total_budget - escrow.credit_applied);
  received := escrow.received_amount + p_amount;

  if received < due then
    update public.campaign_escrow set received_amount = received where campaign_id = p_campaign_id;
    return 'short';
  end if;

  update public.campaign_escrow
  set received_amount = received, escrow_status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()
  where campaign_id = p_campaign_id and escrow_status = 'awaiting_manual_confirm';

  if received > due then
    insert into public.brand_refunds (brand_id, kind, campaign_id, transfer_amount)
    values (target.brand_id, 'over_deposit', p_campaign_id, received - due);
    return 'over';
  end if;
  return 'exact';
end;
$$;

revoke execute on function public.record_deposit(uuid, integer) from public, anon;
grant execute on function public.record_deposit(uuid, integer) to authenticated;

-- 9. The settlement run fixes a stopped campaign's leftover once its last week is settled. Runs once per campaign.
create or replace function public.finalize_campaign(p_campaign_id uuid, p_leftover integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.campaigns;
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.current_role_is('admin')) then
    raise exception 'Only the settlement run can finalize campaigns';
  end if;

  select * into target from public.campaigns
  where id = p_campaign_id and status = 'closed' and finalized_at is null
  for update;
  if target.id is null then
    return false;
  end if;
  if p_leftover is null or p_leftover < 0 or p_leftover > target.total_budget then
    raise exception 'Leftover % is outside the budget', p_leftover;
  end if;

  update public.campaigns set finalized_at = now() where id = p_campaign_id;
  if p_leftover > 0 then
    insert into public.brand_balance_entries (brand_id, kind, amount, campaign_id, refundable_until)
    values (target.brand_id, 'leftover', p_leftover, p_campaign_id, now() + interval '12 months');
  end if;
  return true;
end;
$$;

revoke execute on function public.finalize_campaign(uuid, integer) from public, anon;
grant execute on function public.finalize_campaign(uuid, integer) to authenticated, service_role;

-- 10. The brand asks for part or all of its returnable balance (one open request at a time)
create or replace function public.request_refund(p_amount integer, p_bank_code text, p_account_number text, p_account_holder text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  summary record;
  new_refund_id uuid;
begin
  if auth.uid() is null or not public.current_role_is('brand') then
    raise exception 'Only a brand can ask for its balance back';
  end if;

  perform 1 from public.profiles where id = auth.uid() for update;
  if exists (select 1 from public.brand_refunds where brand_id = auth.uid() and kind = 'leftover' and status = 'requested') then
    raise exception 'A return request is already open' using hint = 'refund_open';
  end if;

  select * into summary from public.brand_balance(auth.uid());
  if p_amount is null or p_amount < 1 or p_amount > summary.refundable then
    raise exception 'Return amount out of range (returnable %)', summary.refundable using hint = 'refund_amount';
  end if;

  insert into public.brand_refunds (brand_id, kind, service_amount, transfer_amount, bank_code, account_number, account_holder)
  values (auth.uid(), 'leftover', p_amount, public.deposit_due(p_amount), p_bank_code, p_account_number, trim(p_account_holder))
  returning id into new_refund_id;

  insert into public.brand_balance_entries (brand_id, kind, amount, refund_id)
  values (auth.uid(), 'refunded', -p_amount, new_refund_id);
  return new_refund_id;
end;
$$;

revoke execute on function public.request_refund(integer, text, text, text) from public, anon;
grant execute on function public.request_refund(integer, text, text, text) to authenticated;

-- 11. The operator marks a return sent, after making the transfer
create or replace function public.mark_refund_paid(p_refund_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_role_is('admin') then
    raise exception 'Only an admin can mark returns sent';
  end if;
  update public.brand_refunds
  set status = 'paid', paid_at = now(), paid_by = auth.uid()
  where id = p_refund_id and status = 'requested';
  if not found then
    raise exception 'Return is not waiting to be sent' using hint = 'not_requested';
  end if;
end;
$$;

revoke execute on function public.mark_refund_paid(uuid) from public, anon;
grant execute on function public.mark_refund_paid(uuid) to authenticated;
```

Run: `pnpm --filter @clipers/db test -- brandBalance` → PASS

- [ ] **Step 3: 사용자 확인** — 운영 DB에 적용해도 되는지 묻는다. 새 열 2개(캠페인), 2개(입금), 표 2개, 함수 8개가 생기고 기존 데이터는 바뀌지 않는다고 설명한다.

- [ ] **Step 4: 적용(확인 후)** — Supabase MCP `apply_migration`(name `brand_balance_refunds`, query = 위 SQL)을 실행한다. 반환된 버전으로 파일 이름을 `supabase/migrations/<version>_brand_balance_refunds.sql`로 바꾼다. 그다음 `get_advisors`(security)로 새 경고가 없는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/*_brand_balance_refunds.sql packages/db/src/brandBalance.test.ts
git commit -m "feat(db): campaigns can be stopped, leftovers become a brand balance that can be returned, deposits are recorded as received

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 주간 정산 — 중단 주까지만 정산, 남은 금액 확정

**Files:** Modify `packages/db/src/services/weeklySettlementRun.ts`, `packages/db/src/services/weeklySettlementRun.test.ts`

- [ ] **Step 1: 테스트용 가짜 클라이언트 고치기와 실패하는 테스트** — `weeklySettlementRun.test.ts`의 `fakeSupabase`를 바꾼다.
  - 메서드 목록을 `['select', 'eq', 'in', 'lt', 'is', 'not', 'order', 'limit', 'range']`로 늘린다.
  - `select`가 `settlement_runs`에만 `lastRun` 행을 돌려주고, 그 밖의 표에는 빈 배열을 돌려주게 한다.

```ts
        select: () =>
          table === 'clips'
            ? chain(options.clips ?? { data: [], error: null })
            : chain({ data: table === 'settlement_runs' && options.lastRun ? [{ period: options.lastRun }] : [], error: null }),
```

파일 끝에 추가:

```ts
describe('finalizing stopped campaigns', () => {
  /** Answers each table with fixed rows and records rpc calls. */
  function tableFake(rows: Record<string, unknown[]>) {
    const rpcs: { name: string; args: unknown }[] = [];
    const chain = (result: unknown) => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'in', 'lt', 'is', 'not', 'order', 'limit', 'range']) builder[method] = () => builder;
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return builder;
    };
    const client = {
      from(table: string) {
        return {
          insert: () => Promise.resolve({ error: null }),
          update: () => chain({ error: null }),
          delete: () => chain({ error: null }),
          select: () => chain({ data: rows[table] ?? [], error: null }),
        };
      },
      rpc(name: string, args: unknown) {
        rpcs.push({ name, args });
        return Promise.resolve({ data: true, error: null });
      },
    };
    return { supabase: client as unknown as SupabaseClient, rpcs };
  }

  it('fixes the leftover of a campaign stopped before the week ended', async () => {
    const { supabase, rpcs } = tableFake({
      campaigns: [{ id: 'c1' }],
      campaign_finances: [{ campaign_id: 'c1', total_budget: 1_000_000, brand_cpm: 3000, creator_cpm: 800 }],
      settlements: [{ campaign_id: 'c1', amount: 80_000 }],
    });
    const result = await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(result.ok).toBe(true);
    // 80,000 won to creators is 300,000 won of brand spend, so 700,000 won is left.
    expect(rpcs).toEqual([{ name: 'finalize_campaign', args: { p_campaign_id: 'c1', p_leftover: 700_000 } }]);
  });

  it('does nothing when no stopped campaign is waiting', async () => {
    const { supabase, rpcs } = tableFake({});
    await runWeeklySettlement(supabase, PERIOD, 'cron');
    expect(rpcs).toEqual([]);
  });
});
```

Run: `pnpm --filter @clipers/db test -- weeklySettlementRun` → 새 테스트 FAIL(rpc 호출 없음), 기존 테스트 PASS

- [ ] **Step 2: 구현** — `weeklySettlementRun.ts`:

import를 바꾼다:

```ts
import { budgetUsage, campaignPricing, creatorCampaignCap, creatorPayoutCap } from '../pricing';
import { getCampaignsToClose } from './campaignClosure';
import { includeInSettlement } from './campaignStop';
```

`type SettledRow` 아래에 추가:

```ts
type StopRow = { id: string; stopped_at: string | null };
type PaidRow = { campaign_id: string; amount: number | string };
```

`settle()`의 `Promise.all` 구조 분해를 `const [financeRows, rateRows, snapshots, settled, stopRows] = await Promise.all([`로 바꾸고, 배열 끝(settlements 조회 다음)에 추가:

```ts
    fetchAllRowsIn(campaignIds, (ids) => (from, to) =>
      supabase.from('campaigns').select('id, stopped_at').in('id', ids).order('id').range(from, to)
    ) as Promise<StopRow[]>,
```

`const finances = new Map(...)` 아래에 추가:

```ts
  const stoppedAt = new Map(stopRows.map((row) => [row.id, row.stopped_at]));
```

`inputs`의 조건을 바꾼다:

```ts
    if (!finance || !rate || settledThisWeek.has(clip.id)) return [];
    if (!includeInSettlement(clip.reviewed_at, stoppedAt.get(clip.campaign_id) ?? null, period)) return [];
```

예산 소진 종료 업데이트를 바꾼다(확정 시각도 함께 기록):

```ts
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'closed', finalized_at: new Date().toISOString() })
      .in('id', toClose)
      .eq('status', 'live');
```

`settle()` 아래에 추가:

```ts
/**
 * Fixes the leftover of campaigns stopped before this week ended. Runs after the week is settled, so a campaign's
 * last settled week is the week it was stopped in; finalize_campaign() does nothing for one already fixed.
 */
async function finalizeStoppedCampaigns(supabase: SupabaseClient, period: SettlementPeriod): Promise<void> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('status', 'closed')
    .is('finalized_at', null)
    .not('stopped_at', 'is', null)
    .lt('stopped_at', period.endAt.toISOString());
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 0) return;

  const [financeRows, paidRows] = await Promise.all([
    fetchAllRowsIn(ids, (slice) => (from, to) =>
      supabase.from('campaign_finances').select('campaign_id, total_budget, brand_cpm, creator_cpm').in('campaign_id', slice).order('campaign_id').range(from, to)
    ) as Promise<FinanceRow[]>,
    fetchAllRowsIn(ids, (slice) => (from, to) =>
      supabase.from('settlements').select('campaign_id, amount').in('campaign_id', slice).order('id').range(from, to)
    ) as Promise<PaidRow[]>,
  ]);
  const paid = new Map<string, number>();
  for (const row of paidRows) paid.set(row.campaign_id, (paid.get(row.campaign_id) ?? 0) + Number(row.amount));

  for (const finance of financeRows) {
    const { remaining } = budgetUsage(Number(finance.total_budget), paid.get(finance.campaign_id) ?? 0, campaignPricing(finance));
    const { error: rpcError } = await supabase.rpc('finalize_campaign', {
      p_campaign_id: finance.campaign_id,
      p_leftover: Math.max(0, Math.floor(remaining)),
    });
    if (rpcError) throw new Error(rpcError.message);
  }
}
```

`runWeeklySettlement`의 `try` 안에서 `const result = await settle(supabase, period);` 바로 다음 줄에 추가:

```ts
    await finalizeStoppedCampaigns(supabase, period);
```

Run: `pnpm --filter @clipers/db test` → 전부 PASS

- [ ] **Step 3: 커밋**

```bash
git add packages/db/src/services/weeklySettlementRun.ts packages/db/src/services/weeklySettlementRun.test.ts
git commit -m "feat(db): settlement stops at a stopped campaign's last week and fixes its leftover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 브랜드 데이터 — 중단·확정 시각, 잔액

**Files:** Modify `apps/app/lib/brand-data.ts` · Create `apps/app/lib/brand-balance.ts`

- [ ] **Step 1: `brand-data.ts`** — `BrandCampaign` 타입에 추가:

```ts
  stoppedAt: string | null;
  finalizedAt: string | null;
```

campaigns 조회의 select를 `'id, title, status, category, content_type, cover_image_url, allowed_platforms, created_at, stopped_at, finalized_at'`로 바꾼다. `budgetUsage` 호출을 바꾼다(예산 소진으로 닫힌 캠페인은 전액 사용):

```ts
    const exhausted = campaign.status === 'closed' && !campaign.stopped_at;
    const usage = budgetUsage(totalBudget, paid.get(campaign.id) ?? 0, pricing, exhausted);
```

반환 객체에 추가:

```ts
      stoppedAt: campaign.stopped_at,
      finalizedAt: campaign.finalized_at,
```

- [ ] **Step 2: `apps/app/lib/brand-balance.ts`**:

```ts
import { cache } from 'react';
import { balanceSummary, type BalanceEntryKind } from '@clipers/db';
import { getSession } from './session';

export type BalanceRow = { id: string; kind: BalanceEntryKind; amount: number; campaign_id: string | null; refundable_until: string | null; created_at: string };
export type RefundRow = {
  id: string;
  kind: 'leftover' | 'over_deposit';
  campaign_id: string | null;
  service_amount: number | null;
  transfer_amount: number;
  bank_code: string | null;
  account_number: string | null;
  status: 'requested' | 'paid';
  requested_at: string;
  paid_at: string | null;
};

/** The signed-in brand's balance ledger, its summary and its returns, deduplicated per request. */
export const getBrandBalance = cache(async () => {
  const { supabase, user } = await getSession();
  const [{ data: entries }, { data: refunds }] = await Promise.all([
    supabase
      .from('brand_balance_entries')
      .select('id, kind, amount, campaign_id, refundable_until, created_at')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('brand_refunds')
      .select('id, kind, campaign_id, service_amount, transfer_amount, bank_code, account_number, status, requested_at, paid_at')
      .eq('brand_id', user.id)
      .order('requested_at', { ascending: false }),
  ]);
  const rows = ((entries ?? []) as BalanceRow[]).map((row) => ({ ...row, amount: Number(row.amount) }));
  return {
    rows,
    refunds: (refunds ?? []) as RefundRow[],
    summary: balanceSummary(rows.map((row) => ({ kind: row.kind, amount: row.amount, refundableUntil: row.refundable_until }))),
  };
});
```

- [ ] **Step 3: 타입 확인** — Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/app/lib/brand-data.ts apps/app/lib/brand-balance.ts
git commit -m "feat(app): brand data knows stopped and finalized campaigns and the brand balance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 브랜드 캠페인 상세 — 중단, 잔액으로 입금, 입금 상태 안내

**Files:** Create `apps/app/app/brand/(workspace)/campaigns/[id]/stop-campaign-button.tsx` · Create `apps/app/app/brand/(workspace)/campaigns/[id]/deposit-panel.tsx` · Delete `apps/app/app/brand/(workspace)/campaigns/[id]/deposit-button.tsx` · Modify `apps/app/app/brand/(workspace)/campaigns/[id]/page.tsx`

- [ ] **Step 1: 중단 버튼** — `stop-campaign-button.tsx`:

```tsx
'use client';

import ActionDialog, { type ActionResult } from '@/components/action-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** Stops a live campaign for good; its approved clips are settled through this week, then the leftover is fixed. */
export default function StopCampaignButton({ campaignId }: { campaignId: string }) {
  async function stop(): Promise<ActionResult> {
    const { error } = await getSupabaseBrowserClient().rpc('stop_campaign', { p_campaign_id: campaignId });
    return error ? { ok: false, message: '중단하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.' } : { ok: true };
  }

  return (
    <ActionDialog canSubmit onSubmit={stop} submitLabel="중단" submitVariant="danger" title="캠페인 중단" trigger="캠페인 중단">
      <p>중단하면 바로 마켓에서 내려가고 새 클립을 받지 않아요. 검수를 기다리던 클립은 반려돼요. 중단한 캠페인은 다시 열 수 없어요.</p>
      <p className="cl-meta">
        지금까지 승인된 클립은 이번 주 조회수까지 정산돼요. 다음 월요일 정산이 끝나면 남은 금액이 잔액으로 옮겨지고, 반환을 요청하거나 다음 캠페인에 쓸 수 있어요.
      </p>
    </ActionDialog>
  );
}
```

- [ ] **Step 2: 입금 패널** — `deposit-panel.tsx`(기존 `deposit-button.tsx`를 대신한다):

```tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { depositDue, maxCredit, vatOn } from '@clipers/db';
import { Button, Field, Input, SummaryList, formatKRW } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

/** What to transfer for a draft campaign, with part of the brand balance put in if it has one. */
export default function DepositPanel({ campaignId, serviceAmount, balance, bankTransferInfo, billingReady }: {
  campaignId: string;
  serviceAmount: number;
  balance: number;
  bankTransferInfo: string | null;
  billingReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState('');
  const limit = maxCredit(balance, serviceAmount);
  const [creditText, setCreditText] = useState(String(limit));
  const credit = Math.min(limit, Math.max(0, Math.floor(Number(creditText) || 0)));
  const cash = serviceAmount - credit;
  const due = depositDue(serviceAmount, credit);

  async function report() {
    setFailed('');
    const { error } = await getSupabaseBrowserClient().rpc('report_deposit', { p_campaign_id: campaignId, p_credit: credit });
    if (error) {
      setFailed(error.hint === 'credit_too_large' ? '잔액이 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.' : '상태를 바꾸지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="cl-stack-tight">
      {limit > 0 && (
        <Field hint={`잔액 ${formatKRW(balance)} 중 ${formatKRW(limit)}까지 쓸 수 있어요.`} htmlFor={`credit-${campaignId}`} label="잔액 사용">
          <Input
            id={`credit-${campaignId}`}
            inputMode="numeric"
            max={limit}
            min={0}
            onChange={(event) => setCreditText(event.target.value)}
            type="number"
            value={creditText}
          />
        </Field>
      )}
      <SummaryList
        rows={[
          { label: '서비스 대금', value: formatKRW(serviceAmount) },
          ...(credit > 0 ? [{ label: '잔액 사용', value: `−${formatKRW(credit)}` }] : []),
          { label: '부가세 (10%)', value: formatKRW(vatOn(cash)) },
          { label: '입금 금액', value: <strong>{formatKRW(due)}</strong> },
          ...(due > 0
            ? [
                { label: '입금 계좌', value: bankTransferInfo ?? '운영팀에 문의해 주세요' },
                { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
              ]
            : []),
        ]}
      />
      {billingReady ? (
        <div>
          <Button disabled={pending} onClick={() => void report()} variant="primary">
            {pending ? '알리는 중…' : due > 0 ? '입금했어요' : '잔액으로 시작'}
          </Button>
        </div>
      ) : (
        <p className="cl-alert cl-tone-amber" role="status">
          입금을 알리기 전에 세금계산서 정보를 입력해 주세요.{' '}
          <Link className="cl-link" href="/brand/settings#billing">
            세금계산서 정보 입력
          </Link>
        </p>
      )}
      {failed && (
        <p className="cl-alert cl-tone-tomato" role="alert">
          {failed}
        </p>
      )}
    </div>
  );
}
```

`git rm "apps/app/app/brand/(workspace)/campaigns/[id]/deposit-button.tsx"`

- [ ] **Step 3: 상세 페이지** — `page.tsx`를 고친다.

import를 바꾼다:
- `@clipers/db` import에서 `depositAmount, vatOn`을 빼고 `classifyDeposit, depositDue`를 넣는다.
- `import DepositButton from './deposit-button';`을 다음 세 줄로 바꾼다.

```ts
import { getBrandBalance } from '@/lib/brand-balance';
import DepositPanel from './deposit-panel';
import StopCampaignButton from './stop-campaign-button';
```

두 번째 `Promise.all`을 바꾼다:

```ts
  const [finances, { data: billing }, { data: escrow }, { data: overDeposit }, balance] = await Promise.all([
    loadCampaignFinances(supabase, [id]),
    supabase.from('brand_billing_profiles').select('company_name').eq('brand_id', user.id).maybeSingle(),
    supabase.from('campaign_escrow').select('received_amount, credit_applied').eq('campaign_id', id).maybeSingle(),
    supabase.from('brand_refunds').select('transfer_amount, status').eq('campaign_id', id).eq('kind', 'over_deposit').maybeSingle(),
    getBrandBalance(),
  ]);
```

`const bankTransferInfo = ...` 아래에 추가:

```ts
  const deposit = escrow
    ? classifyDeposit(depositDue(summary.total_budget, Number(escrow.credit_applied)), Number(escrow.received_amount))
    : null;
  const leftover = balance.rows.find((row) => row.kind === 'leftover' && row.campaign_id === id);
```

`PageHeader`의 `actions`를 바꾼다:

```tsx
        actions={
          campaign.status === 'draft' ? (
            <ButtonLink href={`/brand/campaigns/new?draft=${campaign.id}`} icon={<Pencil size={15} />} variant="secondary">
              수정
            </ButtonLink>
          ) : campaign.status === 'live' ? (
            <StopCampaignButton campaignId={campaign.id} />
          ) : undefined
        }
```

`{campaign.status === 'draft' && (...)}` 카드와 `{campaign.status === 'pending_escrow' && (...)}` 안내를 다음으로 바꾼다:

```tsx
        {campaign.status === 'draft' && (
          <Card description="입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개하고, 입금한 금액만큼 세금계산서를 발행해요." title="예산 입금">
            <DepositPanel
              balance={balance.summary.balance}
              bankTransferInfo={bankTransferInfo ?? null}
              billingReady={Boolean(billing)}
              campaignId={campaign.id}
              serviceAmount={summary.total_budget}
            />
          </Card>
        )}
        {campaign.status === 'pending_escrow' && (
          <p className="cl-alert cl-tone-amber" role="status">
            {deposit && deposit.kind === 'short' && Number(escrow?.received_amount) > 0
              ? `${formatKRW(Number(escrow?.received_amount))}이 확인됐어요. 차액 ${formatKRW(deposit.difference)}을 더 입금해 주세요.`
              : '운영팀이 입금을 확인하고 있어요. 확인되면 캠페인이 공개되고 크리에이터 지원을 받기 시작해요.'}
          </p>
        )}
        {overDeposit && (
          <p className="cl-alert cl-tone-sky" role="status">
            {overDeposit.status === 'paid'
              ? `초과 입금한 ${formatKRW(overDeposit.transfer_amount)}을 입금한 계좌로 돌려드렸어요.`
              : `초과 입금한 ${formatKRW(overDeposit.transfer_amount)}은 영업일 7일 안에 입금한 계좌로 돌려드려요.`}
          </p>
        )}
        {campaign.status === 'closed' && summary.stoppedAt && !summary.finalizedAt && (
          <p className="cl-alert cl-tone-sky" role="status">
            중단한 캠페인이에요. 이번 주 조회수까지 정산한 뒤 다음 월요일에 남은 금액이 확정돼요.
          </p>
        )}
        {leftover && (
          <p className="cl-alert cl-tone-brand" role="status">
            남은 {formatKRW(leftover.amount)}을 잔액으로 옮겼어요. 반환을 요청하거나 다음 캠페인에 쓸 수 있어요.{' '}
            <Link className="cl-link" href="/brand/spend">
              예산 사용 내역
            </Link>
          </p>
        )}
```

`cl-tone-sky` 클래스가 없으면 `cl-tone-amber`로 바꾼다(확인: `grep -n "cl-tone-sky" packages/ui/src/styles/*.css`).

- [ ] **Step 4: 타입·린트** — Run: `pnpm --filter @clipers/app exec tsc --noEmit && pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add "apps/app/app/brand/(workspace)/campaigns/[id]"
git commit -m "feat(app): brands stop a live campaign, pay part of a budget from their balance and see what the deposit check found

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 브랜드 예산 사용 내역 — 잔액과 반환 요청

**Files:** Create `apps/app/app/brand/(workspace)/spend/refund-actions.ts` · Create `apps/app/app/brand/(workspace)/spend/balance-card.tsx` · Modify `apps/app/app/brand/(workspace)/spend/page.tsx`

- [ ] **Step 1: 서버 액션** — `refund-actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { balanceSummary, refundTransferAmount, sendSlackNotification, validateRefundRequest } from '@clipers/db';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type RefundRequestState = { ok: boolean; message: string } | null;

/** The signed-in brand asks for part of its returnable balance; the database re-checks the amount. */
export async function requestRefund(_previous: RefundRequestState, form: FormData): Promise<RefundRequestState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '다시 로그인해 주세요.' };

  const { data: entries } = await supabase.from('brand_balance_entries').select('kind, amount, refundable_until').eq('brand_id', user.id);
  const { refundable } = balanceSummary(
    (entries ?? []).map((row) => ({ kind: row.kind, amount: Number(row.amount), refundableUntil: row.refundable_until }))
  );
  const result = validateRefundRequest(
    {
      amount: Number(form.get('amount')),
      bankCode: String(form.get('bankCode') ?? ''),
      accountNumber: String(form.get('accountNumber') ?? ''),
      accountHolder: String(form.get('accountHolder') ?? ''),
    },
    refundable
  );
  if (!result.ok) return { ok: false, message: result.message };

  const { amount, bankCode, accountNumber, accountHolder } = result.data;
  const { error } = await supabase.rpc('request_refund', {
    p_amount: amount,
    p_bank_code: bankCode,
    p_account_number: accountNumber,
    p_account_holder: accountHolder,
  });
  if (error) {
    return {
      ok: false,
      message: error.hint === 'refund_open' ? '처리 중인 반환 요청이 있어요. 끝난 뒤 다시 요청해 주세요.' : '반환 요청을 보내지 못했어요. 새로고침한 뒤 다시 시도해 주세요.',
    };
  }

  const transfer = refundTransferAmount(amount);
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
    await sendSlackNotification(
      webhook,
      `:money_with_wings: 남은 금액 반환 요청 — ${profile?.display_name ?? '브랜드'} ${transfer.toLocaleString('ko-KR')}원 (서비스 대금 ${amount.toLocaleString('ko-KR')}원 + 부가세). 영업일 7일 안에 보내야 해요.`
    );
  }

  revalidatePath('/brand/spend');
  return { ok: true, message: `반환을 요청했어요. 영업일 7일 안에 ${transfer.toLocaleString('ko-KR')}원을 보내 드려요.` };
}
```

- [ ] **Step 2: 잔액 카드** — `balance-card.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { BANKS, refundTransferAmount, type BalanceSummary } from '@clipers/db';
import { Button, Card, Field, Input, Select, SummaryList, formatKRW } from '@clipers/ui';
import { requestRefund, type RefundRequestState } from './refund-actions';

/** The brand balance, and a form to ask for the returnable part of it. */
export default function BalanceCard({ summary, openRequest }: { summary: BalanceSummary; openRequest: { transferAmount: number; requestedAt: string } | null }) {
  const [state, formAction, pending] = useActionState<RefundRequestState, FormData>(requestRefund, null);

  return (
    <Card description="중단한 캠페인에서 남은 서비스 대금이에요. 반환을 요청하거나 다음 캠페인 입금 때 쓸 수 있어요." id="balance" title="잔액">
      <div className="cl-stack-tight">
        <SummaryList
          rows={[
            { label: '잔액', value: <strong>{formatKRW(summary.balance)}</strong> },
            { label: '반환할 수 있는 금액', value: formatKRW(summary.refundable) },
            ...(summary.campaignOnly > 0
              ? [{ label: '다음 캠페인에만 쓸 수 있는 금액', value: `${formatKRW(summary.campaignOnly)} (확정 후 1년 지남)` }]
              : []),
          ]}
        />
        {openRequest ? (
          <p className="cl-alert cl-tone-amber" role="status">
            {formatKRW(openRequest.transferAmount)} 반환을 처리하고 있어요. 요청한 날부터 영업일 7일 안에 보내 드려요.
          </p>
        ) : state?.ok ? (
          <p className="cl-alert cl-tone-brand" role="status">
            {state.message}
          </p>
        ) : summary.refundable > 0 ? (
          <form action={formAction} className="cl-auth__form">
            <Field hint={`부가세를 더해 ${formatKRW(refundTransferAmount(summary.refundable))}까지 보내 드려요. 수수료는 없어요.`} htmlFor="refund-amount" label="반환받을 서비스 대금">
              <Input defaultValue={summary.refundable} id="refund-amount" inputMode="numeric" max={summary.refundable} min={1} name="amount" required type="number" />
            </Field>
            <div className="cl-form-row">
              <Field htmlFor="refund-bank" label="은행">
                <Select defaultValue="" id="refund-bank" name="bankCode" required>
                  <option value="">은행 선택</option>
                  {BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="refund-account" label="계좌번호">
                <Input autoComplete="off" id="refund-account" inputMode="numeric" name="accountNumber" placeholder="숫자만 입력" required />
              </Field>
            </div>
            <Field hint="세금계산서의 상호와 같은 명의의 계좌로만 보내 드려요." htmlFor="refund-holder" label="예금주">
              <Input id="refund-holder" maxLength={100} name="accountHolder" required />
            </Field>
            {state && !state.ok && (
              <p className="cl-alert cl-tone-tomato" role="alert">
                {state.message}
              </p>
            )}
            <div>
              <Button disabled={pending} type="submit" variant="primary">
                {pending ? '요청 중…' : '반환 요청'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: 페이지** — `spend/page.tsx`를 고친다.

import에 추가:

```ts
import { bankName, maskAccountNumber } from '@clipers/db';
import { Badge } from '@clipers/ui';  // 기존 @clipers/ui import 줄에 Badge를 합친다
import { getBrandBalance } from '@/lib/brand-balance';
import BalanceCard from './balance-card';
```

함수 첫 줄들을 바꾼다:

```ts
  const [campaigns, balance] = await Promise.all([
    getBrandCampaigns().then((rows) => rows.filter((campaign) => campaign.status !== 'draft')),
    getBrandBalance(),
  ]);
  const openRequest = balance.refunds.find((refund) => refund.kind === 'leftover' && refund.status === 'requested');
  const titles = new Map(campaigns.map((campaign) => [campaign.id, campaign.title]));
```

`<Stack>` 안 `StatGrid` 다음에 추가:

```tsx
        {(balance.summary.balance > 0 || openRequest) && (
          <BalanceCard
            openRequest={openRequest ? { transferAmount: openRequest.transfer_amount, requestedAt: openRequest.requested_at } : null}
            summary={balance.summary}
          />
        )}
```

캠페인 표(`campaigns.length > 0 ? ... : ...`) 다음, `</Stack>` 앞에 추가:

```tsx
        {balance.refunds.length > 0 && (
          <DataTable
            columns={[
              {
                key: 'kind',
                header: '반환',
                render: (refund) => (
                  <div>
                    <p>{refund.kind === 'leftover' ? '남은 금액 반환' : '초과 입금 반환'}</p>
                    <p className="cl-meta-subtle">
                      {refund.kind === 'leftover' && refund.bank_code && refund.account_number
                        ? `${bankName(refund.bank_code)} ${maskAccountNumber(refund.account_number)}`
                        : titles.get(refund.campaign_id ?? '') ?? '입금한 계좌'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'requested',
                header: '요청일',
                render: (refund) => new Date(refund.requested_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
              },
              { key: 'amount', header: '보내는 금액', align: 'right', render: (refund) => formatKRW(refund.transfer_amount) },
              {
                key: 'status',
                header: '',
                align: 'right',
                render: (refund) => <Badge tone={refund.status === 'paid' ? 'brand' : 'amber'}>{refund.status === 'paid' ? '보냄' : '처리 중'}</Badge>,
              },
            ]}
            empty=""
            label="반환 내역"
            rowKey={(refund) => refund.id}
            rows={balance.refunds}
          />
        )}
```

- [ ] **Step 4: 타입·린트** — Run: `pnpm --filter @clipers/app exec tsc --noEmit && pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add "apps/app/app/brand/(workspace)/spend"
git commit -m "feat(app): brands see their balance and ask for the returnable part back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 운영자 입금 확인 — 받은 금액 기록, 부족·초과

**Files:** Modify `apps/app/app/admin/deposits/page.tsx`, `apps/app/app/admin/review-actions.tsx`

- [ ] **Step 1: 액션** — `review-actions.tsx`의 `ConfirmDepositAction`을 다음 두 컴포넌트로 바꾼다:

```tsx
const DEPOSIT_RESULT: Record<string, string> = {
  short: '아직 모자라요. 브랜드에게 차액 입금을 안내했어요.',
  over: '캠페인을 공개했어요. 초과분은 반환 화면에 올라갔어요.',
};

/** Records the remaining due amount as received; the campaign goes live. */
export function ConfirmDepositAction({ campaignId, amount }: { campaignId: string; amount: number }) {
  async function confirm(): Promise<ActionResult> {
    const question = amount > 0 ? `${formatKRW(amount)} 입금을 통장에서 확인했나요? 확인하면 캠페인이 바로 공개돼요.` : '잔액으로 낸 캠페인이에요. 공개할까요?';
    if (!window.confirm(question)) return { ok: true };
    const { error } = await getSupabaseBrowserClient().rpc('record_deposit', { p_campaign_id: campaignId, p_amount: amount });
    return error ? fail('입금을 확인 처리하지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label="입금 확인" pendingLabel="처리 중…" run={confirm} variant="primary" />;
}

/** Records a different amount than asked: short keeps the campaign waiting, over queues the excess for return. */
export function DepositMismatchAction({ campaignId, remaining }: { campaignId: string; remaining: number }) {
  const [amount, setAmount] = useState('');
  const value = Math.floor(Number(amount));
  return (
    <ActionDialog
      canSubmit={Number.isFinite(value) && value > 0 && value !== remaining}
      onSubmit={async () => {
        const { data, error } = await getSupabaseBrowserClient().rpc('record_deposit', { p_campaign_id: campaignId, p_amount: value });
        if (error) return fail('기록하지 못했어요. 새로고침한 뒤 확인해 주세요.');
        if (DEPOSIT_RESULT[data as string]) window.alert(DEPOSIT_RESULT[data as string]);
        return { ok: true };
      }}
      submitLabel="기록"
      title="받은 금액 기록"
      trigger="금액이 달라요"
    >
      <Field hint={`남은 안내 금액은 ${formatKRW(remaining)}이에요. 이번에 통장에서 확인한 금액(부가세 포함)을 적어 주세요.`} htmlFor={`deposit-${campaignId}`} label="확인한 금액">
        <Input id={`deposit-${campaignId}`} inputMode="numeric" min={1} onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
      </Field>
    </ActionDialog>
  );
}
```

- [ ] **Step 2: 페이지** — `admin/deposits/page.tsx`를 고친다.

import를 바꾼다:
- `depositAmount`를 `depositDue`로 바꾼다.
- `ConfirmDepositAction` import를 `import { ConfirmDepositAction, DepositMismatchAction } from '../review-actions';`로 바꾼다.

`Row` 타입에 `credit_applied: number; received_amount: number;`를 추가한다. 조회를 늘린다:

```ts
  const ids = campaigns.map((campaign) => campaign.id);
  const [finances, { data: billingRows }, { data: escrowRows }] = await Promise.all([
    loadCampaignFinances(supabase, ids),
    supabase
      .from('brand_billing_profiles')
      .select('brand_id, business_number, company_name, representative, invoice_email')
      .in('brand_id', [...new Set(campaigns.map((campaign) => campaign.brand_id))]),
    supabase.from('campaign_escrow').select('campaign_id, credit_applied, received_amount').in('campaign_id', ids),
  ]);
  const escrowByCampaign = new Map(
    ((escrowRows ?? []) as { campaign_id: string; credit_applied: number; received_amount: number }[]).map((row) => [row.campaign_id, row])
  );
```

`rows` 매핑에 추가:

```ts
    credit_applied: Number(escrowByCampaign.get(campaign.id)?.credit_applied ?? 0),
    received_amount: Number(escrowByCampaign.get(campaign.id)?.received_amount ?? 0),
```

`description`을 바꾼다: `"브랜드가 입금했다고 알린 캠페인이에요. 통장에서 금액(서비스 대금 − 잔액 사용 + 부가세)과 입금자명을 확인해 주세요. 금액이 다르면 받은 금액을 기록하고, 세금계산서는 실제 입금한 금액만큼 홈택스에서 발행해 주세요."`

`amount` 열과 `actions` 열을 바꾼다:

```tsx
            {
              key: 'amount',
              header: '입금 금액',
              align: 'right',
              render: (row) => {
                const due = depositDue(row.total_budget, row.credit_applied);
                return (
                  <div>
                    <p className="cl-emphasis">{formatKRW(due)}</p>
                    <p className="cl-meta-subtle">
                      서비스 대금 {formatKRW(row.total_budget)}
                      {row.credit_applied > 0 ? ` − 잔액 ${formatKRW(row.credit_applied)}` : ''} + 부가세
                    </p>
                    {row.received_amount > 0 && <p className="cl-meta-subtle">지금까지 {formatKRW(row.received_amount)} 확인</p>}
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => {
                const remaining = Math.max(0, depositDue(row.total_budget, row.credit_applied) - row.received_amount);
                return (
                  <div className="cl-inline">
                    <ConfirmDepositAction amount={remaining} campaignId={row.id} />
                    {remaining > 0 && <DepositMismatchAction campaignId={row.id} remaining={remaining} />}
                  </div>
                );
              },
            },
```

`user`를 더 쓰지 않으면 `const { supabase } = await getSession();`으로 바꾼다.

- [ ] **Step 3: 타입·린트** — Run: `pnpm --filter @clipers/app exec tsc --noEmit && pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/app/app/admin/deposits/page.tsx apps/app/app/admin/review-actions.tsx
git commit -m "feat(admin): deposits are recorded as received; short ones wait, extra goes back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 운영자 반환 화면

**Files:** Create `apps/app/app/admin/refunds/page.tsx` · Modify `apps/app/app/admin/review-actions.tsx`, `apps/app/app/workspace-shell.tsx`, `apps/app/lib/admin-data.ts`, `apps/app/app/admin/layout.tsx`

- [ ] **Step 1: 액션** — `review-actions.tsx`의 `PayoutPaidAction` 아래에 추가:

```tsx
/** Marks a return sent, after the operator has made the bank transfer. */
export function RefundPaidAction({ refundId, amount }: { refundId: string; amount: number }) {
  async function markPaid(): Promise<ActionResult> {
    if (!window.confirm(`${formatKRW(amount)}을 이체했나요? 이체를 마친 뒤에만 반환 완료로 바꿔 주세요.`)) return { ok: true };
    const { error } = await getSupabaseBrowserClient().rpc('mark_refund_paid', { p_refund_id: refundId });
    return error ? fail('반환 완료로 바꾸지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label="반환 완료" pendingLabel="처리 중…" run={markPaid} variant="primary" />;
}
```

- [ ] **Step 2: 페이지** — `apps/app/app/admin/refunds/page.tsx`:

```tsx
import { Undo2 } from 'lucide-react';
import { bankName, businessDaysSince, formatBusinessNumber } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader, formatKRW } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { RefundPaidAction } from '../review-actions';

type Billing = { brand_id: string; business_number: string; company_name: string };
type Row = {
  id: string;
  brand_id: string;
  kind: 'leftover' | 'over_deposit';
  service_amount: number | null;
  transfer_amount: number;
  bank_code: string | null;
  account_number: string | null;
  account_holder: string | null;
  requested_at: string;
  brand: { display_name: string } | null;
  campaign: { title: string } | null;
};

/** Returns waiting to be sent: balances brands asked for, and deposits that came in over what was asked. */
export default async function AdminRefundsPage() {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('brand_refunds')
    .select(
      'id, brand_id, kind, service_amount, transfer_amount, bank_code, account_number, account_holder, requested_at, brand:profiles!brand_refunds_brand_id_fkey(display_name), campaign:campaigns(title)'
    )
    .eq('status', 'requested')
    .order('requested_at', { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const { data: billingRows } = await supabase
    .from('brand_billing_profiles')
    .select('brand_id, business_number, company_name')
    .in('brand_id', [...new Set(rows.map((row) => row.brand_id))]);
  const billing = new Map(((billingRows ?? []) as Billing[]).map((row) => [row.brand_id, row]));

  return (
    <Page>
      <PageHeader
        description="요청일부터 영업일 7일 안에 보내야 해요. 남은 금액 반환은 예금주가 세금계산서 상호와 같은지 확인하고, 보낸 뒤 홈택스에서 서비스 대금만큼 수정세금계산서를 발행해 주세요. 초과 입금은 입금한 계좌로 돌려보내요."
        title="반환"
      />
      {rows.length > 0 ? (
        <DataTable
          columns={[
            {
              key: 'brand',
              header: '브랜드',
              render: (row) => {
                const days = businessDaysSince(row.requested_at);
                return (
                  <div>
                    <p>{row.brand?.display_name ?? '브랜드'}</p>
                    <p className="cl-inline cl-meta-subtle">
                      <Badge tone={days >= 7 ? 'tomato' : days >= 5 ? 'amber' : 'neutral'}>영업일 {days}일째</Badge>
                    </p>
                  </div>
                );
              },
            },
            {
              key: 'kind',
              header: '종류',
              render: (row) =>
                row.kind === 'leftover' ? (
                  <div>
                    <p>남은 금액 반환</p>
                    <p className="cl-meta-subtle">수정세금계산서 −{formatKRW(row.service_amount ?? 0)}</p>
                  </div>
                ) : (
                  <div>
                    <p>초과 입금 반환</p>
                    <p className="cl-meta-subtle">{row.campaign?.title ?? '캠페인'}</p>
                  </div>
                ),
            },
            {
              key: 'account',
              header: '보낼 계좌',
              render: (row) => {
                const company = billing.get(row.brand_id);
                return row.kind === 'leftover' && row.bank_code ? (
                  <div>
                    <p className="cl-number">
                      {bankName(row.bank_code)} {row.account_number}
                    </p>
                    <p className="cl-meta-subtle">
                      예금주 {row.account_holder}
                      {company ? ` · ${company.company_name} ${formatBusinessNumber(company.business_number)}` : ''}
                    </p>
                  </div>
                ) : (
                  <span className="cl-meta-subtle">입금한 계좌로</span>
                );
              },
            },
            { key: 'amount', header: '보낼 금액', align: 'right', render: (row) => <span className="cl-emphasis">{formatKRW(row.transfer_amount)}</span> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => <RefundPaidAction amount={row.transfer_amount} refundId={row.id} />,
            },
          ]}
          empty=""
          label="보낼 반환"
          rowKey={(row) => row.id}
          rows={rows}
        />
      ) : (
        <Card>
          <EmptyState description="브랜드가 반환을 요청하거나 초과 입금이 기록되면 여기에 보여요." icon={<Undo2 size={24} />} title="보낼 반환이 없어요" />
        </Card>
      )}
    </Page>
  );
}
```

- [ ] **Step 3: 메뉴와 배지**
  - `workspace-shell.tsx`: lucide import에 `Undo2`를 추가하고, admin '정산' 섹션의 `정산·지급` 다음에 `{ href: '/admin/refunds', label: '반환', icon: <Undo2 {...ICON} /> },`를 추가한다.
  - `admin-data.ts`: `AdminQueueCounts` 타입에 `refunds: number;`를 추가한다. `Promise.all` 배열 끝에 `supabase.from('brand_refunds').select('id', count).eq('status', 'requested'),`를 넣고, 구조 분해에 `refunds`를, 반환 객체에 `refunds: refunds.count ?? 0,`을 추가한다.
  - `admin/layout.tsx`: `badges`에 `'/admin/refunds': counts.refunds,`를 추가한다.

- [ ] **Step 4: 타입·린트** — Run: `pnpm --filter @clipers/app exec tsc --noEmit && pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/app/app/admin/refunds apps/app/app/admin/review-actions.tsx apps/app/app/workspace-shell.tsx apps/app/lib/admin-data.ts apps/app/app/admin/layout.tsx
git commit -m "feat(admin): a queue of returns to send, with business days since the request

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 약관 · 사이트 문구 · 법률 문서

**Files:** Modify `apps/app/content/legal/terms.md`, `apps/site/lib/advertiser-faq.ts`, `apps/site/lib/guides/advertiser-problem.ts`, `docs/legal/README.md`

- [ ] **Step 1: 약관 제9조** — 4항 다음에 추가:

```md
5. 입금액이 안내한 금액보다 적으면 회사는 차액이 확인될 때까지 캠페인을 공개하지 않습니다. 안내한 금액보다 많으면 캠페인을 공개하고, 초과분은 확인한 날부터 영업일 7일 이내에 입금한 계좌로 돌려줍니다.
6. 광고주는 제11조의 잔액을 서비스 대금에 쓸 수 있습니다. 이 경우 입금할 금액과 세금계산서는 잔액을 뺀 서비스 대금을 기준으로 합니다.
```

- [ ] **Step 2: 약관 제11조** — 2항과 3항을 다음으로 바꾸고 4항을 추가한다:

```md
2. 광고주는 서비스 화면에서 캠페인을 중단할 수 있습니다. 중단하면 캠페인은 바로 비공개되고, 중단 시점까지 승인된 클립에 대해서만 중단일이 속한 주의 정산까지 검증 조회수가 차감됩니다. 중단 시점에 검수를 기다리던 클립은 반려됩니다. <!-- 🔸 -->
3. 중단한 캠페인의 남은 서비스 대금은 회사가 제공하지 않은 서비스의 대가이므로, 마지막 정산이 끝나면 확정되어 광고주의 잔액이 됩니다. 광고주는 잔액을 다음 캠페인의 서비스 대금에 쓰거나, 확정된 날부터 1년 안에 반환을 요청할 수 있습니다. 1년이 지난 잔액은 다음 캠페인에만 쓸 수 있습니다. <!-- 🔸 변호사 확인: 반환 방식이 제3조 거래 구조에 영향이 없는지, 1년 뒤 반환 제한이 약관 공정성에 문제없는지, 잔액이 선불전자지급수단에 해당하지 않는지 -->
4. 회사는 반환 요청을 받은 날부터 영업일 7일 이내에, 반환할 서비스 대금과 그 부가가치세를 수수료 없이 광고주 명의 계좌로 보내고 수정세금계산서를 발행합니다.
```

- [ ] **Step 3: 사이트 문구**
  - `advertiser-faq.ts`의 `leftover` 답을 `'캠페인을 화면에서 중단하면 이번 주까지 정산한 뒤 남은 금액이 잔액이 돼요. 잔액은 다음 캠페인에 쓰거나, 1년 안에 수수료 없이 반환받을 수 있어요.'`로 바꾼다.
  - `guides/advertiser-problem.ts`의 '미리 확인해요' 문단 둘째 문장을 `'다 못 쓴 예산은 캠페인을 중단하면 잔액이 되고, 다음 캠페인에 쓰거나 반환받을 수 있어요.'`로 바꾼다.
  - `grep -rn "환불" apps/site apps/app --include=*.ts --include=*.tsx --include=*.md`로 남은 곳이 없는지 확인한다. 개인정보 처리방침의 법정 문구는 그대로 둔다.

- [ ] **Step 4: `docs/legal/README.md`**
  - 1절(변호사에게 물을 것)에 질문 두 개를 추가한다.
    - 잔액(다음 캠페인 이월)이 선불전자지급수단에 해당하는지. 회사 서비스에만 쓸 수 있다.
    - 확정 후 1년이 지나면 반환을 막고 이월만 허용하는 조항(약관 제11조 3항)이 약관규제법상 문제없는지.
  - 5절 '추천안 없이 넣은 기본값' 표의 '남은 대금 반환' 행을 `확정일부터 1년 안 요청, 요청일부터 영업일 7일 이내, 부가세 포함·수수료 없음, 1년 뒤에는 이월만 (2026-10-02 회사 결정)`으로 바꾼다.
  - 5절 끝에 `**2026-10-02 결정**` 블록을 추가한다. 내용은 스펙 1절 표의 다섯 항목과 스펙 문서 경로다.

- [ ] **Step 5: 테스트** — Run: `pnpm --filter @clipers/site test` → PASS(FAQ 테스트가 문구 규칙을 검사한다)

- [ ] **Step 6: 커밋**

```bash
git add apps/app/content/legal/terms.md apps/site/lib/advertiser-faq.ts apps/site/lib/guides/advertiser-problem.ts docs/legal/README.md
git commit -m "docs(legal): terms for stopping campaigns, the balance and its return, and deposits that don't match

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 전체 확인

- [ ] **Step 1:** Run: `pnpm test` → 전부 PASS
- [ ] **Step 2:** Run: `pnpm lint` → 오류 없음
- [ ] **Step 3:** Run: `pnpm --filter @clipers/app build && pnpm --filter @clipers/site build` → 성공
- [ ] **Step 4: 화면 확인** — `run` 스킬로 앱을 띄우고 아래를 확인한다.
  1. 브랜드 진행 중 캠페인에 '캠페인 중단'이 보이고, 확인 창 문구가 맞다.
  2. 잔액이 있는 브랜드의 초안 캠페인에서 잔액 사용 칸을 바꾸면 입금 금액이 다시 계산된다.
  3. 예산 사용 내역의 잔액 카드와 반환 요청 폼이 보인다.
  4. 운영자 입금 확인에 '금액이 달라요'가 있다.
  5. 운영자 메뉴에 '반환'이 있다.

  운영 DB에서 실제로 중단하거나 반환을 요청하지는 않는다. 데이터가 바뀌는 확인이 필요하면 사용자에게 먼저 묻는다.
- [ ] **Step 5:** 결과를 사용자에게 보고한다(커밋 목록, 적용한 마이그레이션 버전, 확인하지 못한 것).
