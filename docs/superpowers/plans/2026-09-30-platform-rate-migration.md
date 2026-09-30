# 플랫폼별 CPM 데이터 모델 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠페인당 단일 CPM/클립당상한(`campaigns.cpm_rate`, `campaigns.per_clip_cap`)을 플랫폼별 요율(`campaign_platform_rates`)로 전환하고, 플랫폼 목록을 7개(유튜브쇼츠/틱톡/릴스/페이스북/X/네이버클립/카카오쇼츠)로 확장한다.

**Architecture:** `settlement.ts`의 정산 계산 함수는 이미 클립 단위(호출자가 넘겨주는) `cpmRate`/`perClipCap`을 쓰므로 **핵심 계산 로직은 변경 불필요**. 호출부(브랜드 생성폼, 정산 생성, 크리에이터 표시)만 새 테이블을 조회하도록 변경한다. `min_payout`은 이번 단계에서 저장·표시만 하고 정산 계산에는 반영하지 않는다(플로어 지급 규칙은 별도 확인 필요 — Task 5 참고).

**Tech Stack:** Supabase(Postgres, RLS), Next.js/TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-marketplace-discovery-design.md` 1절, 5절

---

### Task 1: 마이그레이션 — `campaign_platform_rates` 신설 + 컬럼 정리

**Files:**
- Create: `supabase/migrations/0009_platform_rates.sql` (적용 후 실제 버전으로 리네임)

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- 1) 플랫폼별 요율 테이블
create table campaign_platform_rates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  platform text not null,
  cpm_rate numeric(10,2) not null check (cpm_rate > 0),
  min_payout numeric(12,2) not null default 0 check (min_payout >= 0),
  max_payout numeric(12,2) not null check (max_payout >= min_payout),
  unique (campaign_id, platform)
);

alter table campaign_platform_rates enable row level security;

create policy campaign_platform_rates_select on campaign_platform_rates
  for select using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and (c.brand_id = auth.uid() or current_role_is('admin') or (c.track = 'self_serve' and c.status = 'live'))
    )
  );

create policy campaign_platform_rates_brand_insert_own on campaign_platform_rates
  for insert with check (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id and c.brand_id = auth.uid() and c.status = 'draft'
    )
  );

create policy campaign_platform_rates_admin_all on campaign_platform_rates
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));

-- 2) 기존 단일 요율 데이터를 새 테이블로 백필 (allowed_platforms의 각 플랫폼에 동일 요율 적용)
insert into campaign_platform_rates (campaign_id, platform, cpm_rate, min_payout, max_payout)
select c.id, p.platform, c.cpm_rate, 0, c.per_clip_cap
from campaigns c, unnest(c.allowed_platforms) as p(platform)
on conflict (campaign_id, platform) do nothing;

-- 3) campaigns에 배너/설명 필드 추가, 단일 요율 컬럼 제거
alter table campaigns
  add column cover_image_url text,
  add column content_requirements text,
  add column reference_url text;

alter table campaigns
  drop column cpm_rate,
  drop column per_clip_cap;
```

(파일: `supabase/migrations/0009_platform_rates.sql`)

- [ ] **Step 2: `mcp__claude_ai_Supabase__apply_migration`로 적용**

`project_id: "jkdpxcvbjowtbkgxlxga"`, `name: "platform_rates"`, `query`: Step 1 전체.
Expected: `{"success": true}`

- [ ] **Step 3: 보안 어드바이저 확인**

`mcp__claude_ai_Supabase__get_advisors`(`type: "security"`) — 새 경고 없어야 함(기존 `current_role_is` authenticated 경고 1건만 유지).

- [ ] **Step 4: 실제 버전 확인 후 파일명 리네임**

`mcp__claude_ai_Supabase__list_migrations`로 `name: "platform_rates"`의 `version` 확인 후:
```bash
mv supabase/migrations/0009_platform_rates.sql supabase/migrations/<확인된 version>_platform_rates.sql
```

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat(db): add per-platform campaign rates, drop single cpm_rate/per_clip_cap"
```

---

### Task 2: `packages/db` — 플랫폼 요율 조회 헬퍼 (TDD)

**Files:**
- Create: `packages/db/src/services/platformRate.ts`
- Test: `packages/db/src/services/platformRate.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { findPlatformRate } from './platformRate';

describe('findPlatformRate', () => {
  it('returns the matching platform rate', () => {
    const rates = [
      { platform: 'youtube_shorts', cpmRate: 1.5, minPayout: 15, maxPayout: 100 },
      { platform: 'tiktok', cpmRate: 1, minPayout: 10, maxPayout: 100 },
    ];
    expect(findPlatformRate(rates, 'tiktok')).toEqual({ platform: 'tiktok', cpmRate: 1, minPayout: 10, maxPayout: 100 });
  });

  it('returns null when no rate matches the platform', () => {
    const rates = [{ platform: 'youtube_shorts', cpmRate: 1.5, minPayout: 15, maxPayout: 100 }];
    expect(findPlatformRate(rates, 'tiktok')).toBeNull();
  });
});
```

(파일: `packages/db/src/services/platformRate.test.ts`)

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @clipers/db test -- platformRate`
Expected: FAIL — `Cannot find module './platformRate'`

- [ ] **Step 3: 구현**

```ts
export type PlatformRate = {
  platform: string;
  cpmRate: number;
  minPayout: number;
  maxPayout: number;
};

export function findPlatformRate(rates: PlatformRate[], platform: string): PlatformRate | null {
  return rates.find((rate) => rate.platform === platform) ?? null;
}
```

(파일: `packages/db/src/services/platformRate.ts`)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @clipers/db test -- platformRate`
Expected: PASS — 2 tests passed

- [ ] **Step 5: `index.ts`에 re-export 추가**

`packages/db/src/index.ts` 끝에 추가:
```ts
export * from './services/platformRate';
```

- [ ] **Step 6: 커밋**

```bash
git add packages/db/src/services/platformRate.ts packages/db/src/services/platformRate.test.ts packages/db/src/index.ts
git commit -m "feat(db): add findPlatformRate helper"
```

---

### Task 3: 브랜드 캠페인 생성 폼 — 플랫폼별 요율 입력

**Files:**
- Modify: `apps/app/app/brand/brand-workspace.tsx`

- [ ] **Step 1: 플랫폼 목록 7개로 확장**

`PLATFORM_OPTIONS` 배열을 다음으로 교체:

```tsx
const PLATFORM_OPTIONS = [
  { value: 'youtube_shorts', label: '유튜브 쇼츠' },
  { value: 'tiktok', label: '틱톡' },
  { value: 'instagram_reels', label: '릴스' },
  { value: 'facebook', label: '페이스북' },
  { value: 'x', label: 'X' },
  { value: 'naver_clip', label: '네이버 클립' },
  { value: 'kakao_shorts', label: '카카오 쇼츠' },
];
```

- [ ] **Step 2: 캠페인 타입에서 단일 요율 필드 제거**

`Campaign` 타입에서 `cpm_rate`, `per_clip_cap` 필드를 제거(더 이상 `campaigns` 테이블에 없음).

- [ ] **Step 3: 플랫폼별 요율 입력 상태 추가**

`platforms` state 선언 아래에 추가:

```tsx
  const [platformRates, setPlatformRates] = useState<Record<string, { cpmRate: string; minPayout: string; maxPayout: string }>>({});
```

`togglePlatform` 함수를 다음으로 교체(선택 해제 시 입력값도 정리):

```tsx
  function togglePlatform(value: string) {
    setPlatforms((current) => {
      if (current.includes(value)) {
        setPlatformRates((rates) => {
          const next = { ...rates };
          delete next[value];
          return next;
        });
        return current.filter((platform) => platform !== value);
      }
      return [...current, value];
    });
  }
```

- [ ] **Step 4: 캠페인 생성 로직 — 2단계 insert로 변경**

`createCampaign` 함수 본문을 다음으로 교체:

```tsx
  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (platforms.length === 0) throw new Error('허용 플랫폼을 하나 이상 선택해야 합니다.');
      for (const platform of platforms) {
        const rate = platformRates[platform];
        if (!rate || !rate.cpmRate || !rate.maxPayout) {
          throw new Error('선택한 모든 플랫폼의 CPM과 최대 지급액을 입력해야 합니다.');
        }
      }

      const supabase = getSupabaseBrowserClient();
      const { data: campaignRow, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          brand_id: userId,
          track: 'self_serve',
          title: title.trim(),
          content_type: contentType,
          category: category.trim(),
          total_budget: Number(totalBudget),
          review_sla_hours: Number(reviewSlaHours),
          allowed_platforms: platforms,
          status: 'draft',
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      const { error: ratesError } = await supabase.from('campaign_platform_rates').insert(
        platforms.map((platform) => ({
          campaign_id: (campaignRow as { id: string }).id,
          platform,
          cpm_rate: Number(platformRates[platform].cpmRate),
          min_payout: Number(platformRates[platform].minPayout || 0),
          max_payout: Number(platformRates[platform].maxPayout),
        }))
      );
      if (ratesError) throw ratesError;

      setTitle('');
      setCategory('');
      setTotalBudget('');
      setReviewSlaHours('');
      setPlatforms([]);
      setPlatformRates({});
      setMessage('캠페인을 생성했습니다. 아래 계좌이체 안내에 따라 입금 후 "입금 완료" 버튼을 눌러주세요.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '캠페인을 생성하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 5: 폼에서 CPM/상한 입력란 제거, 플랫폼별 입력 UI로 교체**

기존 "CPM (1,000뷰당 원)"과 "클립당 지급 상한 (원)" `<label>` 두 개를 통째로 제거하고, 허용 플랫폼 체크박스 블록을 다음으로 교체:

```tsx
            <div>
              <p className="app-muted" style={{ marginBottom: 8 }}>허용 플랫폼 및 플랫폼별 요율</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {PLATFORM_OPTIONS.map((option) => {
                  const checked = platforms.includes(option.value);
                  const rate = platformRates[option.value] ?? { cpmRate: '', minPayout: '', maxPayout: '' };
                  return (
                    <div key={option.value}>
                      <label>
                        <input checked={checked} onChange={() => togglePlatform(option.value)} type="checkbox" />
                        {' '}{option.label}
                      </label>
                      {checked && (
                        <div className="app-action-row" style={{ marginTop: 6 }}>
                          <input
                            aria-label={`${option.label} CPM`}
                            onChange={(event) =>
                              setPlatformRates((current) => ({ ...current, [option.value]: { ...rate, cpmRate: event.target.value } }))
                            }
                            placeholder="CPM (1,000뷰당 원)"
                            required
                            type="number"
                            value={rate.cpmRate}
                          />
                          <input
                            aria-label={`${option.label} 최소 지급액`}
                            onChange={(event) =>
                              setPlatformRates((current) => ({ ...current, [option.value]: { ...rate, minPayout: event.target.value } }))
                            }
                            placeholder="최소 지급액 (원, 선택)"
                            type="number"
                            value={rate.minPayout}
                          />
                          <input
                            aria-label={`${option.label} 최대 지급액`}
                            onChange={(event) =>
                              setPlatformRates((current) => ({ ...current, [option.value]: { ...rate, maxPayout: event.target.value } }))
                            }
                            placeholder="최대 지급액 (원)"
                            required
                            type="number"
                            value={rate.maxPayout}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
```

- [ ] **Step 6: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공

- [ ] **Step 7: 커밋**

```bash
git add apps/app/app/brand/brand-workspace.tsx
git commit -m "feat(app): collect per-platform CPM rates on campaign creation"
```

---

### Task 4: 정산 생성 로직 — 플랫폼별 요율 조회로 전환

**Files:**
- Modify: `apps/app/app/admin/settlement-panel.tsx`

- [ ] **Step 1: import에 `findPlatformRate` 추가**

```tsx
import { calculateWeeklySettlementDrafts, findPlatformRate, getCampaignsToClose, getPreviousWeekPeriod } from '@clipers/db';
```

- [ ] **Step 2: 타입 수정**

`CampaignForSettlement`에서 `cpm_rate`, `per_clip_cap` 제거(더 이상 없음). `ApprovedClip`에 `platform` 필드 추가:

```tsx
type CampaignForSettlement = {
  id: string;
  title: string;
  total_budget: number | string;
};

type ApprovedClip = {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: string;
  reviewed_at: string | null;
  campaign: CampaignForSettlement | null;
};
```

- [ ] **Step 3: 클립 조회 쿼리에 `platform` 추가**

```tsx
          .select('id,campaign_id,creator_id,platform,reviewed_at,campaign:campaigns!clips_campaign_id_fkey(id,title,total_budget)')
```

- [ ] **Step 4: 플랫폼별 요율 조회 추가**

`generateSettlements` 함수에서 `if (clips.length === 0) { ... }` 블록 바로 다음, `const snapshots: SnapshotRow[] = [];` 이전에 추가:

```tsx
      const { data: rateRows, error: rateError } = await supabase
        .from('campaign_platform_rates')
        .select('campaign_id,platform,cpm_rate,max_payout')
        .in('campaign_id', [...new Set(clips.map((clip) => clip.campaign_id))]);
      if (rateError) throw rateError;
      const platformRatesByCampaign = new Map<string, { platform: string; cpmRate: number; minPayout: number; maxPayout: number }[]>();
      for (const row of (rateRows ?? []) as { campaign_id: string; platform: string; cpm_rate: number; max_payout: number }[]) {
        const existing = platformRatesByCampaign.get(row.campaign_id) ?? [];
        existing.push({ platform: row.platform, cpmRate: Number(row.cpm_rate), minPayout: 0, maxPayout: Number(row.max_payout) });
        platformRatesByCampaign.set(row.campaign_id, existing);
      }
```

- [ ] **Step 5: `inputs` 생성 로직에서 캠페인 단일 요율 대신 플랫폼별 요율 사용**

`const inputs = clips.flatMap((clip) => { ... })` 블록 안의 `campaign` 관련 코드를 다음으로 교체(기존 `cpmRate: Number(campaign.cpm_rate), perClipCap: Number(campaign.per_clip_cap),` 두 줄을 교체):

```tsx
      const inputs = clips.flatMap((clip) => {
        const campaign = clip.campaign;
        if (!campaign || existingClipIds.has(clip.id)) return [];

        const rate = findPlatformRate(platformRatesByCampaign.get(clip.campaign_id) ?? [], clip.platform);
        if (!rate) return [];

        const previousClipRows = previousSettlements.filter(
          (settlement) => settlement.clip_id === clip.id && settlement.period < period.period
        );
        const previousCampaignRows = previousSettlements.filter(
          (settlement) =>
            settlement.campaign_id === clip.campaign_id && settlement.period < period.period
        );

        return [{
          clipId: clip.id,
          campaignId: clip.campaign_id,
          creatorId: clip.creator_id,
          reviewedAt: clip.reviewed_at,
          cpmRate: rate.cpmRate,
          perClipCap: rate.maxPayout,
          campaignBudget: Number(campaign.total_budget),
          previouslySettledClipAmount: previousClipRows.reduce(
            (total, settlement) => total + Number(settlement.amount),
            0
          ),
          previouslySettledCampaignAmount: previousCampaignRows.reduce(
            (total, settlement) => total + Number(settlement.amount),
            0
          ),
          snapshots: snapshots
            .filter((snapshot) => snapshot.clip_id === clip.id)
            .map((snapshot) => ({
              capturedAt: snapshot.captured_at,
              viewCount: Number(snapshot.view_count),
            })),
        }];
      });
```

- [ ] **Step 6: 캠페인 조회 select에서 제거된 컬럼 정리**

`.select('id,campaign_id,creator_id,reviewed_at,campaign:campaigns!clips_campaign_id_fkey(id,title,cpm_rate,per_clip_cap,total_budget)')`가 이미 Step 3에서 교체됐는지 확인(위 Step 3과 동일 라인이므로 중복 수정 없음 — 확인만).

- [ ] **Step 7: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공

- [ ] **Step 8: 커밋**

```bash
git add apps/app/app/admin/settlement-panel.tsx
git commit -m "feat(app): generate settlements using per-platform campaign rates"
```

---

### Task 5: 크리에이터 화면 — 플랫폼별 요율 표시

**Files:**
- Modify: `apps/app/app/creator/creator-workspace.tsx`

- [ ] **Step 1: `Campaign` 타입에서 단일 CPM 제거, 요율 타입 추가**

`Campaign` 타입에서 `cpm_rate` 필드 제거. 바로 아래에 추가:

```tsx
type PlatformRateRow = {
  campaign_id: string;
  platform: string;
  cpm_rate: number | string;
};
```

(이름을 `PlatformRateRow`로 지어 `@clipers/db`가 내보내는 camelCase `PlatformRate` 타입과 구분한다 — 이 타입은 import하지 않고 로컬에서만 쓰는 raw DB row 형태다.)

- [ ] **Step 2: 요율 목록 state 및 조회 쿼리 추가**

`campaigns` state 선언 다음 줄에 추가:

```tsx
  const [platformRates, setPlatformRates] = useState<PlatformRateRow[]>([]);
```

`loadWorkspace`의 `Promise.all([...])` 배열에 다음 쿼리 추가(campaignResult 다음, applicationResult 이전):

```tsx
        supabase
          .from('campaign_platform_rates')
          .select('campaign_id,platform,cpm_rate'),
```

대응해 구조분해 변수명과 에러 체크, `setPlatformRates(...)` 호출도 함께 추가(기존 `const [campaignResult, applicationResult, ...]` 배열과 `if (...error) throw` 블록에 각각 한 줄씩 추가).

- [ ] **Step 3: 캠페인 테이블의 CPM 열을 플랫폼별 표시로 교체**

"지원 가능한 캠페인" 테이블의 `<td>{Number(campaign.cpm_rate).toLocaleString('ko-KR')}원 / 1,000뷰</td>`를 다음으로 교체:

```tsx
                    <td>
                      {platformRates
                        .filter((rate) => rate.campaign_id === campaign.id)
                        .map((rate) => `${rate.platform}: ${Number(rate.cpm_rate).toLocaleString('ko-KR')}원`)
                        .join(', ') || '—'}
                    </td>
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공

- [ ] **Step 5: 커밋**

```bash
git add apps/app/app/creator/creator-workspace.tsx
git commit -m "feat(app): show per-platform CPM rates to creators"
```

---

### Task 6: 전체 검증

- [ ] **Step 1: 전체 테스트/빌드**

Run: `pnpm turbo run test build --force`
Expected: 전체 통과

- [ ] **Step 2: 남겨진 질문 기록**

`min_payout`(최소 지급액)을 정산 계산에서 "미달 시 얼마를 지급할지" 규칙은 이번 단계에서 **저장·표시만 하고 미적용**으로 남겨둠 — Whop 스크린샷상 의미가 명확하지 않아 임의로 정하지 않음. `mvp-tasks.md`나 다음 대화에서 사용자 확인 후 반영.
