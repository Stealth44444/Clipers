# 하루 제출 한도 · 한 명당 지급 상한 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠페인마다 크리에이터 1명당 하루 제출 한도(1·2·3·5·제한 없음, 기본 3)를 주최자가 정하게 하고, 한 크리에이터가 한 캠페인에서 받는 총액을 브랜드 입금액의 15%로 제한한다. 크리에이터에게 상한 금액과 비율은 보여 주지 않는다.

**Architecture:** 정책 계산은 `@clipers/db`의 순수 함수(테스트 포함): `creatorCampaignCap`, 정산 계산의 크리에이터 잔액, 하루 한도 계산. DB는 `campaigns.daily_clip_limit` 열, 제출 트리거의 하루 한도 검사, 상한 상태만 돌려주는 `creator_campaign_cap_states()`. 화면은 브랜드 폼·요약, 크리에이터 제출·캠페인 목록, 사이트 캠페인 상세, FAQ·가이드 문구.

**Tech Stack:** TypeScript · Vitest · Supabase(Postgres, plpgsql, RLS, 열 단위 권한) · Next.js

**Spec:** `docs/superpowers/specs/2026-10-02-clip-limits-design.md`

**공통 규칙:** "15%"는 화면·FAQ·가이드·llms.txt 어디에도 쓰지 않는다. 브랜드 단가는 공개하지 않는다. 다른 세션의 커밋되지 않은 변경은 내 커밋에 넣지 않는다(커밋 전 `git status`로 확인, 섞이면 내 변경만 `git update-index --cacheinfo`로 스테이징). 운영 DB 변경은 사용자 확인 후. 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: 한 명당 상한 계산 (`pricing.ts`)

**Files:** Modify `packages/db/src/pricing.ts` · Test `packages/db/src/pricing.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `pricing.test.ts` 끝에 추가(import에 `CREATOR_CAMPAIGN_SHARE, creatorCampaignCap` 추가):

```ts
describe('creatorCampaignCap', () => {
  it('lets one creator take at most 15% of the brand budget from a campaign', () => {
    expect(CREATOR_CAMPAIGN_SHARE).toBe(0.15);
    expect(creatorCampaignCap(1_000_000)).toBe(150_000);
    expect(creatorCampaignCap(1_234_567)).toBe(185_185);
    expect(creatorCampaignCap(0)).toBe(0);
  });
});
```

Run: `pnpm --filter @clipers/db test -- pricing` → FAIL (not exported)

- [ ] **Step 2: 구현** — `pricing.ts`의 `creatorPayoutCap` 아래:

```ts
/**
 * Most one creator can be paid from one campaign: a share of the brand's budget, in creator payout won. Mirrored by
 * creator_campaign_cap_states() in the database. Never shown to creators (with the public payout limit it would give
 * away the budget and the brand rate).
 */
export const CREATOR_CAMPAIGN_SHARE = 0.15;

export function creatorCampaignCap(totalBudget: number): number {
  if (!(totalBudget > 0)) return 0;
  return Math.floor(totalBudget * CREATOR_CAMPAIGN_SHARE);
}
```

Run: `pnpm --filter @clipers/db test -- pricing` → PASS. Commit: `feat(db): one creator can take at most a share of a campaign's budget`.

---

### Task 2: 정산 계산에 크리에이터 상한

**Files:** Modify `packages/db/src/services/settlement.ts`, `packages/db/src/services/weeklySettlementRun.ts` · Test `packages/db/src/services/settlement.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `createInput` 기본값에 `creatorCap: 100_000, previouslySettledCreatorAmount: 0,` 추가. `describe('calculateWeeklySettlementDrafts')` 안에 추가:

```ts
  it('stops a creator at their campaign cap across clips, leaving other creators alone', () => {
    const drafts = calculateWeeklySettlementDrafts(
      [
        createInput({ clipId: 'a', creatorCap: 700, previouslySettledCreatorAmount: 100 }),
        createInput({ clipId: 'b', creatorCap: 700, previouslySettledCreatorAmount: 100 }),
        createInput({ clipId: 'c', creatorId: 'creator-2', creatorCap: 700 }),
      ],
      PERIOD
    );
    // Each clip would earn 150 (1,500 views at 100/1K), capped at 400 per clip remaining; creator-1 has 600 left.
    expect(drafts.map((draft) => [draft.clipId, draft.amount])).toEqual([
      ['a', 150],
      ['b', 150],
      ['c', 150],
    ]);
  });

  it('pays nothing more once a creator has reached the cap', () => {
    expect(calculateWeeklySettlementDrafts([createInput({ creatorCap: 500, previouslySettledCreatorAmount: 500 })], PERIOD)).toEqual([]);
  });

  it('pays only what is left under the creator cap', () => {
    const [draft] = calculateWeeklySettlementDrafts([createInput({ creatorCap: 160, previouslySettledCreatorAmount: 100 })], PERIOD);
    expect(draft.amount).toBe(60);
  });
```

(기본 입력의 한 주 증가분은 1,500회 × 100/1,000 = 150. 실제 값이 다르면 기존 첫 테스트의 기대값을 보고 위 숫자를 맞춘다.)

Run: `pnpm --filter @clipers/db test -- settlement` → FAIL (타입 오류 또는 상한 미적용)

- [ ] **Step 2: 구현** — `WeeklySettlementInput`에 필드 추가:

```ts
  /** Most this creator can be paid from this campaign (creatorCampaignCap of the brand budget). */
  creatorCap: number;
  /** What this creator has already been paid from this campaign, earlier weeks plus this week's existing rows. */
  previouslySettledCreatorAmount: number;
```

`calculateWeeklySettlementDrafts`의 캠페인 루프에서 `let budgetRemaining = …` 아래에 크리에이터 잔액 맵을 두고, 금액 계산과 차감을 바꾼다:

```ts
    // Per creator in this campaign: what is left under their cap, shared by all their clips this week.
    const creatorRemaining = new Map<string, number>();
```

```ts
      if (!creatorRemaining.has(input.creatorId)) {
        creatorRemaining.set(input.creatorId, Math.max(0, input.creatorCap - input.previouslySettledCreatorAmount));
      }
      const creatorLeft = creatorRemaining.get(input.creatorId)!;
      const rawAmount = (verifiedViews / 1000) * input.cpmRate;
      const amount = Math.round(Math.min(rawAmount, clipBudgetRemaining, budgetRemaining, creatorLeft) * 100) / 100;
```

`budgetRemaining = Math.max(0, budgetRemaining - amount);` 뒤에:

```ts
      creatorRemaining.set(input.creatorId, Math.max(0, creatorLeft - amount));
```

`weeklySettlementRun.ts`: import에 `creatorCampaignCap` 추가, `SettledRow`에 `creator_id: string` 추가, settlements 조회 select를 `'clip_id, campaign_id, creator_id, amount, period'`로, 입력 생성에 추가:

```ts
        creatorCap: creatorCampaignCap(Number(finance.total_budget)),
        previouslySettledCreatorAmount: sum(spentBefore.filter((row) => row.campaign_id === clip.campaign_id && row.creator_id === clip.creator_id)),
```

`weeklySettlementRun.test.ts`의 가짜 settlements 행에 `creator_id`가 필요하면 넣는다.

Run: `pnpm --filter @clipers/db test` → PASS(전체). Commit: `feat(settlements): a creator's weekly payout stops at their campaign cap`.

---

### Task 3: 하루 제출 한도 — 초안·계산 함수

**Files:** Modify `packages/db/src/campaignDraft.ts` · Create `packages/db/src/dailyClipLimit.ts` · Modify `packages/db/src/index.ts` · Test `packages/db/src/campaignDraft.test.ts`, `packages/db/src/dailyClipLimit.test.ts`

- [ ] **Step 1: 실패하는 테스트**

`dailyClipLimit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DAILY_CLIP_LIMIT_OPTIONS, dailyClipLimitLabel, kstDayStart, submissionsLeftToday } from './dailyClipLimit';

describe('daily clip limit', () => {
  it('offers 1, 2, 3, 5 or no limit', () => {
    expect(DAILY_CLIP_LIMIT_OPTIONS).toEqual([1, 2, 3, 5]);
    expect(dailyClipLimitLabel(3)).toBe('하루 3개');
    expect(dailyClipLimitLabel(null)).toBe('제한 없음');
  });

  it('starts the day at midnight Korea time', () => {
    expect(kstDayStart(new Date('2026-10-02T14:59:00.000Z')).toISOString()).toBe('2026-10-01T15:00:00.000Z');
    expect(kstDayStart(new Date('2026-10-02T15:00:00.000Z')).toISOString()).toBe('2026-10-02T15:00:00.000Z');
  });

  it('counts today’s pending and approved clips, not rejected or yesterday’s', () => {
    const now = new Date('2026-10-02T05:00:00.000Z');
    const clips = [
      { status: 'pending_review', submitted_at: '2026-10-02T01:00:00.000Z' },
      { status: 'approved', submitted_at: '2026-10-01T16:00:00.000Z' },
      { status: 'rejected', submitted_at: '2026-10-02T02:00:00.000Z' },
      { status: 'approved', submitted_at: '2026-10-01T14:00:00.000Z' },
    ];
    expect(submissionsLeftToday(3, clips, now)).toBe(1);
    expect(submissionsLeftToday(2, clips, now)).toBe(0);
    expect(submissionsLeftToday(null, clips, now)).toBeNull();
  });
});
```

`campaignDraft.test.ts`에 추가:

```ts
  it('defaults to three clips a day and accepts no limit', () => {
    expect(emptyCampaignDraft().dailyClipLimit).toBe('3');
    expect(dailyClipLimitValue({ ...valid, dailyClipLimit: 'none' })).toBeNull();
    expect(dailyClipLimitValue({ ...valid, dailyClipLimit: '5' })).toBe(5);
  });
```

(import에 `dailyClipLimitValue` 추가, `valid`에 `dailyClipLimit: '3'` 추가)

Run: `pnpm --filter @clipers/db test -- dailyClipLimit campaignDraft` → FAIL

- [ ] **Step 2: 구현**

`packages/db/src/dailyClipLimit.ts`:

```ts
// How many clips one creator may submit to one campaign per day. The campaign owner picks the limit; the database
// enforces it on submission (prepare_clip_submission). A day runs from midnight Korea time; rejected clips don't count.

export const DAILY_CLIP_LIMIT_OPTIONS = [1, 2, 3, 5] as const;
export const DEFAULT_DAILY_CLIP_LIMIT = 3;

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function dailyClipLimitLabel(limit: number | null): string {
  return limit === null ? '제한 없음' : `하루 ${limit}개`;
}

/** Midnight Korea time at the start of the day `now` falls in. */
export function kstDayStart(now: Date = new Date()): Date {
  const korea = now.getTime() + KOREA_OFFSET_MS;
  return new Date(korea - (korea % DAY_MS) - KOREA_OFFSET_MS);
}

/** Submissions left today, or null when the campaign has no limit. */
export function submissionsLeftToday(
  limit: number | null,
  clips: { status: string; submitted_at: string }[],
  now: Date = new Date()
): number | null {
  if (limit === null) return null;
  const start = kstDayStart(now).getTime();
  const used = clips.filter((clip) => clip.status !== 'rejected' && Date.parse(clip.submitted_at) >= start).length;
  return Math.max(0, limit - used);
}
```

`index.ts`에 `export * from './dailyClipLimit';` 추가.

`campaignDraft.ts`: import `import { DEFAULT_DAILY_CLIP_LIMIT } from './dailyClipLimit';`, `CampaignDraft`에 `dailyClipLimit: string;`, `emptyCampaignDraft`에 `dailyClipLimit: String(DEFAULT_DAILY_CLIP_LIMIT),`, 파일 끝에:

```ts
/** The draft's daily clip limit as stored: a number, or null for no limit. */
export function dailyClipLimitValue(draft: CampaignDraft): number | null {
  return draft.dailyClipLimit === 'none' ? null : Number(draft.dailyClipLimit);
}
```

Run: `pnpm --filter @clipers/db test` → PASS. Commit: `feat(db): daily clip limit options, Korea-time day and the count of today’s submissions`.

---

### Task 4: DB — 열, 권한, 제출 트리거, 상한 상태 함수

**Files:** Create `supabase/migrations/<version>_clip_limits.sql`

- [ ] **Step 1: SQL**

```sql
-- Daily clip limit per campaign (the owner picks 1, 2, 3, 5 or none; default 3) and a per-creator payout cap
-- (docs/superpowers/specs/2026-10-02-clip-limits-design.md).

alter table public.campaigns
  add column daily_clip_limit integer default 3 check (daily_clip_limit is null or daily_clip_limit in (1, 2, 3, 5));

grant select (daily_clip_limit) on public.campaigns to anon, authenticated;

-- Submission check: the existing rules, plus the daily limit. A day starts at midnight Korea time; pending and approved
-- clips count, rejected ones don't. The advisory lock keeps two quick submissions from both slipping under the limit.
create or replace function public.prepare_clip_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_sla_hours integer;
  campaign_daily_limit integer;
  submitted_today integer;
begin
  if new.creator_id is distinct from auth.uid() then
    raise exception 'A clip can only be submitted for the current user';
  end if;

  select c.review_sla_hours, c.daily_clip_limit into campaign_sla_hours, campaign_daily_limit
  from campaigns c
  join campaign_applications ca on ca.campaign_id = c.id
  where c.id = new.campaign_id
    and c.status = 'live'
    and new.platform = any(c.allowed_platforms)
    and ca.creator_id = new.creator_id
    and ca.status = 'approved';

  if campaign_sla_hours is null then
    raise exception 'An approved application to a live campaign is required';
  end if;

  if campaign_daily_limit is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text || ':' || new.campaign_id::text, 0));
    select count(*) into submitted_today
    from clips
    where campaign_id = new.campaign_id
      and creator_id = new.creator_id
      and status in ('pending_review', 'approved')
      and submitted_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
    if submitted_today >= campaign_daily_limit then
      raise exception 'daily_clip_limit_reached' using detail = campaign_daily_limit::text;
    end if;
  end if;

  new.status := 'pending_review';
  new.rejection_reason := null;
  new.submitted_at := now();
  new.sla_deadline := new.submitted_at + make_interval(hours => campaign_sla_hours);
  new.reviewed_at := null;
  new.reviewed_by := null;

  return new;
end;
$$;

-- Where the signed-in creator stands against each campaign's cap: only 'ok', 'near' (80%) or 'reached', never the
-- amount. The share mirrors CREATOR_CAMPAIGN_SHARE in packages/db/src/pricing.ts.
create or replace function public.creator_campaign_cap_states(p_campaign_ids uuid[])
returns table (campaign_id uuid, state text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
    case
      when coalesce(s.paid, 0) >= floor(c.total_budget * 0.15) then 'reached'
      when coalesce(s.paid, 0) >= floor(c.total_budget * 0.15) * 0.8 then 'near'
      else 'ok'
    end
  from public.campaigns c
  left join (
    select st.campaign_id, sum(st.amount) as paid
    from public.settlements st
    where st.creator_id = auth.uid() and st.campaign_id = any(p_campaign_ids)
    group by st.campaign_id
  ) s on s.campaign_id = c.id
  where c.id = any(p_campaign_ids) and auth.uid() is not null;
$$;

revoke execute on function public.creator_campaign_cap_states(uuid[]) from public;
grant execute on function public.creator_campaign_cap_states(uuid[]) to authenticated;
```

- [ ] **Step 2: 적용(사용자 확인 후)** — Supabase MCP `apply_migration`(name `clip_limits`), 반환 버전으로 파일 저장.

- [ ] **Step 3: 확인(SQL)**
  - `select column_name, column_default from information_schema.columns where table_name = 'campaigns' and column_name = 'daily_clip_limit';` → 기본값 3
  - `select count(*) filter (where daily_clip_limit = 3), count(*) from campaigns;` → 모두 3
  - 함수 정의 확인: `select prosrc like '%daily_clip_limit_reached%' from pg_proc where proname = 'prepare_clip_submission';` → true

Commit: `feat(db): daily clip limit enforced on submission; creators see only where they stand against their cap`.

---

### Task 5: 브랜드 화면 — 설정·요약·안내

**Files:** Modify `apps/app/app/brand/(editor)/campaigns/new/campaign-form.tsx`, `apps/app/app/brand/(editor)/campaigns/new/page.tsx`, `apps/app/app/brand/(workspace)/campaigns/[id]/page.tsx`

- [ ] **Step 1: 폼** — import에 `DAILY_CLIP_LIMIT_OPTIONS, dailyClipLimitValue` 추가. 저장 `fields`에 `daily_clip_limit: dailyClipLimitValue(draft),`. "검수 기간" `Field` 바로 뒤에:

```tsx
            <Field hint="한 크리에이터가 하루에 올릴 수 있는 영상 수예요. 반려된 영상은 세지 않아요." htmlFor="campaign-daily-limit" label="크리에이터 1명당 하루 제출 한도">
              <Select id="campaign-daily-limit" onChange={(event) => update({ dailyClipLimit: event.target.value })} value={draft.dailyClipLimit}>
                {DAILY_CLIP_LIMIT_OPTIONS.map((count) => (
                  <option key={count} value={String(count)}>
                    {count}개
                  </option>
                ))}
                <option value="none">제한 없음</option>
              </Select>
            </Field>
```

예산 섹션의 `<div className="cl-form-row">…</div>`(총예산·클립당 최대 예산) 바로 뒤에:

```tsx
            <p className="cl-meta">한 크리에이터에게 예산이 몰리지 않도록, 한 명이 받을 수 있는 금액에도 상한이 있어요.</p>
```

검토 요약(`rows`)에 `{ label: '하루 제출 한도', value: dailyClipLimitLabel(dailyClipLimitValue(draft)) },` 추가(import `dailyClipLimitLabel`).

- [ ] **Step 2: 수정 화면 불러오기** — `page.tsx` select에 `daily_clip_limit` 추가, 초안에 `dailyClipLimit: campaign.daily_clip_limit === null ? 'none' : String(campaign.daily_clip_limit),`.

- [ ] **Step 3: 브랜드 캠페인 상세** — select에 `daily_clip_limit`, 브리프 `rows`의 검수 기간 다음에 `{ label: '하루 제출 한도', value: dailyClipLimitLabel(campaign.daily_clip_limit) },`.

- [ ] **Step 4: 확인 후 커밋** — `pnpm --filter @clipers/app exec tsc --noEmit 2>&1 | grep "error TS" | grep -v "^\.next/"` 출력 없음. Commit: `feat(app): brands pick a daily clip limit per creator; the cap is mentioned, not its size`.

---

### Task 6: 크리에이터 화면 — 남은 제출 수·한도 오류·상한 알림

**Files:** Modify `apps/app/app/creator/campaigns/page.tsx`, `apps/app/app/creator/campaigns/submit-clip-dialog.tsx`

- [ ] **Step 1: 데이터** — 지원 목록 조인 select에 `daily_clip_limit` 추가(`campaign:campaigns!…(title, category, allowed_platforms, daily_clip_limit)`), `Application.campaign` 타입에 `daily_clip_limit: number | null`. 승인된 캠페인 id로 두 가지를 더 읽는다:

```ts
  const approvedIds = myApplications.filter((application) => application.status === 'approved').map((application) => application.campaign_id);
  const [todayClips, capStates] = approvedIds.length
    ? await Promise.all([
        supabase.from('clips').select('campaign_id, status, submitted_at').eq('creator_id', user.id).in('campaign_id', approvedIds).gte('submitted_at', kstDayStart().toISOString()),
        supabase.rpc('creator_campaign_cap_states', { p_campaign_ids: approvedIds }),
      ])
    : [{ data: [] }, { data: [] }];
  const capState = new Map(((capStates.data ?? []) as { campaign_id: string; state: string }[]).map((row) => [row.campaign_id, row.state]));
  const CAP_NOTE: Record<string, string> = {
    near: '이 캠페인에서 받을 수 있는 금액에 거의 다다랐어요',
    reached: '이 캠페인에서 받을 수 있는 금액을 모두 받았어요. 다른 캠페인에도 참여해 보세요',
  };
```

(import `kstDayStart, submissionsLeftToday` from `@clipers/db`)

- [ ] **Step 2: 목록 행** — 승인된 행의 `description`을 다음으로:

```tsx
                    description={[
                      campaign ? `${campaign.category} · ${platformLabels(campaign.allowed_platforms)}` : null,
                      CAP_NOTE[capState.get(application.campaign_id) ?? ''] ?? null,
                    ].filter(Boolean).join(' · ') || undefined}
```

`SubmitClipDialog`에 `dailyLimit={campaign.daily_clip_limit}`와 `leftToday={submissionsLeftToday(campaign.daily_clip_limit, (todayClips.data ?? []).filter((clip) => clip.campaign_id === application.campaign_id))}` 전달.

- [ ] **Step 3: 제출 대화상자** — props에 `dailyLimit: number | null; leftToday: number | null;`. 폼 맨 위(플랫폼 Field 앞)에:

```tsx
          {leftToday !== null && (
            <p className={leftToday === 0 ? 'cl-alert cl-tone-amber' : 'cl-meta'}>
              {leftToday === 0
                ? `오늘은 이 캠페인에 영상을 ${dailyLimit}개까지 올릴 수 있어요. 내일 다시 올려 주세요.`
                : `오늘 남은 제출 ${leftToday}개 · 하루 최대 ${dailyLimit}개`}
            </p>
          )}
```

제출 버튼 `disabled`에 `|| leftToday === 0` 추가. 오류 매핑에 한도 오류 추가:

```ts
      setError(
        insertError.code === '23505'
          ? '이미 제출된 영상이에요. 같은 영상은 한 번만 제출할 수 있어요.'
          : insertError.message.includes('daily_clip_limit_reached')
            ? `오늘은 이 캠페인에 영상을 ${dailyLimit ?? ''}개까지 올릴 수 있어요. 내일 다시 올려 주세요.`
            : '제출하지 못했어요. 링크와 플랫폼을 확인한 뒤 다시 시도해 주세요.'
      );
```

- [ ] **Step 4: 확인 후 커밋** — 타입 검사 출력 없음. Commit: `feat(app): creators see today's submissions left and a quiet note near their cap`.

---

### Task 7: 사이트 캠페인 상세

**Files:** Modify `apps/site/lib/campaigns.ts`, `apps/site/components/campaign-detail.tsx`

- [ ] **Step 1:** `CampaignDetail`에 `dailyClipLimit: number | null;`, `loadCampaignDetail` select에 `daily_clip_limit`, 행 타입에 `daily_clip_limit: number | null`, 반환에 `dailyClipLimit: row.daily_clip_limit,`.
- [ ] **Step 2:** `campaign-detail.tsx` — 지급 한도 패널의 `ProgressBar` 아래에 `<p className="cl-meta">한 명이 받을 수 있는 금액에는 상한이 있어요.</p>`, 검수 패널의 `<p className="cl-meta">…</p>` 아래에:

```tsx
          <p className="cl-meta">{campaign.dailyClipLimit === null ? '하루 제출 수에는 제한이 없어요.' : `1명당 하루 ${campaign.dailyClipLimit}개까지 제출할 수 있어요.`}</p>
```

(import `dailyClipLimitLabel`은 쓰지 않아도 된다)
- [ ] **Step 3:** 타입 검사, `curl -s http://localhost:3001/campaigns/<live id> | grep -o "1명당 하루 3개"`. Commit: `feat(site): campaign detail shows the daily limit and that a per-person cap exists`.

---

### Task 8: FAQ·가이드 문구

**Files:** Modify `apps/site/lib/creator-faq.ts`, `apps/site/lib/creator-faq.test.ts`, `apps/site/lib/advertiser-faq.ts`, `apps/site/lib/advertiser-faq.test.ts`, `apps/site/lib/guides/common.ts`, `apps/site/lib/guides/index.test.ts`

- [ ] **Step 1: 테스트 먼저** — `creator-faq.test.ts` id 목록에서 `'per-clip-max'` 다음에 `'daily-limit'` 추가, `advertiser-faq.test.ts` id 목록에서 `'clip-cap'` 다음에 `'daily-limit'` 추가. 두 테스트와 `guides/index.test.ts`의 금지 문구에 `'15%'` 추가(가이드 테스트는 `banned` 배열에). Run → FAIL.
- [ ] **Step 2: 문구**
  - 크리에이터 `per-clip-max`의 답: `'영상 하나로 받을 수 있는 최대 금액은 캠페인마다 달라요. 또 한 사람이 한 캠페인에서 받을 수 있는 금액에도 상한이 있어서, 여러 크리에이터가 고르게 받을 수 있어요.'`
  - 크리에이터 새 항목(`per-clip-max` 다음): `{ id: 'daily-limit', q: '하루에 영상을 몇 개까지 올릴 수 있나요?', a: '캠페인마다 크리에이터 한 명이 하루에 올릴 수 있는 영상 수가 정해져 있어요. 캠페인 상세에서 확인할 수 있고, 반려된 영상은 세지 않아요.' }`
  - 광고주 `clip-cap`의 답: `'클립 하나가 받을 수 있는 금액에 상한을 둘 수 있어요. 또 한 크리에이터가 받을 수 있는 금액에도 상한이 있어서 예산이 여러 크리에이터에게 나뉘어요.'`
  - 광고주 새 항목(`clip-cap` 다음): `{ id: 'daily-limit', q: '크리에이터가 하루에 영상을 몇 개까지 올리나요?', a: '캠페인을 만들 때 크리에이터 1명당 하루 제출 한도를 1개, 2개, 3개, 5개, 제한 없음 중에서 고를 수 있어요. 기본은 3개예요.' }`
  - `common.ts`의 `CAVEATS` 두 번째 줄: `'영상 하나와 한 사람이 한 캠페인에서 받을 수 있는 금액에는 상한이 있고, 지급 한도에 다다르면 캠페인이 끝나요.'` (지급 한도 용어는 현재 FAQ와 맞춘다)
- [ ] **Step 3:** `pnpm --filter @clipers/site test` → PASS, `curl -s http://localhost:3001/llms.txt | grep -c "15%"` → 0. Commit: `copy(site): FAQs and guides mention the daily limit and that a per-person cap exists`.

---

### Task 9: 전체 확인

- [ ] `pnpm test` 전부 통과, 두 앱 타입 오류 없음.
- [ ] 제출 차단(운영 DB, 사용자 확인 후): 데모 크리에이터 계정이 없으면 SQL로 트리거 동작만 확인 — 트랜잭션 안에서 `set local role`/`request.jwt.claims`로 승인된 크리에이터를 흉내 내 같은 캠페인에 4건 삽입 시 4번째가 `daily_clip_limit_reached`, 끝에 `rollback`. 실제 데이터는 남기지 않는다.
- [ ] `rg -n "15%" apps/site apps/app --glob '!**/node_modules/**' --glob '!**/.next/**'` → 결과 없음.
- [ ] 분리된 작업 폴더에서 사이트·앱 빌드 성공.
