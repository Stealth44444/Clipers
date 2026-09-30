# 마켓플레이스 디스커버리 + 캠페인 상세 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/site`에 로그인 없이 접근 가능한 캠페인 디스커버리 그리드와 캠페인 상세 페이지(플랫폼별 정산표, 예산, 리더보드, 누적 조회수 차트)를 만든다.

**Architecture:** `apps/site`는 지금까지 `@clipers/db`(Supabase)에 의존하지 않는 순수 마케팅 셸이었다. 이번에 anon key로 읽기 전용 Supabase 클라이언트를 추가하고, Next.js 서버 컴포넌트에서 직접 조회한다(클라이언트 컴포넌트로 fetch하지 않음 — SEO/GEO 요구사항 때문에 서버 렌더링 우선). 새로 필요한 공개(RLS) 노출과 Storage 버킷을 마이그레이션으로 추가하고, 집계 로직(일별 조회수 롤업, 리더보드 랭킹)은 `packages/db`에 순수 함수로 구현해 테스트한다.

**Tech Stack:** Next.js 15(App Router, Server Components), Supabase(Postgres + Storage + RLS), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-marketplace-discovery-design.md`

**마이그레이션 적용 방법**: 로컬 CLI 인증 불가 — `mcp__claude_ai_Supabase__apply_migration`(project_id: `jkdpxcvbjowtbkgxlxga`)로 적용 후 `list_migrations`로 실제 버전 확인, 로컬 파일명을 그 버전으로 리네임.

---

### Task 1: 마이그레이션 — 공개 RLS 확장 + Storage 버킷

**Files:**
- Create: `supabase/migrations/0010_public_marketplace_access.sql` (적용 후 실제 버전으로 리네임)

- [ ] **Step 1: SQL 작성**

```sql
-- 1) 참여자 수 카운트용 — 라이브 셀프서브 캠페인의 지원서 공개 조회
create policy campaign_applications_public_select on campaign_applications
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.track = 'self_serve' and c.status = 'live')
  );

-- 2) 리더보드용 — 라이브 셀프서브 캠페인의 정산 내역 공개 조회 (Whop도 크리에이터명+수익을 공개 노출)
create policy settlements_public_select_live_campaigns on settlements
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.track = 'self_serve' and c.status = 'live')
  );

-- 3) 조회수 차트/Top clips용 — 라이브 셀프서브 캠페인의 승인된 클립 스냅샷 공개 조회
create policy view_snapshots_public_select_live_campaigns on view_snapshots
  for select using (
    exists (
      select 1 from clips cl
      join campaigns c on c.id = cl.campaign_id
      where cl.id = clip_id and cl.status = 'approved' and c.track = 'self_serve' and c.status = 'live'
    )
  );

-- 4) 캠페인 배너 이미지 Storage 버킷 (public-read, 브랜드 본인 폴더에만 쓰기)
insert into storage.buckets (id, name, public)
values ('campaign-banners', 'campaign-banners', true)
on conflict (id) do nothing;

create policy campaign_banners_public_read on storage.objects
  for select using (bucket_id = 'campaign-banners');

create policy campaign_banners_brand_insert_own on storage.objects
  for insert with check (
    bucket_id = 'campaign-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy campaign_banners_brand_update_own on storage.objects
  for update using (
    bucket_id = 'campaign-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

(파일: `supabase/migrations/0010_public_marketplace_access.sql`)

- [ ] **Step 2: 적용**

`mcp__claude_ai_Supabase__apply_migration`(`project_id: "jkdpxcvbjowtbkgxlxga"`, `name: "public_marketplace_access"`, `query`: Step 1 전체).
Expected: `{"success": true}`

- [ ] **Step 3: 보안 어드바이저 확인**

`mcp__claude_ai_Supabase__get_advisors`(`type: "security"`) — 새 경고 없어야 함.

- [ ] **Step 4: 실제 버전 확인 후 리네임**

`mcp__claude_ai_Supabase__list_migrations`로 `public_marketplace_access`의 `version` 확인 후:
```bash
mv supabase/migrations/0010_public_marketplace_access.sql supabase/migrations/<확인된 version>_public_marketplace_access.sql
```

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat(db): open public read access for marketplace + campaign banner storage"
```

---

### Task 2: 집계 순수 함수 — 조회수 롤업 + 리더보드 (TDD)

**Files:**
- Create: `packages/db/src/services/viewsRollup.ts`
- Test: `packages/db/src/services/viewsRollup.test.ts`
- Create: `packages/db/src/services/leaderboard.ts`
- Test: `packages/db/src/services/leaderboard.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 조회수 롤업 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { rollupDailyViews } from './viewsRollup';

describe('rollupDailyViews', () => {
  it('carries forward the last known view count per clip across days', () => {
    const result = rollupDailyViews([
      {
        clipId: 'clip-1',
        snapshots: [
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 100 },
          { capturedAt: '2026-01-03T00:00:00Z', viewCount: 300 },
        ],
      },
      {
        clipId: 'clip-2',
        snapshots: [{ capturedAt: '2026-01-02T00:00:00Z', viewCount: 50 }],
      },
    ]);

    expect(result).toEqual([
      { date: '2026-01-01', totalViews: 100 },
      { date: '2026-01-02', totalViews: 150 },
      { date: '2026-01-03', totalViews: 350 },
    ]);
  });

  it('returns an empty array when there are no snapshots', () => {
    expect(rollupDailyViews([])).toEqual([]);
  });

  it('ignores invalid snapshot entries', () => {
    const result = rollupDailyViews([
      {
        clipId: 'clip-1',
        snapshots: [
          { capturedAt: 'not-a-date', viewCount: 100 },
          { capturedAt: '2026-01-01T00:00:00Z', viewCount: 10 },
        ],
      },
    ]);
    expect(result).toEqual([{ date: '2026-01-01', totalViews: 10 }]);
  });
});
```

(파일: `packages/db/src/services/viewsRollup.test.ts`)

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db test -- viewsRollup`
Expected: FAIL — `Cannot find module './viewsRollup'`

- [ ] **Step 3: 구현**

```ts
export type ViewSnapshotPoint = {
  capturedAt: Date | string;
  viewCount: number;
};

export type ClipSnapshotSeries = {
  clipId: string;
  snapshots: ViewSnapshotPoint[];
};

export type DailyViewsPoint = {
  date: string;
  totalViews: number;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function rollupDailyViews(series: ClipSnapshotSeries[]): DailyViewsPoint[] {
  const perClip = series.map(({ clipId, snapshots }) => ({
    clipId,
    sorted: snapshots
      .map((snapshot) => ({ capturedAt: new Date(snapshot.capturedAt), viewCount: snapshot.viewCount }))
      .filter(
        (snapshot) =>
          Number.isFinite(snapshot.capturedAt.getTime()) &&
          Number.isSafeInteger(snapshot.viewCount) &&
          snapshot.viewCount >= 0
      )
      .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime()),
  }));

  const allDates = new Set<string>();
  for (const clip of perClip) {
    for (const snapshot of clip.sorted) {
      allDates.add(toDateKey(snapshot.capturedAt));
    }
  }
  const sortedDates = [...allDates].sort();
  if (sortedDates.length === 0) return [];

  const lastKnownByClip = new Map<string, number>();
  return sortedDates.map((date) => {
    const dayEnd = new Date(`${date}T23:59:59.999Z`).getTime();
    for (const clip of perClip) {
      const latestForDay = [...clip.sorted].reverse().find((snapshot) => snapshot.capturedAt.getTime() <= dayEnd);
      if (latestForDay) {
        lastKnownByClip.set(clip.clipId, latestForDay.viewCount);
      }
    }
    const totalViews = [...lastKnownByClip.values()].reduce((sum, count) => sum + count, 0);
    return { date, totalViews };
  });
}
```

(파일: `packages/db/src/services/viewsRollup.ts`)

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db test -- viewsRollup`
Expected: PASS — 3 tests passed

- [ ] **Step 5: 리더보드 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { rankCreatorEarnings } from './leaderboard';

describe('rankCreatorEarnings', () => {
  it('ranks creators by total settlement amount, descending', () => {
    const result = rankCreatorEarnings([
      { creatorId: 'c1', creatorName: 'Alice', amount: 100 },
      { creatorId: 'c2', creatorName: 'Bob', amount: 300 },
      { creatorId: 'c1', creatorName: 'Alice', amount: 50 },
    ]);

    expect(result).toEqual([
      { rank: 1, creatorId: 'c2', creatorName: 'Bob', totalAmount: 300 },
      { rank: 2, creatorId: 'c1', creatorName: 'Alice', totalAmount: 150 },
    ]);
  });

  it('returns an empty array for no settlements', () => {
    expect(rankCreatorEarnings([])).toEqual([]);
  });
});
```

(파일: `packages/db/src/services/leaderboard.test.ts`)

- [ ] **Step 6: 실패 확인**

Run: `pnpm --filter @clipers/db test -- leaderboard`
Expected: FAIL — `Cannot find module './leaderboard'`

- [ ] **Step 7: 구현**

```ts
export type SettlementEarning = {
  creatorId: string;
  creatorName: string;
  amount: number;
};

export type RankedCreatorEarning = {
  rank: number;
  creatorId: string;
  creatorName: string;
  totalAmount: number;
};

export function rankCreatorEarnings(settlements: SettlementEarning[]): RankedCreatorEarning[] {
  const totals = new Map<string, { creatorName: string; totalAmount: number }>();
  for (const settlement of settlements) {
    const existing = totals.get(settlement.creatorId);
    totals.set(settlement.creatorId, {
      creatorName: settlement.creatorName,
      totalAmount: (existing?.totalAmount ?? 0) + settlement.amount,
    });
  }

  return [...totals.entries()]
    .map(([creatorId, { creatorName, totalAmount }]) => ({ creatorId, creatorName, totalAmount }))
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}
```

(파일: `packages/db/src/services/leaderboard.ts`)

- [ ] **Step 8: 통과 확인**

Run: `pnpm --filter @clipers/db test -- leaderboard`
Expected: PASS — 2 tests passed

- [ ] **Step 9: `index.ts`에 re-export 추가**

```ts
export * from './services/viewsRollup';
export * from './services/leaderboard';
```

- [ ] **Step 10: 커밋**

```bash
git add packages/db/src/services/viewsRollup.ts packages/db/src/services/viewsRollup.test.ts packages/db/src/services/leaderboard.ts packages/db/src/services/leaderboard.test.ts packages/db/src/index.ts
git commit -m "feat(db): add daily views rollup and creator leaderboard ranking"
```

---

### Task 3: `apps/site` — Supabase 읽기 전용 클라이언트 배선

**Files:**
- Modify: `apps/site/package.json`
- Create: `apps/site/lib/supabase-server.ts`
- Modify: `.env.example`

- [ ] **Step 1: 의존성 추가**

`apps/site/package.json`의 `dependencies`에 추가:

```json
    "@clipers/db": "workspace:*",
```

- [ ] **Step 2: 서버 클라이언트 헬퍼 작성**

```ts
import { createSupabaseClient } from '@clipers/db';

let client: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase URL과 anon key가 필요합니다.');
  }
  client ??= createSupabaseClient(url, anonKey);
  return client;
}
```

(파일: `apps/site/lib/supabase-server.ts`. 이 클라이언트는 anon key로만 공개 데이터를 읽으므로 쿠키/세션 처리가 필요 없다 — 인증이 전혀 없는 서버 컴포넌트 전용 읽기 클라이언트.)

- [ ] **Step 3: `apps/site/tsconfig.json`에 `@/*` 경로 별칭 확인**

`apps/site/tsconfig.json`을 읽어 `paths`에 `"@/*": ["./*"]`가 이미 있는지 확인(foundation 스캐폴드 기준 이미 있어야 함). 없으면 `apps/app/tsconfig.json`과 동일하게 추가.

- [ ] **Step 4: 환경변수 템플릿에 추가 확인**

`.env.example`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 이미 있으므로(앱과 공유) 추가 작업 없음 — `apps/site`용 `.env.local`을 만들 때 같은 값을 복사해야 한다는 점만 Task 7에서 확인.

- [ ] **Step 5: 설치 확인**

Run: `pnpm install`
Expected: 에러 없이 종료, `apps/site`가 `@clipers/db`를 workspace 의존성으로 인식

- [ ] **Step 6: 커밋**

```bash
git add apps/site/package.json apps/site/lib/supabase-server.ts pnpm-lock.yaml
git commit -m "feat(site): wire up read-only Supabase client"
```

---

### Task 4: 디스커버리 그리드 (`apps/site/app/page.tsx`)

**Files:**
- Modify: `apps/site/app/page.tsx`
- Create: `apps/site/app/discover-sections.tsx`

- [ ] **Step 1: 데이터 조회 + 페이지 컴포넌트 작성**

```tsx
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { DiscoverGrid } from './discover-sections';

export type CampaignCard = {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  total_budget: number;
  allowed_platforms: string[];
  brand_name: string;
  rate_range: { min: number; max: number } | null;
};

async function loadCampaignCards(): Promise<CampaignCard[]> {
  const supabase = getSupabaseServerClient();
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id,title,category,cover_image_url,total_budget,allowed_platforms,brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  const rows = (campaigns ?? []) as unknown as Array<{
    id: string;
    title: string;
    category: string;
    cover_image_url: string | null;
    total_budget: number;
    allowed_platforms: string[];
    brand: { display_name: string } | null;
  }>;
  if (rows.length === 0) return [];

  const { data: rates } = await supabase
    .from('campaign_platform_rates')
    .select('campaign_id,cpm_rate')
    .in('campaign_id', rows.map((row) => row.id));
  const rateRows = (rates ?? []) as { campaign_id: string; cpm_rate: number }[];

  return rows.map((row) => {
    const campaignRates = rateRows.filter((rate) => rate.campaign_id === row.id).map((rate) => Number(rate.cpm_rate));
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      cover_image_url: row.cover_image_url,
      total_budget: Number(row.total_budget),
      allowed_platforms: row.allowed_platforms,
      brand_name: row.brand?.display_name ?? '브랜드',
      rate_range: campaignRates.length > 0 ? { min: Math.min(...campaignRates), max: Math.max(...campaignRates) } : null,
    };
  });
}

export default async function DiscoverPage() {
  const campaigns = await loadCampaignCards();

  return (
    <main className="app-page">
      <header className="app-global-header">
        <Link className="app-wordmark" href="/">Clipers</Link>
        <nav className="app-global-nav" aria-label="서비스">
          <Link href="/for-creators">크리에이터</Link>
          <Link href="/for-brands">브랜드</Link>
        </nav>
        <a href="https://app.clipers.com/login">로그인</a>
      </header>
      <div className="app-shell">
        <div className="app-heading">
          <p className="app-eyebrow">DISCOVER CAMPAIGNS</p>
          <h1>지금 참여할 수 있는 캠페인</h1>
          <p className="app-muted">예산을 건 캠페인에 클립을 제출하고 검증된 조회수만큼 정산받으세요.</p>
        </div>
        <DiscoverGrid campaigns={campaigns} />
      </div>
    </main>
  );
}
```

(파일: `apps/site/app/page.tsx` — 기존 placeholder를 전부 교체. 배포 도메인이 아직 하나뿐이므로 로그인 링크는 절대경로 placeholder(`app.clipers.com`)로 두고, 실제 배포 시 도메인 확정되면 교체)

- [ ] **Step 2: 히어로/카드그리드/키워드검색/Top clips 클라이언트 컴포넌트 작성**

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CampaignCard } from './page';

const PLATFORM_LABEL: Record<string, string> = {
  youtube_shorts: '유튜브 쇼츠',
  tiktok: '틱톡',
  instagram_reels: '릴스',
  facebook: '페이스북',
  x: 'X',
  naver_clip: '네이버 클립',
  kakao_shorts: '카카오 쇼츠',
};

function formatRate(card: CampaignCard): string {
  if (!card.rate_range) return '요율 미정';
  const { min, max } = card.rate_range;
  return min === max
    ? `₩${min.toLocaleString('ko-KR')} / 1,000뷰`
    : `₩${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')} / 1,000뷰`;
}

export function DiscoverGrid({ campaigns }: { campaigns: CampaignCard[] }) {
  const [keyword, setKeyword] = useState('');
  const heroCampaigns = useMemo(
    () => [...campaigns].sort((left, right) => right.total_budget - left.total_budget).slice(0, 5),
    [campaigns]
  );
  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter(
      (campaign) => campaign.title.toLowerCase().includes(query) || campaign.category.toLowerCase().includes(query)
    );
  }, [campaigns, keyword]);

  return (
    <>
      {heroCampaigns.length > 0 && (
        <section className="app-section" aria-labelledby="hero-title">
          <h2 id="hero-title" className="app-muted" style={{ fontSize: 12, textTransform: 'uppercase' }}>Featured</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
            {heroCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                style={{ flex: '0 0 360px', display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}
              >
                <div
                  style={{
                    height: 160,
                    background: campaign.cover_image_url ? `url(${campaign.cover_image_url}) center/cover` : '#222',
                  }}
                />
                <div style={{ padding: 16 }}>
                  <p className="app-muted">{campaign.brand_name}</p>
                  <h3 style={{ margin: '4px 0' }}>{campaign.title}</h3>
                  <p className="app-muted">{campaign.category} · {formatRate(campaign)} · {campaign.total_budget.toLocaleString('ko-KR')}원</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="app-section" aria-labelledby="search-title">
        <h2 id="search-title">캠페인 검색</h2>
        <input
          aria-label="캠페인 검색"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="예: 게임 캠페인 보여줘"
          style={{ width: '100%', maxWidth: 480, boxSizing: 'border-box', padding: '11px 12px', borderRadius: 6, border: '1px solid #454545', background: '#181818', color: '#fff' }}
          value={keyword}
        />
      </section>

      <section className="app-section" aria-labelledby="grid-title">
        <h2 id="grid-title">Campaigns for you <span className="app-muted">{filtered.length}</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              style={{ display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}
            >
              <div
                style={{
                  height: 140,
                  background: campaign.cover_image_url ? `url(${campaign.cover_image_url}) center/cover` : '#222',
                }}
              />
              <div style={{ padding: 14 }}>
                <p className="app-muted">{campaign.brand_name}</p>
                <h3 style={{ margin: '4px 0', fontSize: 16 }}>{campaign.title}</h3>
                <p className="app-muted">{campaign.allowed_platforms.map((platform) => PLATFORM_LABEL[platform] ?? platform).join(', ')}</p>
                <p className="app-muted">{formatRate(campaign)}</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="app-muted">조건에 맞는 캠페인이 없습니다.</p>}
        </div>
      </section>
    </>
  );
}
```

(파일: `apps/site/app/discover-sections.tsx`. Top clips 섹션은 Task 5에서 상세 페이지와 공유하는 썸네일 로직을 먼저 만든 뒤 Task 6에서 이 파일에 추가한다.)

- [ ] **Step 3: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/site --force`
Expected: 성공 (환경변수 없으면 런타임 에러는 나중 확인 대상, 빌드 자체는 통과해야 함 — 타입 에러만 우선 확인)

- [ ] **Step 4: 커밋**

```bash
git add apps/site/app/page.tsx apps/site/app/discover-sections.tsx
git commit -m "feat(site): add public campaign discovery grid"
```

---

### Task 5: 캠페인 상세 페이지 (`apps/site/app/campaigns/[id]/page.tsx`)

**Files:**
- Create: `apps/site/app/campaigns/[id]/page.tsx`
- Create: `apps/site/app/campaigns/[id]/views-chart.tsx`

- [ ] **Step 1: 데이터 조회 + 정적 섹션 작성**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { rankCreatorEarnings, rollupDailyViews } from '@clipers/db';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { ViewsChart } from './views-chart';

const PLATFORM_LABEL: Record<string, string> = {
  youtube_shorts: '유튜브 쇼츠',
  tiktok: '틱톡',
  instagram_reels: '릴스',
  facebook: '페이스북',
  x: 'X',
  naver_clip: '네이버 클립',
  kakao_shorts: '카카오 쇼츠',
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id,title,category,total_budget,content_requirements,reference_url,cover_image_url,allowed_platforms,brand:profiles!campaigns_brand_id_fkey(display_name)')
    .eq('id', id)
    .eq('track', 'self_serve')
    .eq('status', 'live')
    .maybeSingle();

  if (!campaign) notFound();
  const brandName = (campaign as unknown as { brand: { display_name: string } | null }).brand?.display_name ?? '브랜드';

  const [{ data: rates }, { data: applications }, { data: settlements }, { data: approvedClips }] = await Promise.all([
    supabase.from('campaign_platform_rates').select('platform,cpm_rate,min_payout,max_payout').eq('campaign_id', id),
    supabase.from('campaign_applications').select('id').eq('campaign_id', id),
    supabase
      .from('settlements')
      .select('creator_id,amount,creator:profiles!settlements_creator_id_fkey(display_name)')
      .eq('campaign_id', id),
    supabase.from('clips').select('id').eq('campaign_id', id).eq('status', 'approved'),
  ]);

  const clipIds = (approvedClips ?? []).map((clip) => (clip as { id: string }).id);
  let dailyViews: { date: string; totalViews: number }[] = [];
  if (clipIds.length > 0) {
    const { data: snapshotRows } = await supabase
      .from('view_snapshots')
      .select('clip_id,view_count,captured_at')
      .in('clip_id', clipIds);
    const byClip = new Map<string, { capturedAt: string; viewCount: number }[]>();
    for (const row of (snapshotRows ?? []) as { clip_id: string; view_count: number; captured_at: string }[]) {
      const existing = byClip.get(row.clip_id) ?? [];
      existing.push({ capturedAt: row.captured_at, viewCount: Number(row.view_count) });
      byClip.set(row.clip_id, existing);
    }
    dailyViews = rollupDailyViews([...byClip.entries()].map(([clipId, snapshots]) => ({ clipId, snapshots })));
  }

  const settlementRows = (settlements ?? []) as unknown as { creator_id: string; amount: number; creator: { display_name: string } | null }[];
  const leaderboard = rankCreatorEarnings(
    settlementRows.map((row) => ({ creatorId: row.creator_id, creatorName: row.creator?.display_name ?? '크리에이터', amount: Number(row.amount) }))
  ).slice(0, 3);
  const totalEarned = settlementRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const consumedBudget = totalEarned;
  const totalBudget = Number((campaign as { total_budget: number }).total_budget);
  const latestTotalViews = dailyViews.at(-1)?.totalViews ?? 0;
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <main className="app-page">
      <header className="app-global-header">
        <Link className="app-wordmark" href="/">Clipers</Link>
        <nav className="app-global-nav" aria-label="서비스">
          <Link href="/">Discover</Link>
        </nav>
        <a href="https://app.clipers.com/login?next=/creator">지원하기</a>
      </header>
      <div className="app-shell">
        <div
          style={{
            height: 240,
            borderRadius: 12,
            background: (campaign as { cover_image_url: string | null }).cover_image_url
              ? `url(${(campaign as { cover_image_url: string | null }).cover_image_url}) center/cover`
              : '#222',
          }}
        />
        <div className="app-heading">
          <p className="app-eyebrow">{brandName}</p>
          <h1>{(campaign as { title: string }).title}</h1>
          <p className="app-muted">
            {(campaign as { category: string }).category} · 참여자 {(applications ?? []).length}명 ·{' '}
            {((campaign as { allowed_platforms: string[] }).allowed_platforms).map((platform) => PLATFORM_LABEL[platform] ?? platform).join(', ')}
          </p>
          <a className="app-button app-button-primary" href="https://app.clipers.com/login?next=/creator" style={{ display: 'inline-flex', marginTop: 12 }}>
            지원하기
          </a>
        </div>

        <section className="app-section" aria-labelledby="rates-title">
          <h2 id="rates-title">플랫폼별 정산표</h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>플랫폼</th><th>1,000뷰당</th><th>최소 지급</th><th>최대 지급</th></tr></thead>
              <tbody>
                {(rates ?? []).map((rate) => {
                  const row = rate as { platform: string; cpm_rate: number; min_payout: number; max_payout: number };
                  return (
                    <tr key={row.platform}>
                      <td>{PLATFORM_LABEL[row.platform] ?? row.platform}</td>
                      <td>{Number(row.cpm_rate).toLocaleString('ko-KR')}원</td>
                      <td>{Number(row.min_payout).toLocaleString('ko-KR')}원</td>
                      <td>{Number(row.max_payout).toLocaleString('ko-KR')}원</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-section" aria-labelledby="budget-title">
          <h2 id="budget-title">예산</h2>
          <p style={{ fontSize: 28, fontFamily: 'var(--font-heading)' }}>
            {consumedBudget.toLocaleString('ko-KR')}원 <span className="app-muted" style={{ fontSize: 16 }}>/ {totalBudget.toLocaleString('ko-KR')}원</span>
          </p>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#333', overflow: 'hidden' }}>
            <div style={{ width: `${totalBudget > 0 ? Math.min(100, Math.round((consumedBudget / totalBudget) * 100)) : 0}%`, height: '100%', background: 'var(--brand-primary)' }} />
          </div>
          {(campaign as { content_requirements: string | null }).content_requirements && (
            <p className="app-muted" style={{ marginTop: 16 }}>
              콘텐츠 요구사항: {(campaign as { content_requirements: string | null }).content_requirements}
            </p>
          )}
          {(campaign as { reference_url: string | null }).reference_url && (
            <p className="app-muted">
              참고 자료: <a href={(campaign as { reference_url: string }).reference_url} rel="noreferrer" target="_blank">링크 열기</a>
            </p>
          )}
        </section>

        {leaderboard.length > 0 && (
          <section className="app-section" aria-labelledby="leaderboard-title">
            <h2 id="leaderboard-title">Top clippers</h2>
            <p className="app-muted">참여 크리에이터 평균 수익 {(totalEarned / Math.max(1, leaderboard.length)).toLocaleString('ko-KR')}원</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {leaderboard.map((entry) => (
                <div key={entry.creatorId} style={{ border: '1px solid #333', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 24 }}>{medal[entry.rank - 1] ?? `#${entry.rank}`}</p>
                  <p>{entry.creatorName}</p>
                  <p className="app-muted">{entry.totalAmount.toLocaleString('ko-KR')}원</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="app-section" aria-labelledby="views-title">
          <h2 id="views-title">{latestTotalViews.toLocaleString('ko-KR')} views</h2>
          <p className="app-muted">승인된 모든 클립의 조회수 누적 합계, 일별 추이.</p>
          <ViewsChart points={dailyViews} />
        </section>
      </div>
    </main>
  );
}
```

(파일: `apps/site/app/campaigns/[id]/page.tsx`. Next.js 15에서 `params`가 Promise이므로 `await params`로 받는다.)

- [ ] **Step 2: 조회수 차트 컴포넌트 작성**

```tsx
'use client';

export function ViewsChart({ points }: { points: { date: string; totalViews: number }[] }) {
  if (points.length === 0) return <p className="app-muted">아직 조회수 데이터가 없습니다.</p>;

  const width = 640;
  const height = 160;
  const maxViews = Math.max(...points.map((point) => point.totalViews), 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const pathPoints = points
    .map((point, index) => `${index * stepX},${height - (point.totalViews / maxViews) * height}`)
    .join(' ');

  return (
    <svg height={height} role="img" style={{ width: '100%', maxWidth: width }} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" points={pathPoints} stroke="var(--brand-primary)" strokeWidth={2} />
    </svg>
  );
}
```

(파일: `apps/site/app/campaigns/[id]/views-chart.tsx`. 외부 차트 라이브러리 없이 인라인 SVG로 최소 구현 — 라이브러리 추가는 이후 필요시 검토.)

- [ ] **Step 3: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/site --force`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/site/app/campaigns/
git commit -m "feat(site): add public campaign detail page with rate table, leaderboard, and views chart"
```

---

### Task 6: 브랜드 워크스페이스 — 배너 업로드 + 요구사항/참고자료 필드

**Files:**
- Modify: `apps/app/app/brand/brand-workspace.tsx`

- [ ] **Step 1: 상태 추가**

`title` state 아래에 추가:

```tsx
  const [contentRequirements, setContentRequirements] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
```

- [ ] **Step 2: 캠페인 생성 후 배너 업로드**

`createCampaign` 함수에서 `campaign_platform_rates` insert가 성공한 다음, `setTitle('');` 이전에 추가:

```tsx
      if (bannerFile) {
        const path = `${userId}/${(campaignRow as { id: string }).id}`;
        const { error: uploadError } = await supabase.storage.from('campaign-banners').upload(path, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('campaign-banners').getPublicUrl(path);
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({ cover_image_url: publicUrlData.publicUrl, content_requirements: contentRequirements.trim() || null, reference_url: referenceUrl.trim() || null })
          .eq('id', (campaignRow as { id: string }).id);
        if (updateError) throw updateError;
      } else if (contentRequirements.trim() || referenceUrl.trim()) {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({ content_requirements: contentRequirements.trim() || null, reference_url: referenceUrl.trim() || null })
          .eq('id', (campaignRow as { id: string }).id);
        if (updateError) throw updateError;
      }
```

- [ ] **Step 3: 폼 초기화에 새 필드 추가**

기존 `setTitle(''); setCategory(''); ...` 초기화 블록에 추가:

```tsx
      setContentRequirements('');
      setReferenceUrl('');
      setBannerFile(null);
```

- [ ] **Step 4: 폼 UI에 입력란 추가**

"검수 SLA (시간)" `<label>` 다음, 허용 플랫폼 블록 이전에 추가:

```tsx
            <label>
              배너 이미지
              <input
                accept="image/*"
                onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <label>
              콘텐츠 요구사항 (선택)
              <textarea onChange={(event) => setContentRequirements(event.target.value)} value={contentRequirements} />
            </label>
            <label>
              참고 자료 링크 (선택)
              <input onChange={(event) => setReferenceUrl(event.target.value)} type="url" value={referenceUrl} />
            </label>
```

- [ ] **Step 5: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add apps/app/app/brand/brand-workspace.tsx
git commit -m "feat(app): let brands upload a campaign banner and set requirements/reference link"
```

---

### Task 7: Top clips 섹션 + 전체 검증

**Files:**
- Modify: `apps/site/app/page.tsx`
- Modify: `apps/site/app/discover-sections.tsx`

- [ ] **Step 1: 디스커버리 페이지에서 승인 클립 + 최신 조회수 조회**

`apps/site/app/page.tsx`의 `loadCampaignCards` 함수 아래, `DiscoverPage` 함수 위에 추가:

```tsx
export type TopClip = {
  id: string;
  url: string;
  campaignTitle: string;
  viewCount: number;
};

async function loadTopClips(campaignIds: string[]): Promise<TopClip[]> {
  if (campaignIds.length === 0) return [];
  const supabase = getSupabaseServerClient();

  const { data: clips } = await supabase
    .from('clips')
    .select('id,url,campaign:campaigns!clips_campaign_id_fkey(title)')
    .eq('status', 'approved')
    .in('campaign_id', campaignIds);
  const clipRows = (clips ?? []) as unknown as { id: string; url: string; campaign: { title: string } | null }[];
  if (clipRows.length === 0) return [];

  const { data: snapshots } = await supabase
    .from('view_snapshots')
    .select('clip_id,view_count,captured_at')
    .in('clip_id', clipRows.map((clip) => clip.id))
    .order('captured_at', { ascending: false });
  const latestByClip = new Map<string, number>();
  for (const row of (snapshots ?? []) as { clip_id: string; view_count: number }[]) {
    if (!latestByClip.has(row.clip_id)) latestByClip.set(row.clip_id, Number(row.view_count));
  }

  return clipRows
    .map((clip) => ({ id: clip.id, url: clip.url, campaignTitle: clip.campaign?.title ?? '캠페인', viewCount: latestByClip.get(clip.id) ?? 0 }))
    .sort((left, right) => right.viewCount - left.viewCount)
    .slice(0, 12);
}
```

`DiscoverPage` 함수 안, `const campaigns = await loadCampaignCards();` 다음 줄에 추가:

```tsx
  const topClips = await loadTopClips(campaigns.map((campaign) => campaign.id));
```

`<DiscoverGrid campaigns={campaigns} />`를 `<DiscoverGrid campaigns={campaigns} topClips={topClips} />`로 교체.

- [ ] **Step 2: `DiscoverGrid`에 Top clips 섹션 추가**

`apps/site/app/discover-sections.tsx` 상단 import에 `import type { CampaignCard, TopClip } from './page';`로 교체(기존 `import type { CampaignCard } from './page';` 대체).

`extractYouTubeVideoId`를 쓰기 위해 import 줄 추가:

```tsx
import { extractYouTubeVideoId } from '@clipers/db';
```

컴포넌트 시그니처를 `export function DiscoverGrid({ campaigns, topClips }: { campaigns: CampaignCard[]; topClips: TopClip[] })`로 교체.

마지막 `</>` 직전(카드 그리드 섹션 다음)에 추가:

```tsx
      {topClips.length > 0 && (
        <section className="app-section" aria-labelledby="top-clips-title">
          <h2 id="top-clips-title">Top clips</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {topClips.map((clip) => {
              const videoId = extractYouTubeVideoId(clip.url);
              return (
                <a key={clip.id} href={clip.url} rel="noreferrer" target="_blank" style={{ flex: '0 0 160px' }}>
                  <div
                    style={{
                      height: 260,
                      borderRadius: 8,
                      background: videoId ? `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg) center/cover` : '#222',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 8,
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      {clip.viewCount.toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="app-muted" style={{ fontSize: 12, marginTop: 4 }}>{clip.campaignTitle}</p>
                </a>
              );
            })}
          </div>
        </section>
      )}
```

- [ ] **Step 3: 전체 빌드/테스트**

Run: `pnpm turbo run test build --force`
Expected: 전체 통과

- [ ] **Step 4: 커밋**

```bash
git add apps/site/app/page.tsx apps/site/app/discover-sections.tsx
git commit -m "feat(site): add top clips section to the discovery grid"
```

- [ ] **Step 5: `apps/site/.env.local` 준비 확인**

`apps/site/.env.local`이 없으면 생성해서 `apps/app/.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값을 그대로 복사(서비스 role 키나 다른 비밀값은 site에 절대 넣지 않는다 — anon key만).
