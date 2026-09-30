# Clipers 공통 기반(Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clipers 전체 플랫폼(마케팅 사이트, 브랜드/크리에이터/운영자 앱)이 공유할 모노레포 기반 — 저장소 구조, 데이터 모델, RLS 권한, 디자인 토큰, 핵심 비즈니스 로직, 테스트/CI 인프라를 만든다.

**Architecture:** pnpm + Turborepo 모노레포. `apps/site`(공개 마케팅/마켓플레이스)와 `apps/app`(로그인 필요, 브랜드/크리에이터/운영자 라우트)이 `packages/ui`(디자인 토큰)와 `packages/db`(Supabase 클라이언트 + 비즈니스 로직 서비스)를 공유한다. Supabase Postgres가 데이터 저장소이자 RLS 기반 1차 보안 경계이고, 예산/SLA/정산 계산 같은 핵심 로직은 `packages/db`에 순수 함수로 구현해 두 앱에서 재사용한다.

**Tech Stack:** pnpm, Turborepo, TypeScript, Next.js 15 (React 19), Tailwind CSS 3, Supabase (Postgres + Auth + `@supabase/ssr`), Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-30-foundation-design.md`

---

### Task 1: 모노레포 뼈대 + git 초기화

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: git 저장소 초기화**

Run: `git init`
Expected: `Initialized empty Git repository in .../clipers/.git/`

- [ ] **Step 2: 루트 package.json 작성**

```json
{
  "name": "clipers",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: pnpm 워크스페이스 정의**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

(파일: `pnpm-workspace.yaml`)

- [ ] **Step 4: Turborepo 태스크 정의**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

(파일: `turbo.json`)

- [ ] **Step 5: 공통 tsconfig 베이스**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

(파일: `tsconfig.base.json`)

- [ ] **Step 6: .gitignore**

```
node_modules
.next
dist
.turbo
.env
.env.local
supabase/.branches
supabase/.temp
```

- [ ] **Step 7: 환경변수 템플릿**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

(파일: `.env.example`)

- [ ] **Step 8: pnpm 설치 확인**

Run: `pnpm install`
Expected: 워크스페이스에 아직 앱/패키지가 없으므로 루트 devDependencies만 설치되고 에러 없이 종료

- [ ] **Step 9: 커밋**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .env.example pnpm-lock.yaml
git commit -m "chore: scaffold pnpm/turborepo monorepo"
```

---

### Task 2: packages/config — 공유 eslint 설정

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/eslint-preset.js`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@clipers/config",
  "version": "0.0.0",
  "private": true,
  "main": "eslint-preset.js",
  "devDependencies": {
    "eslint": "^9.11.0"
  }
}
```

- [ ] **Step 2: eslint preset 작성**

```js
module.exports = {
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    "no-unused-vars": "warn",
  },
};
```

- [ ] **Step 3: 설치 확인**

Run: `pnpm install`
Expected: `@clipers/config` 워크스페이스 패키지로 인식되어 에러 없이 종료

- [ ] **Step 4: 커밋**

```bash
git add packages/config pnpm-lock.yaml
git commit -m "chore: add shared eslint preset package"
```

---

### Task 3: packages/ui — 디자인 토큰 + Tailwind 프리셋

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/tokens.css`
- Create: `packages/ui/src/tailwind-preset.ts`
- Create: `packages/ui/src/index.ts`
- Test: `packages/ui/src/tailwind-preset.test.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@clipers/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vitest 설정**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

(파일: `packages/ui/vitest.config.ts`)

- [ ] **Step 4: 디자인 토큰 CSS 작성**

`clipping-platform-spec.md` 2장에 실측된 값을 그대로 옮김. `status-positive`는 브랜드 그린과 구분되는 앰버 톤으로 분리(스펙 2.1의 경고사항 반영).

```css
:root {
  /* 배경 */
  --bg-primary: #111111;
  --bg-panel: #0A0A0A;

  /* 텍스트 */
  --text-primary: #FFFFFF;

  /* 구분선 */
  --border-stroke: rgba(255, 255, 255, 0.106);
  --border-width: 0.8px;

  /* 브랜드/CTA */
  --brand-primary: #3DD68C;
  --brand-primary-dark: #2FAE72;

  /* 인터랙티브 UI */
  --action-primary: #3DD68C;

  /* 상태 -- 브랜드색과 구분되는 앰버 톤 */
  --status-positive: #F5A524;

  /* 컴포넌트 */
  --radius-button: 8px;
  --avatar-ring-width: 1.6px;
}
```

(파일: `packages/ui/src/tokens.css`)

- [ ] **Step 5: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { clipersPreset } from '../tailwind-preset';

describe('clipersPreset', () => {
  it('defines the brand color tokens', () => {
    const colors = clipersPreset.theme?.extend?.colors as Record<string, string>;
    expect(colors['brand-primary']).toBe('var(--brand-primary)');
    expect(colors['status-positive']).toBe('var(--status-positive)');
  });

  it('fixes the button radius token', () => {
    const radius = clipersPreset.theme?.extend?.borderRadius as Record<string, string>;
    expect(radius.button).toBe('var(--radius-button)');
  });
});
```

(파일: `packages/ui/src/tailwind-preset.test.ts`)

- [ ] **Step 6: 테스트 실패 확인**

Run: `pnpm --filter @clipers/ui test`
Expected: FAIL -- `Cannot find module '../tailwind-preset'`

- [ ] **Step 7: Tailwind 프리셋 구현**

```ts
import type { Config } from 'tailwindcss';

export const clipersPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-panel': 'var(--bg-panel)',
        'text-primary': 'var(--text-primary)',
        'border-stroke': 'var(--border-stroke)',
        'brand-primary': 'var(--brand-primary)',
        'brand-primary-dark': 'var(--brand-primary-dark)',
        'action-primary': 'var(--action-primary)',
        'status-positive': 'var(--status-positive)',
      },
      borderRadius: {
        button: 'var(--radius-button)',
      },
      borderWidth: {
        stroke: 'var(--border-width)',
      },
    },
  },
};
```

(파일: `packages/ui/src/tailwind-preset.ts`)

- [ ] **Step 8: index.ts에서 re-export**

```ts
export { clipersPreset } from './tailwind-preset';
```

(파일: `packages/ui/src/index.ts`)

- [ ] **Step 9: 테스트 통과 확인**

Run: `pnpm install && pnpm --filter @clipers/ui test`
Expected: PASS -- 2 tests passed

- [ ] **Step 10: 커밋**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): add design token css and tailwind preset"
```

---

### Task 4: packages/db — Supabase 클라이언트 + 에러 타입

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/vitest.config.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/services/errors.ts`
- Create: `packages/db/src/index.ts`
- Test: `packages/db/src/client.test.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@clipers/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vitest 설정**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

(파일: `packages/db/vitest.config.ts`)

- [ ] **Step 4: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  it('throws when url or anon key is missing', () => {
    expect(() => createSupabaseClient('', '')).toThrow(
      'Supabase URL과 anon key가 모두 필요합니다.'
    );
  });

  it('creates a client when both values are provided', () => {
    const client = createSupabaseClient('https://example.supabase.co', 'anon-key');
    expect(client).toBeDefined();
  });
});
```

(파일: `packages/db/src/client.test.ts`)

- [ ] **Step 5: 테스트 실패 확인**

Run: `pnpm --filter @clipers/db test`
Expected: FAIL -- `Cannot find module './client'`

- [ ] **Step 6: 클라이언트 팩토리 구현**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL과 anon key가 모두 필요합니다.');
  }
  return createClient(url, anonKey);
}
```

(파일: `packages/db/src/client.ts`)

- [ ] **Step 7: 서비스 공통 에러/결과 타입 작성**

```ts
export type ServiceError = {
  ok: false;
  code: string;
  message: string;
};

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

export function err(code: string, message: string): ServiceError {
  return { ok: false, code, message };
}

export function ok<T>(data: T): ServiceSuccess<T> {
  return { ok: true, data };
}
```

(파일: `packages/db/src/services/errors.ts`)

- [ ] **Step 8: index.ts에서 re-export**

```ts
export { createSupabaseClient } from './client';
export * from './services/errors';
```

(파일: `packages/db/src/index.ts`)

- [ ] **Step 9: 테스트 통과 확인**

Run: `pnpm install && pnpm --filter @clipers/db test`
Expected: PASS -- 2 tests passed

- [ ] **Step 10: 커밋**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): add supabase client factory and service error types"
```

---

### Task 5: packages/db — 예산 소진 계산 서비스 (TDD)

**Files:**
- Create: `packages/db/src/services/budget.ts`
- Test: `packages/db/src/services/budget.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { calculateClipAmount, calculateBudgetConsumed } from './budget';

describe('calculateClipAmount', () => {
  it('calculates CPM-based earnings for a clip', () => {
    expect(calculateClipAmount(10000, 2, 100)).toBe(20);
  });

  it('caps earnings at the per-clip cap', () => {
    expect(calculateClipAmount(1000000, 2, 100)).toBe(100);
  });
});

describe('calculateBudgetConsumed', () => {
  it('sums capped earnings across multiple clips', () => {
    const clips = [{ viewCount: 10000 }, { viewCount: 1000000 }];
    expect(calculateBudgetConsumed(clips, 2, 100)).toBe(120);
  });

  it('returns 0 for no clips', () => {
    expect(calculateBudgetConsumed([], 2, 100)).toBe(0);
  });
});
```

(파일: `packages/db/src/services/budget.test.ts`)

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @clipers/db test`
Expected: FAIL -- `Cannot find module './budget'`

- [ ] **Step 3: 구현**

`per_clip_cap`(클립당 지급 상한, 스펙 4.1)과 CPM 계산을 함께 처리한다. 뷰 1,000당 `cpmRate`를 적용하고 클립당 상한을 넘지 않도록 캡을 씌운다.

```ts
export interface ClipViewCount {
  viewCount: number;
}

export function calculateClipAmount(
  viewCount: number,
  cpmRate: number,
  perClipCap: number
): number {
  const rawAmount = (viewCount / 1000) * cpmRate;
  return Math.min(rawAmount, perClipCap);
}

export function calculateBudgetConsumed(
  clips: ClipViewCount[],
  cpmRate: number,
  perClipCap: number
): number {
  return clips.reduce(
    (sum, clip) => sum + calculateClipAmount(clip.viewCount, cpmRate, perClipCap),
    0
  );
}
```

(파일: `packages/db/src/services/budget.ts`)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @clipers/db test`
Expected: PASS -- 4 tests passed

- [ ] **Step 5: index.ts에 re-export 추가**

```ts
export { createSupabaseClient } from './client';
export * from './services/errors';
export * from './services/budget';
```

(파일: `packages/db/src/index.ts`)

- [ ] **Step 6: 커밋**

```bash
git add packages/db/src/services/budget.ts packages/db/src/services/budget.test.ts packages/db/src/index.ts
git commit -m "feat(db): add budget consumption calculation service"
```

---

### Task 6: packages/db — SLA 마감시간 계산 서비스 (TDD)

**Files:**
- Create: `packages/db/src/services/sla.ts`
- Test: `packages/db/src/services/sla.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { calculateSlaDeadline, isSlaBreached } from './sla';

describe('calculateSlaDeadline', () => {
  it('adds the SLA hours to the submission time', () => {
    const submittedAt = new Date('2026-01-01T00:00:00Z');
    const deadline = calculateSlaDeadline(submittedAt, 48);
    expect(deadline.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });
});

describe('isSlaBreached', () => {
  it('returns false before the deadline', () => {
    const submittedAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-02T00:00:00Z');
    expect(isSlaBreached(submittedAt, 48, now)).toBe(false);
  });

  it('returns true after the deadline', () => {
    const submittedAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-04T00:00:00Z');
    expect(isSlaBreached(submittedAt, 48, now)).toBe(true);
  });
});
```

(파일: `packages/db/src/services/sla.test.ts`)

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @clipers/db test`
Expected: FAIL -- `Cannot find module './sla'`

- [ ] **Step 3: 구현**

스펙 4.2의 "SLA 초과 시 자동 에스컬레이션" 기능이 나중에 이 함수를 폴링해서 쓴다.

```ts
export function calculateSlaDeadline(submittedAt: Date, reviewSlaHours: number): Date {
  return new Date(submittedAt.getTime() + reviewSlaHours * 60 * 60 * 1000);
}

export function isSlaBreached(
  submittedAt: Date,
  reviewSlaHours: number,
  now: Date = new Date()
): boolean {
  return now.getTime() > calculateSlaDeadline(submittedAt, reviewSlaHours).getTime();
}
```

(파일: `packages/db/src/services/sla.ts`)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @clipers/db test`
Expected: PASS -- 3 tests passed

- [ ] **Step 5: index.ts에 re-export 추가**

```ts
export { createSupabaseClient } from './client';
export * from './services/errors';
export * from './services/budget';
export * from './services/sla';
```

(파일: `packages/db/src/index.ts`)

- [ ] **Step 6: 커밋**

```bash
git add packages/db/src/services/sla.ts packages/db/src/services/sla.test.ts packages/db/src/index.ts
git commit -m "feat(db): add SLA deadline calculation service"
```

---

### Task 7: packages/db — 클립 반려 서비스, 사유 필수 강제 (TDD)

**Files:**
- Create: `packages/db/src/services/rejectClip.ts`
- Test: `packages/db/src/services/rejectClip.test.ts`
- Modify: `packages/db/src/index.ts`

스펙 4.2 "반려 시 사유 명시 필수" 요구사항을 서비스 레이어에서 강제한다 -- Supabase까지 요청이 가기 전에 막는다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rejectClip } from './rejectClip';

function createFakeSupabase(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => result,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('rejectClip', () => {
  it('rejects when reason is empty', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('rejection_reason_required');
    }
  });

  it('rejects when reason is only whitespace', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '   ');
    expect(result.ok).toBe(false);
  });

  it('updates clip status when reason is provided', async () => {
    const fakeSupabase = createFakeSupabase({ data: { id: 'clip-1' }, error: null });
    const result = await rejectClip(fakeSupabase, 'clip-1', '워터마크가 없습니다');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('clip-1');
    }
  });

  it('returns a db_error when supabase returns an error', async () => {
    const fakeSupabase = createFakeSupabase({ data: null, error: { message: 'not found' } });
    const result = await rejectClip(fakeSupabase, 'clip-1', '사유');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('db_error');
    }
  });
});
```

(파일: `packages/db/src/services/rejectClip.test.ts`)

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @clipers/db test`
Expected: FAIL -- `Cannot find module './rejectClip'`

- [ ] **Step 3: 구현**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type ServiceResult } from './errors';

export async function rejectClip(
  supabase: SupabaseClient,
  clipId: string,
  reason: string
): Promise<ServiceResult<{ id: string }>> {
  if (!reason || reason.trim().length === 0) {
    return err('rejection_reason_required', '반려 사유를 반드시 입력해야 합니다.');
  }

  const { data, error } = await supabase
    .from('clips')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', clipId)
    .select('id')
    .single();

  if (error) {
    return err('db_error', error.message);
  }

  return ok({ id: (data as { id: string }).id });
}
```

(파일: `packages/db/src/services/rejectClip.ts`)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @clipers/db test`
Expected: PASS -- 4 tests passed

- [ ] **Step 5: index.ts에 re-export 추가**

```ts
export { createSupabaseClient } from './client';
export * from './services/errors';
export * from './services/budget';
export * from './services/sla';
export * from './services/rejectClip';
```

(파일: `packages/db/src/index.ts`)

- [ ] **Step 6: 커밋**

```bash
git add packages/db/src/services/rejectClip.ts packages/db/src/services/rejectClip.test.ts packages/db/src/index.ts
git commit -m "feat(db): enforce rejection reason in rejectClip service"
```

---

### Task 8: Supabase 스키마 마이그레이션

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Supabase 프로젝트 설정 파일 작성**

```toml
project_id = "clipers"

[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323
```

(파일: `supabase/config.toml`)

- [ ] **Step 2: 스키마 마이그레이션 작성**

설계 문서(`docs/superpowers/specs/2026-09-30-foundation-design.md`) 2장의 데이터 모델을 그대로 구현.

```sql
-- 사용자 프로필
create type user_role as enum ('brand', 'creator', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'creator',
  display_name text not null,
  created_at timestamptz not null default now()
);

-- 캠페인
create type campaign_track as enum ('managed', 'self_serve');
create type campaign_content_type as enum ('clipping', 'ugc');
create type campaign_status as enum (
  'draft', 'pending_escrow', 'pending_managed_review', 'live', 'paused', 'closed'
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references profiles(id) on delete cascade,
  track campaign_track not null,
  title text not null,
  content_type campaign_content_type not null,
  category text not null,
  total_budget numeric(12,2) not null check (total_budget > 0),
  cpm_rate numeric(10,2) not null check (cpm_rate > 0),
  per_clip_cap numeric(12,2) not null check (per_clip_cap > 0),
  review_sla_hours integer not null check (review_sla_hours > 0),
  allowed_platforms text[] not null,
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- 예산 에스크로
create type escrow_status as enum ('awaiting_manual_confirm', 'confirmed', 'pg_pending');

create table campaign_escrow (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  escrow_status escrow_status not null default 'awaiting_manual_confirm',
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz
);

-- 크리에이터 지원
create type application_status as enum ('applied', 'approved', 'rejected');

create table campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  status application_status not null default 'applied',
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

-- 클립 제출
create type clip_status as enum ('pending_review', 'approved', 'rejected');

create table clips (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  platform text not null,
  url text not null,
  status clip_status not null default 'pending_review',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  sla_deadline timestamptz not null
);

-- 조회수 스냅샷
create table view_snapshots (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references clips(id) on delete cascade,
  view_count bigint not null check (view_count >= 0),
  captured_at timestamptz not null default now()
);

-- 정산
create type settlement_status as enum ('pending', 'requested', 'paid');

create table settlements (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  clip_id uuid not null references clips(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status settlement_status not null default 'pending',
  period text not null
);

-- 신규 가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'creator', coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

(파일: `supabase/migrations/0001_init.sql`)

- [ ] **Step 3: 마이그레이션 문법 검증**

Run: `npx supabase@latest db lint --schema public -f supabase/migrations/0001_init.sql`
Expected: SQL 문법 오류 없이 종료 (Supabase 프로젝트 연결 전이라 실제 적용은 Task 9 이후 `supabase db push`로 수행)

- [ ] **Step 4: 커밋**

```bash
git add supabase/config.toml supabase/migrations/0001_init.sql
git commit -m "feat(db): add initial supabase schema migration"
```

---

### Task 9: Supabase RLS 정책 마이그레이션

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

**의존:** Task 8 완료 후 진행 (테이블이 먼저 존재해야 함)

- [ ] **Step 1: RLS 정책 작성**

설계 문서 3장의 권한 규칙을 그대로 구현 -- 브랜드는 자기 캠페인만, 크리에이터는 자기 클립/지원서만, 관리자는 전체. 트랙 분기(매니지드 비노출)도 여기서 이중 방어로 강제.

```sql
alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table campaign_escrow enable row level security;
alter table campaign_applications enable row level security;
alter table clips enable row level security;
alter table view_snapshots enable row level security;
alter table settlements enable row level security;

create or replace function current_role_is(target_role user_role)
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = target_role
  );
$$ language sql stable security definer;

-- profiles
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or current_role_is('admin'));
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- campaigns
create policy "campaigns_brand_crud" on campaigns
  for all using (brand_id = auth.uid() or current_role_is('admin'))
  with check (brand_id = auth.uid() or current_role_is('admin'));

create policy "campaigns_creator_select_self_serve" on campaigns
  for select using (track = 'self_serve' and status = 'live');

create policy "campaigns_creator_select_invited_managed" on campaigns
  for select using (
    track = 'managed' and exists (
      select 1 from campaign_applications ca
      where ca.campaign_id = campaigns.id and ca.creator_id = auth.uid()
    )
  );

-- campaign_escrow
create policy "escrow_brand_select" on campaign_escrow
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );
create policy "escrow_admin_insert" on campaign_escrow
  for insert with check (current_role_is('admin'));
create policy "escrow_admin_update" on campaign_escrow
  for update using (current_role_is('admin'));

-- campaign_applications
create policy "applications_creator_crud_own" on campaign_applications
  for all using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "applications_brand_select" on campaign_applications
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );

-- clips
create policy "clips_creator_crud_own" on clips
  for all using (creator_id = auth.uid())
  with check (creator_id = auth.uid());
create policy "clips_brand_select" on clips
  for select using (
    exists (select 1 from campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
    or current_role_is('admin')
  );
create policy "clips_admin_update" on clips
  for update using (current_role_is('admin'));

-- view_snapshots
create policy "view_snapshots_select" on view_snapshots
  for select using (
    exists (
      select 1 from clips cl
      join campaigns c on c.id = cl.campaign_id
      where cl.id = clip_id and (cl.creator_id = auth.uid() or c.brand_id = auth.uid())
    )
    or current_role_is('admin')
  );
create policy "view_snapshots_admin_insert" on view_snapshots
  for insert with check (current_role_is('admin'));

-- settlements
create policy "settlements_creator_select" on settlements
  for select using (creator_id = auth.uid() or current_role_is('admin'));
create policy "settlements_admin_write" on settlements
  for all using (current_role_is('admin'))
  with check (current_role_is('admin'));
```

(파일: `supabase/migrations/0002_rls.sql`)

- [ ] **Step 2: 마이그레이션 문법 검증**

Run: `npx supabase@latest db lint --schema public -f supabase/migrations/0002_rls.sql`
Expected: SQL 문법 오류 없이 종료

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat(db): add row level security policies and track branching rules"
```

> **참고 (실제 프로젝트 연결 시 필수 작업):** 위 두 마이그레이션은 `supabase link --project-ref <ref>` 로 실제 프로젝트에 연결한 뒤 `supabase db push`로 적용해야 함. 구글/카카오 OAuth는 Supabase 대시보드에서 프로바이더 활성화, 네이버는 Edge Function 기반 커스텀 OAuth 플로우가 별도로 필요 -- 이 작업은 실제 Supabase 프로젝트가 생성된 이후 진행 (이 계획 범위 밖, 다음 하위 프로젝트에서 다룸).

---

### Task 10: apps/app -- Next.js 스캐폴드 + 역할 기반 미들웨어

**Files:**
- Create: `apps/app/package.json`
- Create: `apps/app/tsconfig.json`
- Create: `apps/app/next.config.ts`
- Create: `apps/app/tailwind.config.ts`
- Create: `apps/app/postcss.config.js`
- Create: `apps/app/app/globals.css`
- Create: `apps/app/app/layout.tsx`
- Create: `apps/app/app/page.tsx`
- Create: `apps/app/app/login/page.tsx`
- Create: `apps/app/app/brand/layout.tsx`
- Create: `apps/app/app/brand/page.tsx`
- Create: `apps/app/app/creator/layout.tsx`
- Create: `apps/app/app/creator/page.tsx`
- Create: `apps/app/app/admin/layout.tsx`
- Create: `apps/app/app/admin/page.tsx`
- Create: `apps/app/middleware.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@clipers/app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "echo \"no tests in this package yet\""
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@clipers/ui": "workspace:*",
    "@clipers/db": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clipers/ui', '@clipers/db'],
};

export default nextConfig;
```

- [ ] **Step 4: tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';
import { clipersPreset } from '@clipers/ui';

const config: Config = {
  presets: [clipersPreset as Config],
  content: ['./app/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **Step 5: postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: 전역 스타일**

```css
@import '@clipers/ui/src/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

(파일: `apps/app/app/globals.css`)

- [ ] **Step 7: 루트 레이아웃**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clipers App',
  description: '브랜드·크리에이터·운영자용 Clipers 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

(파일: `apps/app/app/layout.tsx`)

- [ ] **Step 8: 홈/로그인 placeholder**

```tsx
export default function AppHomePage() {
  return <main>Clipers App</main>;
}
```

(파일: `apps/app/app/page.tsx`)

```tsx
export default function LoginPage() {
  return <main>로그인 (추후 구현)</main>;
}
```

(파일: `apps/app/app/login/page.tsx`)

- [ ] **Step 9: 역할별 라우트 placeholder -- brand**

```tsx
export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="brand">{children}</div>;
}
```

(파일: `apps/app/app/brand/layout.tsx`)

```tsx
export default function BrandHomePage() {
  return <main>브랜드 대시보드 (추후 구현)</main>;
}
```

(파일: `apps/app/app/brand/page.tsx`)

- [ ] **Step 10: 역할별 라우트 placeholder -- creator**

```tsx
export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="creator">{children}</div>;
}
```

(파일: `apps/app/app/creator/layout.tsx`)

```tsx
export default function CreatorHomePage() {
  return <main>크리에이터 대시보드 (추후 구현)</main>;
}
```

(파일: `apps/app/app/creator/page.tsx`)

- [ ] **Step 11: 역할별 라우트 placeholder -- admin**

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-role="admin">{children}</div>;
}
```

(파일: `apps/app/app/admin/layout.tsx`)

```tsx
export default function AdminHomePage() {
  return <main>운영 어드민 (추후 구현)</main>;
}
```

(파일: `apps/app/app/admin/page.tsx`)

- [ ] **Step 12: 역할 기반 미들웨어**

설계 문서 3장: 세션의 `role`을 읽어 `/brand`, `/creator`, `/admin` 접근을 서버 단에서 차단.

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ROLE_ROUTE_PREFIX: Record<string, string> = {
  brand: '/brand',
  creator: '/creator',
  admin: '/admin',
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set(name, value, options),
        remove: (name, options) => response.cookies.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const matchedRole = Object.entries(ROLE_ROUTE_PREFIX).find(([, prefix]) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!matchedRole) {
    return response;
  }

  const [requiredRole] = matchedRole;

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== requiredRole) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/brand/:path*', '/creator/:path*', '/admin/:path*'],
};
```

(파일: `apps/app/middleware.ts`)

- [ ] **Step 13: 빌드 확인**

Run: `pnpm install && pnpm --filter @clipers/app build`
Expected: 환경변수가 없어도 빌드 자체는 성공(미들웨어는 런타임에만 사용) -- 빌드가 실패하면 위 파일들의 오타를 먼저 확인

- [ ] **Step 14: 커밋**

```bash
git add apps/app
git commit -m "feat(app): scaffold next.js app with role-based route guard"
```

---

### Task 11: apps/site -- Next.js 스캐폴드 + 3개 랜딩 진입점

**Files:**
- Create: `apps/site/package.json`
- Create: `apps/site/tsconfig.json`
- Create: `apps/site/next.config.ts`
- Create: `apps/site/tailwind.config.ts`
- Create: `apps/site/postcss.config.js`
- Create: `apps/site/app/globals.css`
- Create: `apps/site/app/layout.tsx`
- Create: `apps/site/app/page.tsx`
- Create: `apps/site/app/for-creators/page.tsx`
- Create: `apps/site/app/for-brands/page.tsx`

- [ ] **Step 1: package.json**

```json
{
  "name": "@clipers/site",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "echo \"no tests in this package yet\""
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@clipers/ui": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clipers/ui'],
};

export default nextConfig;
```

- [ ] **Step 4: tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';
import { clipersPreset } from '@clipers/ui';

const config: Config = {
  presets: [clipersPreset as Config],
  content: ['./app/**/*.{ts,tsx}'],
};

export default config;
```

- [ ] **Step 5: postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: 전역 스타일**

```css
@import '@clipers/ui/src/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

(파일: `apps/site/app/globals.css`)

- [ ] **Step 7: 루트 레이아웃**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clipers',
  description: '국내 음원·K팝 콘텐츠 특화 클리핑 캠페인 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

(파일: `apps/site/app/layout.tsx`)

- [ ] **Step 8: 회사소개 진입점 (`/`)**

```tsx
export default function CompanyIntroPage() {
  return (
    <main>
      <h1>Clipers</h1>
      <p>국내 음원·K팝 콘텐츠 특화 클리핑 캠페인 플랫폼입니다.</p>
    </main>
  );
}
```

(파일: `apps/site/app/page.tsx`)

- [ ] **Step 9: 크리에이터용 히어로 진입점 (`/for-creators`)**

```tsx
export default function ForCreatorsHeroPage() {
  return (
    <main>
      <h1>클립 만들고, 조회수만큼 정산받기</h1>
      <p>음원·K팝 콘텐츠로 숏폼 클립을 제작하고 검증된 조회수만큼 리워드를 받으세요.</p>
    </main>
  );
}
```

(파일: `apps/site/app/for-creators/page.tsx`)

- [ ] **Step 10: 광고주용 히어로 진입점 (`/for-brands`)**

```tsx
export default function ForBrandsHeroPage() {
  return (
    <main>
      <h1>예산을 걸면, 검증된 조회수만큼만 정산됩니다</h1>
      <p>브랜드·레이블이 예산을 걸면 크리에이터가 숏폼 클립을 제작해 확산시킵니다.</p>
    </main>
  );
}
```

(파일: `apps/site/app/for-brands/page.tsx`)

- [ ] **Step 11: 빌드 확인**

Run: `pnpm install && pnpm --filter @clipers/site build`
Expected: 빌드 성공, `/`, `/for-creators`, `/for-brands` 3개 라우트 생성 확인

- [ ] **Step 12: 커밋**

```bash
git add apps/site
git commit -m "feat(site): scaffold marketing site with three landing entry points"
```

---

### Task 12: CI -- GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test
      - run: pnpm turbo run build
```

(파일: `.github/workflows/ci.yml`)

- [ ] **Step 2: 로컬에서 동일 파이프라인 실행해 확인**

Run: `pnpm turbo run test && pnpm turbo run build`
Expected: 모든 패키지의 test/build 태스크가 통과

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run tests and build on push and pull request"
```

---

## Self-Review 체크리스트 (계획 작성자용, 참고)

- **스펙 커버리지**: 설계 문서 1~6장 모두 최소 1개 태스크로 반영됨 (구조=T1, 데이터모델=T8, RLS/트랙분기=T9, 디자인토큰=T3, 비즈니스로직=T5~T7, 테스트/CI=T12)
- **플레이스홀더 스캔**: 없음 -- 모든 스텝에 실제 코드/명령어 포함
- **타입 일관성**: `ServiceResult<T>`/`err`/`ok`는 Task 4에서 정의, Task 5~7에서 동일 시그니처로 재사용. `clipersPreset`은 Task 3에서 정의해 Task 10/11에서 그대로 import
