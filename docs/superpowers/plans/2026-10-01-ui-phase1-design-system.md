# UI 리디자인 1단계 — 디자인 시스템 + 앱 셸 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Whop/Frosted UI 토큰과 컴포넌트 구조를 `packages/ui`에 이식하고, 미사용 Tailwind를 제거하고, 세 워크스페이스를 새 앱 셸(상단바·반응형 사이드바·사용자 메뉴·로그아웃)로 감싼다.

**Architecture:** `packages/ui`가 토큰(`styles/tokens.css`), 리셋(`styles/base.css`), 컴포넌트 스타일(`styles/components.css`, `cl-` 접두 클래스)과 React 컴포넌트를 소유한다. 계산이 필요한 부분(차트 좌표, 체크리스트 진행도, 아바타, 숫자 포맷)은 `src/lib`의 순수 함수로 두고 테스트한다. 기존 페이지는 2~6단계에서 재작성되므로, 이번 단계에서는 앱 `globals.css`에 레거시 `app-*` 클래스를 새 토큰 기반으로 남겨 두어 화면이 깨지지 않게 한다.

**Tech Stack:** React 19, Next.js 15, TypeScript, lucide-react(MIT 아이콘), Vitest. Tailwind 제거.

**Spec:** `docs/superpowers/specs/2026-10-01-ui-redesign-design.md` §2, §3

**실행 메모:** 각 코드 블록 바로 위의 `**File:** \`경로\`` 표기가 생성할 파일 경로다.

---

### Task 1: Tailwind 제거

**Files:**
- Delete: `apps/app/tailwind.config.ts`, `apps/app/postcss.config.js`, `apps/site/tailwind.config.ts`, `apps/site/postcss.config.js`
- Delete: `packages/ui/src/tailwind-preset.ts`, `packages/ui/src/tailwind-preset.test.ts`
- Modify: `apps/app/package.json`, `apps/site/package.json`, `packages/ui/package.json`, `packages/ui/src/index.ts`
- Modify: `apps/app/app/globals.css`, `apps/site/app/globals.css` (`@tailwind` 세 줄 제거)

- [ ] **Step 1: 설정/프리셋 파일 삭제**

```bash
git rm -q apps/app/tailwind.config.ts apps/app/postcss.config.js apps/site/tailwind.config.ts apps/site/postcss.config.js packages/ui/src/tailwind-preset.ts packages/ui/src/tailwind-preset.test.ts
```

- [ ] **Step 2: 의존성 제거**

```bash
pnpm --filter @clipers/app remove tailwindcss postcss autoprefixer
pnpm --filter @clipers/site remove tailwindcss postcss autoprefixer
pnpm --filter @clipers/ui remove tailwindcss
```

- [ ] **Step 3: `packages/ui/src/index.ts`에서 프리셋 export 제거, 두 앱 `globals.css`에서 `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;` 세 줄 제거**

- [ ] **Step 4: 빌드 확인** — `pnpm turbo run build --force` → 성공. (Task 3에서 CSS 리셋이 들어가기 전까지 브라우저 기본 스타일이 잠깐 보일 수 있으나 빌드는 통과해야 함)

- [ ] **Step 5: 커밋** — `chore: remove unused Tailwind (zero utility classes in use)`

---

### Task 2: `packages/ui` 패키지 설정 + 순수 헬퍼 (TDD)

**Files:**
- Modify: `packages/ui/package.json`, `packages/ui/tsconfig.json`
- Create: `packages/ui/src/lib/{cx,avatar,checklist,chart,format}.ts` + 각 `.test.ts`

- [ ] **Step 1: 의존성 추가**

```bash
pnpm --filter @clipers/ui add lucide-react
pnpm --filter @clipers/ui add -D react @types/react
pnpm --filter @clipers/app add lucide-react
```

`packages/ui/package.json`에 `"peerDependencies": { "react": "^19.0.0" }` 추가.

- [ ] **Step 2: tsconfig에 JSX 설정**

**File:** `packages/ui/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 실패하는 테스트 작성**

**File:** `packages/ui/src/lib/avatar.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { avatarGradient, initials } from './avatar';

describe('initials', () => {
  it('uses the first letters of the first two words', () => {
    expect(initials('Grace Hopper')).toBe('GH');
  });

  it('uses the first two characters of a single latin word', () => {
    expect(initials('a31713080')).toBe('A3');
  });

  it('uses only the first syllable for Hangul names', () => {
    expect(initials('홍길동')).toBe('홍');
  });

  it('falls back to a question mark for blank names', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('avatarGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(avatarGradient('user-1')).toBe(avatarGradient('user-1'));
  });

  it('returns a CSS linear-gradient', () => {
    expect(avatarGradient('user-1')).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/);
  });
});
```

**File:** `packages/ui/src/lib/checklist.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { checklistProgress } from './checklist';

describe('checklistProgress', () => {
  it('counts done items and points at the first unfinished one', () => {
    expect(
      checklistProgress([
        { id: 'account', done: true },
        { id: 'apply', done: false },
        { id: 'submit', done: false },
      ])
    ).toEqual({ done: 1, total: 3, currentId: 'apply' });
  });

  it('has no current item once everything is done', () => {
    expect(checklistProgress([{ id: 'a', done: true }])).toEqual({ done: 1, total: 1, currentId: null });
  });
});
```

**File:** `packages/ui/src/lib/chart.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { buildLineChart, niceMax } from './chart';

describe('niceMax', () => {
  it('rounds up to a readable axis maximum', () => {
    expect(niceMax(0)).toBe(100);
    expect(niceMax(80)).toBe(100);
    expect(niceMax(100)).toBe(100);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(4_100_000)).toBe(5_000_000);
  });
});

describe('buildLineChart', () => {
  it('returns an empty path but a 0..100 axis when there is no data', () => {
    const chart = buildLineChart([], 600, 200);
    expect(chart.line).toBe('');
    expect(chart.area).toBe('');
    expect(chart.yTicks.map((tick) => tick.value)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('maps points across the full width and scales to the nice max', () => {
    const chart = buildLineChart(
      [
        { label: '9/1', value: 0 },
        { label: '9/2', value: 50 },
        { label: '9/3', value: 100 },
      ],
      600,
      200
    );
    expect(chart.line).toBe('M0,200 L300,100 L600,0');
    expect(chart.area).toBe('M0,200 L300,100 L600,0 L600,200 L0,200 Z');
  });

  it('always labels the last point', () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ label: `d${index}`, value: index }));
    const chart = buildLineChart(points, 600, 200);
    expect(chart.xLabels.at(-1)?.label).toBe('d29');
    expect(chart.xLabels.length).toBeLessThanOrEqual(6);
  });
});
```

**File:** `packages/ui/src/lib/format.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { formatCompactNumber, formatKRW } from './format';

describe('formatKRW', () => {
  it('rounds and groups won amounts', () => {
    expect(formatKRW(1234.4)).toBe('1,234원');
  });
});

describe('formatCompactNumber', () => {
  it('uses Korean compact units', () => {
    expect(formatCompactNumber(4_100_000)).toBe('410만');
    expect(formatCompactNumber(950)).toBe('950');
  });
});
```

**File:** `packages/ui/src/lib/cx.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('joins truthy class names', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});
```

- [ ] **Step 4: 실패 확인** — `pnpm --filter @clipers/ui test` → FAIL (모듈 없음)

- [ ] **Step 5: 구현**

**File:** `packages/ui/src/lib/cx.ts`
```ts
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
```

**File:** `packages/ui/src/lib/avatar.ts`
```ts
const GRADIENTS: Array<[string, string]> = [
  ['#58b982', '#2f6c48'],
  ['#75c7f0', '#6e56cf'],
  ['#ffc53d', '#e54d2e'],
  ['#baa7ff', '#58b982'],
  ['#ff977d', '#baa7ff'],
  ['#7fd6a4', '#75c7f0'],
];

const HANGUL = /[ㄱ-ㆎ가-힣]/;

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (HANGUL.test(trimmed[0])) return trimmed[0];

  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return Array.from(trimmed).slice(0, 2).join('').toUpperCase();
}

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
```

**File:** `packages/ui/src/lib/checklist.ts`
```ts
export type ChecklistState = { id: string; done: boolean };

export function checklistProgress(items: ChecklistState[]): { done: number; total: number; currentId: string | null } {
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
    currentId: items.find((item) => !item.done)?.id ?? null,
  };
}
```

**File:** `packages/ui/src/lib/chart.ts`
```ts
export type ChartPoint = { label: string; value: number };

export type ChartGeometry = {
  max: number;
  line: string;
  area: string;
  yTicks: { value: number; y: number }[];
  xLabels: { label: string; x: number }[];
};

const MULTIPLIERS = [1, 2, 2.5, 5, 10];

export function niceMax(value: number): number {
  if (value <= 0) return 100;
  const base = 10 ** Math.floor(Math.log10(value));
  const multiplier = MULTIPLIERS.find((candidate) => candidate * base >= value) ?? 10;
  return Math.max(100, multiplier * base);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildLineChart(points: ChartPoint[], width: number, height: number, tickCount = 5): ChartGeometry {
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: round(points.length > 1 ? index * stepX : width / 2),
    y: round(height - (Math.max(0, point.value) / max) * height),
  }));

  const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x},${coord.y}`).join(' ');
  const area = coords.length > 0 ? `${line} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z` : '';

  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (max / tickCount) * index;
    return { value, y: round(height - (value / max) * height) };
  });

  const labelCount = Math.min(6, points.length);
  const labelIndexes = new Set<number>();
  for (let slot = 0; slot < labelCount; slot += 1) {
    labelIndexes.add(labelCount === 1 ? points.length - 1 : Math.round((slot * (points.length - 1)) / (labelCount - 1)));
  }
  const xLabels = [...labelIndexes]
    .sort((left, right) => left - right)
    .map((index) => ({ label: points[index].label, x: coords[index].x }));

  return { max, line, area, yTicks, xLabels };
}
```

**File:** `packages/ui/src/lib/format.ts`
```ts
const WON = new Intl.NumberFormat('ko-KR');
const COMPACT = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatKRW(value: number): string {
  return `${WON.format(Math.round(value))}원`;
}

export function formatCompactNumber(value: number): string {
  return COMPACT.format(value);
}
```

- [ ] **Step 6: 통과 확인** — `pnpm --filter @clipers/ui test` → PASS

- [ ] **Step 7: 커밋** — `feat(ui): add pure helpers for charts, checklists, avatars and formatting`

---

### Task 3: 스타일 — 토큰, 리셋, 컴포넌트

**Files:**
- Create: `packages/ui/src/styles/{tokens,base,components,index}.css`
- Delete: `packages/ui/src/tokens.css` (내용은 `styles/tokens.css`로 이관, 기존 변수명은 별칭으로 유지)

- [ ] **Step 1: 토큰**

**File:** `packages/ui/src/styles/tokens.css`
```css
/*
 * Scales below are ported from Frosted UI (https://github.com/whopio/frosted-ui),
 * Copyright (c) 2023 WorkOS, Copyright (c) 2023 Whop — MIT License.
 * Brand scale is derived from the official Clipers logo fill #58B982.
 */
:root {
  color-scheme: dark;

  --gray-1: #111111;
  --gray-2: #191919;
  --gray-3: #222222;
  --gray-4: #2a2a2a;
  --gray-5: #313131;
  --gray-6: #3a3a3a;
  --gray-7: #484848;
  --gray-8: #606060;
  --gray-9: #6e6e6e;
  --gray-10: #7b7b7b;
  --gray-11: #b4b4b4;
  --gray-12: #eeeeee;
  --gray-a2: rgba(255, 255, 255, 0.04);
  --gray-a3: rgba(255, 255, 255, 0.07);
  --gray-a4: rgba(255, 255, 255, 0.106);
  --gray-a5: rgba(255, 255, 255, 0.14);

  --brand-3: #13291d;
  --brand-4: #173524;
  --brand-6: #245538;
  --brand-8: #3c8a5c;
  --brand-9: #58b982;
  --brand-10: #63c58d;
  --brand-11: #7fd6a4;
  --brand-12: #c8f0d8;
  --brand-a2: rgba(88, 185, 130, 0.07);
  --brand-a3: rgba(88, 185, 130, 0.12);
  --brand-a4: rgba(88, 185, 130, 0.2);
  --brand-contrast: #06140c;
  --brand-gradient: linear-gradient(90deg, #4fae78 0%, #6fcb98 100%);

  --amber-9: #ffc53d;
  --amber-11: #ffca16;
  --amber-a3: rgba(255, 197, 61, 0.12);
  --tomato-9: #e54d2e;
  --tomato-11: #ff977d;
  --tomato-a3: rgba(229, 77, 46, 0.14);
  --sky-9: #7ce2fe;
  --sky-11: #75c7f0;
  --sky-a3: rgba(124, 226, 254, 0.12);
  --violet-9: #6e56cf;
  --violet-11: #baa7ff;
  --violet-a3: rgba(110, 86, 207, 0.18);

  --color-background: var(--gray-1);
  --color-panel: var(--gray-2);
  --color-field: var(--gray-3);
  --color-text: var(--gray-12);
  --color-text-muted: var(--gray-11);
  --color-text-subtle: var(--gray-10);
  --color-border: var(--gray-a3);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 40px;
  --space-8: 48px;
  --space-9: 64px;

  --radius-1: 3px;
  --radius-2: 4px;
  --radius-3: 6px;
  --radius-4: 8px;
  --radius-5: 12px;
  --radius-6: 16px;
  --radius-full: 9999px;

  --font-size-0: 10px;
  --font-size-1: 12px;
  --font-size-2: 14px;
  --font-size-3: 16px;
  --font-size-4: 18px;
  --font-size-5: 20px;
  --font-size-6: 24px;
  --font-size-7: 28px;
  --font-size-8: 32px;
  --font-size-9: 40px;
  --font-body: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif;
  --font-heading: var(--font-body);

  /* Aliases kept for legacy app-* styles until phases 3-6 replace them. */
  --bg-primary: var(--color-background);
  --bg-panel: var(--color-panel);
  --text-primary: var(--color-text);
  --border-stroke: var(--gray-a4);
  --border-width: 1px;
  --brand-primary: var(--brand-9);
  --brand-primary-dark: #479a6b;
  --action-primary: var(--brand-9);
  --status-positive: #f5a524;
  --radius-button: var(--radius-4);
  --avatar-ring-width: 1.6px;
}
```

- [ ] **Step 2: 리셋**

**File:** `packages/ui/src/styles/base.css`
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--font-size-2);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1,
h2,
h3,
h4,
p {
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 2px solid var(--brand-9);
  outline-offset: 2px;
}
```

- [ ] **Step 3: 컴포넌트 스타일**

**File:** `packages/ui/src/styles/components.css`
```css
/* ---------- tones (shared by badges, stat icons, empty states, progress) ---------- */
.cl-tone-neutral { --tone-bg: var(--gray-a3); --tone-fg: var(--gray-11); --tone-solid: var(--gray-6); }
.cl-tone-brand { --tone-bg: var(--brand-a3); --tone-fg: var(--brand-11); --tone-solid: var(--brand-9); }
.cl-tone-amber { --tone-bg: var(--amber-a3); --tone-fg: var(--amber-11); --tone-solid: var(--amber-9); }
.cl-tone-tomato { --tone-bg: var(--tomato-a3); --tone-fg: var(--tomato-11); --tone-solid: var(--tomato-9); }
.cl-tone-sky { --tone-bg: var(--sky-a3); --tone-fg: var(--sky-11); --tone-solid: var(--sky-9); }
.cl-tone-violet { --tone-bg: var(--violet-a3); --tone-fg: var(--violet-11); --tone-solid: var(--violet-9); }

/* ---------- app shell ---------- */
.cl-shell { min-height: 100vh; }

.cl-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 60px;
  padding: 0 var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.cl-topbar__logo { display: inline-flex; align-items: center; }
.cl-topbar__logo img { display: block; height: 22px; width: auto; }
.cl-topbar__end { display: flex; align-items: center; gap: var(--space-2); margin-left: auto; }

.cl-shell__body { display: grid; grid-template-columns: 264px minmax(0, 1fr); }
.cl-shell__main { min-width: 0; }
.cl-menu-toggle { display: none; }
.cl-scrim { display: none; }

.cl-sidebar {
  position: sticky;
  top: 60px;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--color-border);
  background: var(--color-background);
}

.cl-sidebar__section { display: grid; gap: 2px; }
.cl-sidebar__section-title {
  padding: 0 var(--space-3);
  margin-bottom: var(--space-1);
  color: var(--color-text-subtle);
  font-size: var(--font-size-1);
  font-weight: 500;
}

.cl-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-3);
  font-weight: 500;
}
.cl-sidebar__item:hover { background: var(--gray-a2); color: var(--color-text); }
.cl-sidebar__item[aria-current="page"] { background: var(--gray-a3); color: var(--color-text); box-shadow: inset 0 0 0 1px var(--gray-a3); }
.cl-sidebar__item svg { flex: 0 0 auto; }
.cl-sidebar__badge { margin-left: auto; }
.cl-sidebar__footer { margin-top: auto; }

@media (max-width: 768px) {
  .cl-topbar { padding: 0 var(--space-4); }
  .cl-menu-toggle { display: inline-flex; }
  .cl-shell__body { grid-template-columns: minmax(0, 1fr); }
  .cl-shell__nav .cl-sidebar {
    position: fixed;
    top: 60px;
    bottom: 0;
    left: 0;
    z-index: 40;
    width: 280px;
    height: auto;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  .cl-shell[data-nav-open="true"] .cl-shell__nav .cl-sidebar { transform: none; }
  .cl-shell[data-nav-open="true"] .cl-scrim {
    position: fixed;
    inset: 60px 0 0;
    z-index: 35;
    display: block;
    background: rgba(0, 0, 0, 0.55);
  }
}

/* ---------- page ---------- */
.cl-page { width: min(1080px, 100% - 48px); margin: 0 auto; padding: var(--space-6) 0 var(--space-9); }
.cl-page-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); }
.cl-page-header__title { font-size: var(--font-size-8); font-weight: 650; letter-spacing: -0.01em; line-height: 1.2; }
.cl-page-header__description { margin-top: var(--space-2); color: var(--color-text-muted); font-size: var(--font-size-3); }
.cl-page-header__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
@media (max-width: 640px) {
  .cl-page { width: min(100% - 32px, 1080px); padding-top: var(--space-5); }
  .cl-page-header__title { font-size: var(--font-size-6); }
}

/* ---------- buttons ---------- */
.cl-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 0;
  border-radius: var(--radius-full);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
}
.cl-button--sm { height: 32px; padding: 0 var(--space-3); font-size: var(--font-size-1); }
.cl-button--md { height: 40px; padding: 0 var(--space-4); font-size: var(--font-size-2); }
.cl-button--lg { height: 52px; padding: 0 var(--space-6); font-size: var(--font-size-3); }
.cl-button--block { width: 100%; }
.cl-button--primary { background: var(--brand-gradient); color: var(--brand-contrast); }
.cl-button--primary:hover { filter: brightness(1.07); }
.cl-button--secondary { background: var(--gray-4); color: var(--color-text); }
.cl-button--secondary:hover { background: var(--gray-5); }
.cl-button--ghost { background: transparent; color: var(--color-text-muted); }
.cl-button--ghost:hover { background: var(--gray-a3); color: var(--color-text); }
.cl-button--danger { background: var(--tomato-a3); color: var(--tomato-11); }
.cl-button--danger:hover { filter: brightness(1.15); }
.cl-button:disabled,
.cl-button[aria-disabled="true"] { cursor: not-allowed; opacity: 0.45; filter: none; }

.cl-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.cl-icon-button:hover { background: var(--gray-a3); color: var(--color-text); }

/* ---------- badge / avatar ---------- */
.cl-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--tone-bg);
  color: var(--tone-fg);
  font-size: var(--font-size-1);
  font-weight: 600;
  white-space: nowrap;
}
.cl-badge--solid { background: var(--tone-solid); color: var(--brand-contrast); }

.cl-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background-size: cover;
  color: #fff;
  font-weight: 700;
  object-fit: cover;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.cl-avatar--sm { width: 28px; height: 28px; font-size: var(--font-size-1); }
.cl-avatar--md { width: 36px; height: 36px; font-size: var(--font-size-2); }
.cl-avatar--lg { width: 56px; height: 56px; font-size: var(--font-size-5); }

/* ---------- card ---------- */
.cl-card { padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-6); background: var(--color-panel); }
.cl-card--flush { padding: 0; overflow: hidden; }
.cl-card__header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.cl-card__title { font-size: var(--font-size-4); font-weight: 600; }
.cl-card__description { margin-top: 2px; color: var(--color-text-muted); }

/* ---------- progress ---------- */
.cl-progress { height: 6px; overflow: hidden; border-radius: var(--radius-full); background: var(--gray-4); }
.cl-progress__fill { height: 100%; border-radius: inherit; background: var(--tone-solid); transition: width 0.3s ease; }
.cl-progress.cl-tone-brand .cl-progress__fill { background: var(--brand-gradient); }

/* ---------- stat card ---------- */
.cl-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); }
.cl-stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-5);
  background: var(--color-panel);
}
.cl-stat--highlight { background: linear-gradient(90deg, var(--tone-bg), var(--color-panel) 70%); }
.cl-stat__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--tone-bg);
  color: var(--tone-fg);
}
.cl-stat__value { font-size: var(--font-size-5); font-weight: 650; line-height: 1.2; }
.cl-stat__label { color: var(--color-text-muted); font-size: var(--font-size-1); }

/* ---------- tabs ---------- */
.cl-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-panel);
}
.cl-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-subtle);
  font-weight: 600;
  cursor: pointer;
}
.cl-tab:hover { color: var(--color-text); }
.cl-tab[aria-selected="true"] { background: var(--gray-4); color: var(--color-text); }
.cl-tab__count { color: var(--gray-9); font-weight: 500; }

/* ---------- empty state ---------- */
.cl-empty { display: grid; justify-items: center; gap: var(--space-2); padding: var(--space-9) var(--space-4); text-align: center; }
.cl-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--tone-solid);
  color: var(--brand-contrast);
}
.cl-empty__title { font-size: var(--font-size-4); font-weight: 600; }
.cl-empty__description { max-width: 440px; color: var(--color-text-muted); }
.cl-empty__action { margin-top: var(--space-3); }

/* ---------- form controls ---------- */
.cl-field { display: grid; gap: var(--space-2); }
.cl-field__label { color: var(--color-text-muted); font-size: var(--font-size-1); font-weight: 500; }
.cl-field__meta { display: flex; justify-content: space-between; gap: var(--space-2); color: var(--gray-9); font-size: var(--font-size-1); }
.cl-field__counter { margin-left: auto; }
.cl-field__error { color: var(--tomato-11); }

.cl-input,
.cl-select,
.cl-textarea {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--radius-5);
  background: var(--color-field);
  color: var(--color-text);
  transition: border-color 0.15s ease;
}
.cl-input,
.cl-select { height: 46px; padding: 0 var(--space-4); }
.cl-textarea { min-height: 128px; padding: var(--space-3) var(--space-4); resize: vertical; }
.cl-input::placeholder,
.cl-textarea::placeholder { color: var(--gray-9); }
.cl-input:hover,
.cl-select:hover,
.cl-textarea:hover { border-color: var(--gray-a4); }
.cl-input:focus,
.cl-select:focus,
.cl-textarea:focus { border-color: var(--brand-8); outline: none; }
.cl-input[aria-invalid="true"],
.cl-textarea[aria-invalid="true"] { border-color: var(--tomato-9); }
.cl-select {
  appearance: none;
  padding-right: var(--space-8);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23b4b4b4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
}

.cl-switch {
  position: relative;
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--gray-6);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.cl-switch::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: #fff;
  content: "";
  transition: transform 0.15s ease;
}
.cl-switch[aria-checked="true"] { background: var(--brand-9); }
.cl-switch[aria-checked="true"]::after { transform: translateX(18px); }

.cl-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-panel);
  color: var(--color-text-muted);
  font-weight: 600;
  cursor: pointer;
}
.cl-chip:hover { color: var(--color-text); }
.cl-chip[aria-pressed="true"] { border-color: var(--brand-8); background: var(--brand-a3); color: var(--brand-11); }

.cl-option-card {
  position: relative;
  display: grid;
  gap: 2px;
  width: 100%;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  background: var(--color-panel);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.cl-option-card:hover { border-color: var(--gray-a5); }
.cl-option-card[aria-checked="true"] { border-color: var(--brand-8); background: linear-gradient(180deg, var(--brand-a2), var(--color-panel)); }
.cl-option-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-full);
  background: var(--gray-4);
  color: var(--color-text-muted);
}
.cl-option-card[aria-checked="true"] .cl-option-card__icon { background: var(--brand-9); color: var(--brand-contrast); }
.cl-option-card__radio {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--gray-7);
  border-radius: var(--radius-full);
}
.cl-option-card[aria-checked="true"] .cl-option-card__radio { border-color: var(--brand-9); background: var(--brand-9); color: var(--brand-contrast); }
.cl-option-card__title { font-weight: 600; }
.cl-option-card__description { color: var(--color-text-muted); font-size: var(--font-size-2); }

.cl-dropzone {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  padding: var(--space-8) var(--space-4);
  border: 1.5px dashed var(--gray-6);
  border-radius: var(--radius-6);
  background: var(--color-field);
  color: var(--color-text-muted);
  text-align: center;
  cursor: pointer;
}
.cl-dropzone:hover,
.cl-dropzone[data-dragging="true"] { border-color: var(--brand-8); background: var(--brand-a2); color: var(--color-text); }
.cl-dropzone__title { color: var(--color-text); font-weight: 600; }
.cl-dropzone__hint { font-size: var(--font-size-1); }
.cl-dropzone input { display: none; }

/* ---------- dialog ---------- */
.cl-dialog {
  width: min(560px, calc(100% - 32px));
  max-height: calc(100vh - 64px);
  padding: 0;
  border: 1px solid var(--gray-a4);
  border-radius: var(--radius-6);
  background: var(--color-panel);
  color: var(--color-text);
}
.cl-dialog::backdrop { background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); }
.cl-dialog__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-border); }
.cl-dialog__title { font-size: var(--font-size-3); font-weight: 600; }
.cl-dialog__body { display: grid; gap: var(--space-4); padding: var(--space-5); }
.cl-dialog__footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--color-border); }

/* ---------- checklist ---------- */
.cl-checklist__count { color: var(--color-text-muted); font-weight: 600; }
.cl-checklist__progress { margin-bottom: var(--space-3); }
.cl-checklist__items { display: grid; gap: var(--space-1); margin: 0; padding: 0; list-style: none; }
.cl-checklist__item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-5); }
.cl-checklist__item[data-current="true"] { background: var(--gray-3); }
.cl-checklist__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--gray-4);
  color: var(--color-text-muted);
}
.cl-checklist__item[data-done="true"] .cl-checklist__icon { background: var(--brand-9); color: var(--brand-contrast); }
.cl-checklist__text { flex: 1 1 auto; min-width: 0; }
.cl-checklist__title { font-weight: 600; }
.cl-checklist__item[data-done="true"] .cl-checklist__title { color: var(--color-text-muted); }
.cl-checklist__description { color: var(--color-text-muted); font-size: var(--font-size-2); }

/* ---------- timeline ---------- */
.cl-timeline { display: grid; margin: 0; padding: 0; list-style: none; }
.cl-timeline__item { position: relative; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 64px; padding-left: var(--space-6); }
.cl-timeline__item::before { position: absolute; top: 50%; left: 4px; width: 10px; height: 10px; border-radius: var(--radius-full); background: var(--gray-12); content: ""; transform: translateY(-50%); }
.cl-timeline__item:not(:last-child)::after { position: absolute; top: calc(50% + 8px); bottom: calc(-50% + 8px); left: 8px; width: 2px; background: var(--gray-6); content: ""; }
.cl-timeline__label { font-size: var(--font-size-3); font-weight: 600; }
.cl-timeline__count { color: var(--gray-9); font-weight: 500; }
.cl-timeline__value { color: var(--color-text-muted); }
.cl-timeline__value strong { color: var(--color-text); }

/* ---------- summary list ---------- */
.cl-summary { display: grid; gap: var(--space-2); margin: 0; }
.cl-summary__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 52px; padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-5); background: var(--color-panel); }
.cl-summary__label { color: var(--color-text-muted); }
.cl-summary__value { margin: 0; font-weight: 600; text-align: right; }

/* ---------- data table ---------- */
.cl-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-6); background: var(--color-panel); }
.cl-table { width: 100%; border-collapse: collapse; text-align: left; }
.cl-table th,
.cl-table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.cl-table th { color: var(--color-text-subtle); font-size: var(--font-size-1); font-weight: 500; white-space: nowrap; }
.cl-table tbody tr:last-child td { border-bottom: 0; }
.cl-table tbody tr:hover td { background: var(--gray-a2); }
.cl-table__empty { padding: var(--space-7) var(--space-4); color: var(--color-text-muted); text-align: center; }

/* ---------- chart ---------- */
.cl-chart { width: 100%; }
.cl-chart svg { width: 100%; height: auto; overflow: visible; }
.cl-chart__grid { stroke: var(--gray-a3); stroke-width: 1; }
.cl-chart__axis { fill: var(--color-text-subtle); font-size: 11px; }
.cl-chart__line { fill: none; stroke: var(--brand-9); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.cl-chart__last { fill: var(--brand-9); }

/* ---------- user menu ---------- */
.cl-user-menu { position: relative; }
.cl-user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-2) 0 var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-panel);
  color: var(--color-text);
  cursor: pointer;
}
.cl-user-menu__name { max-width: 140px; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.cl-user-menu__panel {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 50;
  display: grid;
  gap: var(--space-1);
  min-width: 220px;
  padding: var(--space-2);
  border: 1px solid var(--gray-a4);
  border-radius: var(--radius-5);
  background: var(--gray-2);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
.cl-user-menu__identity { display: grid; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); }
.cl-user-menu__identity span { color: var(--color-text-muted); font-size: var(--font-size-1); }
.cl-user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: 38px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-3);
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.cl-user-menu__item:hover { background: var(--gray-a3); }
@media (max-width: 480px) { .cl-user-menu__name { display: none; } }

/* ---------- sticky footer ---------- */
.cl-sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  background: rgba(17, 17, 17, 0.92);
  backdrop-filter: blur(12px);
}
.cl-sticky-footer__message { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--tomato-11); font-weight: 500; }
.cl-sticky-footer__actions { display: flex; gap: var(--space-2); margin-left: auto; }
```

- [ ] **Step 4: 진입점**

**File:** `packages/ui/src/styles/index.css`
```css
@import './tokens.css';
@import './base.css';
@import './components.css';
```

- [ ] **Step 5: 기존 토큰 파일 삭제** — `git rm -q packages/ui/src/tokens.css` (두 앱의 `@import` 경로는 Task 5에서 교체)

- [ ] **Step 6: 커밋** — Task 5와 함께 빌드 검증 후 커밋(여기서는 경로가 아직 교체되지 않아 빌드가 깨지므로 Task 4·5까지 진행한 뒤 한 번에 확인)

---

### Task 4: React 컴포넌트

**Files:** Create `packages/ui/src/components/*.tsx`, Modify `packages/ui/src/index.ts`

**File:** `packages/ui/src/components/Button.tsx`
```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonStyleOptions = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string };

export function buttonClass({ variant = 'secondary', size = 'md', block, className }: ButtonStyleOptions = {}): string {
  return cx('cl-button', `cl-button--${variant}`, `cl-button--${size}`, block && 'cl-button--block', className);
}

type ButtonContentProps = { icon?: ReactNode; iconEnd?: ReactNode };

export type ButtonProps = ButtonStyleOptions & ButtonContentProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, size, block, className, icon, iconEnd, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </button>
  );
}

export type ButtonLinkProps = ButtonStyleOptions & ButtonContentProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function ButtonLink({ variant, size, block, className, icon, iconEnd, children, ...rest }: ButtonLinkProps) {
  return (
    <a className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </a>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx('cl-icon-button', className)} {...rest}>
      {children}
    </button>
  );
}
```

**File:** `packages/ui/src/components/Badge.tsx`
```tsx
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type Tone = 'neutral' | 'brand' | 'amber' | 'tomato' | 'sky' | 'violet';

export function Badge({ tone = 'neutral', solid, icon, children }: { tone?: Tone; solid?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cx('cl-badge', `cl-tone-${tone}`, solid && 'cl-badge--solid')}>
      {icon}
      {children}
    </span>
  );
}
```

**File:** `packages/ui/src/components/Avatar.tsx`
```tsx
import { avatarGradient, initials } from '../lib/avatar';
import { cx } from '../lib/cx';

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (src) {
    return <img alt="" className={cx('cl-avatar', `cl-avatar--${size}`)} src={src} />;
  }
  return (
    <span aria-hidden className={cx('cl-avatar', `cl-avatar--${size}`)} style={{ backgroundImage: avatarGradient(name) }}>
      {initials(name)}
    </span>
  );
}
```

**File:** `packages/ui/src/components/Card.tsx`
```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
};

export function Card({ title, description, actions, flush, className, children, ...rest }: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={cx('cl-card', flush && 'cl-card--flush', className)} {...rest}>
      {hasHeader && (
        <div className="cl-card__header">
          <div>
            {title && <h2 className="cl-card__title">{title}</h2>}
            {description && <p className="cl-card__description">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
```

**File:** `packages/ui/src/components/ProgressBar.tsx`
```tsx
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function ProgressBar({ value, tone = 'brand', label }: { value: number; tone?: Tone; label?: string }) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className={cx('cl-progress', `cl-tone-${tone}`)}
      role="progressbar"
    >
      <div className="cl-progress__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
```

**File:** `packages/ui/src/components/StatCard.tsx`
```tsx
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function StatCard({ icon, value, label, tone = 'neutral', highlight }: { icon: ReactNode; value: ReactNode; label: ReactNode; tone?: Tone; highlight?: boolean }) {
  return (
    <div className={cx('cl-stat', `cl-tone-${tone}`, highlight && 'cl-stat--highlight')}>
      <span className="cl-stat__icon">{icon}</span>
      <div>
        <div className="cl-stat__value">{value}</div>
        <div className="cl-stat__label">{label}</div>
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="cl-stat-grid">{children}</div>;
}
```

**File:** `packages/ui/src/components/Tabs.tsx`
```tsx
'use client';

export type TabItem<T extends string> = { value: T; label: string; count?: number };

export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div aria-label={label} className="cl-tabs" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className="cl-tab"
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
          {item.count !== undefined && <span className="cl-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
```

**File:** `packages/ui/src/components/EmptyState.tsx`
```tsx
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import type { Tone } from './Badge';

export function EmptyState({ icon, title, description, action, tone = 'brand' }: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; tone?: Tone }) {
  return (
    <div className={cx('cl-empty', `cl-tone-${tone}`)}>
      <span className="cl-empty__icon">{icon}</span>
      <p className="cl-empty__title">{title}</p>
      {description && <p className="cl-empty__description">{description}</p>}
      {action && <div className="cl-empty__action">{action}</div>}
    </div>
  );
}
```

**File:** `packages/ui/src/components/Field.tsx`
```tsx
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export function Field({ label, htmlFor, error, hint, count, maxLength, children }: {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: ReactNode;
  count?: number;
  maxLength?: number;
  children: ReactNode;
}) {
  const showMeta = error || hint || maxLength !== undefined;
  return (
    <div className="cl-field">
      <label className="cl-field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {showMeta && (
        <div className="cl-field__meta">
          {error ? <span className="cl-field__error">{error}</span> : hint ? <span>{hint}</span> : null}
          {maxLength !== undefined && <span className="cl-field__counter">{count ?? 0}/{maxLength}</span>}
        </div>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('cl-input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('cl-textarea', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('cl-select', className)} {...rest}>
      {children}
    </select>
  );
}
```

**File:** `packages/ui/src/components/Switch.tsx`
```tsx
'use client';

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="cl-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    />
  );
}
```

**File:** `packages/ui/src/components/Chip.tsx`
```tsx
'use client';

import type { ReactNode } from 'react';

export function Chip({ selected, onToggle, icon, children, disabled }: { selected: boolean; onToggle: () => void; icon?: ReactNode; children: ReactNode; disabled?: boolean }) {
  return (
    <button aria-pressed={selected} className="cl-chip" disabled={disabled} onClick={onToggle} type="button">
      {icon}
      {children}
    </button>
  );
}
```

**File:** `packages/ui/src/components/OptionCard.tsx`
```tsx
'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function OptionCard({ icon, title, description, selected, onSelect }: { icon: ReactNode; title: ReactNode; description?: ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <button aria-checked={selected} className="cl-option-card" onClick={onSelect} role="radio" type="button">
      <span className="cl-option-card__icon">{icon}</span>
      <span className="cl-option-card__radio" aria-hidden>{selected && <Check size={12} strokeWidth={3} />}</span>
      <span className="cl-option-card__title">{title}</span>
      {description && <span className="cl-option-card__description">{description}</span>}
    </button>
  );
}
```

**File:** `packages/ui/src/components/Dropzone.tsx`
```tsx
'use client';

import { useId, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';

export function Dropzone({ accept, onFile, title, hint, fileName }: { accept?: string; onFile: (file: File) => void; title: ReactNode; hint?: ReactNode; fileName?: string | null }) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className="cl-dropzone"
      data-dragging={dragging}
      htmlFor={inputId}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <Upload size={22} />
      <span className="cl-dropzone__title">{fileName ?? title}</span>
      {hint && <span className="cl-dropzone__hint">{hint}</span>}
      <input
        accept={accept}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
        type="file"
      />
    </label>
  );
}
```

**File:** `packages/ui/src/components/Dialog.tsx`
```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="cl-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      ref={ref}
    >
      <div className="cl-dialog__header">
        <h2 className="cl-dialog__title">{title}</h2>
        <IconButton label="닫기" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <div className="cl-dialog__body">{children}</div>
      {footer && <div className="cl-dialog__footer">{footer}</div>}
    </dialog>
  );
}
```

**File:** `packages/ui/src/components/Checklist.tsx`
```tsx
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { checklistProgress } from '../lib/checklist';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

export type ChecklistItem = { id: string; icon: ReactNode; title: ReactNode; description?: ReactNode; done: boolean; action?: ReactNode };

export function Checklist({ title, description, items }: { title: ReactNode; description?: ReactNode; items: ChecklistItem[] }) {
  const { done, total, currentId } = checklistProgress(items);
  return (
    <Card actions={<span className="cl-checklist__count">{done} / {total}</span>} description={description} title={title}>
      <div className="cl-checklist__progress">
        <ProgressBar label="진행도" value={total > 0 ? done / total : 0} />
      </div>
      <ol className="cl-checklist__items">
        {items.map((item) => (
          <li className="cl-checklist__item" data-current={item.id === currentId} data-done={item.done} key={item.id}>
            <span className="cl-checklist__icon">{item.done ? <Check size={18} strokeWidth={3} /> : item.icon}</span>
            <div className="cl-checklist__text">
              <p className="cl-checklist__title">{item.title}</p>
              {item.description && <p className="cl-checklist__description">{item.description}</p>}
            </div>
            {!item.done && item.action}
          </li>
        ))}
      </ol>
    </Card>
  );
}
```

**File:** `packages/ui/src/components/Timeline.tsx`
```tsx
import type { ReactNode } from 'react';

export type TimelineItem = { id: string; label: ReactNode; count?: number; valueLabel: ReactNode; value: ReactNode; action?: ReactNode };

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="cl-timeline">
      {items.map((item) => (
        <li className="cl-timeline__item" key={item.id}>
          <span className="cl-timeline__label">
            {item.label} {item.count !== undefined && <span className="cl-timeline__count">({item.count})</span>}
          </span>
          <span className="cl-timeline__value">
            {item.valueLabel}: <strong>{item.value}</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}
```

**File:** `packages/ui/src/components/SummaryList.tsx`
```tsx
import type { ReactNode } from 'react';

export function SummaryList({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="cl-summary">
      {rows.map((row, index) => (
        <div className="cl-summary__row" key={index}>
          <dt className="cl-summary__label">{row.label}</dt>
          <dd className="cl-summary__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

**File:** `packages/ui/src/components/DataTable.tsx`
```tsx
import type { ReactNode } from 'react';

export type Column<Row> = { key: string; header: ReactNode; render: (row: Row) => ReactNode; align?: 'left' | 'right' };

export function DataTable<Row>({ columns, rows, rowKey, empty, label }: { columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string; empty: ReactNode; label: string }) {
  return (
    <div className="cl-table-wrap">
      <table aria-label={label} className="cl-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="cl-table__empty" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

**File:** `packages/ui/src/components/LineChart.tsx`
```tsx
import { useId } from 'react';
import { buildLineChart, type ChartPoint } from '../lib/chart';
import { formatCompactNumber } from '../lib/format';

const WIDTH = 720;
const HEIGHT = 240;
const LEFT = 44;
const BOTTOM = 28;

export function LineChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const gradientId = useId();
  const plotWidth = WIDTH - LEFT;
  const plotHeight = HEIGHT - BOTTOM;
  const chart = buildLineChart(points, plotWidth, plotHeight);
  const last = chart.xLabels.at(-1);

  return (
    <figure aria-label={label} className="cl-chart" role="img">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-9)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand-9)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line className="cl-chart__grid" x1={LEFT} x2={WIDTH} y1={tick.y} y2={tick.y} />
            <text className="cl-chart__axis" dominantBaseline="middle" textAnchor="end" x={LEFT - 8} y={tick.y}>
              {formatCompactNumber(tick.value)}
            </text>
          </g>
        ))}
        <g transform={`translate(${LEFT},0)`}>
          {chart.area && <path d={chart.area} fill={`url(#${gradientId})`} />}
          {chart.line && <path className="cl-chart__line" d={chart.line} />}
          {chart.xLabels.map((tick) => (
            <text className="cl-chart__axis" key={`${tick.label}-${tick.x}`} textAnchor={tick === last ? 'end' : tick.x === 0 ? 'start' : 'middle'} x={tick.x} y={HEIGHT - 6}>
              {tick.label}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  );
}
```

**File:** `packages/ui/src/components/PageHeader.tsx`
```tsx
import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="cl-page-header">
      <div>
        <h1 className="cl-page-header__title">{title}</h1>
        {description && <p className="cl-page-header__description">{description}</p>}
      </div>
      {actions && <div className="cl-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="cl-page">{children}</div>;
}
```

**File:** `packages/ui/src/components/StickyFooter.tsx`
```tsx
import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

export function StickyFooter({ message, children }: { message?: string | null; children: ReactNode }) {
  return (
    <div className="cl-sticky-footer">
      {message && (
        <span className="cl-sticky-footer__message" role="status">
          <CircleAlert size={16} />
          {message}
        </span>
      )}
      <div className="cl-sticky-footer__actions">{children}</div>
    </div>
  );
}
```

**File:** `packages/ui/src/components/Sidebar.tsx`
```tsx
import type { ElementType, ReactNode } from 'react';

export type SidebarItem = { href: string; label: string; icon?: ReactNode; badge?: ReactNode; exact?: boolean };
export type SidebarSection = { title?: string; items: SidebarItem[] };

function isActive(item: SidebarItem, activePath: string): boolean {
  if (activePath === item.href) return true;
  return !item.exact && activePath.startsWith(`${item.href}/`);
}

export function Sidebar({ header, sections, footer, activePath = '', LinkComponent = 'a' }: {
  header?: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
  activePath?: string;
  LinkComponent?: ElementType;
}) {
  return (
    <nav aria-label="워크스페이스" className="cl-sidebar">
      {header}
      {sections.map((section, index) => (
        <div className="cl-sidebar__section" key={section.title ?? index}>
          {section.title && <p className="cl-sidebar__section-title">{section.title}</p>}
          {section.items.map((item) => (
            <LinkComponent
              aria-current={isActive(item, activePath) ? 'page' : undefined}
              className="cl-sidebar__item"
              href={item.href}
              key={item.href}
            >
              {item.icon}
              {item.label}
              {item.badge && <span className="cl-sidebar__badge">{item.badge}</span>}
            </LinkComponent>
          ))}
        </div>
      ))}
      {footer && <div className="cl-sidebar__footer">{footer}</div>}
    </nav>
  );
}
```

**File:** `packages/ui/src/components/AppShell.tsx`
```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { IconButton } from './Button';

export function AppShell({ logo, topbarEnd, sidebar, children }: { logo: ReactNode; topbarEnd?: ReactNode; sidebar: ReactNode; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="cl-shell" data-nav-open={navOpen}>
      <header className="cl-topbar">
        <IconButton className="cl-menu-toggle" label={navOpen ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setNavOpen((open) => !open)}>
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </IconButton>
        {logo}
        <div className="cl-topbar__end">{topbarEnd}</div>
      </header>
      <div className="cl-shell__body">
        <div
          className="cl-shell__nav"
          onClick={(event) => {
            if ((event.target as Element).closest('a')) setNavOpen(false);
          }}
        >
          {sidebar}
        </div>
        <div aria-hidden className="cl-scrim" onClick={() => setNavOpen(false)} />
        <main className="cl-shell__main">{children}</main>
      </div>
    </div>
  );
}
```

**File:** `packages/ui/src/components/UserMenu.tsx`
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Avatar } from './Avatar';

export function UserMenu({ name, subtitle, onSignOut, signOutLabel = '로그아웃' }: { name: string; subtitle?: string; onSignOut: () => void; signOutLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="cl-user-menu" ref={ref}>
      <button aria-expanded={open} aria-haspopup="menu" className="cl-user-menu__trigger" onClick={() => setOpen((value) => !value)} type="button">
        <Avatar name={name || '?'} size="sm" />
        <span className="cl-user-menu__name">{name}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="cl-user-menu__panel" role="menu">
          <div className="cl-user-menu__identity">
            <strong>{name}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="cl-user-menu__item" onClick={onSignOut} role="menuitem" type="button">
            <LogOut size={16} />
            {signOutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
```

**File:** `packages/ui/src/index.ts`
```ts
export * from './lib/avatar';
export * from './lib/chart';
export * from './lib/checklist';
export * from './lib/cx';
export * from './lib/format';
export * from './components/AppShell';
export * from './components/Avatar';
export * from './components/Badge';
export * from './components/Button';
export * from './components/Card';
export * from './components/Checklist';
export * from './components/Chip';
export * from './components/DataTable';
export * from './components/Dialog';
export * from './components/Dropzone';
export * from './components/EmptyState';
export * from './components/Field';
export * from './components/LineChart';
export * from './components/OptionCard';
export * from './components/PageHeader';
export * from './components/ProgressBar';
export * from './components/Sidebar';
export * from './components/StatCard';
export * from './components/StickyFooter';
export * from './components/Switch';
export * from './components/Tabs';
export * from './components/Timeline';
export * from './components/UserMenu';
export * from './components/SummaryList';
```

---

### Task 5: 앱 연결 — 스타일 진입점, 폰트, 새 워크스페이스 셸 + 로그아웃

**Files:** Modify `apps/app/app/globals.css`, `apps/site/app/globals.css`, `apps/app/app/layout.tsx`, `apps/site/app/layout.tsx`, `apps/app/app/workspace-shell.tsx`

- [ ] **Step 1: 앱 전역 CSS** — 공용 리셋/셸은 `packages/ui`가 담당하므로 제거하고, 2~5단계 재작성 전까지 쓰이는 레거시 `app-*`만 남긴다.

**File:** `apps/app/app/globals.css`
```css
@import '@clipers/ui/src/styles/index.css';

/* Legacy page styles — removed as phases 2-5 rebuild each screen on @clipers/ui components. */
.app-page { min-height: 100vh; background: var(--color-background); }
.app-shell { width: min(1080px, 100% - 48px); margin: 0 auto; padding: var(--space-6) 0 var(--space-9); }
.app-wordmark { display: inline-flex; align-items: center; }
.app-wordmark img { display: block; height: 24px; width: auto; }
.app-heading { padding: var(--space-5) 0 var(--space-6); }
.app-eyebrow { margin: 0 0 10px; color: var(--brand-11); font-size: 12px; font-weight: 700; text-transform: uppercase; }
.app-heading h1,
.app-auth-panel h1 { font-size: var(--font-size-8); font-weight: 650; letter-spacing: -0.01em; line-height: 1.2; }
.app-muted { color: var(--color-text-muted); }
.app-section { padding: var(--space-6) 0; border-top: 1px solid var(--color-border); }
.app-section h2 { margin: 0 0 18px; font-size: var(--font-size-4); }
.app-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-6); background: var(--color-panel); }
.app-table { width: 100%; border-collapse: collapse; text-align: left; }
.app-table th,
.app-table td { padding: 14px 12px; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.app-table th { color: var(--color-text-subtle); font-size: 12px; font-weight: 500; white-space: nowrap; }
.app-table td { font-size: 14px; }
.app-table tr:last-child td { border-bottom: 0; }
.app-status { white-space: nowrap; }
.app-status-positive { color: var(--brand-11); }
.app-status-requested { color: var(--amber-11); }
.app-status-neutral { color: var(--color-text-muted); }
.app-status-negative,
.app-status-overdue,
.app-error { color: var(--tomato-11); }
.app-form { display: grid; gap: 16px; max-width: 520px; }
.app-form label { display: grid; gap: 8px; color: var(--color-text-muted); font-size: 14px; }
.app-form input,
.app-form select,
.app-form textarea,
.app-table textarea,
.app-table input { width: 100%; border: 1px solid transparent; border-radius: var(--radius-5); padding: 11px 12px; background: var(--color-field); color: var(--color-text); }
.app-form textarea,
.app-table textarea { min-height: 84px; resize: vertical; }
.app-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; border: 0; border-radius: var(--radius-full); padding: 0 16px; background: var(--gray-4); color: var(--color-text); font-weight: 600; cursor: pointer; white-space: nowrap; }
.app-button:hover { background: var(--gray-5); }
.app-button-primary { background: var(--brand-gradient); color: var(--brand-contrast); }
.app-button:disabled { cursor: not-allowed; opacity: 0.45; }
.app-action-row { display: flex; flex-wrap: wrap; gap: 8px; }
.app-notice { margin: 14px 0; color: var(--brand-11); }
.app-stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); }
.app-stat-tile { padding: 18px 20px; border: 1px solid var(--color-border); border-radius: var(--radius-5); background: var(--color-panel); }
.app-stat-tile .app-stat-label { margin: 0 0 8px; color: var(--color-text-muted); font-size: 12px; }
.app-stat-tile .app-stat-value { margin: 0; font-size: var(--font-size-6); font-weight: 650; }
.app-auth-page { display: grid; place-items: center; padding: 24px; }
.app-auth-panel { width: min(440px, 100%); }
.app-auth-panel > .app-wordmark { display: inline-block; margin-bottom: 44px; }
.app-auth-panel .app-form { margin-top: 28px; }
.app-auth-panel .app-button { width: 100%; }
.app-auth-switch { margin-top: 24px; color: var(--color-text-muted); font-size: 14px; }
.app-link-button { border: 0; padding: 0; background: none; color: var(--brand-11); cursor: pointer; font-weight: 700; }
.app-message { color: var(--brand-11); }

@media (max-width: 640px) {
  .app-shell { width: min(100% - 32px, 1080px); padding-top: var(--space-4); }
  .app-heading h1,
  .app-auth-panel h1 { font-size: 26px; }
  .app-table th,
  .app-table td { padding: 12px 9px; }
}
```

- [ ] **Step 2: 사이트 전역 CSS** — `apps/site/app/globals.css`에서 첫 줄 `@import '@clipers/ui/src/tokens.css';`를 `@import '@clipers/ui/src/styles/index.css';`로 바꾸고, `body { ... }`, `a { ... }` 규칙을 삭제한다(리셋으로 이관). 나머지는 6단계에서 교체.

- [ ] **Step 3: Pretendard 로드** — 두 앱의 `app/layout.tsx`에서 `<html lang="ko">` 안에 다음 `<head>`를 추가한다(동적 서브셋: 페이지에 쓰인 글자만 내려받음).

```tsx
      <head>
        <link crossOrigin="anonymous" href="https://cdn.jsdelivr.net" rel="preconnect" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
      </head>
```

- [ ] **Step 4: 워크스페이스 셸을 `AppShell`로 교체 + 로그아웃**

**File:** `apps/app/app/workspace-shell.tsx`
```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  ClipboardCheck,
  Film,
  Gauge,
  Megaphone,
  MessageSquareWarning,
  PlusCircle,
  ScrollText,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { AppShell, Sidebar, UserMenu, type SidebarSection } from '@clipers/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type WorkspaceRole = 'admin' | 'brand' | 'creator';

const ROLE_LABEL: Record<WorkspaceRole, string> = { admin: '운영자', brand: '브랜드', creator: '크리에이터' };

const ICON = { size: 18 };

// Hash links until phases 3-5 split each workspace into real routes.
const NAVIGATION: Record<WorkspaceRole, SidebarSection[]> = {
  creator: [
    {
      title: '크리에이터',
      items: [
        { href: '#campaigns-title', label: '캠페인', icon: <Megaphone {...ICON} /> },
        { href: '#applications-title', label: '내 지원', icon: <UserCheck {...ICON} /> },
        { href: '#clips-title', label: '내 클립', icon: <Film {...ICON} /> },
        { href: '#settlements-title', label: '내 정산', icon: <Wallet {...ICON} /> },
      ],
    },
  ],
  brand: [
    {
      title: '브랜드',
      items: [
        { href: '#create-campaign-title', label: '캠페인 만들기', icon: <PlusCircle {...ICON} /> },
        { href: '#my-campaigns-title', label: '내 캠페인', icon: <Megaphone {...ICON} /> },
      ],
    },
  ],
  admin: [
    {
      title: '운영',
      items: [
        { href: '#campaign-overview-title', label: '캠페인 현황', icon: <Gauge {...ICON} /> },
        { href: '#application-queue-title', label: '지원서 검토', icon: <UserCheck {...ICON} /> },
        { href: '#clip-queue-title', label: '클립 검수', icon: <ClipboardCheck {...ICON} /> },
        { href: '#manual-view-report-queue-title', label: '조회수 신고', icon: <ScrollText {...ICON} /> },
        { href: '#dispute-queue-title', label: '이의제기', icon: <MessageSquareWarning {...ICON} /> },
        { href: '#settlements-title', label: '주간 정산', icon: <Banknote {...ICON} /> },
      ],
    },
  ],
};

export default function WorkspaceShell({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', data.user.id).maybeSingle();
      setDisplayName(profile?.display_name ?? data.user.email ?? '');
    })();
  }, []);

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <AppShell
      logo={
        <Link className="cl-topbar__logo" href={`/${role}`}>
          <img alt="Clipers" src="/brand/clipers-wordmark.svg" />
        </Link>
      }
      sidebar={<Sidebar activePath={pathname} LinkComponent={Link} sections={NAVIGATION[role]} />}
      topbarEnd={<UserMenu name={displayName} onSignOut={() => void signOut()} subtitle={ROLE_LABEL[role]} />}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 5: 전체 테스트/빌드** — `pnpm turbo run test build --force` → 전 패키지 통과

- [ ] **Step 6: dev 서버 스모크** — `apps/app`을 띄워 `/login` 200, `/creator` 307(미로그인 리다이렉트), 서버 로그 에러 없음 확인. 시각 확인은 사용자 로컬에서.

- [ ] **Step 7: 커밋** — `feat(ui): port Frosted tokens and components into packages/ui; new app shell with sign-out`
