# 클립 부정 방지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캠페인 공개 이후·인증한 내 계정에 올린 영상만 인정하고, 삭제·비공개 영상은 그 주부터 정산에서 빼고, 온보딩에서 만 19세 이상을 확인한다.

**Architecture:** 설계 `docs/superpowers/specs/2026-10-03-clip-fraud-guards-design.md`. 판단 로직(계정 주소 정규화, 인증 코드, 유튜브 영상 판정, 사라진 영상 찾기, 정산 제외, 온보딩 통과 조건, 슬랙 문구)은 `@clipers/db`의 순수 함수로 두고 Vitest로 검사한다. DB는 마이그레이션 하나(`live_at`, `creator_channels`, 클립 칸, 연령 확인, 유튜브 직접 insert 차단). 앱은 서버 액션(서비스 키)으로 유튜브 제출과 계정 인증을 하고, 운영자 화면은 기존처럼 브라우저 클라이언트 + 운영자 RLS로 처리한다.

**Tech Stack:** Supabase(Postgres, RLS, 트리거), Next.js 15 App Router 서버 액션(`apps/app`), YouTube Data API v3(`videos.list`, `channels.list`), Vitest.

**작업 규칙:** 같은 작업 트리를 다른 세션이 함께 쓴다. 커밋은 항상 `git commit -m … -- <이 작업의 파일들>`로 자기 파일만 담는다. push하지 않는다(사용자가 요청할 때만). 명령은 저장소 루트(`C:/Users/Sony/Desktop/clipers`) 기준. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**배포 순서 주의:** Task 1의 마이그레이션을 운영 DB에 적용하면, 앱이 배포되기 전까지 운영 앱의 유튜브 클립 제출과 온보딩 완료가 실패한다(정책이 유튜브 직접 insert를 막고, `complete_onboarding` 시그니처가 바뀐다). 지금은 출시 전 잠금 상태라 괜찮지만, 이 계획을 마친 뒤 push(=배포)를 미루지 않도록 사용자에게 알린다.

---

## File map

| 파일 | 역할 |
|---|---|
| `supabase/migrations/20261003140000_clip_fraud_guards.sql` | `live_at`, `creator_channels`, 클립 칸, 연령 확인, 정책·트리거 |
| `packages/db/src/channels.ts` (+test) | 계정 주소 정규화, 인증 코드 생성·포함 판정 |
| `packages/db/src/services/youtubeVideo.ts` (+test) | 영상 정보·채널 조회, 제출 판정과 문구 |
| `packages/db/src/services/youtubeViews.ts` (+test) | 공개 상태 함께 받기, 사라진 영상 찾기 |
| `packages/db/src/services/settlement.ts` (+test), `weeklySettlementRun.ts` | `unavailableAt` 제외 |
| `packages/db/src/services/slackNotifier.ts` (+test) | 삭제·비공개 알림 문구 |
| `packages/db/src/onboarding.ts` (+test) | 연령 확인 |
| `packages/db/src/index.ts` | 새 모듈 export |
| `apps/app/app/onboarding/onboarding-flow.tsx` | 세 번째 필수 스위치 |
| `apps/app/app/creator/settings/channel-actions.ts`, `channels-card.tsx`, `page.tsx` | 내 채널 |
| `apps/app/app/creator/campaigns/submit-clip-action.ts`, `submit-clip-dialog.tsx` | 유튜브 서버 제출 |
| `apps/app/app/admin/channels/page.tsx`, `review-actions.tsx`, `workspace-shell.tsx`, `admin/layout.tsx`, `lib/admin-data.ts` | 계정 인증 화면 |
| `apps/app/app/admin/clips/page.tsx`, `admin/campaigns/[id]/page.tsx`, `lib/status.ts` | 검수 확인 항목, 정산 멈춤 표시·해제 |
| `apps/app/app/api/cron/youtube-views/route.ts` | 삭제·비공개 감지 |
| `apps/app/app/creator/submissions/page.tsx`, `submissions-view.tsx` | 정산 멈춤 안내 |
| `apps/app/content/legal/terms.md`, `privacy.md`, `docs/legal/README.md` | 🔸 초안 |
| `apps/site/lib/creator-faq.ts` (+test) | 제출 가능한 영상 FAQ |

---

### Task 1: 마이그레이션

**Files:**
- Create: `supabase/migrations/20261003140000_clip_fraud_guards.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- Clip fraud guards (docs/superpowers/specs/2026-10-03-clip-fraud-guards-design.md): when a campaign went live,
-- accounts creators proved they own, what the server confirmed about a YouTube video, when a video stopped being
-- public, and the adult confirmation at onboarding.

-- 1) When a campaign first went live. Videos posted before it don't count.
alter table public.campaigns add column live_at timestamptz;
-- Campaigns that were live before this column existed: their creation time (existing clips are grandfathered).
update public.campaigns set live_at = created_at where status in ('live', 'paused', 'closed') and live_at is null;
-- campaigns uses per-column read grants (brand_cpm and total_budget are hidden); signed-in users may read live_at.
grant select (live_at) on public.campaigns to authenticated;

create or replace function public.stamp_campaign_live_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'live' and new.live_at is null then
    new.live_at := now();
  end if;
  return new;
end;
$$;

create trigger stamp_campaign_live_at
  before insert or update of status on public.campaigns
  for each row execute function public.stamp_campaign_live_at();

-- 2) Accounts a creator proved they own. The app server (service key) adds and auto-verifies; admins verify the rest.
create table public.creator_channels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube_shorts', 'tiktok', 'instagram_reels', 'facebook', 'x', 'naver_clip', 'kakao_shorts')),
  url text not null check (char_length(url) <= 500),
  external_id text,
  verification_code text not null check (verification_code ~ '^CLIPERS-[A-Z2-9]{5}$'),
  verified_at timestamptz,
  verified_by text check (verified_by in ('auto', 'admin')),
  created_at timestamptz not null default now(),
  unique (creator_id, platform, url),
  check ((verified_at is null) = (verified_by is null))
);

-- One account can be verified by one person only (YouTube by channel id, others by normalized url).
create unique index creator_channels_verified_account_unique
  on public.creator_channels (platform, coalesce(external_id, url))
  where verified_at is not null;
create index creator_channels_creator_idx on public.creator_channels (creator_id);

alter table public.creator_channels enable row level security;
revoke all on public.creator_channels from anon;

create policy creator_channels_select_own_or_admin on public.creator_channels
  for select to authenticated
  using (creator_id = (select auth.uid()) or public.current_role_is('admin'));
create policy creator_channels_admin_update on public.creator_channels
  for update to authenticated
  using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));
create policy creator_channels_admin_delete on public.creator_channels
  for delete to authenticated
  using (public.current_role_is('admin'));

-- 3) Clip facts. video_* are what the server read from YouTube at submission; unavailable_* mark a video that was
-- deleted or made private ('missing': an API key can't tell the two apart), unlisted, or marked by an operator.
alter table public.clips
  add column video_published_at timestamptz,
  add column video_channel_id text,
  add column unavailable_at timestamptz,
  add column unavailable_reason text check (unavailable_reason in ('missing', 'unlisted', 'manual')),
  add constraint clips_unavailable_pair check ((unavailable_at is null) = (unavailable_reason is null));

-- YouTube clips go through the app server, which checks the video first. Creators insert other platforms directly.
drop policy clips_creator_insert_own on public.clips;
create policy clips_creator_insert_own on public.clips
  for insert with check (
    creator_id = auth.uid()
    and platform <> 'youtube_shorts'
    and status = 'pending_review'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
    and public.current_role_is('creator')
    and exists (
      select 1
      from public.campaigns c
      join public.campaign_applications ca on ca.campaign_id = c.id
      where c.id = clips.campaign_id
        and c.status = 'live'
        and clips.platform = any (c.allowed_platforms)
        and ca.creator_id = auth.uid()
        and ca.status = 'approved'
    )
  );

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
  -- The app server inserts YouTube clips with the service key after checking the signed-in user itself.
  from_server boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
begin
  if not from_server and new.creator_id is distinct from auth.uid() then
    raise exception 'A clip can only be submitted for the current user';
  end if;

  if not from_server then
    new.video_published_at := null;
    new.video_channel_id := null;
  end if;
  new.unavailable_at := null;
  new.unavailable_reason := null;

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

  -- Every platform needs a verified account before its clips are accepted (pending verification is not enough).
  if not exists (
    select 1 from creator_channels ch
    where ch.creator_id = new.creator_id and ch.platform = new.platform and ch.verified_at is not null
  ) then
    raise exception 'account_not_verified';
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

-- 4) Adult confirmation, recorded once at onboarding.
alter table public.profiles add column adult_confirmed_at timestamptz;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
    or public.current_role_is('admin')
    or current_setting('clipers.profile_guard_bypass', true) = 'on' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only an admin can change profile roles';
  end if;

  if new.onboarding_completed_at is distinct from old.onboarding_completed_at
    or new.terms_agreed_at is distinct from old.terms_agreed_at
    or new.adult_confirmed_at is distinct from old.adult_confirmed_at then
    raise exception 'Onboarding is completed through complete_onboarding()';
  end if;

  return new;
end;
$$;

drop trigger prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before update of role, onboarding_completed_at, terms_agreed_at, adult_confirmed_at on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- New signature (one more argument): drop the old one so PostgREST never has two to choose from.
drop function public.complete_onboarding(public.user_role, text[], text, text, text);

create function public.complete_onboarding(
  p_role public.user_role,
  p_interests text[] default '{}',
  p_on_camera text default null,
  p_experience_level text default null,
  p_heard_from text default null,
  p_adult_confirmed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles;
begin
  select * into current_profile from public.profiles where id = auth.uid() for update;

  if current_profile.id is null then
    raise exception 'Not signed in';
  end if;
  if current_profile.onboarding_completed_at is not null then
    raise exception 'Onboarding is already completed';
  end if;
  if current_profile.role = 'admin' or p_role not in ('creator', 'brand') then
    raise exception 'Onboarding can only choose the creator or brand role';
  end if;
  if p_adult_confirmed is not true then
    raise exception 'Only adults (19 or older) can use Clipers';
  end if;
  if p_role = 'creator'
    and (coalesce(cardinality(p_interests), 0) < 1 or p_on_camera is null or p_experience_level is null) then
    raise exception 'Creators must answer every onboarding question';
  end if;
  if p_heard_from is not null
    and p_heard_from not in ('search', 'youtube_shortform', 'instagram_tiktok', 'friend_creator', 'community_blog', 'press', 'other') then
    raise exception 'Unknown heard_from answer';
  end if;

  perform set_config('clipers.profile_guard_bypass', 'on', true);

  update public.profiles
  set role = p_role,
      interests = case when p_role = 'creator' then coalesce(p_interests, '{}') else '{}' end,
      on_camera = case when p_role = 'creator' then p_on_camera end,
      experience_level = case when p_role = 'creator' then p_experience_level end,
      terms_agreed_at = now(),
      adult_confirmed_at = now(),
      onboarding_completed_at = now()
  where id = current_profile.id;

  perform set_config('clipers.profile_guard_bypass', 'off', true);

  -- Accounts from before this table exists have no row yet.
  insert into public.signup_attributions (user_id, heard_from, heard_from_at)
  values (current_profile.id, p_heard_from, case when p_heard_from is not null then now() end)
  on conflict (user_id) do update
    set heard_from = excluded.heard_from,
        heard_from_at = excluded.heard_from_at;
end;
$$;

revoke execute on function public.complete_onboarding(public.user_role, text[], text, text, text, boolean) from public, anon;
grant execute on function public.complete_onboarding(public.user_role, text[], text, text, text, boolean) to authenticated;
```

- [ ] **Step 2: 운영 DB에 적용**

Supabase MCP `apply_migration` (project `jkdpxcvbjowtbkgxlxga`, name `clip_fraud_guards`, query = 위 파일 전체). 거절되면 사용자에게 SQL 편집기 실행을 요청한다.

- [ ] **Step 3: 실제 DB에서 확인**

`execute_sql`로 아래를 실행한다.

```sql
select
  (select count(*) from campaigns where status in ('live','paused','closed') and live_at is null) as live_without_live_at,
  (select count(*) from pg_trigger where tgname = 'stamp_campaign_live_at') as live_at_trigger,
  (select with_check like '%youtube_shorts%' from pg_policies where policyname = 'clips_creator_insert_own') as youtube_blocked,
  (select prosrc like '%service_role%' and prosrc like '%account_not_verified%' from pg_proc where proname = 'prepare_clip_submission') as server_path,
  (select pg_get_function_identity_arguments(oid) from pg_proc where proname = 'complete_onboarding') as onboarding_args,
  (select relrowsecurity from pg_class where relname = 'creator_channels') as channels_rls;
```

Expected: `live_without_live_at = 0`, `live_at_trigger = 1`, `youtube_blocked = true`, `server_path = true`, `onboarding_args`가 `…, p_adult_confirmed boolean`으로 끝남, `channels_rls = true`.

그리고 트리거 동작을 롤백되는 블록에서 확인한다(초안 캠페인 하나를 `live`로 바꾼 뒤 일부러 오류를 내서 되돌린다).

```sql
do $$
declare
  target uuid;
  stamped timestamptz;
begin
  select id into target from campaigns where status = 'draft' limit 1;
  if target is null then raise exception 'no draft campaign to test'; end if;
  update campaigns set status = 'live' where id = target;
  select live_at into stamped from campaigns where id = target;
  raise exception 'rollback: live_at=%', stamped;
end;
$$;
```

Expected: 오류 메시지 `rollback: live_at=<지금 시각>`(변경은 오류로 롤백된다). 다른 트리거(`require_billing_before_deposit`)가 먼저 막으면 그 오류가 나오는데, 그때는 `select prosrc from pg_proc where proname = 'stamp_campaign_live_at'`로 함수 본문만 확인하고 넘어간다.

- [ ] **Step 4: 보안 경고 확인**

`get_advisors`(type `security`)를 실행해 `creator_channels`, `stamp_campaign_live_at` 관련 새 경고가 없는지 본다. `function_search_path_mutable`이 나오면 해당 함수에 `set search_path`가 빠진 것이니 고친다.

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(db): clip fraud guards — campaign live_at, creator_channels, clip video facts and availability, adult confirmation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- supabase/migrations/20261003140000_clip_fraud_guards.sql
```

(새 파일이므로 먼저 `git add supabase/migrations/20261003140000_clip_fraud_guards.sql`.)

---

### Task 2: 계정 주소 정규화와 인증 코드

**Files:**
- Create: `packages/db/src/channels.ts`
- Create: `packages/db/src/channels.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/db/src/channels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { descriptionHasCode, newVerificationCode, parseChannelUrl } from './channels';

describe('parseChannelUrl', () => {
  it.each([
    ['https://www.youtube.com/@Clipers_KR', 'https://www.youtube.com/@clipers_kr', { handle: '@clipers_kr' }],
    ['https://m.youtube.com/@clipers_kr/shorts', 'https://www.youtube.com/@clipers_kr', { handle: '@clipers_kr' }],
    ['https://youtube.com/@%ED%81%B4%EB%A6%AC%ED%8D%BC%EC%8A%A4', 'https://www.youtube.com/@클리퍼스', { handle: '@클리퍼스' }],
    [
      'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
      'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
      { channelId: 'UCabcdefghijklmnopqrstuv' },
    ],
  ])('normalizes the YouTube channel %s', (input, url, youtube) => {
    expect(parseChannelUrl('youtube_shorts', input)).toEqual({ url, youtube });
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/c/legacyname',
    'http://www.youtube.com/@clipers_kr',
    'https://youtube.com.evil.example/@clipers_kr',
    'not a url',
  ])('rejects %s as a YouTube channel', (input) => {
    expect(parseChannelUrl('youtube_shorts', input)).toBeNull();
  });

  it('normalizes other platforms to one url per account', () => {
    expect(parseChannelUrl('tiktok', 'https://www.tiktok.com/@Clipers/?lang=ko')).toEqual({ url: 'https://tiktok.com/@clipers', youtube: null });
    expect(parseChannelUrl('x', 'https://twitter.com/Clipers')).toEqual({ url: 'https://x.com/clipers', youtube: null });
    expect(parseChannelUrl('instagram_reels', 'https://instagram.com/clipers/')).toEqual({ url: 'https://instagram.com/clipers', youtube: null });
  });

  it('keeps the path case where the platform may care', () => {
    expect(parseChannelUrl('naver_clip', 'https://clip.naver.com/Abc123')).toEqual({ url: 'https://clip.naver.com/Abc123', youtube: null });
  });

  it('rejects a url from the wrong platform or without an account path', () => {
    expect(parseChannelUrl('tiktok', 'https://instagram.com/clipers')).toBeNull();
    expect(parseChannelUrl('instagram_reels', 'https://instagram.com/')).toBeNull();
    expect(parseChannelUrl('unknown', 'https://example.com/clipers')).toBeNull();
  });
});

describe('newVerificationCode', () => {
  it('builds CLIPERS- plus five unambiguous characters', () => {
    expect(newVerificationCode(() => 0)).toBe('CLIPERS-AAAAA');
    expect(newVerificationCode()).toMatch(/^CLIPERS-[A-HJKMNP-Z2-9]{5}$/);
  });
});

describe('descriptionHasCode', () => {
  it('finds the code anywhere in the text, ignoring case', () => {
    expect(descriptionHasCode('채널 소개\nclipers-7k3q9 입니다', 'CLIPERS-7K3Q9')).toBe(true);
    expect(descriptionHasCode('CLIPERS-7K3Q8', 'CLIPERS-7K3Q9')).toBe(false);
    expect(descriptionHasCode(null, 'CLIPERS-7K3Q9')).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/channels.test.ts`
Expected: FAIL (`Failed to resolve import "./channels"`)

- [ ] **Step 3: 구현**

`packages/db/src/channels.ts`:

```ts
// Accounts creators register to prove they own them (creator_channels). Each account reduces to one url, so the
// database can let only one person verify it; the creator proves ownership by putting a code in its description.

export type YouTubeChannelRef = { handle: string } | { channelId: string };
export type ParsedChannelUrl = { url: string; youtube: YouTubeChannelRef | null };

// Profile hosts per platform (subdomains allowed). twitter.com is stored as x.com.
const PLATFORM_HOSTS: Record<string, string[]> = {
  tiktok: ['tiktok.com'],
  instagram_reels: ['instagram.com'],
  facebook: ['facebook.com'],
  x: ['x.com', 'twitter.com'],
  naver_clip: ['naver.com'],
  kakao_shorts: ['kakao.com'],
};
// Usernames on these are case-insensitive, so one account has one stored url.
const CASE_INSENSITIVE = new Set(['tiktok', 'instagram_reels', 'facebook', 'x']);

const HANDLE = /^@[\p{L}\p{N}._-]{3,30}$/u;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The account url to store for `platform`, or null when `input` isn't a profile on that platform. */
export function parseChannelUrl(platform: string, input: string): ParsedChannelUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);

  if (platform === 'youtube_shorts') {
    if (host !== 'youtube.com') return null;
    const first = segments[0] ? decode(segments[0]) : null;
    if (first && HANDLE.test(first)) {
      const handle = first.toLowerCase();
      return { url: `https://www.youtube.com/${handle}`, youtube: { handle } };
    }
    if (first === 'channel' && segments[1] && CHANNEL_ID.test(segments[1])) {
      return { url: `https://www.youtube.com/channel/${segments[1]}`, youtube: { channelId: segments[1] } };
    }
    return null;
  }

  const hosts = PLATFORM_HOSTS[platform];
  if (!hosts?.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;
  if (segments.length === 0) return null;
  const path = `/${segments.join('/')}`;
  return {
    url: `https://${host === 'twitter.com' ? 'x.com' : host}${CASE_INSENSITIVE.has(platform) ? path.toLowerCase() : path}`,
    youtube: null,
  };
}

// No 0/O, 1/I/L: the code is read off a screen and typed into a channel description.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function secureRandomInt(max: number): number {
  const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1));
  return value % max;
}

export function newVerificationCode(randomInt: (max: number) => number = secureRandomInt): string {
  let code = '';
  for (let index = 0; index < 5; index += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `CLIPERS-${code}`;
}

export function descriptionHasCode(text: string | null | undefined, code: string): boolean {
  return !!text && text.toUpperCase().includes(code.toUpperCase());
}
```

`packages/db/src/index.ts`에서 `export * from './platforms';` 다음 줄에 추가:

```ts
export * from './channels';
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/channels.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/channels.ts packages/db/src/channels.test.ts
git commit -m "feat(db): normalize creator account urls and verification codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/channels.ts packages/db/src/channels.test.ts packages/db/src/index.ts
```

---

### Task 3: 유튜브 영상·채널 조회와 제출 판정

**Files:**
- Create: `packages/db/src/services/youtubeVideo.ts`
- Create: `packages/db/src/services/youtubeVideo.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/db/src/services/youtubeVideo.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  evaluateYouTubeSubmission,
  fetchYouTubeChannel,
  fetchYouTubeVideoInfo,
  YOUTUBE_SUBMISSION_MESSAGES,
  type YouTubeVideoInfo,
} from './youtubeVideo';

const VIDEO_ID = 'dQw4w9WgXcQ';
const CHANNEL_ID = 'UCabcdefghijklmnopqrstuv';

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('fetchYouTubeVideoInfo', () => {
  it('reads the channel, publish time and privacy of one video', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [{ id: VIDEO_ID, snippet: { channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z' }, status: { privacyStatus: 'public' } }] })
    );
    const result = await fetchYouTubeVideoInfo(VIDEO_ID, 'key', fetcher);
    expect(result).toEqual({ ok: true, data: { videoId: VIDEO_ID, channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z', privacyStatus: 'public' } });
    const requested = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requested.searchParams.get('part')).toBe('snippet,status');
    expect(requested.searchParams.get('id')).toBe(VIDEO_ID);
  });

  it('returns null when YouTube does not return the video (deleted or private)', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ items: [] }));
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', fetcher)).toEqual({ ok: true, data: null });
  });

  it('fails without a key, on HTTP errors and on network errors', async () => {
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, ' ', vi.fn<typeof fetch>())).toMatchObject({ ok: false, code: 'MISSING_API_KEY' });
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', vi.fn<typeof fetch>().mockResolvedValue(response({}, 403)))).toMatchObject({ ok: false, code: 'YOUTUBE_API_ERROR' });
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', vi.fn<typeof fetch>().mockRejectedValue(new Error('down')))).toMatchObject({ ok: false, code: 'YOUTUBE_REQUEST_FAILED' });
  });
});

describe('fetchYouTubeChannel', () => {
  it('looks a handle up with forHandle and returns its id and description', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ items: [{ id: CHANNEL_ID, snippet: { description: 'CLIPERS-7K3Q9' } }] }));
    const result = await fetchYouTubeChannel({ handle: '@clipers_kr' }, 'key', fetcher);
    expect(result).toEqual({ ok: true, data: { channelId: CHANNEL_ID, description: 'CLIPERS-7K3Q9' } });
    const requested = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requested.pathname).toBe('/youtube/v3/channels');
    expect(requested.searchParams.get('forHandle')).toBe('@clipers_kr');
  });

  it('looks a channel id up with id, and returns null when there is no such channel', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({}));
    expect(await fetchYouTubeChannel({ channelId: CHANNEL_ID }, 'key', fetcher)).toEqual({ ok: true, data: null });
    expect(new URL(fetcher.mock.calls[0][0] as URL).searchParams.get('id')).toBe(CHANNEL_ID);
  });
});

describe('evaluateYouTubeSubmission', () => {
  const video: YouTubeVideoInfo = { videoId: VIDEO_ID, channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z', privacyStatus: 'public' };
  const rules = { verifiedChannelIds: [CHANNEL_ID], liveAt: '2026-10-04T00:00:00Z' };

  it('accepts a public video from a verified channel posted after the campaign went live', () => {
    expect(evaluateYouTubeSubmission(video, rules)).toBeNull();
  });

  it('names the first rule a video breaks', () => {
    expect(evaluateYouTubeSubmission(null, rules)).toBe('not_found');
    expect(evaluateYouTubeSubmission({ ...video, privacyStatus: 'unlisted' }, rules)).toBe('not_public');
    expect(evaluateYouTubeSubmission(video, { ...rules, verifiedChannelIds: [] })).toBe('channel_not_verified');
    expect(evaluateYouTubeSubmission({ ...video, publishedAt: '2026-10-03T23:59:59Z' }, rules)).toBe('published_before_live');
  });

  it('has a message for every rejection', () => {
    expect(Object.keys(YOUTUBE_SUBMISSION_MESSAGES).sort()).toEqual(['channel_not_verified', 'not_found', 'not_public', 'published_before_live']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/youtubeVideo.test.ts`
Expected: FAIL (`Failed to resolve import "./youtubeVideo"`)

- [ ] **Step 3: 구현**

`packages/db/src/services/youtubeVideo.ts`:

```ts
import type { YouTubeChannelRef } from '../channels';
import { err, ok, type ServiceResult } from './errors';

// What a YouTube clip must be at submission: public, from a channel the creator verified, posted after the
// campaign went live. The app server reads the video here before it saves the clip.

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export type YouTubeVideoInfo = { videoId: string; channelId: string; publishedAt: string; privacyStatus: string };
export type YouTubeChannelInfo = { channelId: string; description: string };

type VideosResponse = {
  items?: Array<{ id?: string; snippet?: { channelId?: string; publishedAt?: string }; status?: { privacyStatus?: string } }>;
};
type ChannelsResponse = { items?: Array<{ id?: string; snippet?: { description?: string } }> };

async function getJson<T>(path: string, params: Record<string, string>, apiKey: string, fetcher: typeof fetch): Promise<ServiceResult<T>> {
  if (!apiKey.trim()) return err('MISSING_API_KEY', 'YouTube Data API 키가 설정되지 않았습니다.');
  const endpoint = new URL(`${API_BASE}/${path}`);
  endpoint.search = new URLSearchParams({ ...params, key: apiKey }).toString();
  try {
    const response = await fetcher(endpoint, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return err('YOUTUBE_API_ERROR', `YouTube Data API 요청이 HTTP ${response.status}로 실패했습니다.`);
    return ok((await response.json()) as T);
  } catch {
    return err('YOUTUBE_REQUEST_FAILED', 'YouTube Data API에 연결하지 못했습니다.');
  }
}

/** One video's channel, publish time and privacy; null when YouTube doesn't return it (deleted or private). */
export async function fetchYouTubeVideoInfo(videoId: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<YouTubeVideoInfo | null>> {
  const result = await getJson<VideosResponse>('videos', { part: 'snippet,status', id: videoId }, apiKey, fetcher);
  if (!result.ok) return result;
  const item = result.data.items?.find((entry) => entry.id === videoId);
  if (!item) return ok(null);
  const channelId = item.snippet?.channelId;
  const publishedAt = item.snippet?.publishedAt;
  const privacyStatus = item.status?.privacyStatus;
  if (!channelId || !publishedAt || !privacyStatus) return err('INVALID_VIDEO_INFO', 'YouTube API가 영상 정보를 온전히 돌려주지 않았습니다.');
  return ok({ videoId, channelId, publishedAt, privacyStatus });
}

/** A channel's id and description, found by handle or id; null when there is no such channel. */
export async function fetchYouTubeChannel(ref: YouTubeChannelRef, apiKey: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<YouTubeChannelInfo | null>> {
  const lookup = 'handle' in ref ? { forHandle: ref.handle } : { id: ref.channelId };
  const result = await getJson<ChannelsResponse>('channels', { part: 'snippet', ...lookup }, apiKey, fetcher);
  if (!result.ok) return result;
  const item = result.data.items?.[0];
  if (!item?.id) return ok(null);
  return ok({ channelId: item.id, description: item.snippet?.description ?? '' });
}

export type YouTubeSubmissionRejection = 'not_found' | 'not_public' | 'channel_not_verified' | 'published_before_live';

/** The first rule the video breaks, or null when it can be submitted. */
export function evaluateYouTubeSubmission(
  video: YouTubeVideoInfo | null,
  rules: { verifiedChannelIds: readonly string[]; liveAt: string }
): YouTubeSubmissionRejection | null {
  if (!video) return 'not_found';
  if (video.privacyStatus !== 'public') return 'not_public';
  if (!rules.verifiedChannelIds.includes(video.channelId)) return 'channel_not_verified';
  if (Date.parse(video.publishedAt) < Date.parse(rules.liveAt)) return 'published_before_live';
  return null;
}

export const YOUTUBE_SUBMISSION_MESSAGES: Record<YouTubeSubmissionRejection, string> = {
  not_found: '영상을 찾을 수 없어요. 링크와 공개 상태를 확인해 주세요.',
  not_public: '공개 상태인 영상만 제출할 수 있어요.',
  channel_not_verified: "설정의 '내 채널'에서 인증한 채널의 영상만 제출할 수 있어요.",
  published_before_live: '캠페인이 공개된 뒤에 올린 영상만 제출할 수 있어요.',
};
```

`packages/db/src/index.ts`에서 `export * from './services/youtubeViews';` 다음 줄에 추가:

```ts
export * from './services/youtubeVideo';
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/youtubeVideo.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/services/youtubeVideo.ts packages/db/src/services/youtubeVideo.test.ts
git commit -m "feat(db): read a YouTube video and channel, and judge a submission against the campaign rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/services/youtubeVideo.ts packages/db/src/services/youtubeVideo.test.ts packages/db/src/index.ts
```

---

### Task 4: 조회수 수집이 공개 상태도 받고, 사라진 영상을 찾는다

**Files:**
- Modify: `packages/db/src/services/youtubeViews.ts`
- Modify: `packages/db/src/services/youtubeViews.test.ts`

- [ ] **Step 1: 테스트 수정·추가**

`youtubeViews.test.ts`의 import를 바꾼다:

```ts
import { extractYouTubeVideoId, fetchYouTubeViewCount, fetchYouTubeViewCounts, findUnavailableClips } from './youtubeViews';
```

`'requests statistics for the parsed video id'` 테스트를 아래로 바꾼다:

```ts
  it('requests statistics and status for the parsed video id', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [{ id: VIDEO_ID, statistics: { viewCount: '12500' }, status: { privacyStatus: 'public' } }] })
    );

    const result = await fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', fetcher);

    expect(result).toEqual({ ok: true, data: { videoId: VIDEO_ID, viewCount: 12500, privacyStatus: 'public' } });
    const requestedUrl = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requestedUrl.pathname).toBe('/youtube/v3/videos');
    expect(requestedUrl.searchParams.get('part')).toBe('statistics,status');
    expect(requestedUrl.searchParams.get('id')).toBe(VIDEO_ID);
  });
```

파일 끝에 추가:

```ts
describe('findUnavailableClips', () => {
  const clips = [
    { id: 'clip-public', videoId: 'aaaaaaaaaaa' },
    { id: 'clip-unlisted', videoId: 'bbbbbbbbbbb' },
    { id: 'clip-gone', videoId: 'ccccccccccc' },
  ];

  it('marks videos YouTube no longer returns as missing and unlisted ones as unlisted', () => {
    expect(
      findUnavailableClips(clips, [
        { videoId: 'aaaaaaaaaaa', viewCount: 10, privacyStatus: 'public' },
        { videoId: 'bbbbbbbbbbb', viewCount: 10, privacyStatus: 'unlisted' },
      ])
    ).toEqual([
      { clipId: 'clip-unlisted', reason: 'unlisted' },
      { clipId: 'clip-gone', reason: 'missing' },
    ]);
  });

  it('leaves a video alone when YouTube did not say its privacy', () => {
    expect(findUnavailableClips([clips[0]], [{ videoId: 'aaaaaaaaaaa', viewCount: 10, privacyStatus: null }])).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/youtubeViews.test.ts`
Expected: FAIL (`findUnavailableClips is not a function`, part가 `statistics`)

- [ ] **Step 3: 구현**

`youtubeViews.ts`에서:

1. 타입을 바꾼다:

```ts
export type YouTubeViewCount = {
  videoId: string;
  viewCount: number;
  /** 'public', 'unlisted' (private videos are not returned to an API key); null when YouTube left it out. */
  privacyStatus: string | null;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    statistics?: {
      viewCount?: string;
    };
    status?: {
      privacyStatus?: string;
    };
  }>;
};
```

2. `fetchYouTubeViewCounts` 안에서 `const viewCounts = new Map<string, number>();`를
`const viewCounts = new Map<string, YouTubeViewCount>();`로, `part: 'statistics',`를 `part: 'statistics,status',`로, `viewCounts.set(item.id, viewCount);`를
`viewCounts.set(item.id, { videoId: item.id, viewCount, privacyStatus: item.status?.privacyStatus ?? null });`로 바꾸고, 마지막 return을 바꾼다:

```ts
  return ok([...viewCounts.values()]);
```

3. 파일 끝에 추가:

```ts
export type UnavailableReason = 'missing' | 'unlisted' | 'manual';

/**
 * Clips whose video stopped being public: YouTube no longer returns it (deleted or made private — an API key
 * can't tell which) or returns it as unlisted. Only call this with a successful response for every clip's video.
 */
export function findUnavailableClips(
  clips: ReadonlyArray<{ id: string; videoId: string }>,
  counts: readonly YouTubeViewCount[]
): Array<{ clipId: string; reason: Exclude<UnavailableReason, 'manual'> }> {
  const byVideo = new Map(counts.map((count) => [count.videoId, count]));
  return clips.flatMap((clip) => {
    const found = byVideo.get(clip.videoId);
    if (!found) return [{ clipId: clip.id, reason: 'missing' as const }];
    if (found.privacyStatus === 'unlisted') return [{ clipId: clip.id, reason: 'unlisted' as const }];
    return [];
  });
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/youtubeViews.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(db): view collection reads privacy status and finds videos that stopped being public

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/services/youtubeViews.ts packages/db/src/services/youtubeViews.test.ts
```

---

### Task 5: 정산이 멈춘 클립을 그 주부터 뺀다

**Files:**
- Modify: `packages/db/src/services/settlement.ts`
- Modify: `packages/db/src/services/settlement.test.ts`
- Modify: `packages/db/src/services/weeklySettlementRun.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`settlement.test.ts`의 `describe('calculateWeeklySettlementDrafts', …)` 블록 안 마지막에 추가(블록 이름이 다르면 `calculateWeeklySettlementDrafts`를 부르는 블록 안에 둔다):

```ts
  it('stops paying a clip from the week its video was found missing or not public', () => {
    // PERIOD is the Korea-time week 2026-09-21 ~ 2026-09-28 (2026-09-20T15:00Z ~ 2026-09-27T15:00Z).
    expect(calculateWeeklySettlementDrafts([createInput({ unavailableAt: '2026-09-25T00:00:00.000Z' })], PERIOD)).toEqual([]);
    expect(calculateWeeklySettlementDrafts([createInput({ unavailableAt: '2026-09-01T00:00:00.000Z' })], PERIOD)).toEqual([]);
  });

  it('still pays the weeks before the video was found missing', () => {
    expect(calculateWeeklySettlementDrafts([createInput({ unavailableAt: '2026-09-28T00:00:00.000Z' })], PERIOD)).toEqual(
      calculateWeeklySettlementDrafts([createInput()], PERIOD)
    );
    expect(calculateWeeklySettlementDrafts([createInput()], PERIOD)).toHaveLength(1);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/settlement.test.ts`
Expected: FAIL (첫 테스트가 초안 1건을 받음; 타입 오류는 vitest가 무시)

- [ ] **Step 3: 구현**

`settlement.ts`의 `WeeklySettlementInput`에서 `snapshots` 줄 앞에 추가:

```ts
  /** When the video was found deleted, private or unlisted (clips.unavailable_at); not paid from that week on. */
  unavailableAt?: string | null;
```

`calculateWeeklySettlementDrafts`에서 `if (!Number.isFinite(reviewedAt) || reviewedAt >= periodEnd) continue;` 다음 줄에 추가:

```ts
      // A video that stopped being public is not paid from the week it was found that way (already paid weeks stay).
      if (input.unavailableAt && Date.parse(input.unavailableAt) < periodEnd) continue;
```

`weeklySettlementRun.ts`에서:

`ApprovedClip` 타입에 `reviewed_at: string | null;` 다음 줄로 추가:

```ts
  unavailable_at: string | null;
```

클립 조회의 `.select('id, campaign_id, creator_id, platform, reviewed_at')`를 `.select('id, campaign_id, creator_id, platform, reviewed_at, unavailable_at')`로 바꾸고, 입력을 만드는 곳에서 `reviewedAt: clip.reviewed_at,` 다음 줄에 추가:

```ts
        unavailableAt: clip.unavailable_at,
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db test`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(db): settlements skip a clip from the week its video stopped being public

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/services/settlement.ts packages/db/src/services/settlement.test.ts packages/db/src/services/weeklySettlementRun.ts
```

---

### Task 6: 삭제·비공개 슬랙 알림 문구

**Files:**
- Modify: `packages/db/src/services/slackNotifier.ts`
- Modify: `packages/db/src/services/slackNotifier.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`slackNotifier.test.ts`의 import에 `buildUnavailableClipsSlackMessage`를 더하고, 파일 끝에 추가:

```ts
describe('buildUnavailableClipsSlackMessage', () => {
  it('lists each clip with why its settlement stopped', () => {
    expect(
      buildUnavailableClipsSlackMessage([
        { campaignTitle: '신곡 챌린지', creatorName: '민지', url: 'https://youtu.be/aaaaaaaaaaa', reason: 'missing' },
        { campaignTitle: '신곡 챌린지', creatorName: '하늘', url: 'https://youtu.be/bbbbbbbbbbb', reason: 'unlisted' },
      ])
    ).toBe(
      ':no_entry: 정산을 멈춘 클립 2건\n' +
        '• [신곡 챌린지] 민지 — 삭제·비공개 https://youtu.be/aaaaaaaaaaa\n' +
        '• [신곡 챌린지] 하늘 — 일부 공개 https://youtu.be/bbbbbbbbbbb'
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/slackNotifier.test.ts`
Expected: FAIL (`buildUnavailableClipsSlackMessage is not a function`)

- [ ] **Step 3: 구현**

`slackNotifier.ts`의 `buildEscalationSlackMessage` 다음에 추가:

```ts
export type UnavailableClipSummary = {
  campaignTitle: string;
  creatorName: string;
  url: string;
  reason: 'missing' | 'unlisted' | 'manual';
};

export const UNAVAILABLE_REASON_LABEL: Record<UnavailableClipSummary['reason'], string> = {
  missing: '삭제·비공개',
  unlisted: '일부 공개',
  manual: '운영자 표시',
};

export function buildUnavailableClipsSlackMessage(clips: UnavailableClipSummary[]): string {
  const lines = clips.map((clip) => `• [${clip.campaignTitle}] ${clip.creatorName} — ${UNAVAILABLE_REASON_LABEL[clip.reason]} ${clip.url}`);
  return `:no_entry: 정산을 멈춘 클립 ${clips.length}건\n${lines.join('\n')}`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/services/slackNotifier.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(db): Slack message for clips whose settlement stopped

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/services/slackNotifier.ts packages/db/src/services/slackNotifier.test.ts
```

---

### Task 7: 온보딩 만 19세 확인

**Files:**
- Modify: `packages/db/src/onboarding.ts`
- Modify: `packages/db/src/onboarding.test.ts`
- Modify: `apps/app/app/onboarding/onboarding-flow.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`onboarding.test.ts`의 `completeCreator`에 `privacyAgreed: true,` 다음 줄로 `adultConfirmed: true,`를 넣고, `'needs both consents on the terms step'` 테스트를 아래로 바꾼다:

```ts
  it('needs both consents and the adult confirmation on the terms step', () => {
    expect(canContinueOnboarding('terms', { ...completeCreator, privacyAgreed: false })).toBe(false);
    expect(canContinueOnboarding('terms', { ...completeCreator, adultConfirmed: false })).toBe(false);
    expect(canContinueOnboarding('terms', completeCreator)).toBe(true);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/db exec vitest run src/onboarding.test.ts`
Expected: FAIL (`adultConfirmed: false`인데 true를 돌려줌)

- [ ] **Step 3: 구현**

`onboarding.ts`:

`OnboardingAnswers`의 `privacyAgreed: boolean;` 다음에:

```ts
  /** "만 19세 이상이에요" — Clipers is for adults only (terms art. 5). */
  adultConfirmed: boolean;
```

`emptyOnboardingAnswers`를:

```ts
export function emptyOnboardingAnswers(): OnboardingAnswers {
  return {
    role: null,
    interests: [],
    onCamera: null,
    experienceLevel: null,
    heardFrom: null,
    termsAgreed: false,
    privacyAgreed: false,
    adultConfirmed: false,
  };
}
```

`canContinueOnboarding`의 `case 'terms':`를:

```ts
    case 'terms':
      return answers.termsAgreed && answers.privacyAgreed && answers.adultConfirmed;
```

`onboarding-flow.tsx`:

lucide import 목록에 `UserCheck`를 알파벳 순서로 더한다(`Shield, UserCheck, Wallet`).

`complete_onboarding` 호출 인자에 `p_heard_from: answers.heardFrom,` 다음 줄로:

```ts
      p_adult_confirmed: answers.adultConfirmed,
```

약관 단계의 두 번째 `ListRow`(개인정보) 다음, `</List>` 앞에:

```tsx
              <ListRow
                description="Clipers는 만 19세 이상만 이용할 수 있어요."
                icon={<UserCheck {...ICON} />}
                title="만 19세 이상이에요 (필수)"
                trailing={<Switch checked={answers.adultConfirmed} label="만 19세 이상 확인" onChange={(adultConfirmed) => update({ adultConfirmed })} />}
              />
```

- [ ] **Step 4: 통과·타입 확인**

Run: `pnpm --filter @clipers/db test` → PASS
Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음 (`OnboardingAnswers`를 직접 만드는 다른 곳이 있으면 여기서 드러나니 `adultConfirmed: false`를 더한다)

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(onboarding): required adult confirmation for creators and brands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- packages/db/src/onboarding.ts packages/db/src/onboarding.test.ts apps/app/app/onboarding/onboarding-flow.tsx
```

---

### Task 8: 크리에이터 설정 "내 채널"

**Files:**
- Create: `apps/app/app/creator/settings/channel-actions.ts`
- Create: `apps/app/app/creator/settings/channels-card.tsx`
- Modify: `apps/app/app/creator/settings/page.tsx`

- [ ] **Step 1: 서버 액션 작성**

`apps/app/app/creator/settings/channel-actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { descriptionHasCode, fetchYouTubeChannel, newVerificationCode, parseChannelUrl, PLATFORMS } from '@clipers/db';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// creator_channels is written only here (service key) and by operators, so a creator can't mark an account verified.

export type ChannelActionState = { ok: boolean; message: string } | null;

async function signedInCreatorId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'creator' ? user.id : null;
}

/** Registers an account and gives it a code to put in the channel description or profile bio. */
export async function addChannel(_previous: ChannelActionState, form: FormData): Promise<ChannelActionState> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };

  const platform = String(form.get('platform') ?? '');
  if (!PLATFORMS.some((item) => item.value === platform)) return { ok: false, message: '플랫폼을 골라 주세요.' };
  const parsed = parseChannelUrl(platform, String(form.get('url') ?? ''));
  if (!parsed) {
    return {
      ok: false,
      message:
        platform === 'youtube_shorts'
          ? '채널 주소를 확인해 주세요. youtube.com/@핸들 또는 youtube.com/channel/UC… 형식이에요.'
          : '계정 주소를 확인해 주세요. 내 프로필 페이지 주소를 붙여 넣으면 돼요.',
    };
  }

  const { error } = await getSupabaseAdminClient()
    .from('creator_channels')
    .insert({ creator_id: creatorId, platform, url: parsed.url, verification_code: newVerificationCode() });
  if (error) return { ok: false, message: error.code === '23505' ? '이미 등록한 계정이에요.' : '등록하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  revalidatePath('/creator/settings');
  return { ok: true, message: '등록했어요. 아래 안내대로 인증 코드를 넣어 주세요.' };
}

/** Checks the YouTube channel description for the code and marks the channel verified. */
export async function verifyYouTubeChannel(channelRowId: string): Promise<{ ok: boolean; message: string }> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };

  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from('creator_channels')
    .select('id, platform, url, verification_code, verified_at')
    .eq('id', channelRowId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (!row || row.platform !== 'youtube_shorts') return { ok: false, message: '채널을 찾을 수 없어요.' };
  if (row.verified_at) return { ok: true, message: '이미 인증된 채널이에요.' };

  const ref = parseChannelUrl('youtube_shorts', row.url)?.youtube;
  if (!ref) return { ok: false, message: '채널 주소를 확인해 주세요.' };
  const channel = await fetchYouTubeChannel(ref, process.env.YOUTUBE_DATA_API_KEY ?? '');
  if (!channel.ok) return { ok: false, message: '지금은 유튜브 채널을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.' };
  if (!channel.data) return { ok: false, message: '채널을 찾을 수 없어요. 주소를 확인해 주세요.' };
  if (!descriptionHasCode(channel.data.description, row.verification_code)) {
    return { ok: false, message: '채널 설명에서 코드를 찾지 못했어요. 설명을 저장했는지 확인한 뒤 다시 눌러 주세요.' };
  }

  const { error } = await admin
    .from('creator_channels')
    .update({ external_id: channel.data.channelId, verified_at: new Date().toISOString(), verified_by: 'auto' })
    .eq('id', row.id)
    .is('verified_at', null);
  if (error) {
    return {
      ok: false,
      message: error.code === '23505' ? '이 채널은 이미 다른 계정에서 인증했어요. 운영팀에 문의해 주세요.' : '인증하지 못했어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  revalidatePath('/creator/settings');
  return { ok: true, message: '채널을 인증했어요.' };
}

/** Removes an account that isn't verified yet; a verified one is released only by the operations team. */
export async function removeChannel(channelRowId: string): Promise<{ ok: boolean; message: string }> {
  const creatorId = await signedInCreatorId();
  if (!creatorId) return { ok: false, message: '다시 로그인해 주세요.' };
  const { error } = await getSupabaseAdminClient()
    .from('creator_channels')
    .delete()
    .eq('id', channelRowId)
    .eq('creator_id', creatorId)
    .is('verified_at', null);
  if (error) return { ok: false, message: '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  revalidatePath('/creator/settings');
  return { ok: true, message: '삭제했어요.' };
}
```

- [ ] **Step 2: 카드 작성**

`apps/app/app/creator/settings/channels-card.tsx`:

```tsx
'use client';

import { useActionState, useState, useTransition } from 'react';
import { PLATFORMS, platformLabel } from '@clipers/db';
import { Badge, Button, Card, Field, Input, Select } from '@clipers/ui';
import { addChannel, removeChannel, verifyYouTubeChannel, type ChannelActionState } from './channel-actions';

export type CreatorChannel = { id: string; platform: string; url: string; verificationCode: string; verifiedAt: string | null };

/** Accounts the creator posts clips from. Only clips from a verified account are accepted. */
export default function ChannelsCard({ channels }: { channels: CreatorChannel[] }) {
  const [state, formAction, pending] = useActionState<ChannelActionState, FormData>(addChannel, null);
  const [platform, setPlatform] = useState('');

  return (
    <Card
      description="클립을 올리는 계정을 등록하고 인증해 주세요. 인증한 계정이 있는 플랫폼만 클립을 제출할 수 있고, 캠페인 공개 이후 올린 영상만 정산돼요."
      id="channels"
      title="내 채널"
    >
      {channels.length > 0 && (
        <ul className="cl-channel-list">
          {channels.map((channel) => (
            <ChannelRow channel={channel} key={channel.id} />
          ))}
        </ul>
      )}
      <form action={formAction} className="cl-auth__form">
        <div className="cl-form-row">
          <Field htmlFor="channel-platform" label="플랫폼">
            <Select id="channel-platform" name="platform" onChange={(event) => setPlatform(event.target.value)} required value={platform}>
              <option value="">플랫폼 선택</option>
              {PLATFORMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            hint={platform === 'youtube_shorts' ? 'youtube.com/@핸들 주소를 붙여 넣어 주세요.' : '내 프로필 페이지 주소를 붙여 넣어 주세요.'}
            htmlFor="channel-url"
            label="계정 주소"
          >
            <Input id="channel-url" name="url" placeholder="https://" required type="url" />
          </Field>
        </div>
        {state && (
          <p className={state.ok ? 'cl-alert cl-tone-brand' : 'cl-alert cl-tone-tomato'} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </p>
        )}
        <div className="cl-inline">
          <Button disabled={pending} type="submit" variant="secondary">
            {pending ? '등록 중…' : '계정 등록'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ChannelRow({ channel }: { channel: CreatorChannel }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [working, startWorking] = useTransition();
  const youtube = channel.platform === 'youtube_shorts';

  function run(action: (id: string) => Promise<{ ok: boolean; message: string }>) {
    startWorking(async () => {
      const result = await action(channel.id);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <li className="cl-channel">
      <div className="cl-inline">
        <Badge tone={channel.verifiedAt ? 'brand' : 'amber'}>
          {channel.verifiedAt ? '인증됨' : youtube ? '코드 확인 필요' : '운영팀 확인 대기'}
        </Badge>
        <span>{platformLabel(channel.platform)}</span>
        <a className="cl-link" href={channel.url} rel="noreferrer" target="_blank">
          {channel.url.replace(/^https:\/\//, '')}
        </a>
      </div>
      {!channel.verifiedAt && (
        <>
          <p className="cl-meta">
            {youtube ? '채널 설명' : '프로필 소개'}에 <code>{channel.verificationCode}</code>를 넣고 저장해 주세요.{' '}
            {youtube ? "저장한 뒤 '인증 확인'을 누르면 바로 인증돼요." : '운영팀이 확인하면 인증돼요.'} 인증이 끝나면 코드는 지워도 돼요.
          </p>
          <div className="cl-inline">
            {youtube && (
              <Button disabled={working} onClick={() => run(verifyYouTubeChannel)} size="sm" variant="primary">
                {working ? '확인 중…' : '인증 확인'}
              </Button>
            )}
            <Button disabled={working} onClick={() => run(removeChannel)} size="sm" variant="secondary">
              삭제
            </Button>
          </div>
        </>
      )}
      {message && (
        <p className={message.ok ? 'cl-meta' : 'cl-alert cl-tone-tomato'} role={message.ok ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}
    </li>
  );
}
```

`cl-channel-list`, `cl-channel` 스타일은 `apps/app/app/globals.css` 끝에 추가한다(기존 토큰만 쓴다; 토큰 이름은 파일 안의 `--cl-` 변수를 확인해 맞춘다):

```css
.cl-channel-list { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 12px; }
.cl-channel { display: grid; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--cl-border); }
.cl-channel:last-child { border-bottom: 0; padding-bottom: 0; }
.cl-channel code { font-family: var(--cl-font-mono, ui-monospace, monospace); font-weight: 600; }
```

- [ ] **Step 3: 설정 페이지에 붙이기**

`apps/app/app/creator/settings/page.tsx`:

```tsx
import { Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import ChannelsCard from './channels-card';
import PayoutDetailsCard from './payout-details-card';
import SettingsForm from './settings-form';

export default async function CreatorSettingsPage() {
  const { supabase, user, profile } = await getSession();
  const [{ data: account }, { data: channels }] = await Promise.all([
    supabase.from('payout_accounts').select('legal_name, bank_code, account_number, updated_at').eq('creator_id', user.id).maybeSingle(),
    supabase.from('creator_channels').select('id, platform, url, verification_code, verified_at').eq('creator_id', user.id).order('created_at'),
  ]);

  return (
    <Page>
      <PageHeader description="프로필과 관심 분야를 바꾸면 추천 캠페인에 반영돼요." title="설정" />
      <Stack>
        <SettingsForm email={user.email ?? ''} profile={profile} />
        <ChannelsCard
          channels={(channels ?? []).map((channel) => ({
            id: channel.id,
            platform: channel.platform,
            url: channel.url,
            verificationCode: channel.verification_code,
            verifiedAt: channel.verified_at,
          }))}
        />
        <PayoutDetailsCard
          account={
            account
              ? { legalName: account.legal_name, bankCode: account.bank_code, accountNumber: account.account_number, updatedAt: account.updated_at }
              : null
          }
        />
      </Stack>
    </Page>
  );
}
```

- [ ] **Step 4: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/app/app/creator/settings/channel-actions.ts apps/app/app/creator/settings/channels-card.tsx
git commit -m "feat(creator): register and verify the accounts clips are posted from

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/creator/settings/channel-actions.ts apps/app/app/creator/settings/channels-card.tsx apps/app/app/creator/settings/page.tsx apps/app/app/globals.css
```

(`globals.css`를 다른 세션이 고치고 있으면 `git diff apps/app/app/globals.css`로 내 변경만 있는지 먼저 확인한다. 섞여 있으면 `git add -p` 대신 그 파일을 빼고 커밋한 뒤 사용자에게 알린다.)

---

### Task 9: 유튜브 클립은 서버에서 확인하고 저장

**Files:**
- Create: `apps/app/app/creator/campaigns/submit-clip-action.ts`
- Modify: `apps/app/app/creator/campaigns/submit-clip-dialog.tsx`

- [ ] **Step 1: 서버 액션 작성**

`apps/app/app/creator/campaigns/submit-clip-action.ts`:

```ts
'use server';

import { evaluateYouTubeSubmission, extractYouTubeVideoId, fetchYouTubeVideoInfo, YOUTUBE_SUBMISSION_MESSAGES } from '@clipers/db';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type SubmitClipFailure = 'duplicate' | 'daily_limit' | 'account_not_verified' | 'other';
export type SubmitClipResult = { ok: true } | { ok: false; reason: SubmitClipFailure; message: string };

const failure = (reason: SubmitClipFailure, message = ''): SubmitClipResult => ({ ok: false, reason, message });

/**
 * YouTube clips are read from YouTube before they're saved: public, from a channel the creator verified, posted
 * after the campaign went live. Creators can't insert YouTube clips directly (clips_creator_insert_own).
 */
export async function submitYouTubeClip(campaignId: string, rawUrl: string): Promise<SubmitClipResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure('other', '다시 로그인해 주세요.');

  const url = rawUrl.trim();
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return failure('other', '유튜브 영상 링크를 확인해 주세요.');

  const admin = getSupabaseAdminClient();
  const [{ data: campaign }, { data: channels }] = await Promise.all([
    admin.from('campaigns').select('live_at').eq('id', campaignId).eq('status', 'live').maybeSingle(),
    admin.from('creator_channels').select('external_id').eq('creator_id', user.id).eq('platform', 'youtube_shorts').not('verified_at', 'is', null),
  ]);
  if (!campaign?.live_at) return failure('other', '지금은 이 캠페인에 제출할 수 없어요.');

  const video = await fetchYouTubeVideoInfo(videoId, process.env.YOUTUBE_DATA_API_KEY ?? '');
  if (!video.ok) return failure('other', '지금은 유튜브 영상을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.');
  const rejection = evaluateYouTubeSubmission(video.data, {
    verifiedChannelIds: (channels ?? []).flatMap((channel) => (channel.external_id ? [channel.external_id] : [])),
    liveAt: campaign.live_at,
  });
  if (rejection || !video.data) return failure('other', YOUTUBE_SUBMISSION_MESSAGES[rejection ?? 'not_found']);

  // The insert trigger still checks the approved application, the platform and the daily limit.
  const { error } = await admin.from('clips').insert({
    campaign_id: campaignId,
    creator_id: user.id,
    platform: 'youtube_shorts',
    url,
    video_published_at: video.data.publishedAt,
    video_channel_id: video.data.channelId,
  });
  if (error) {
    if (error.code === '23505') return failure('duplicate');
    if (error.message.includes('daily_clip_limit_reached')) return failure('daily_limit');
    if (error.message.includes('account_not_verified')) return failure('account_not_verified');
    return failure('other');
  }
  return { ok: true };
}
```

- [ ] **Step 2: 대화상자 바꾸기**

`submit-clip-dialog.tsx`:

import에 추가:

```ts
import { submitYouTubeClip, type SubmitClipFailure } from './submit-clip-action';
```

`submit` 함수를 아래로 바꾼다:

```tsx
  function failureMessage(reason: SubmitClipFailure, message: string): string {
    if (reason === 'duplicate') return '이미 제출된 영상이에요. 같은 영상은 한 번만 제출할 수 있어요.';
    if (reason === 'daily_limit') return `오늘은 이 캠페인에 영상을 ${dailyLimit ?? ''}개까지 올릴 수 있어요. 내일 다시 올려 주세요.`;
    if (reason === 'account_not_verified') return "설정의 '내 채널'에서 이 플랫폼 계정을 인증한 뒤 제출할 수 있어요. 운영팀 확인을 기다리는 계정은 아직 쓸 수 없어요.";
    return message || '제출하지 못했어요. 링크와 플랫폼을 확인한 뒤 다시 시도해 주세요.';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    let result: { ok: true } | { ok: false; reason: SubmitClipFailure; message: string };
    if (platform === 'youtube_shorts') {
      result = await submitYouTubeClip(campaignId, url);
    } else {
      const { error: insertError } = await getSupabaseBrowserClient()
        .from('clips')
        .insert({ campaign_id: campaignId, creator_id: creatorId, platform, url: url.trim() });
      // 23505: clips_video_key_active_unique — this video is already submitted (here or in another campaign).
      result = !insertError
        ? { ok: true }
        : {
            ok: false,
            reason:
              insertError.code === '23505'
                ? 'duplicate'
                : insertError.message.includes('daily_clip_limit_reached')
                  ? 'daily_limit'
                  : insertError.message.includes('account_not_verified')
                    ? 'account_not_verified'
                    : 'other',
            message: '',
          };
    }
    setSubmitting(false);
    if (!result.ok) {
      setError(failureMessage(result.reason, result.message));
      return;
    }
    setUrl('');
    close();
    startTransition(() => router.push('/creator/submissions'));
  }
```

영상 링크 `Field`의 `hint`를 바꾼다:

```tsx
          <Field
            hint={
              platform === 'youtube_shorts'
                ? "설정의 '내 채널'에서 인증한 채널에 캠페인 공개 이후 올린 공개 영상만 제출할 수 있어요."
                : "설정의 '내 채널'에서 인증한 계정에 캠페인 공개 이후 공개로 올린 영상 링크를 붙여 넣어 주세요."
            }
            htmlFor={`${formId}-url`}
            label="영상 링크"
          >
```

- [ ] **Step 3: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/app/app/creator/campaigns/submit-clip-action.ts
git commit -m "feat(creator): YouTube clips are checked against YouTube before they are saved

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/creator/campaigns/submit-clip-action.ts apps/app/app/creator/campaigns/submit-clip-dialog.tsx
```

---

### Task 10: 운영자 "계정 인증" 화면

**Files:**
- Create: `apps/app/app/admin/channels/page.tsx`
- Modify: `apps/app/app/admin/review-actions.tsx`
- Modify: `apps/app/app/workspace-shell.tsx`
- Modify: `apps/app/app/admin/layout.tsx`
- Modify: `apps/app/lib/admin-data.ts`

- [ ] **Step 1: 운영자 액션 추가**

`review-actions.tsx`의 `ApplicationActions` 다음에 추가:

```tsx
/** Verifies a non-YouTube account after the operator saw the code in its bio, or rejects (removes) the registration. */
export function ChannelVerifyActions({ channelId }: { channelId: string }) {
  async function verify(): Promise<ActionResult> {
    const { data, error } = await getSupabaseBrowserClient()
      .from('creator_channels')
      .update({ verified_at: new Date().toISOString(), verified_by: 'admin' })
      .eq('id', channelId)
      .is('verified_at', null)
      .select('id')
      .maybeSingle();
    if (error) return fail(error.code === '23505' ? '같은 계정을 이미 다른 크리에이터가 인증했어요.' : '인증하지 못했어요.');
    return data ? { ok: true } : fail('이미 처리된 계정이에요.');
  }
  async function reject(): Promise<ActionResult> {
    if (!window.confirm('소개에서 코드를 찾지 못했나요? 거절하면 등록이 지워지고, 크리에이터는 다시 등록할 수 있어요.')) return { ok: true };
    const { error } = await getSupabaseBrowserClient().from('creator_channels').delete().eq('id', channelId).is('verified_at', null);
    return error ? fail('거절하지 못했어요.') : { ok: true };
  }
  return (
    <div className="cl-inline">
      <ActionButton label="인증" pendingLabel="처리 중…" run={verify} variant="primary" />
      <ActionButton label="거절" pendingLabel="처리 중…" run={reject} />
    </div>
  );
}

/** Releases a verified account, e.g. when the creator asks or the account changed hands. */
export function ChannelRevokeAction({ channelId }: { channelId: string }) {
  async function revoke(): Promise<ActionResult> {
    if (!window.confirm('인증을 해제할까요? 이 계정의 새 클립은 다시 인증하기 전까지 받을 수 없어요.')) return { ok: true };
    const { error } = await getSupabaseBrowserClient()
      .from('creator_channels')
      .update({ verified_at: null, verified_by: null, external_id: null })
      .eq('id', channelId);
    return error ? fail('해제하지 못했어요.') : { ok: true };
  }
  return <ActionButton label="인증 해제" pendingLabel="처리 중…" run={revoke} />;
}
```

- [ ] **Step 2: 화면 작성**

`apps/app/app/admin/channels/page.tsx`:

```tsx
import { BadgeCheck } from 'lucide-react';
import { fetchAllRows, platformLabel } from '@clipers/db';
import { Card, DataTable, EmptyState, Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ChannelRevokeAction, ChannelVerifyActions } from '../review-actions';

type Row = {
  id: string;
  platform: string;
  url: string;
  verification_code: string;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  creator: { display_name: string } | null;
};

const dateLabel = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function AccountCell({ row }: { row: Row }) {
  return (
    <div>
      <p>
        {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
      </p>
      <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
        {row.url.replace(/^https:\/\//, '')}
      </a>
    </div>
  );
}

export default async function AdminChannelsPage() {
  const { supabase } = await getSession();
  const rows = (await fetchAllRows((from, to) =>
    supabase
      .from('creator_channels')
      .select('id, platform, url, verification_code, verified_at, verified_by, created_at, creator:profiles!creator_channels_creator_id_fkey(display_name)')
      .order('created_at', { ascending: true })
      .range(from, to)
  )) as unknown as Row[];
  // YouTube channels verify themselves (the creator presses "인증 확인"); the rest wait for an operator.
  const pending = rows.filter((row) => !row.verified_at && row.platform !== 'youtube_shorts');
  const verified = rows.filter((row) => row.verified_at).reverse();

  return (
    <Page>
      <PageHeader description="계정을 열어 프로필 소개에 인증 코드가 있는지 확인해 주세요. 유튜브는 자동으로 인증돼요." title="계정 인증" />
      <Stack>
        {pending.length > 0 ? (
          <DataTable
            columns={[
              { key: 'account', header: '계정', render: (row) => <AccountCell row={row} /> },
              { key: 'code', header: '인증 코드', render: (row) => <code>{row.verification_code}</code> },
              { key: 'created', header: '등록', render: (row) => <span className="cl-number">{dateLabel(row.created_at)}</span> },
              { key: 'actions', header: '', align: 'right', render: (row) => <ChannelVerifyActions channelId={row.id} /> },
            ]}
            empty=""
            label="확인할 계정"
            rowKey={(row) => row.id}
            rows={pending}
          />
        ) : (
          <Card>
            <EmptyState description="크리에이터가 유튜브 외 계정을 등록하면 여기에 보여요." icon={<BadgeCheck size={24} />} title="확인할 계정이 없어요" />
          </Card>
        )}
        {verified.length > 0 && (
          <Card title="인증된 계정">
            <DataTable
              columns={[
                { key: 'account', header: '계정', render: (row) => <AccountCell row={row} /> },
                {
                  key: 'verified',
                  header: '인증',
                  render: (row) => (
                    <span className="cl-meta">
                      {row.verified_by === 'auto' ? '자동' : '운영팀'} · {row.verified_at ? dateLabel(row.verified_at) : ''}
                    </span>
                  ),
                },
                { key: 'actions', header: '', align: 'right', render: (row) => <ChannelRevokeAction channelId={row.id} /> },
              ]}
              empty=""
              label="인증된 계정"
              rowKey={(row) => row.id}
              rows={verified}
            />
          </Card>
        )}
      </Stack>
    </Page>
  );
}
```

- [ ] **Step 3: 사이드바와 대기 건수**

`workspace-shell.tsx`: lucide import에 `BadgeCheck`를 알파벳 순서로 더하고(`ArrowUpRight, BadgeCheck, Banknote`), 운영자 `검수` 묶음의 `클립` 다음 줄에:

```tsx
        { href: '/admin/channels', label: '계정 인증', icon: <BadgeCheck {...ICON} /> },
```

`lib/admin-data.ts`:
- `AdminQueueCounts`에 `refunds: number;` 다음 줄로 `/** Non-YouTube accounts waiting for an operator to check the code. */ channels: number;`
- `Promise.all` 배열 끝에 `supabase.from('creator_channels').select('id', count).is('verified_at', null).neq('platform', 'youtube_shorts'),`를 더하고 구조 분해에 `channels`를 더한다.
- 반환 객체에 `channels: channels.count ?? 0,`

`admin/layout.tsx`의 `badges`에 `'/admin/clips': counts.clips,` 다음 줄로:

```tsx
        '/admin/channels': counts.channels,
```

- [ ] **Step 4: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/app/app/admin/channels/page.tsx
git commit -m "feat(admin): account verification queue for non-YouTube accounts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/admin/channels/page.tsx apps/app/app/admin/review-actions.tsx apps/app/app/workspace-shell.tsx apps/app/app/admin/layout.tsx apps/app/lib/admin-data.ts
```

---

### Task 11: 클립 검수 확인 항목과 정산 멈춤 표시·해제

**Files:**
- Modify: `apps/app/app/admin/review-actions.tsx`
- Modify: `apps/app/app/admin/clips/page.tsx`
- Modify: `apps/app/app/admin/campaigns/[id]/page.tsx`

- [ ] **Step 1: 검수 액션에 확인 항목 추가**

`review-actions.tsx`:

`ActionButton`에 `disabled` 속성을 더한다. 시그니처를 `function ActionButton({ label, pendingLabel, variant = 'secondary', disabled = false, run }: { label: string; pendingLabel: string; variant?: ButtonVariant; disabled?: boolean; run: () => Promise<ActionResult>; })`로 바꾸고, `<Button disabled={working} …>`를 `<Button disabled={working || disabled} …>`로 바꾼다.

`ClipReviewActions`를 아래로 바꾼다:

```tsx
export type ClipManualChecks = {
  /** When the campaign went live (videos posted earlier don't count). */
  liveAt: string | null;
  /** The creator's verified accounts on the clip's platform. */
  accounts: string[];
};

const shortDate = (value: string) => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Approve or reject a clip. Clips the server didn't check against YouTube (other platforms, and YouTube clips from
 * before that check) need the operator to confirm the posting time and the account first.
 */
export function ClipReviewActions({ clipId, reviewerId, manualChecks }: { clipId: string; reviewerId: string; manualChecks: ClipManualChecks | null }) {
  const [reason, setReason] = useState('');
  const [postedAfterLive, setPostedAfterLive] = useState(false);
  const [fromVerifiedAccount, setFromVerifiedAccount] = useState(false);
  const checked = !manualChecks || (postedAfterLive && fromVerifiedAccount);

  async function approve(): Promise<ActionResult> {
    const { data, error } = await getSupabaseBrowserClient()
      .from('clips')
      .update({ status: 'approved', rejection_reason: null, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq('id', clipId)
      .eq('status', 'pending_review')
      .select('id')
      .maybeSingle();
    if (error) return fail('승인하지 못했어요.');
    return data ? { ok: true } : fail('이미 검수된 클립이에요.');
  }
  return (
    <div className="cl-review-actions">
      {manualChecks && (
        <div className="cl-review-checks">
          <label className="cl-inline cl-meta">
            <input checked={postedAfterLive} onChange={(event) => setPostedAfterLive(event.target.checked)} type="checkbox" />
            캠페인 공개({manualChecks.liveAt ? shortDate(manualChecks.liveAt) : '날짜 없음'}) 이후 게시
          </label>
          <label className="cl-inline cl-meta">
            <input
              checked={fromVerifiedAccount}
              disabled={manualChecks.accounts.length === 0}
              onChange={(event) => setFromVerifiedAccount(event.target.checked)}
              type="checkbox"
            />
            인증된 계정의 게시물
          </label>
          <p className="cl-meta-subtle">
            {manualChecks.accounts.length > 0
              ? `인증된 계정: ${manualChecks.accounts.map((url) => url.replace(/^https:\/\//, '')).join(', ')}`
              : '이 플랫폼에 인증된 계정이 없어요. 반려 사유에 계정 인증을 안내해 주세요.'}
          </p>
        </div>
      )}
      <div className="cl-inline">
        <ActionButton disabled={!checked} label="승인" pendingLabel="승인 중…" run={approve} variant="primary" />
        <ActionDialog
          canSubmit={reason.trim().length > 0}
          onSubmit={async () => {
            const result = await rejectClip(getSupabaseBrowserClient(), clipId, reason, reviewerId);
            return result.ok ? { ok: true } : fail(result.message);
          }}
          submitLabel="반려하기"
          submitVariant="danger"
          title="클립 반려"
          trigger="반려"
        >
          <Field count={reason.length} htmlFor={`reject-${clipId}`} label="반려 사유" maxLength={500}>
            <Textarea
              id={`reject-${clipId}`}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="크리에이터에게 그대로 보여요. 어떤 요구사항을 지키지 않았는지 구체적으로 적어 주세요."
              value={reason}
            />
          </Field>
        </ActionDialog>
      </div>
    </div>
  );
}

/** Stops (or resumes) a clip's settlement after the operator checked its video by hand. */
export function ClipAvailabilityAction({ clipId, unavailable }: { clipId: string; unavailable: boolean }) {
  async function run(): Promise<ActionResult> {
    const question = unavailable
      ? '영상이 다시 공개된 것을 확인했나요? 표시를 지우면 다음 정산부터 다시 포함돼요.'
      : '영상이 삭제됐거나 공개 상태가 아닌 것을 확인했나요? 표시한 날이 속한 주부터 정산에서 빠져요.';
    if (!window.confirm(question)) return { ok: true };
    const { error } = await getSupabaseBrowserClient()
      .from('clips')
      .update(unavailable ? { unavailable_at: null, unavailable_reason: null } : { unavailable_at: new Date().toISOString(), unavailable_reason: 'manual' })
      .eq('id', clipId)
      .eq('status', 'approved');
    return error ? fail('바꾸지 못했어요. 새로고침한 뒤 확인해 주세요.') : { ok: true };
  }
  return <ActionButton label={unavailable ? '표시 해제' : '삭제·비공개로 표시'} pendingLabel="처리 중…" run={run} />;
}
```

`apps/app/app/globals.css` 끝에 추가:

```css
.cl-review-actions { display: grid; gap: 8px; justify-items: end; }
.cl-review-checks { display: grid; gap: 4px; justify-items: start; max-width: 320px; }
```

- [ ] **Step 2: 클립 검수 화면**

`apps/app/app/admin/clips/page.tsx`를 아래로 바꾼다:

```tsx
import { ClipboardCheck } from 'lucide-react';
import { platformLabel, UNAVAILABLE_REASON_LABEL } from '@clipers/db';
import { Badge, Card, DataTable, EmptyState, Page, PageHeader, Stack } from '@clipers/ui';
import { getSession } from '@/lib/session';
import { ClipAvailabilityAction, ClipReviewActions, type ClipManualChecks } from '../review-actions';

type Row = {
  id: string;
  url: string;
  platform: string;
  creator_id: string;
  sla_deadline: string;
  video_published_at: string | null;
  campaign: { title: string; content_requirements: string | null; live_at: string | null } | null;
  creator: { display_name: string } | null;
};

type StoppedRow = {
  id: string;
  url: string;
  platform: string;
  unavailable_at: string;
  unavailable_reason: 'missing' | 'unlisted' | 'manual';
  campaign: { title: string } | null;
  creator: { display_name: string } | null;
};

const deadlineLabel = (value: string) =>
  new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function AdminClipsPage() {
  const { supabase, user } = await getSession();
  const [{ data }, { data: stoppedData }] = await Promise.all([
    supabase
      .from('clips')
      .select(
        'id, url, platform, creator_id, sla_deadline, video_published_at, campaign:campaigns!clips_campaign_id_fkey(title, content_requirements, live_at), creator:profiles!clips_creator_id_fkey(display_name)'
      )
      .eq('status', 'pending_review')
      .order('sla_deadline', { ascending: true }),
    supabase
      .from('clips')
      .select('id, url, platform, unavailable_at, unavailable_reason, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name)')
      .eq('status', 'approved')
      .not('unavailable_at', 'is', null)
      .order('unavailable_at', { ascending: false }),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const stopped = (stoppedData ?? []) as unknown as StoppedRow[];

  const creatorIds = [...new Set(rows.map((row) => row.creator_id))];
  const { data: channelRows } = creatorIds.length
    ? await supabase.from('creator_channels').select('creator_id, platform, url').in('creator_id', creatorIds).not('verified_at', 'is', null)
    : { data: [] as { creator_id: string; platform: string; url: string }[] };
  const accountsOf = (creatorId: string, platform: string) =>
    (channelRows ?? []).filter((channel) => channel.creator_id === creatorId && channel.platform === platform).map((channel) => channel.url);
  // The server checked YouTube clips submitted since the fraud guards (video_published_at is set); the rest are checked by hand.
  const manualChecks = (row: Row): ClipManualChecks | null =>
    row.video_published_at ? null : { liveAt: row.campaign?.live_at ?? null, accounts: accountsOf(row.creator_id, row.platform) };
  const now = Date.now();

  return (
    <Page>
      <PageHeader description="검수 기한이 빠른 순서예요. 반려할 때 적은 사유는 크리에이터에게 그대로 보여요." title="클립 검수" />
      <Stack>
        {rows.length > 0 ? (
          <DataTable
            columns={[
              {
                key: 'deadline',
                header: '검수 기한',
                render: (row) =>
                  Date.parse(row.sla_deadline) < now ? (
                    <Badge tone="tomato">기한 초과 · {deadlineLabel(row.sla_deadline)}</Badge>
                  ) : (
                    <span className="cl-number">{deadlineLabel(row.sla_deadline)}</span>
                  ),
              },
              {
                key: 'clip',
                header: '캠페인 / 크리에이터',
                render: (row) => (
                  <div>
                    <p>{row.campaign?.title ?? '캠페인'}</p>
                    <p className="cl-meta-subtle">
                      {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
                    </p>
                    {row.video_published_at && (
                      <p className="cl-meta-subtle">자동 확인 · 인증 채널 · {deadlineLabel(row.video_published_at)} 게시</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'requirements',
                header: '요구사항',
                render: (row) => <p className="cl-meta cl-clamp">{row.campaign?.content_requirements || '—'}</p>,
              },
              {
                key: 'link',
                header: '',
                render: (row) => (
                  <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
                    영상 열기
                  </a>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => <ClipReviewActions clipId={row.id} manualChecks={manualChecks(row)} reviewerId={user.id} />,
              },
            ]}
            empty=""
            label="검수할 클립"
            rowKey={(row) => row.id}
            rows={rows}
          />
        ) : (
          <Card>
            <EmptyState description="크리에이터가 클립을 제출하면 여기에 보여요." icon={<ClipboardCheck size={24} />} title="검수할 클립이 없어요" />
          </Card>
        )}
        {stopped.length > 0 && (
          <Card description="영상이 삭제·비공개로 바뀌어 정산이 멈춘 클립이에요. 다시 공개된 것을 확인했을 때만 표시를 지워 주세요." title="정산이 멈춘 클립">
            <DataTable
              columns={[
                {
                  key: 'stopped',
                  header: '멈춘 날',
                  render: (row) => (
                    <div>
                      <Badge tone="amber">{UNAVAILABLE_REASON_LABEL[row.unavailable_reason]}</Badge>
                      <p className="cl-meta-subtle">{deadlineLabel(row.unavailable_at)}</p>
                    </div>
                  ),
                },
                {
                  key: 'clip',
                  header: '캠페인 / 크리에이터',
                  render: (row) => (
                    <div>
                      <p>{row.campaign?.title ?? '캠페인'}</p>
                      <p className="cl-meta-subtle">
                        {row.creator?.display_name ?? '크리에이터'} · {platformLabel(row.platform)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'link',
                  header: '',
                  render: (row) => (
                    <a className="cl-link" href={row.url} rel="noreferrer" target="_blank">
                      영상 열기
                    </a>
                  ),
                },
                { key: 'actions', header: '', align: 'right', render: (row) => <ClipAvailabilityAction clipId={row.id} unavailable /> },
              ]}
              empty=""
              label="정산이 멈춘 클립"
              rowKey={(row) => row.id}
              rows={stopped}
            />
          </Card>
        )}
      </Stack>
    </Page>
  );
}
```

- [ ] **Step 3: 캠페인 상세에 승인된 클립**

`apps/app/app/admin/campaigns/[id]/page.tsx`:

import를 바꾼다:

```tsx
import { notFound } from 'next/navigation';
import { campaignEconomics, campaignPricing, categoryLabel, creatorPayoutToClipCap, depositDue, fetchAllRows, platformLabel, platformLabels, UNAVAILABLE_REASON_LABEL } from '@clipers/db';
import { Badge, Card, DataTable, Page, PageHeader, Stack, SummaryList, formatKRW } from '@clipers/ui';
import { loadCampaignFinances } from '@/lib/campaign-finances';
import { getSession } from '@/lib/session';
import { CAMPAIGN_STATUS, CONTENT_TYPE_LABEL, statusDisplay } from '@/lib/status';
import { ClipAvailabilityAction, ConfirmDepositAction, PricingForm } from '../../review-actions';

type ApprovedClip = {
  id: string;
  url: string;
  platform: string;
  unavailable_at: string | null;
  unavailable_reason: 'missing' | 'unlisted' | 'manual' | null;
  creator: { display_name: string } | null;
};

const shortDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
```

`Promise.all`에 승인된 클립 조회를 더한다:

```tsx
  const [finances, settlements, rates, { data: escrow }, approvedClips] = await Promise.all([
    loadCampaignFinances(supabase, [id]),
    fetchAllRows((from, to) => supabase.from('settlements').select('amount').eq('campaign_id', id).order('id').range(from, to)),
    supabase.from('campaign_platform_rates').select('max_payout').eq('campaign_id', id).limit(1),
    supabase.from('campaign_escrow').select('credit_applied, received_amount').eq('campaign_id', id).maybeSingle(),
    fetchAllRows((from, to) =>
      supabase
        .from('clips')
        .select('id, url, platform, unavailable_at, unavailable_reason, creator:profiles!clips_creator_id_fkey(display_name)')
        .eq('campaign_id', id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .range(from, to)
    ).then((rows) => rows as unknown as ApprovedClip[]),
  ]);
```

`<Card title="설정">…</Card>` 다음, `</Stack>` 앞에:

```tsx
        <Card description="삭제·비공개를 직접 확인한 클립은 표시해 주세요. 표시한 날이 속한 주부터 정산에서 빠져요. 유튜브는 매일 자동으로 확인해요." title="승인된 클립">
          {approvedClips.length > 0 ? (
            <DataTable
              columns={[
                {
                  key: 'creator',
                  header: '크리에이터',
                  render: (clip) => (
                    <div>
                      <p>{clip.creator?.display_name ?? '크리에이터'}</p>
                      <p className="cl-meta-subtle">{platformLabel(clip.platform)}</p>
                    </div>
                  ),
                },
                {
                  key: 'state',
                  header: '정산',
                  render: (clip) =>
                    clip.unavailable_at && clip.unavailable_reason ? (
                      <Badge tone="amber">
                        멈춤 · {UNAVAILABLE_REASON_LABEL[clip.unavailable_reason]} · {shortDate(clip.unavailable_at)}
                      </Badge>
                    ) : (
                      <Badge tone="brand">진행 중</Badge>
                    ),
                },
                {
                  key: 'link',
                  header: '',
                  render: (clip) => (
                    <a className="cl-link" href={clip.url} rel="noreferrer" target="_blank">
                      영상 열기
                    </a>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (clip) => <ClipAvailabilityAction clipId={clip.id} unavailable={!!clip.unavailable_at} />,
                },
              ]}
              empty=""
              label="승인된 클립"
              rowKey={(clip) => clip.id}
              rows={approvedClips}
            />
          ) : (
            <p className="cl-meta">아직 승인된 클립이 없어요.</p>
          )}
        </Card>
```

- [ ] **Step 4: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(admin): manual checks for clips the server did not verify, and stopping or resuming a clip's settlement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/admin/review-actions.tsx apps/app/app/admin/clips/page.tsx "apps/app/app/admin/campaigns/[id]/page.tsx" apps/app/app/globals.css
```

---

### Task 12: 조회수 수집이 삭제·비공개를 감지

**Files:**
- Modify: `apps/app/app/api/cron/youtube-views/route.ts`

- [ ] **Step 1: 구현**

import를 바꾼다:

```ts
import { buildUnavailableClipsSlackMessage, extractYouTubeVideoId, fetchYouTubeViewCounts, findUnavailableClips, sendSlackNotification, type UnavailableClipSummary } from '@clipers/db';
```

클립 조회에서 `.eq('status', 'approved')` 다음 줄에 추가(이미 멈춘 클립은 다시 조회하지 않는다):

```ts
      .is('unavailable_at', null)
```

`viewCounts`와 `snapshots` 계산은 그대로 둔다(`item.viewCount`를 읽으므로 Task 4 뒤에도 맞다).

스냅샷 저장(`if (snapshots.length > 0) { … }`) 다음, 최종 `return NextResponse.json(` 앞에 추가:

```ts
  // Videos YouTube no longer returns (deleted or private) or returns as unlisted stop being settled from today.
  const unavailable = findUnavailableClips(candidates, viewCountResult.data);
  const markedIds: string[] = [];
  for (const reason of ['missing', 'unlisted'] as const) {
    const ids = unavailable.filter((clip) => clip.reason === reason).map((clip) => clip.clipId);
    if (ids.length === 0) continue;
    const { data: marked, error } = await supabase
      .from('clips')
      .update({ unavailable_at: new Date().toISOString(), unavailable_reason: reason })
      .in('id', ids)
      .is('unavailable_at', null)
      .select('id');
    if (error) return responseError('Could not mark unavailable clips.', 502);
    markedIds.push(...(marked ?? []).map((clip) => clip.id));
  }

  // Marked clips leave the candidate list, so each is announced once. A failed post doesn't undo the marks.
  let slackNotified = false;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (markedIds.length > 0 && slackWebhookUrl) {
    const { data: details } = await supabase
      .from('clips')
      .select('url, unavailable_reason, campaign:campaigns!clips_campaign_id_fkey(title), creator:profiles!clips_creator_id_fkey(display_name)')
      .in('id', markedIds);
    const summaries: UnavailableClipSummary[] = ((details ?? []) as unknown as Array<{
      url: string;
      unavailable_reason: UnavailableClipSummary['reason'];
      campaign: { title: string } | null;
      creator: { display_name: string } | null;
    }>).map((clip) => ({
      campaignTitle: clip.campaign?.title ?? '캠페인',
      creatorName: clip.creator?.display_name ?? '크리에이터',
      url: clip.url,
      reason: clip.unavailable_reason,
    }));
    slackNotified = (await sendSlackNotification(slackWebhookUrl, buildUnavailableClipsSlackMessage(summaries))).ok;
  }
```

최종 응답 객체의 `unavailable: candidates.length - snapshots.length,` 줄을 아래 두 줄로 바꾼다:

```ts
    markedUnavailable: markedIds.length,
    slackNotified,
```

- [ ] **Step 2: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 3: 커밋**

```bash
git commit -m "feat(cron): view collection marks deleted, private and unlisted videos and alerts Slack once

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/api/cron/youtube-views/route.ts
```

---

### Task 13: 크리에이터 제출 현황의 정산 멈춤 안내

**Files:**
- Modify: `apps/app/app/creator/submissions/page.tsx`
- Modify: `apps/app/app/creator/submissions/submissions-view.tsx`

- [ ] **Step 1: 구현**

`page.tsx`의 클립 조회 select 문자열에서 `rejection_reason,` 다음에 ` unavailable_at,`를 넣는다:

```ts
      .select('id, url, platform, status, submitted_at, sla_deadline, rejection_reason, unavailable_at, campaign:campaigns!clips_campaign_id_fkey(title)')
```

`submissions-view.tsx`:

`SubmissionRow`의 `rejection_reason: string | null;` 다음 줄에:

```ts
  /** Set when the video was found deleted, private or unlisted; settlement stopped from that week. */
  unavailable_at: string | null;
```

상태 칸의 `{row.rejection_reason && …}` 다음 줄에:

```tsx
            {row.status === 'approved' && row.unavailable_at && (
              <p className="cl-meta-subtle">영상이 삭제되거나 비공개로 바뀌어 정산이 멈췄어요. 다시 공개했다면 이의제기로 알려 주세요.</p>
            )}
```

`FollowUp`의 `if (row.status === 'rejected') return <DisputeDialog … />;` 다음 줄에:

```tsx
  if (row.status === 'approved' && row.unavailable_at) return <DisputeDialog clipId={row.id} creatorId={creatorId} />;
```

- [ ] **Step 2: 타입·린트 확인**

Run: `pnpm --filter @clipers/app exec tsc --noEmit` → 오류 없음
Run: `pnpm --filter @clipers/app lint` → 오류 없음

- [ ] **Step 3: 커밋**

```bash
git commit -m "feat(creator): submissions explain a stopped settlement and offer a dispute

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/app/creator/submissions/page.tsx apps/app/app/creator/submissions/submissions-view.tsx
```

---

### Task 14: 약관·처리방침 초안과 크리에이터 FAQ

**Files:**
- Modify: `apps/app/content/legal/terms.md`
- Modify: `apps/app/content/legal/privacy.md`
- Modify: `docs/legal/README.md`
- Modify: `apps/site/lib/creator-faq.ts`
- Modify: `apps/site/lib/creator-faq.test.ts`

- [ ] **Step 1: 약관 제13조**

`terms.md` 제13조의 3항 다음에 추가:

```md
4. 크리에이터는 캠페인이 공개된 뒤 게시한 영상만, 서비스에서 인증한 본인 계정에 게시한 영상만 제출할 수 있습니다. 계정 인증은 회사가 안내하는 인증 코드를 채널 설명이나 프로필 소개에 넣는 방식으로 합니다. <!-- 🔸 2026-10-03 추가 -->
5. 제출한 클립이 삭제되거나 공개 상태가 아니게 된 것이 확인되면, 확인한 날이 속한 주부터 그 클립은 정산에서 제외됩니다. 다시 공개된 것을 회사가 확인하면 그다음 정산부터 다시 포함합니다. <!-- 🔸 2026-10-03 추가. 자동으로 재개하지 않고 운영팀 확인 후 재개 -->
```

- [ ] **Step 2: 처리방침**

`privacy.md` 수집 항목 표에서:
- 회원가입 행의 `약관 동의 일시`를 `약관 동의·만 19세 이상 확인 일시`로 바꾼다.
- 크리에이터 활동 행 다음에 새 행을 넣는다:

```md
| 크리에이터 계정 인증 | 등록한 플랫폼 계정 주소, 유튜브 채널 ID, 인증 코드와 인증 일시, 제출 영상의 게시 일시와 공개 상태 | 계정 소유 확인, 부정 제출 방지, 정산 대상 확인 | 계약 이행 <!-- 🔸 2026-10-03 추가 --> |
```

보유 기간 표의 `유입 경로` 행 앞에:

```md
| 계정 인증 정보 | 탈퇴할 때까지 | — <!-- 🔸 2026-10-03 추가 --> |
```

국외 이전 표의 Google 행 항목 칸 `영상 링크(공개된 영상 ID)`를 `영상 링크(공개된 영상 ID), 등록한 유튜브 채널 주소`로, 목적 칸 `유튜브 조회수 확인, 썸네일 표시`를 `유튜브 조회수·게시 일시·공개 상태 확인, 채널 인증, 썸네일 표시`로 바꾼다. Slack 행 목적 칸 `검수 지연 알림, 새 상담 문의 알림`을 `검수 지연 알림, 영상 삭제·비공개 알림, 새 상담 문의 알림`으로 바꾼다.

- [ ] **Step 3: 변호사 질문**

`docs/legal/README.md` 1절 목록 끝(8번 다음)에 추가:

```md
9. 캠페인 공개 이후·인증한 본인 계정에 게시한 영상만 인정하고, 삭제·비공개가 확인된 주부터 정산에서 빼는 조항(약관 제13조 제4·5항)이 약관규제법상 문제없는가. 확인한 주에 이미 쌓인 조회수를 지급하지 않는 것이 크리에이터에게 부당하게 불리한가. (2026-10-03 추가)
```

5절 잠정 결정 표 끝에 추가:

```md
| 정산 대상 영상 | 캠페인 공개 이후, 인증한 본인 계정 게시물만 | 약관 제13조 제4항 |
| 삭제·비공개 영상 | 확인한 주부터 정산 제외, 운영팀 확인 후에만 재개 | 약관 제13조 제5항 |
```

- [ ] **Step 4: 크리에이터 FAQ (테스트 먼저)**

`creator-faq.test.ts`의 id 목록에서 `'platforms', 'view-check',`를 `'platforms', 'which-videos', 'view-check',`로 바꾼다.

Run: `pnpm --filter @clipers/site exec vitest run lib/creator-faq.test.ts`
Expected: FAIL (`which-videos`가 없음)

`creator-faq.ts`에서 `platforms` 항목 다음, `view-check` 항목 앞에 추가:

```ts
  {
    id: 'which-videos',
    q: '어떤 영상을 제출할 수 있나요?',
    a: "인증한 내 계정에 캠페인이 공개된 뒤 공개로 올린 영상만 제출할 수 있어요. 먼저 설정의 '내 채널'에서 계정을 등록하고, 안내받은 인증 코드를 채널 설명이나 프로필 소개에 넣어 인증해 주세요. 유튜브는 바로 자동으로 인증되고, 다른 플랫폼은 운영팀이 확인한 뒤부터 제출할 수 있어요. 올린 영상을 삭제하거나 비공개로 바꾸면 그 주부터 정산이 멈춰요.",
  },
```

Run: `pnpm --filter @clipers/site test`
Expected: PASS (공개 문구 금지어 검사 포함)

- [ ] **Step 5: 커밋**

```bash
git commit -m "docs(legal): draft rules for eligible videos and stopped settlements; creator FAQ on which videos count

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/app/content/legal/terms.md apps/app/content/legal/privacy.md docs/legal/README.md apps/site/lib/creator-faq.ts apps/site/lib/creator-faq.test.ts
```

---

### Task 15: 전체 확인

- [ ] **Step 1: 테스트·타입·린트**

```bash
pnpm --filter @clipers/db test
pnpm --filter @clipers/site test
pnpm --filter @clipers/app exec tsc --noEmit
pnpm --filter @clipers/app lint
pnpm --filter @clipers/site lint
```

Expected: 모두 통과.

- [ ] **Step 2: 로컬 화면 확인 (앱 개발 서버 3000번이 이미 떠 있다)**

브라우저 없이 확인할 수 있는 범위에서:
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/onboarding` 등 새 화면(`/creator/settings`, `/admin/channels`, `/admin/clips`)이 500이 아닌지(로그인 리다이렉트 302/307은 정상).
- 개발 서버 출력(`bnl4oiiw5`)에 컴파일 오류가 없는지.

로그인이 필요한 실제 흐름(내 채널 등록 → 유튜브 인증 확인, 유튜브 제출 거절 문구, 운영자 확인 항목, 온보딩 세 번째 스위치)은 사용자에게 확인 목록으로 넘긴다.

- [ ] **Step 3: 실제 DB 상태 재확인**

```sql
select count(*) filter (where unavailable_at is not null) as stopped, count(*) as approved from clips where status = 'approved';
```

(마이그레이션 직후라 `stopped = 0`이 정상. 다음 날 01:00 UTC 조회수 수집 뒤 다시 보면 감지 결과가 나온다.)

- [ ] **Step 4: 사용자에게 보고**

- 커밋 목록, push 안 함, 운영 DB는 이미 바뀌었으니 배포(push)를 미루면 운영 앱의 유튜브 제출·온보딩이 막혀 있다는 점.
- [확인 필요] 약관 제13조 4·5항, 처리방침 계정 인증 행, 다시 공개된 영상의 재개 방식.
- 사용자가 직접 볼 확인 목록(Step 2).
