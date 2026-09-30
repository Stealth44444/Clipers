# 브랜드 셀프서브: 캠페인 생성 + 예산 입금 확인 루프 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브랜드가 직접 가입해서 캠페인을 만들고, 계좌이체로 예산을 입금하고, 운영자 확인을 거쳐 캠페인이 자동으로 라이브 전환되는 전체 루프를 구현한다.

**Architecture:** DB 트리거(SECURITY DEFINER)로 상태 전이(캠페인 생성 시 에스크로 행 자동 생성, 입금 확인 시 캠페인 자동 라이브 전환)를 처리하고, RLS로 브랜드가 건드릴 수 있는 필드/상태를 제한한다. UI는 기존 admin/creator workspace와 동일한 패턴(WorkspaceShell + 테이블 기반 폼)을 따른다.

**Tech Stack:** Next.js 15(App Router), Supabase(Postgres + RLS + Auth), TypeScript. 새 순수 계산 로직은 없음 — 상태 전이는 SQL 트리거로 처리.

**Spec:** `docs/superpowers/specs/2026-09-30-brand-self-serve-design.md`

**중요 — 마이그레이션 적용 방법:** 로컬 Supabase CLI는 이 환경에서 인증할 수 없다(자격증명 탐색이 자동 차단됨). 마이그레이션은 `mcp__claude_ai_Supabase__apply_migration` 도구로 프로젝트 `jkdpxcvbjowtbkgxlxga`("Cilpers")에 직접 적용한다. 이 도구는 파일명의 순번(`0008_...`)과 무관하게 적용 시점의 타임스탬프를 버전으로 기록하므로, 적용 후 `mcp__claude_ai_Supabase__list_migrations`로 실제 부여된 버전 문자열을 확인하고 로컬 파일명을 그 버전으로 맞춰 이름을 바꿔야 한다(Task 1의 마지막 스텝 참고 — 직전 세션에서 0005~0007에 동일한 절차를 이미 적용해둔 전례가 있음).

---

### Task 1: Supabase 마이그레이션 — 브랜드 역할, 에스크로 자동화, RLS

**Files:**
- Create: `supabase/migrations/0008_brand_self_serve.sql` (임시 파일명 — 적용 후 Step 6에서 실제 버전으로 리네임)

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- 1) 회원가입 시 역할 선택 허용 (브랜드/크리에이터만, admin은 화이트리스트에서 제외해 자가 승격 불가)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'requested_role';
  resolved_role public.user_role := 'creator';
begin
  if requested_role = 'brand' then
    resolved_role := 'brand';
  end if;

  insert into public.profiles (id, role, display_name)
  values (new.id, resolved_role, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

-- 2) campaigns RLS 강화: 기존 campaigns_brand_crud(모든 필드를 아무 때나 수정 가능)를
--    insert/update/select로 쪼개서 브랜드가 draft 상태에서만 자유 수정, draft->pending_escrow
--    전환만 가능하도록 제한. admin은 별도 정책으로 전체 접근 유지.
drop policy campaigns_brand_crud on campaigns;

create policy campaigns_select_own_or_admin on campaigns
  for select using (brand_id = auth.uid() or current_role_is('admin'));

create policy campaigns_brand_insert_own on campaigns
  for insert with check (
    brand_id = auth.uid()
    and track = 'self_serve'
    and status = 'draft'
    and current_role_is('brand')
  );

create policy campaigns_brand_update_own on campaigns
  for update using (brand_id = auth.uid() and status = 'draft')
  with check (brand_id = auth.uid() and status in ('draft', 'pending_escrow'));

create policy campaigns_admin_all on campaigns
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));

-- 3) 캠페인 생성 시 에스크로 행 자동 생성 (브랜드는 campaign_escrow에 직접 쓰지 않음)
create or replace function public.create_campaign_escrow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.campaign_escrow (campaign_id, escrow_status)
  values (new.id, 'awaiting_manual_confirm');
  return new;
end;
$$;

create trigger create_campaign_escrow
  after insert on campaigns
  for each row execute function public.create_campaign_escrow();

-- 4) 운영자가 입금 확인(escrow_status -> confirmed) 시 캠페인 자동 라이브 전환
create or replace function public.activate_campaign_on_escrow_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.escrow_status = 'confirmed' and old.escrow_status = 'awaiting_manual_confirm' then
    update public.campaigns
    set status = 'live'
    where id = new.campaign_id and status = 'pending_escrow';
  end if;
  return new;
end;
$$;

create trigger activate_campaign_on_escrow_confirmed
  after update on campaign_escrow
  for each row execute function public.activate_campaign_on_escrow_confirmed();

-- 5) 브랜드가 자기 캠페인의 정산 내역(예산 소진율 계산용)을 볼 수 있도록 허용
create policy settlements_brand_select on settlements
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
  );
```

(파일: `supabase/migrations/0008_brand_self_serve.sql`)

- [ ] **Step 2: 신규 트리거 함수도 보안 어드바이저 기준에 맞게 EXECUTE 권한 회수**

이전 세션에서 트리거 전용 함수는 `anon`/`authenticated`/`public`에서 EXECUTE를 회수해야 `/rest/v1/rpc/<fn>`로 직접 호출되지 않는다는 걸 확인했다(`20260930102022_security_hardening.sql`, `20260930102154_security_hardening_revoke_public.sql` 참고). 같은 파일 맨 끝에 추가:

```sql
revoke execute on function public.create_campaign_escrow() from public, anon, authenticated;
revoke execute on function public.activate_campaign_on_escrow_confirmed() from public, anon, authenticated;
```

- [ ] **Step 3: `mcp__claude_ai_Supabase__apply_migration` 도구로 적용**

`project_id: "jkdpxcvbjowtbkgxlxga"`, `name: "brand_self_serve"`, `query`: Step 1 + Step 2에서 작성한 SQL 전체(하나로 합쳐서).

Expected: `{"success": true}`

- [ ] **Step 4: 보안 어드바이저 재확인**

`mcp__claude_ai_Supabase__get_advisors`(`project_id: "jkdpxcvbjowtbkgxlxga"`, `type: "security"`) 호출.
Expected: `create_campaign_escrow`, `activate_campaign_on_escrow_confirmed`가 `anon_security_definer_function_executable`/`authenticated_security_definer_function_executable` 목록에 나타나지 않아야 함(이미 알려진 `current_role_is`의 `authenticated` 경고 1건은 의도된 것이므로 무시).

- [ ] **Step 5: 실제 부여된 버전 확인 후 로컬 파일명 정정**

`mcp__claude_ai_Supabase__list_migrations`(`project_id: "jkdpxcvbjowtbkgxlxga"`) 호출해서 `name: "brand_self_serve"`인 항목의 `version` 값을 확인(예: `20260930113000` 형태). 그 값으로 로컬 파일을 리네임:

```bash
mv supabase/migrations/0008_brand_self_serve.sql supabase/migrations/<확인된 version>_brand_self_serve.sql
```

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat(db): add brand self-serve campaign creation and escrow automation"
```

---

### Task 2: 로그인 화면 — 회원가입 시 역할 선택

**Files:**
- Modify: `apps/app/app/login/login-form.tsx`

- [ ] **Step 1: 역할 상태 추가 및 헤딩/설명 문구 역할별 분기**

`apps/app/app/login/login-form.tsx`의 `FormMode` 타입 아래에 역할 타입과 상태를 추가:

```tsx
type FormMode = 'sign-in' | 'sign-up';
type SignUpRole = 'creator' | 'brand';
```

`useState` 선언부(기존 `displayName` state 바로 아래)에 추가:

```tsx
  const [signUpRole, setSignUpRole] = useState<SignUpRole>('creator');
```

- [ ] **Step 2: 가입 처리 로직에 역할 반영**

`handleSubmit` 안의 `supabase.auth.signUp` 호출부를 다음으로 교체:

```tsx
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: displayName.trim(), requested_role: signUpRole },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/${signUpRole === 'brand' ? 'brand' : 'creator'}`,
          },
        });

        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('가입 확인 메일을 보냈습니다. 메일의 링크를 열어 가입을 완료해 주세요.');
          return;
        }
      } else {
```

- [ ] **Step 3: 폼에 역할 선택 라디오 추가**

이름 입력 필드(`{mode === 'sign-up' && (...)}`) 바로 아래에 추가:

```tsx
          {mode === 'sign-up' && (
            <div className="app-action-row" role="radiogroup" aria-label="가입 유형">
              <label>
                <input
                  checked={signUpRole === 'creator'}
                  onChange={() => setSignUpRole('creator')}
                  type="radio"
                  value="creator"
                />
                {' '}크리에이터로 가입
              </label>
              <label>
                <input
                  checked={signUpRole === 'brand'}
                  onChange={() => setSignUpRole('brand')}
                  type="radio"
                  value="brand"
                />
                {' '}브랜드로 가입
              </label>
            </div>
          )}
```

- [ ] **Step 4: 헤딩/설명 문구를 역할별로 분기**

```tsx
        <h1 id="auth-title">
          {mode === 'sign-in' ? '다시 오셨네요' : signUpRole === 'brand' ? '브랜드로 시작하기' : '크리에이터로 시작하기'}
        </h1>
        <p className="app-muted">
          {mode === 'sign-in'
            ? '계정에 로그인해 작업을 이어가세요.'
            : signUpRole === 'brand'
              ? '가입 후 캠페인을 개설할 수 있습니다.'
              : '가입 후 공개 캠페인에 지원할 수 있습니다.'}
        </p>
```

- [ ] **Step 5: 하단 전환 버튼 문구 단순화**

기존 `{mode === 'sign-in' ? '크리에이터 가입' : '로그인'}`을 `{mode === 'sign-in' ? '회원가입' : '로그인'}`으로 교체(역할 선택은 이제 폼 안에서 하므로).

- [ ] **Step 6: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 타입 에러 없이 성공

- [ ] **Step 7: 커밋**

```bash
git add apps/app/app/login/login-form.tsx
git commit -m "feat(app): let signup choose between creator and brand role"
```

---

### Task 3: WorkspaceShell에 브랜드 역할 추가

**Files:**
- Modify: `apps/app/app/workspace-shell.tsx`

- [ ] **Step 1: `WorkspaceRole` 타입과 내비게이션 항목 추가**

`type WorkspaceRole = 'admin' | 'creator';`를 `type WorkspaceRole = 'admin' | 'brand' | 'creator';`로 교체.

`workspaceNavigation` 객체에 `creator:` 항목 위에 다음을 추가:

```tsx
  brand: {
    title: '브랜드 워크스페이스',
    items: [
      { label: '캠페인 만들기', href: '#create-campaign-title' },
      { label: '내 캠페인', href: '#my-campaigns-title' },
    ],
  },
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공 (아직 `/brand`에서 `role="brand"`를 넘기는 곳이 없어도 타입 에러는 없어야 함)

- [ ] **Step 3: 커밋**

```bash
git add apps/app/app/workspace-shell.tsx
git commit -m "feat(app): add brand role to workspace shell navigation"
```

---

### Task 4: 브랜드 워크스페이스 — 캠페인 생성 + 입금 확인 + 캠페인 목록

**Files:**
- Create: `apps/app/app/brand/brand-workspace.tsx`
- Modify: `apps/app/app/brand/page.tsx`

- [ ] **Step 1: `brand-workspace.tsx` 작성**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import WorkspaceShell from '../workspace-shell';

type Campaign = {
  id: string;
  title: string;
  content_type: 'clipping' | 'ugc';
  category: string;
  total_budget: number | string;
  cpm_rate: number | string;
  per_clip_cap: number | string;
  review_sla_hours: number;
  allowed_platforms: string[];
  status: string;
};

type Settlement = {
  campaign_id: string;
  amount: number | string;
};

const PLATFORM_OPTIONS = [
  { value: 'youtube_shorts', label: '유튜브 쇼츠' },
  { value: 'tiktok', label: '틱톡' },
  { value: 'instagram_reels', label: '릴스' },
];

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: '입금 대기',
  pending_escrow: '입금 확인 중',
  live: '라이브',
  paused: '일시중지',
  closed: '마감',
};

function statusClass(status: string): string {
  if (status === 'live') return 'app-status app-status-positive';
  if (status === 'pending_escrow') return 'app-status app-status-requested';
  if (status === 'closed') return 'app-status app-status-neutral';
  return 'app-status app-status-neutral';
}

export default function BrandWorkspace() {
  const [userId, setUserId] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'clipping' | 'ugc'>('clipping');
  const [category, setCategory] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [cpmRate, setCpmRate] = useState('');
  const [perClipCap, setPerClipCap] = useState('');
  const [reviewSlaHours, setReviewSlaHours] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWorkspace() {
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setUserId('');
        return;
      }

      setUserId(userData.user.id);
      const [campaignResult, settlementResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id,title,content_type,category,total_budget,cpm_rate,per_clip_cap,review_sla_hours,allowed_platforms,status')
          .eq('brand_id', userData.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('settlements').select('campaign_id,amount'),
      ]);

      if (campaignResult.error) throw campaignResult.error;
      if (settlementResult.error) throw settlementResult.error;

      setCampaigns((campaignResult.data ?? []) as Campaign[]);
      setSettlements((settlementResult.data ?? []) as Settlement[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '캠페인 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  function togglePlatform(value: string) {
    setPlatforms((current) =>
      current.includes(value) ? current.filter((platform) => platform !== value) : [...current, value]
    );
  }

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (platforms.length === 0) throw new Error('허용 플랫폼을 하나 이상 선택해야 합니다.');

      const { error: insertError } = await getSupabaseBrowserClient().from('campaigns').insert({
        brand_id: userId,
        track: 'self_serve',
        title: title.trim(),
        content_type: contentType,
        category: category.trim(),
        total_budget: Number(totalBudget),
        cpm_rate: Number(cpmRate),
        per_clip_cap: Number(perClipCap),
        review_sla_hours: Number(reviewSlaHours),
        allowed_platforms: platforms,
        status: 'draft',
      });
      if (insertError) throw insertError;

      setTitle('');
      setCategory('');
      setTotalBudget('');
      setCpmRate('');
      setPerClipCap('');
      setReviewSlaHours('');
      setPlatforms([]);
      setMessage('캠페인을 생성했습니다. 아래 계좌이체 안내에 따라 입금 후 "입금 완료" 버튼을 눌러주세요.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '캠페인을 생성하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function markDeposited(campaignId: string) {
    setSubmitting(true);
    setError('');
    setMessage('');

    const { data, error: updateError } = await getSupabaseBrowserClient()
      .from('campaigns')
      .update({ status: 'pending_escrow' })
      .eq('id', campaignId)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (!data) {
      setError('상태가 변경되었습니다. 새로고침 후 확인하세요.');
    } else {
      setMessage('입금 확인 요청을 등록했습니다. 운영팀 확인 후 캠페인이 라이브로 전환됩니다.');
      await loadWorkspace();
    }
    setSubmitting(false);
  }

  const bankTransferInfo = process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO ?? '계좌 정보 미설정 — 운영팀에 문의하세요.';

  return (
    <WorkspaceShell role="brand">
      <div className="app-shell">
        <div className="app-heading">
          <p className="app-eyebrow">BRAND WORKSPACE</p>
          <h1>캠페인 만들기</h1>
          <p className="app-muted">캠페인을 만들고 예산을 입금하면 운영팀 확인 후 라이브로 전환됩니다.</p>
        </div>

        {message && <p className="app-notice" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}
        {!userId && !loading && <p className="app-muted">로그인이 필요합니다. <a href="/login">로그인으로 이동</a></p>}

        <section className="app-section" aria-labelledby="create-campaign-title">
          <h2 id="create-campaign-title">새 캠페인</h2>
          <form className="app-form" onSubmit={createCampaign}>
            <label>
              제목
              <input onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <label>
              콘텐츠 타입
              <select onChange={(event) => setContentType(event.target.value as 'clipping' | 'ugc')} value={contentType}>
                <option value="clipping">클리핑</option>
                <option value="ugc">UGC</option>
              </select>
            </label>
            <label>
              카테고리
              <input onChange={(event) => setCategory(event.target.value)} placeholder="예: 음악, 게임" required value={category} />
            </label>
            <label>
              총예산 (원)
              <input min={1} onChange={(event) => setTotalBudget(event.target.value)} required type="number" value={totalBudget} />
            </label>
            <label>
              CPM (1,000뷰당 원)
              <input min={1} onChange={(event) => setCpmRate(event.target.value)} required type="number" value={cpmRate} />
            </label>
            <label>
              클립당 지급 상한 (원)
              <input min={1} onChange={(event) => setPerClipCap(event.target.value)} required type="number" value={perClipCap} />
            </label>
            <label>
              검수 SLA (시간)
              <input min={1} onChange={(event) => setReviewSlaHours(event.target.value)} required type="number" value={reviewSlaHours} />
            </label>
            <div>
              <p className="app-muted" style={{ marginBottom: 8 }}>허용 플랫폼</p>
              <div className="app-action-row">
                {PLATFORM_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={platforms.includes(option.value)}
                      onChange={() => togglePlatform(option.value)}
                      type="checkbox"
                    />
                    {' '}{option.label}
                  </label>
                ))}
              </div>
            </div>
            <button className="app-button app-button-primary" disabled={submitting || !userId} type="submit">
              캠페인 만들기
            </button>
          </form>
        </section>

        <section className="app-section" aria-labelledby="my-campaigns-title">
          <h2 id="my-campaigns-title">내 캠페인 <span className="app-muted">{campaigns.length}</span></h2>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead><tr><th>제목</th><th>예산</th><th>상태</th><th>처리</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const consumed = settlements
                    .filter((settlement) => settlement.campaign_id === campaign.id)
                    .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
                  return (
                    <tr key={campaign.id}>
                      <td>{campaign.title}</td>
                      <td>
                        {campaign.status === 'live' || campaign.status === 'closed'
                          ? `${consumed.toLocaleString('ko-KR')}원 / ${Number(campaign.total_budget).toLocaleString('ko-KR')}원`
                          : `${Number(campaign.total_budget).toLocaleString('ko-KR')}원`}
                      </td>
                      <td className={statusClass(campaign.status)}>{CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}</td>
                      <td>
                        {campaign.status === 'draft' ? (
                          <div className="app-action-row">
                            <span className="app-muted">{bankTransferInfo}</span>
                            <button className="app-button" disabled={submitting} onClick={() => void markDeposited(campaign.id)} type="button">
                              입금 완료했습니다
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && campaigns.length === 0 && <tr><td colSpan={4}>아직 만든 캠페인이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
```

(파일: `apps/app/app/brand/brand-workspace.tsx`)

- [ ] **Step 2: `brand/page.tsx`를 워크스페이스로 교체**

```tsx
import BrandWorkspace from './brand-workspace';

export default function BrandHomePage() {
  return <BrandWorkspace />;
}
```

(파일: `apps/app/app/brand/page.tsx`)

- [ ] **Step 3: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 타입 에러 없이 성공, `/brand` 라우트가 정적/동적 페이지 목록에 표시됨

- [ ] **Step 4: 커밋**

```bash
git add apps/app/app/brand/
git commit -m "feat(app): add brand campaign creation and deposit confirmation workspace"
```

---

### Task 5: 운영자 화면 — 입금 확인 액션 추가

**Files:**
- Modify: `apps/app/app/admin/admin-workspace.tsx`

- [ ] **Step 1: 캠페인 현황 쿼리에 `pending_escrow` 포함, 브랜드 정보 추가**

`admin-workspace.tsx`에서 캠페인 조회 부분을:

```tsx
        supabase
          .from('campaigns')
          .select('id,title,status,total_budget')
          .in('status', ['live', 'closed'])
          .order('created_at', { ascending: false }),
```

다음으로 교체:

```tsx
        supabase
          .from('campaigns')
          .select('id,title,status,total_budget,brand:profiles!campaigns_brand_id_fkey(display_name)')
          .in('status', ['pending_escrow', 'live', 'closed'])
          .order('created_at', { ascending: false }),
```

- [ ] **Step 2: 타입 업데이트**

`CampaignForOverview`와 `CampaignOverview` 타입을 다음으로 교체:

```tsx
type CampaignForOverview = {
  id: string;
  title: string;
  status: string;
  total_budget: number | string;
  brand: { display_name: string } | null;
};

type CampaignOverview = {
  id: string;
  title: string;
  status: string;
  totalBudget: number;
  consumedAmount: number;
  brandName: string;
};
```

`campaignsForOverview.map(...)`으로 `setCampaignOverviews`를 채우는 부분에 `brandName: campaign.brand?.display_name ?? '브랜드'`를 추가.

- [ ] **Step 3: 입금 확인 핸들러 추가**

`resolveDisputeAction` 함수 정의 다음에 추가:

```tsx
  async function confirmEscrow(campaignId: string) {
    setUpdatingId(campaignId);
    setError('');
    setMessage('');

    const { data, error: updateError } = await getSupabaseBrowserClient()
      .from('campaign_escrow')
      .update({ escrow_status: 'confirmed', confirmed_by: userId, confirmed_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('escrow_status', 'awaiting_manual_confirm')
      .select('campaign_id')
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
    } else if (!data) {
      setError('이미 처리되었거나 대기 중인 입금이 아닙니다.');
    } else {
      setMessage('입금을 확인하고 캠페인을 라이브로 전환했습니다.');
      await loadQueue();
    }
    setUpdatingId('');
  }
```

- [ ] **Step 4: 캠페인 현황 테이블에 브랜드/처리 열 추가**

"캠페인 현황" 섹션의 `<thead>`를 `<thead><tr><th>캠페인</th><th>브랜드</th><th>상태</th><th>예산 소진</th><th>소진율</th><th>처리</th></tr></thead>`로 교체.

`<tbody>` 내부의 `campaignOverviews.map(...)` 블록을 다음으로 교체:

```tsx
                {campaignOverviews.map((campaign) => {
                  const rate = campaign.totalBudget > 0 ? Math.min(1, campaign.consumedAmount / campaign.totalBudget) : 0;
                  return (
                    <tr key={campaign.id}>
                      <td>{campaign.title}</td>
                      <td>{campaign.brandName}</td>
                      <td className={
                        campaign.status === 'closed' ? 'app-status app-status-neutral'
                        : campaign.status === 'pending_escrow' ? 'app-status app-status-requested'
                        : 'app-status app-status-positive'
                      }>
                        {campaign.status === 'closed' ? '마감' : campaign.status === 'pending_escrow' ? '입금 확인 대기' : '진행 중'}
                      </td>
                      <td>{campaign.consumedAmount.toLocaleString('ko-KR')}원 / {campaign.totalBudget.toLocaleString('ko-KR')}원</td>
                      <td>
                        {campaign.status === 'pending_escrow' ? '—' : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 120, height: 6, borderRadius: 3, background: '#333', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.round(rate * 100)}%`, height: '100%', background: 'var(--brand-primary)' }} />
                            </div>
                            <span className="app-muted">{Math.round(rate * 100)}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {campaign.status === 'pending_escrow' ? (
                          <button className="app-button app-button-primary" disabled={updatingId === campaign.id} onClick={() => void confirmEscrow(campaign.id)} type="button">
                            입금 확인
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {!loading && campaignOverviews.length === 0 && <tr><td colSpan={6}>진행 중이거나 마감된 캠페인이 없습니다.</td></tr>}
```

(기존 `colSpan={4}`이던 빈 상태 행도 `colSpan={6}`으로 함께 바뀐다.)

- [ ] **Step 5: 빌드 확인**

Run: `pnpm turbo run build --filter=@clipers/app --force`
Expected: 성공

- [ ] **Step 6: 커밋**

```bash
git add apps/app/app/admin/admin-workspace.tsx
git commit -m "feat(app): let admins confirm brand campaign deposits"
```

---

### Task 6: 계좌이체 안내 환경변수

**Files:**
- Modify: `.env.example`
- Modify: `apps/app/.env.local`

- [ ] **Step 1: 템플릿에 추가**

`.env.example`에 추가:

```
NEXT_PUBLIC_BANK_TRANSFER_INFO=
```

- [ ] **Step 2: 로컬 개발용 placeholder 값 추가**

`apps/app/.env.local`에 추가(실제 계좌번호는 운영팀이 나중에 교체):

```
NEXT_PUBLIC_BANK_TRANSFER_INFO=계좌 정보 준비 중 - 운영팀에 문의
```

- [ ] **Step 3: 커밋 (`.env.example`만 — `.env.local`은 gitignore 대상)**

```bash
git add .env.example
git commit -m "chore(app): document bank transfer info env var"
```

---

### Task 7: 전체 동작 확인

- [ ] **Step 1: 전체 빌드/테스트**

Run: `pnpm turbo run test build --force`
Expected: 전체 패키지 테스트 통과 + 빌드 성공

- [ ] **Step 2: 수동 시나리오 점검 체크리스트 작성**

다음 흐름이 막히는 지점 없이 이어지는지 코드 상으로 재확인(실제 브라우저 조작은 사용자 또는 `run` 스킬로 별도 확인):
1. `/login`에서 "브랜드로 가입" 선택 후 가입 → `/brand`로 리다이렉트
2. `/brand`에서 캠페인 생성 → "내 캠페인"에 `입금 대기` 상태로 표시
3. "입금 완료했습니다" 클릭 → 상태가 `입금 확인 중`으로 변경
4. `/admin`의 "캠페인 현황"에 해당 캠페인이 `입금 확인 대기`로 표시되고 "입금 확인" 버튼이 보임
5. "입금 확인" 클릭 → 캠페인이 `진행 중`(live)으로 바뀜
6. `/creator`의 "지원 가능한 캠페인" 목록에 해당 캠페인이 나타남(기존 `campaigns_creator_select_self_serve` 정책이 `track='self_serve' and status='live'`를 이미 조회 허용하므로 추가 작업 불필요)

- [ ] **Step 3: 최종 커밋 (필요 시 정리 커밋)**

앞선 태스크들에서 이미 커밋했다면 이 단계는 생략.
