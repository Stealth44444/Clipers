# Brand Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/brands` around why a brand should spend there (comparison, real product demos, use cases, controls, verification, start card) and switch the landing palette from warm beige to Apple-neutral.

**Architecture:** Pure frame data for every product demo lives in `apps/site/lib/brand-demos.ts` and `apps/site/lib/brand-cases.ts` (tested with vitest). Client components in `apps/site/components/brand/` render a frame with the real `@clipers/ui` components inside an `inert` dark-themed crop, driven by one hook (`useDemoFrame`) and one pointer (`DemoCursor`). Section styles go in a new `packages/ui/src/styles/brand-landing.css`; the shared stylesheet gets the neutral tokens, a reusable `.cl-app-dark` token class, and loses the old brand-only rules.

**Tech Stack:** Next.js 15 (App Router, server components by default), React 19, TypeScript, `@clipers/ui`, `@clipers/db`, lucide-react, vitest (node environment), plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-01-brand-page-redesign-design.md`

**House rules that apply to every task** (from the spec and the user's standing feedback):
- Korean UI copy, 해요체, exactly as written in this plan. Sentence-case gray labels, no uppercase eyebrows, no pill shapes, no icons in front of card headings, no step numbers.
- Never show the brand rate (`DEFAULT_PRICING.brandCpm`, "1천 회당") anywhere on the site, and never put a won amount and a view count in the same demo.
- Weights 400/500/600 only. Lucide icons.
- Another session is working on `/contact` and guides at the same time: only stage the files this plan names (`git add <paths>`), never `git add -A`.

**Commands used throughout:**
- Site tests: `pnpm --filter @clipers/site test` (runs `vitest run`; append a file filter, e.g. `pnpm --filter @clipers/site test brand-demos`)
- Site typecheck: `pnpm --filter @clipers/site exec tsc --noEmit`
- The site dev server usually runs on http://localhost:3001 (`pnpm --filter @clipers/site dev -- -p 3001` if it is not running).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `packages/ui/src/styles/components.css` | Modify | Neutral `.cl-landing` tokens; neutral shadows; `.cl-app-dark` token class shared with `.cl-demo`; delete old brand-only rules (Task 12) |
| `packages/ui/src/components/MeshGradient.tsx` | Modify | First default colour `#ffffff` (melts into the white page) |
| `packages/ui/src/styles/brand-landing.css` | Create | All new `/brands` section styles |
| `packages/ui/src/styles/index.css` | Modify | Import `brand-landing.css` |
| `apps/site/lib/brand-demos.ts` (+ `.test.ts`) | Create | Frame data for every demo |
| `apps/site/lib/brand-cases.ts` (+ `.test.ts`) | Create | Use-case data and tile thumbnails |
| `apps/site/components/brand/use-demo-frame.ts` | Create | Loop frames while on screen; reduced motion shows the last frame |
| `apps/site/components/brand/demo-cursor.tsx` | Create | macOS pointer that glides to `[data-demo=…]` |
| `apps/site/components/brand/compare-table.tsx` | Create | §4.3 comparison table |
| `apps/site/components/brand/demos/campaign-editor-demo.tsx` | Create | §4.4 card 1 |
| `apps/site/components/brand/demos/clip-submit-demo.tsx` | Create | §4.4 card 2 |
| `apps/site/components/brand/demos/received-clips-demo.tsx` | Create | §4.4 card 3 |
| `apps/site/components/brand/solution-cards.tsx` | Create | §4.4 section |
| `apps/site/components/brand/use-cases.tsx` | Create | §4.5 tabs + 제출 영상 window |
| `apps/site/components/brand/demos/control-demos.tsx` | Create | §4.6 four small demos |
| `apps/site/components/brand/controls-bento.tsx` | Create | §4.6 section |
| `apps/site/components/brand/demos/verified-views.tsx` | Create | §4.7 counter |
| `apps/site/components/brand/verify-flow.tsx` | Create | §4.7 section |
| `apps/site/components/brand/demos/deposit-demo.tsx` | Create | §4.8 deposit card |
| `apps/site/components/brand/start-card.tsx` | Create | §4.8 section |
| `apps/site/app/brands/page.tsx` | Rewrite | Section order and copy |
| `apps/site/lib/brand-page.test.ts` | Create | Guard: no brand rate in brand-page sources |

---

### Task 1: Neutral landing palette

**Files:**
- Modify: `packages/ui/src/styles/components.css` (the `.cl-landing` block that starts with the comment `landing (main page) — warm light theme`, and every `rgba(31, 26, 20, …)` / `rgba(255, 253, 251, …)`)
- Modify: `packages/ui/src/components/MeshGradient.tsx` (default `colors`)

- [ ] **Step 1: Replace the token block**

In `packages/ui/src/styles/components.css`, replace this block:

```css
/* ---------- landing (main page) — warm light theme after contentrewards.com ---------- */
/* Same components, light tokens: everything below reads these instead of the dark scale. */
.cl-landing {
  color-scheme: light;
  --color-background: #fffdfb;
  --color-panel: #f6f2ec;
  --color-field: #efe9e2;
  --color-text: #1f1a14;
  --color-text-muted: #6a6158;
  --color-text-subtle: #91877c;
  --color-border: rgba(31, 26, 20, 0.07);
  --gray-a2: rgba(31, 26, 20, 0.05);
  --gray-a3: rgba(31, 26, 20, 0.08);
  --gray-a4: rgba(31, 26, 20, 0.12);
  --gray-3: #efe9e2;
  --gray-4: #e9e2d9;
  --gray-5: #ded6cc;
```

with:

```css
/* ---------- landing (main page) — Apple-neutral light theme (white page, #f5f5f7 panels) ---------- */
/* Same components, light tokens: everything below reads these instead of the dark scale. */
.cl-landing {
  color-scheme: light;
  --color-background: #ffffff;
  --color-panel: #f5f5f7;
  --color-field: #ebebef;
  --color-text: #1d1d1f;
  --color-text-muted: #6e6e73;
  --color-text-subtle: #8e8e93;
  --color-border: rgba(0, 0, 0, 0.07);
  --gray-a2: rgba(0, 0, 0, 0.05);
  --gray-a3: rgba(0, 0, 0, 0.08);
  --gray-a4: rgba(0, 0, 0, 0.12);
  --gray-3: #ebebef;
  --gray-4: #e6e6ea;
  --gray-5: #d9d9de;
```

Also change the comment line `/* ---------- partner logo wall (landing) — static, logos only, one warm neutral colour ---------- */` to `/* ---------- partner logo wall (landing) — static, logos only, one neutral colour ---------- */`.

- [ ] **Step 2: Neutralise the remaining warm shadows**

Run (Git Bash, from the repo root):

```bash
sed -i 's/rgba(31, 26, 20,/rgba(0, 0, 0,/g; s/rgba(255, 253, 251,/rgba(255, 255, 255,/g' packages/ui/src/styles/components.css
```

- [ ] **Step 3: Mesh melts into white**

In `packages/ui/src/components/MeshGradient.tsx` change the default

```ts
  colors = ['#fffdfb', '#e3f3e9', '#9fd8b8', '#eef6cf'],
```

to

```ts
  colors = ['#ffffff', '#e3f3e9', '#9fd8b8', '#eef6cf'],
```

(The lime `#eef6cf` stays — the user asked to keep it.)

- [ ] **Step 4: Verify no warm colour is left**

Run: `grep -rn "31, 26, 20\|fffdfb\|f6f2ec\|efe9e2\|e9e2d9\|ded6cc\|1f1a14\|6a6158\|91877c\|255, 253, 251" packages/ui/src apps/site/app apps/site/components`
Expected: no output.

- [ ] **Step 5: Look at the creator page**

Open http://localhost:3001/ and http://localhost:3001/brands. Expected: white page, light-gray (#f5f5f7) cards, near-black text, no beige anywhere; hero mesh still green with its lime.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/styles/components.css packages/ui/src/components/MeshGradient.tsx
git commit -m "style(site): Apple-neutral landing palette — white page, #f5f5f7 panels; mesh melts into white

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `.cl-app-dark` — the app's dark tokens for product crops

**Files:**
- Modify: `packages/ui/src/styles/components.css` (the `.cl-demo { color-scheme: dark; … }` rule under `/* Restore the app's dark tokens inside the window … */`, and the X-icon rules in the `.cl-landing` block)

- [ ] **Step 1: Split the token part out of `.cl-demo`**

Replace:

```css
/* Restore the app's dark tokens inside the window (the landing scope switched them to light). */
.cl-demo {
  color-scheme: dark;
  --color-background: #111111;
  --color-panel: #191919;
  --color-field: #222222;
  --color-text: #eeeeee;
  --color-text-muted: #b4b4b4;
  --color-text-subtle: #7b7b7b;
  --gray-a2: rgba(255, 255, 255, 0.04);
  --gray-a3: rgba(255, 255, 255, 0.07);
  --gray-a4: rgba(255, 255, 255, 0.106);
  --gray-3: #222222;
  --gray-4: #2a2a2a;
  --gray-5: #313131;
  --brand-11: #7fd6a4;
  width: min(920px, 100%);
```

with:

```css
/* Restore the app's dark tokens inside product shots (the landing scope switched them to light): the macOS window
   and every crop of the real app UI on the landings use exactly the app's colours. */
.cl-demo,
.cl-app-dark {
  color-scheme: dark;
  --color-background: #111111;
  --color-panel: #191919;
  --color-field: #222222;
  --color-text: #eeeeee;
  --color-text-muted: #b4b4b4;
  --color-text-subtle: #7b7b7b;
  --gray-a2: rgba(255, 255, 255, 0.04);
  --gray-a3: rgba(255, 255, 255, 0.07);
  --gray-a4: rgba(255, 255, 255, 0.106);
  --gray-3: #222222;
  --gray-4: #2a2a2a;
  --gray-5: #313131;
  --brand-11: #7fd6a4;
  color: var(--color-text);
}
.cl-demo {
  width: min(920px, 100%);
```

(Leave the rest of the original `.cl-demo` rule — `overflow`, `border-radius`, `background`, `color`, `position`, `box-shadow` — as it is.)

- [ ] **Step 2: Keep the X mark white inside dark crops**

In the `.cl-landing` block replace

```css
.cl-landing .cl-demo .cl-platform-icon[src$="/x.png"] { filter: none; }
```

with

```css
.cl-landing .cl-demo .cl-platform-icon[src$="/x.png"],
.cl-landing .cl-app-dark .cl-platform-icon[src$="/x.png"] { filter: none; }
```

- [ ] **Step 3: Verify the hero window is unchanged**

Open http://localhost:3001/brands. Expected: the hero macOS dashboard looks exactly as before (dark, same text colours).

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/styles/components.css
git commit -m "style(ui): .cl-app-dark — the app's dark tokens for product crops on the landings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Demo frame data (`brand-demos.ts`)

**Files:**
- Create: `apps/site/lib/brand-demos.ts`
- Test: `apps/site/lib/brand-demos.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/site/lib/brand-demos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BUDGET_TOTAL,
  DEPOSIT_FRAMES,
  EDITOR_BUDGET,
  EDITOR_CHIPS,
  REQUIREMENTS_TEXT,
  SUBMIT_URL,
  budgetFrames,
  editorDone,
  editorFrames,
  receivedFrames,
  requirementsFrames,
  submitFrames,
  typingSteps,
  verifiedFrames,
} from './brand-demos';

describe('typingSteps', () => {
  it('grows one character at a time', () => {
    expect(typingSteps('300')).toEqual(['3', '30', '300']);
    expect(typingSteps('여름')).toEqual(['여', '여름']);
  });
});

describe('editorFrames', () => {
  const frames = editorFrames();

  it('starts at 2/7 and ends at 5/7 with the budget typed', () => {
    expect(editorDone(frames[0].state)).toBe(2);
    const last = frames[frames.length - 1].state;
    expect(editorDone(last)).toBe(5);
    expect(last).toMatchObject({ clipping: true, chips: EDITOR_CHIPS.length, budget: EDITOR_BUDGET });
  });

  it('rests on the finished form before looping', () => {
    expect(frames[frames.length - 1].ms).toBeGreaterThanOrEqual(2000);
  });

  it('only clicks where the cursor is', () => {
    for (const { state } of frames) if (state.click) expect(state.cursor).not.toBeNull();
  });
});

describe('submitFrames', () => {
  const frames = submitFrames();

  it('submits only after the platform and link are filled', () => {
    const sending = frames.find(({ state }) => state.sending);
    expect(sending?.state).toMatchObject({ platform: true, url: SUBMIT_URL });
  });

  it('ends on the sent notice', () => {
    expect(frames[frames.length - 1].state.sent).toBe(true);
  });
});

describe('receivedFrames', () => {
  const frames = receivedFrames();

  it('always shows four rows', () => {
    for (const { state } of frames) expect(state.rows).toHaveLength(4);
  });

  it('shows each new clip waiting for review, then approved', () => {
    const arrivals = frames.slice(1);
    for (let index = 0; index < arrivals.length; index += 2) {
      const arrived = arrivals[index].state.rows[0];
      expect(arrived.approved).toBe(false);
      expect(arrivals[index + 1].state.rows[0]).toMatchObject({ id: arrived.id, approved: true });
    }
  });

  it('only counts up', () => {
    frames.slice(1).forEach(({ state }, index) => {
      expect(state.views).toBeGreaterThan(frames[index].state.views);
      expect(state.clips).toBeGreaterThanOrEqual(frames[index].state.clips);
    });
  });
});

describe('control and start demos', () => {
  it('types the requirements in full, then holds', () => {
    const frames = requirementsFrames();
    expect(frames[0].state).toBe('');
    expect(frames[frames.length - 1].state).toBe(REQUIREMENTS_TEXT);
    expect(frames[frames.length - 1].ms).toBeGreaterThanOrEqual(3000);
  });

  it('spends the budget down without running out', () => {
    const frames = budgetFrames();
    frames.slice(1).forEach(({ state }, index) => expect(state).toBeLessThan(frames[index].state));
    expect(frames[frames.length - 1].state).toBeGreaterThan(BUDGET_TOTAL / 2);
  });

  it('counts verified views up', () => {
    const frames = verifiedFrames();
    expect(frames[frames.length - 1].state).toBeGreaterThan(frames[0].state);
  });

  it('walks the deposit from 입금 전 to 진행 중', () => {
    expect(DEPOSIT_FRAMES.map(({ state }) => state.status)).toEqual(['draft', 'draft', 'draft', 'pending_escrow', 'live']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @clipers/site test brand-demos`
Expected: FAIL — `Failed to resolve import "./brand-demos"`.

- [ ] **Step 3: Write the implementation**

Create `apps/site/lib/brand-demos.ts`:

```ts
// Frames for the brand page's product demos. Each demo loops through its frames and its component only renders the
// current frame's state, so timing and content live here where they can be tested.
// No demo shows a budget amount next to views: together they would reveal the brand rate.

export type Frame<S> = { ms: number; state: S };

/** Every prefix of `text`, one character longer each time: '3', '30', '300', … */
export function typingSteps(text: string): string[] {
  const chars = [...text];
  return chars.map((_, index) => chars.slice(0, index + 1).join(''));
}

/** Gives the last frame a longer hold, so a finished demo rests before it loops. */
function hold<S>(frames: Frame<S>[], ms: number): Frame<S>[] {
  const last = frames[frames.length - 1];
  return [...frames.slice(0, -1), { ...last, ms }];
}

// ---------- new-campaign editor (brand app) ----------

export type EditorState = { clipping: boolean; chips: number; budget: string; cursor: string | null; click: boolean };

export const EDITOR_CHIPS = ['유튜브 쇼츠', '틱톡', '인스타그램 릴스'] as const;
export const EDITOR_TOTAL_STEPS = 7;
export const EDITOR_BUDGET = '3000000';

/** The editor's "n/7 완료": name and description are already filled; then content type, platforms and budget. */
export function editorDone(state: EditorState): number {
  return 2 + Number(state.clipping) + Number(state.chips > 0) + Number(state.budget !== '');
}

export function editorFrames(): Frame<EditorState>[] {
  const base: EditorState = { clipping: false, chips: 0, budget: '', cursor: null, click: false };
  const frames: Frame<EditorState>[] = [
    { ms: 900, state: base },
    { ms: 800, state: { ...base, cursor: 'clipping' } },
    { ms: 500, state: { ...base, clipping: true, cursor: 'clipping', click: true } },
  ];
  EDITOR_CHIPS.forEach((_, index) => {
    const cursor = `chip-${index}`;
    frames.push({ ms: 650, state: { ...base, clipping: true, chips: index, cursor } });
    frames.push({ ms: 300, state: { ...base, clipping: true, chips: index + 1, cursor, click: true } });
  });
  const ready: EditorState = { ...base, clipping: true, chips: EDITOR_CHIPS.length, cursor: 'budget' };
  frames.push({ ms: 750, state: ready }, { ms: 250, state: { ...ready, click: true } });
  for (const budget of typingSteps(EDITOR_BUDGET)) frames.push({ ms: 110, state: { ...ready, budget } });
  return hold(frames, 2400);
}

// ---------- clip-submit dialog (creator app) ----------

export type SubmitState = { platform: boolean; url: string; sending: boolean; sent: boolean; cursor: string | null; click: boolean };

export const SUBMIT_URL = 'https://youtube.com/shorts/x8Kq2';

export function submitFrames(): Frame<SubmitState>[] {
  const base: SubmitState = { platform: false, url: '', sending: false, sent: false, cursor: null, click: false };
  const picked: SubmitState = { ...base, platform: true };
  const frames: Frame<SubmitState>[] = [
    { ms: 900, state: base },
    { ms: 800, state: { ...base, cursor: 'platform' } },
    { ms: 450, state: { ...picked, cursor: 'platform', click: true } },
    { ms: 700, state: { ...picked, cursor: 'url' } },
    { ms: 300, state: { ...picked, cursor: 'url', click: true } },
  ];
  for (const url of typingSteps(SUBMIT_URL)) frames.push({ ms: 45, state: { ...picked, url, cursor: 'url' } });
  const filled: SubmitState = { ...picked, url: SUBMIT_URL };
  frames.push(
    { ms: 800, state: { ...filled, cursor: 'submit' } },
    { ms: 900, state: { ...filled, sending: true, cursor: 'submit', click: true } },
    { ms: 2600, state: { ...filled, sent: true, cursor: 'submit' } }
  );
  return frames;
}

// ---------- received clips (brand campaign page) ----------

export type ClipRow = { id: number; creator: string; platform: string; approved: boolean };
export type ReceivedState = { views: number; clips: number; rows: ClipRow[] };

const RECEIVED_ROWS = 4;
const ARRIVALS: [string, string][] = [
  ['도윤', 'tiktok'],
  ['서아', 'naver_clip'],
  ['지호', 'youtube_shorts'],
  ['유나', 'kakao_shorts'],
  ['하루', 'youtube_shorts'],
  ['민지', 'instagram_reels'],
];
const FIRST_ROWS: ClipRow[] = [
  { id: -1, creator: '지호', platform: 'naver_clip', approved: true },
  { id: -2, creator: '서아', platform: 'tiktok', approved: true },
  { id: -3, creator: '민지', platform: 'instagram_reels', approved: true },
  { id: -4, creator: '하루', platform: 'youtube_shorts', approved: true },
];

/** New clips arrive waiting for review and pass it; verified views and the clip count only go up. */
export function receivedFrames(): Frame<ReceivedState>[] {
  let rows = FIRST_ROWS;
  let views = 482_000;
  let clips = 37;
  const frames: Frame<ReceivedState>[] = [{ ms: 1600, state: { views, clips, rows } }];
  ARRIVALS.forEach(([creator, platform], id) => {
    views += 4_300;
    clips += 1;
    rows = [{ id, creator, platform, approved: false }, ...rows].slice(0, RECEIVED_ROWS);
    frames.push({ ms: 1600, state: { views, clips, rows } });
    views += 4_100;
    rows = rows.map((row) => (row.id === id ? { ...row, approved: true } : row));
    frames.push({ ms: 1600, state: { views, clips, rows } });
  });
  return frames;
}

// ---------- controls bento ----------

export const REQUIREMENTS_TEXT = '음원 후렴을 15초 이상 사용\n영상 설명에 #여름밤챌린지 포함';

export function requirementsFrames(): Frame<string>[] {
  return hold([{ ms: 600, state: '' }, ...typingSteps(REQUIREMENTS_TEXT).map((state) => ({ ms: 60, state }))], 3500);
}

export type CapState = { filled: boolean; capped: boolean };

export const CAP_FRAMES: Frame<CapState>[] = [
  { ms: 600, state: { filled: false, capped: false } },
  { ms: 1300, state: { filled: true, capped: false } },
  { ms: 4100, state: { filled: true, capped: true } },
];

/** The waiting applicant's review: false = 검토 중, true = 승인. */
export const APPLICANT_FRAMES: Frame<boolean>[] = [
  { ms: 2600, state: false },
  { ms: 2600, state: true },
];

export const BUDGET_TOTAL = 3_000_000;

/** Remaining budget ticking down (no views beside it). */
export function budgetFrames(): Frame<number>[] {
  return hold(
    Array.from({ length: 28 }, (_, step) => ({ ms: 700, state: 2_850_000 - step * 9_000 })),
    2000
  );
}

// ---------- verification ----------

export function verifiedFrames(): Frame<number>[] {
  return Array.from({ length: 40 }, (_, step) => ({ ms: 300, state: 48_200 + step * 37 }));
}

// ---------- deposit (brand campaign page) ----------

export type DepositStatus = 'draft' | 'pending_escrow' | 'live';
export type DepositState = { status: DepositStatus; sending: boolean; cursor: string | null; click: boolean };

/** Same labels and tones as the brand app's CAMPAIGN_STATUS (apps/app/lib/status.ts); leads as the app words them. */
export const DEPOSIT_STATUS: Record<DepositStatus, { label: string; tone: 'neutral' | 'amber' | 'brand'; lead: string }> = {
  draft: { label: '입금 전', tone: 'neutral', lead: '입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개해요.' },
  pending_escrow: { label: '입금 확인 중', tone: 'amber', lead: '운영팀이 입금을 확인하고 있어요. 확인되면 캠페인이 공개돼요.' },
  live: { label: '진행 중', tone: 'brand', lead: '캠페인이 공개됐어요. 크리에이터 지원을 받기 시작해요.' },
};

export const DEPOSIT_FRAMES: Frame<DepositState>[] = [
  { ms: 1000, state: { status: 'draft', sending: false, cursor: null, click: false } },
  { ms: 900, state: { status: 'draft', sending: false, cursor: 'deposit', click: false } },
  { ms: 700, state: { status: 'draft', sending: true, cursor: 'deposit', click: true } },
  { ms: 2200, state: { status: 'pending_escrow', sending: false, cursor: 'deposit', click: false } },
  { ms: 3000, state: { status: 'live', sending: false, cursor: null, click: false } },
];
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @clipers/site test brand-demos`
Expected: PASS (all tests in `brand-demos.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/site/lib/brand-demos.ts apps/site/lib/brand-demos.test.ts
git commit -m "feat(site): frame data for the brand page's product demos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Use-case data (`brand-cases.ts`)

**Files:**
- Create: `apps/site/lib/brand-cases.ts`
- Test: `apps/site/lib/brand-cases.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/site/lib/brand-cases.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRAND_CASES, CLIP_POSTERS, caseThumbnails } from './brand-cases';
import type { ShowcaseVideo } from './youtube-showcase';

const video = (id: string): ShowcaseVideo => ({
  id,
  campaign: '',
  channel: '',
  channelId: '',
  thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
});

describe('BRAND_CASES', () => {
  it('has the three cases in order with five clips each', () => {
    expect(BRAND_CASES.map((item) => item.id)).toEqual(['launch', 'music', 'channel']);
    for (const item of BRAND_CASES) expect(item.clips).toHaveLength(5);
  });

  it('has counts that add up and match the clips waiting for review', () => {
    for (const item of BRAND_CASES) {
      expect(item.counts.pending + item.counts.approved).toBe(item.counts.all);
      expect(item.clips.some((clip) => clip.pending)).toBe(true);
    }
  });

  it('draws thumbnails from the matching showcase kind', () => {
    expect(BRAND_CASES.map((item) => item.showcase)).toEqual(['ugc', 'music', 'clipping']);
  });
});

describe('caseThumbnails', () => {
  it('puts real thumbnails first and fills the rest with clip posters', () => {
    expect(caseThumbnails([video('a'), video('b')], 5, 0)).toEqual([
      'https://i.ytimg.com/vi/a/maxresdefault.jpg',
      'https://i.ytimg.com/vi/b/maxresdefault.jpg',
      CLIP_POSTERS[0],
      CLIP_POSTERS[1],
      CLIP_POSTERS[2],
    ]);
  });

  it('uses posters only without videos, shifted per case', () => {
    expect(caseThumbnails(undefined, 5, 1)).toEqual([CLIP_POSTERS[1], CLIP_POSTERS[2], CLIP_POSTERS[3], CLIP_POSTERS[0], CLIP_POSTERS[1]]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @clipers/site test brand-cases`
Expected: FAIL — `Failed to resolve import "./brand-cases"`.

- [ ] **Step 3: Write the implementation**

Create `apps/site/lib/brand-cases.ts`:

```ts
import type { ShowcaseKind, ShowcaseVideo } from '@/lib/youtube-showcase';

// The brand page's use cases, each shown as a campaign in the brand app's 제출 영상 screen. Brands, creators, counts
// and views are illustrative and fixed. No budget amounts here: next to views they would reveal the brand rate.

export type BrandCaseClip = { creator: string; platform: string; views: number; pending?: boolean };

export type BrandCase = {
  id: 'launch' | 'music' | 'channel';
  label: string;
  lead: string;
  /** The campaign's content type as the brand app names it. */
  kind: string;
  title: string;
  brand: string;
  counts: { all: number; pending: number; approved: number };
  /** Which real YouTube showcase videos (lib/youtube-showcase) give the tiles their thumbnails. */
  showcase: ShowcaseKind;
  clips: BrandCaseClip[];
};

export const BRAND_CASES: BrandCase[] = [
  {
    id: 'launch',
    label: '신제품 알리기',
    lead: '크리에이터들이 제품을 각자 스타일로 소개하는 숏폼을 찍어 올려요. 리뷰, 일상, 상황극처럼 저마다 다른 영상이 한 캠페인에 모여요.',
    kind: 'UGC 캠페인',
    title: '데일리 뷰티 신제품 마스카라 소개',
    brand: '데일리 뷰티',
    counts: { all: 128, pending: 6, approved: 122 },
    showcase: 'ugc',
    clips: [
      { creator: '민지', platform: 'instagram_reels', views: 82_000 },
      { creator: '도윤', platform: 'youtube_shorts', views: 31_000 },
      { creator: '서아', platform: 'tiktok', views: 124_000 },
      { creator: '지호', platform: 'youtube_shorts', views: 67_000 },
      { creator: '유나', platform: 'instagram_reels', views: 29_000, pending: true },
    ],
  },
  {
    id: 'music',
    label: '새 음원 알리기',
    lead: '새 음원을 배경음으로 쓰거나 챌린지에 참여한 숏폼이 여러 플랫폼에 동시에 올라와요. 뮤직비디오와 무대 영상을 클리핑할 수도 있어요.',
    kind: '음악 캠페인',
    title: "신곡 '여름밤' 후렴 챌린지",
    brand: '데모 레코즈',
    counts: { all: 221, pending: 8, approved: 213 },
    showcase: 'music',
    clips: [
      { creator: '하루', platform: 'tiktok', views: 213_000 },
      { creator: '민지', platform: 'instagram_reels', views: 98_000 },
      { creator: '도윤', platform: 'youtube_shorts', views: 55_000 },
      { creator: '서아', platform: 'kakao_shorts', views: 32_000, pending: true },
      { creator: '지호', platform: 'youtube_shorts', views: 141_000 },
    ],
  },
  {
    id: 'channel',
    label: '채널 키우기',
    lead: '긴 영상과 방송의 명장면을 크리에이터들이 숏폼으로 편집해 올려요. 숏폼에서 원본 채널로 이어지는 길이 그만큼 많아져요.',
    kind: '클리핑 캠페인',
    title: '스튜디오 하루 예능 하이라이트 클리핑',
    brand: '스튜디오 하루',
    counts: { all: 39, pending: 2, approved: 37 },
    showcase: 'clipping',
    clips: [
      { creator: '편집왕', platform: 'youtube_shorts', views: 310_000 },
      { creator: '클립데일리', platform: 'tiktok', views: 186_000 },
      { creator: '숏츠랩', platform: 'youtube_shorts', views: 112_000 },
      { creator: '하이라이트', platform: 'x', views: 48_000 },
      { creator: '명장면', platform: 'instagram_reels', views: 93_000, pending: true },
    ],
  },
];

/** The site's own short-form clips (public/media/clips), used where a real YouTube thumbnail is missing. */
export const CLIP_POSTERS = ['/media/clips/beauty.jpg', '/media/clips/drive.jpg', '/media/clips/pet.jpg', '/media/clips/sky.jpg'] as const;

/** One image per tile: the kind's real YouTube thumbnails first, then clip posters shifted by `offset` so cases differ. */
export function caseThumbnails(videos: ShowcaseVideo[] | undefined, count: number, offset: number): string[] {
  const real = (videos ?? []).map((video) => video.thumbnail);
  const posters = Array.from({ length: count }, (_, index) => CLIP_POSTERS[(index + offset) % CLIP_POSTERS.length]);
  return [...real, ...posters].slice(0, count);
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @clipers/site test brand-cases`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/site/lib/brand-cases.ts apps/site/lib/brand-cases.test.ts
git commit -m "feat(site): brand page use cases — launch, new music, channel growth

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Demo engine — `useDemoFrame`, `DemoCursor`, base styles

**Files:**
- Create: `apps/site/components/brand/use-demo-frame.ts`
- Create: `apps/site/components/brand/demo-cursor.tsx`
- Create: `packages/ui/src/styles/brand-landing.css`
- Modify: `packages/ui/src/styles/index.css`

- [ ] **Step 1: The hook**

Create `apps/site/components/brand/use-demo-frame.ts`:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from '@/lib/brand-demos';

/**
 * Plays a demo's frames in a loop while its element is on screen. Under reduced motion it shows the last frame
 * (the finished state) and never moves. `go` jumps to a frame and restarts the timing from there.
 * Pass a module-level frames array: a new array on every render would restart the loop.
 */
export function useDemoFrame<S, E extends Element = HTMLDivElement>(frames: readonly Frame<S>[]) {
  const ref = useRef<E>(null);
  const [index, setIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const current = useRef(0);
  const timer = useRef(0);
  const visible = useRef(false);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!visible.current) return;
    timer.current = window.setTimeout(() => {
      current.current = (current.current + 1) % frames.length;
      setIndex(current.current);
      schedule();
    }, frames[current.current].ms);
  }, [frames]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = frames.length - 1;
      setIndex(current.current);
      return;
    }
    setMoving(true);
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      schedule();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
  }, [frames, schedule]);

  const go = useCallback(
    (next: number) => {
      current.current = next;
      setIndex(next);
      schedule();
    },
    [schedule]
  );

  return { ref, frame: frames[index].state, index, moving, go };
}
```

- [ ] **Step 2: The pointer**

Create `apps/site/components/brand/demo-cursor.tsx`:

```tsx
'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The macOS pointer of a product demo. It glides to the element marked `data-demo={target}` inside the stage
 * (or rests near the bottom-right corner when there is no target) and dips when `click` is true.
 */
export default function DemoCursor({ stage, target, click }: { stage: RefObject<HTMLElement | null>; target: string | null; click: boolean }) {
  const [point, setPoint] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const root = stage.current;
    if (!root) return;
    const place = () => {
      const box = root.getBoundingClientRect();
      const element = target ? root.querySelector<HTMLElement>(`[data-demo="${target}"]`) : null;
      if (!element) {
        setPoint({ x: box.width * 0.82, y: box.height * 0.88 });
        return;
      }
      const rect = element.getBoundingClientRect();
      setPoint({ x: rect.left - box.left + rect.width * 0.5, y: rect.top - box.top + rect.height * 0.6 });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [stage, target]);

  return (
    <svg
      aria-hidden
      className="cl-demo-cursor"
      data-click={click}
      height="24"
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
      viewBox="0 0 16 22"
      width="18"
    >
      <path d="M1 1v17.5l4.6-4.4 3.1 7 2.9-1.3-3-6.8h6.2z" fill="#000" stroke="#fff" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}
```

- [ ] **Step 3: The stylesheet with the shared demo styles**

Create `packages/ui/src/styles/brand-landing.css`:

```css
/* ---------- brand landing (/brands) — docs/superpowers/specs/2026-10-01-brand-page-redesign-design.md ---------- */

/* Demo pointer */
.cl-demo-cursor { position: absolute; top: 0; left: 0; z-index: 3; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3)); transition: transform 0.7s cubic-bezier(0.4, 0.1, 0.2, 1); }
.cl-demo-cursor[data-click="true"] { animation: cl-demo-press 0.25s ease; }
@keyframes cl-demo-press { 50% { scale: 0.82; } }

/* A crop of the real app (dark, via .cl-app-dark), floating on a light card */
.cl-bdemo { position: relative; display: grid; align-content: start; gap: 12px; padding: 18px 18px 22px; border-radius: 16px; background: var(--color-background); font-size: 13px; text-align: left; box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.55), inset 0 0.5px 0 rgba(255, 255, 255, 0.14), 0 22px 60px rgba(0, 0, 0, 0.22), 0 6px 18px rgba(0, 0, 0, 0.1); }
.cl-bdemo__head { display: flex; align-items: baseline; justify-content: space-between; }
.cl-bdemo__title { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
.cl-bdemo__meta { color: var(--color-text-subtle); font-size: 12px; font-variant-numeric: tabular-nums; }
.cl-bdemo__label { margin-bottom: -4px; color: var(--color-text-subtle); font-size: 12px; }
.cl-bdemo .cl-field { gap: 6px; }
.cl-bdemo .cl-field__label { font-size: 12px; }
.cl-bdemo .cl-input,
.cl-bdemo .cl-select { height: 38px; font-size: 13px; }
.cl-bdemo .cl-textarea { min-height: 84px; font-size: 13px; resize: none; }
.cl-bdemo .cl-option-grid { gap: 8px; }
.cl-bdemo .cl-option-card { gap: 2px; padding: 10px 12px; }
.cl-bdemo .cl-chip-group { gap: 6px; }
.cl-bdemo .cl-chip { height: 30px; padding: 0 10px; font-size: 12.5px; }
.cl-bdemo__big { font-size: 26px; font-weight: 600; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.cl-bdemo__big small { color: var(--color-text-subtle); font-size: 14px; font-weight: 400; }
```

- [ ] **Step 4: Import it**

Replace the content of `packages/ui/src/styles/index.css` with:

```css
@import './tokens.css';
@import './base.css';
@import './components.css';
@import './brand-landing.css';
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @clipers/site exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/site/components/brand/use-demo-frame.ts apps/site/components/brand/demo-cursor.tsx packages/ui/src/styles/brand-landing.css packages/ui/src/styles/index.css
git commit -m "feat(site): demo engine for the brand page — frame loop, pointer, dark crop styles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Comparison table

**Files:**
- Create: `apps/site/components/brand/compare-table.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: The component**

Create `apps/site/components/brand/compare-table.tsx`:

```tsx
// Influencer seeding beside a Clipers campaign, row by row (spec §4.3). Facts only: no rates, no other companies' names.

const ROWS = [
  { label: '비용을 내는 기준', them: '섭외할 때 정한 금액', us: '검증된 조회수만큼만' },
  { label: '조회수가 나오지 않으면', them: '비용은 그대로 나가요', us: '예산도 쓰이지 않아요' },
  { label: '만들어지는 영상', them: '섭외한 사람 수만큼', us: '참여한 크리에이터마다 각자의 영상' },
  { label: '섭외·계약·정산', them: '한 명씩 직접', us: '검수부터 지급까지 Clipers가' },
  { label: '올라가는 곳', them: '크리에이터의 채널 하나', us: '7개 숏폼 플랫폼 중 원하는 곳에' },
];

export default function CompareTable() {
  return (
    <section aria-labelledby="compare-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="compare-title">
        섭외하는 대신, 캠페인을 여세요
      </h2>
      <p className="cl-landing-section__lead">같은 예산이어도, 어디에 쓰이는지가 달라요.</p>
      <div className="cl-compare">
        <table>
          <caption>인플루언서 섭외와 Clipers 캠페인 비교</caption>
          <colgroup>
            <col className="cl-compare__col-label" />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <td />
              <th className="cl-compare__them" scope="col">
                인플루언서 섭외
              </th>
              <th className="cl-compare__us" scope="col">
                <span>
                  <img alt="" height="22" src="/logo/clipers-mark.svg" width="22" />
                  Clipers 캠페인
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td className="cl-compare__them" data-label="인플루언서 섭외">
                  {row.them}
                </td>
                <td className="cl-compare__us" data-label="Clipers 캠페인">
                  {row.us}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Its styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Comparison table: the Clipers column raised as one white slab (pricing-table style) */
.cl-compare { position: relative; width: min(960px, 100%); margin: 0 auto; }
.cl-compare::before { position: absolute; top: -12px; right: 0; bottom: -12px; left: 61%; border-radius: 20px; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 12px 40px rgba(0, 0, 0, 0.08); content: ""; }
.cl-compare table { position: relative; width: 100%; border-collapse: collapse; table-layout: fixed; }
.cl-compare caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.cl-compare__col-label { width: 22%; }
.cl-compare th,
.cl-compare td { padding: 18px 24px; font-size: 17px; font-weight: 400; line-height: 1.45; text-align: left; vertical-align: top; }
.cl-compare thead th { padding-bottom: 22px; font-size: 18px; font-weight: 600; }
.cl-compare thead .cl-compare__us span { display: inline-flex; align-items: center; gap: 10px; }
.cl-compare tbody th { color: var(--color-text-subtle); font-size: 15px; }
.cl-compare tbody th,
.cl-compare tbody td { box-shadow: inset 0 1px 0 var(--gray-a3); }
.cl-compare .cl-compare__them { color: var(--color-text-muted); }
.cl-compare tbody .cl-compare__us { font-weight: 500; }
@media (max-width: 800px) {
  .cl-compare::before,
  .cl-compare thead { display: none; }
  .cl-compare table,
  .cl-compare tbody,
  .cl-compare tr,
  .cl-compare th,
  .cl-compare td { display: block; }
  .cl-compare tr { margin-bottom: 12px; padding: 18px; border-radius: 18px; background: var(--color-panel); }
  .cl-compare tbody th,
  .cl-compare tbody td { padding: 4px 0; box-shadow: none; }
  .cl-compare tbody th { margin-bottom: 6px; color: var(--color-text); font-size: 16px; font-weight: 600; }
  .cl-compare td::before { display: block; color: var(--color-text-subtle); font-size: 12px; font-weight: 400; content: attr(data-label); }
  .cl-compare td.cl-compare__us { margin-top: 8px; padding: 12px 14px; border-radius: 12px; background: #fff; }
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.

```bash
git add apps/site/components/brand/compare-table.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand page comparison — influencer seeding beside a Clipers campaign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Solution cards with the three real-product demos

**Files:**
- Create: `apps/site/components/brand/demos/campaign-editor-demo.tsx`
- Create: `apps/site/components/brand/demos/clip-submit-demo.tsx`
- Create: `apps/site/components/brand/demos/received-clips-demo.tsx`
- Create: `apps/site/components/brand/solution-cards.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: New-campaign editor demo**

Create `apps/site/components/brand/demos/campaign-editor-demo.tsx`:

```tsx
'use client';

import { useId } from 'react';
import { Clapperboard, Scissors } from 'lucide-react';
import { Chip, Field, Input, OptionCard, ProgressBar } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { EDITOR_CHIPS, EDITOR_TOTAL_STEPS, editorDone, editorFrames } from '@/lib/brand-demos';

const FRAMES = editorFrames();
const noop = () => {};

/** The brand app's new-campaign editor: pick 클리핑, switch on three platforms, type the budget. No expected views. */
export default function CampaignEditorDemo() {
  const { ref, frame } = useDemoFrame(FRAMES);
  const budgetId = useId();
  const done = editorDone(frame);

  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <div className="cl-bdemo__head">
        <span className="cl-bdemo__title">새 캠페인</span>
        <span className="cl-bdemo__meta">
          {done}/{EDITOR_TOTAL_STEPS} 완료
        </span>
      </div>
      <ProgressBar bare value={done / EDITOR_TOTAL_STEPS} />
      <p className="cl-bdemo__label">콘텐츠</p>
      <div className="cl-option-grid">
        <div data-demo="clipping">
          <OptionCard icon={<Scissors size={18} />} onSelect={noop} selected={frame.clipping} title="클리핑" />
        </div>
        <div>
          <OptionCard icon={<Clapperboard size={18} />} onSelect={noop} selected={false} title="UGC" />
        </div>
      </div>
      <p className="cl-bdemo__label">플랫폼</p>
      <div className="cl-chip-group">
        {EDITOR_CHIPS.map((label, index) => (
          <span data-demo={`chip-${index}`} key={label}>
            <Chip onToggle={noop} selected={index < frame.chips}>
              {label}
            </Chip>
          </span>
        ))}
      </div>
      <Field htmlFor={budgetId} label="총예산 (원)">
        <Input data-demo="budget" id={budgetId} placeholder="1000000" readOnly value={frame.budget} />
      </Field>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}
```

- [ ] **Step 2: Clip-submit demo**

Create `apps/site/components/brand/demos/clip-submit-demo.tsx`:

```tsx
'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button, Field, Input, Select, StatusDot } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { submitFrames } from '@/lib/brand-demos';

const FRAMES = submitFrames();
const noop = () => {};

/**
 * The creator app's clip-submit dialog over the clip being submitted. It uses the Dialog's markup and classes because
 * the real Dialog only opens as a modal; the fields and buttons inside are the real components.
 */
export default function ClipSubmitDemo() {
  const { ref, frame, moving } = useDemoFrame(FRAMES);
  const video = useRef<HTMLVideoElement>(null);
  const platformId = useId();
  const urlId = useId();

  useEffect(() => {
    if (moving) video.current?.play().catch(() => {});
  }, [moving]);

  return (
    <div className="cl-bdemo-submit" inert ref={ref}>
      <video className="cl-bdemo-submit__clip" loop muted playsInline poster="/media/clips/beauty.jpg" preload="metadata" ref={video} src="/media/clips/beauty.mp4" />
      <div className="cl-app-dark cl-dialog cl-bdemo-submit__dialog">
        <div className="cl-dialog__header">
          <p className="cl-dialog__title">여름밤 후렴 챌린지 · 클립 제출</p>
          <span className="cl-icon-button">
            <X size={18} />
          </span>
        </div>
        <div className="cl-dialog__body">
          <Field htmlFor={platformId} label="플랫폼">
            <Select data-demo="platform" id={platformId} onChange={noop} value={frame.platform ? 'youtube_shorts' : ''}>
              <option value="">플랫폼 선택</option>
              <option value="youtube_shorts">유튜브 쇼츠</option>
            </Select>
          </Field>
          <Field hint="공개 상태로 게시된 영상 링크를 붙여 넣어 주세요." htmlFor={urlId} label="영상 링크">
            <Input data-demo="url" id={urlId} placeholder="https://youtube.com/shorts/..." readOnly value={frame.url} />
          </Field>
        </div>
        <div className="cl-dialog__footer">
          <Button variant="secondary">취소</Button>
          <Button data-demo="submit" disabled={!frame.platform || !frame.url} variant="primary">
            {frame.sending ? '제출 중…' : '제출하기'}
          </Button>
        </div>
      </div>
      <p className="cl-app-dark cl-bdemo-toast" data-on={frame.sent}>
        <StatusDot pulse tone="yellow">
          제출했어요 · 검수 대기
        </StatusDot>
      </p>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}
```

- [ ] **Step 3: Received-clips demo**

Create `apps/site/components/brand/demos/received-clips-demo.tsx`:

```tsx
'use client';

import { Eye, Film } from 'lucide-react';
import { platformLabel } from '@clipers/db';
import { Badge, DataTable, StatCard, StatGrid, formatCompactNumber } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { receivedFrames } from '@/lib/brand-demos';

const FRAMES = receivedFrames();

/** The brand campaign page: verified views and received clips, with new clips passing review. No budget amounts. */
export default function ReceivedClipsDemo() {
  const { ref, frame } = useDemoFrame(FRAMES);

  return (
    <div className="cl-app-dark cl-bdemo cl-bdemo--clips" inert ref={ref}>
      <StatGrid>
        <StatCard icon={<Eye size={16} />} label="검증 조회수" tone="sky" value={formatCompactNumber(frame.views)} />
        <StatCard icon={<Film size={16} />} label="받은 클립" tone="amber" value={frame.clips} />
      </StatGrid>
      <p className="cl-bdemo__label">받은 클립</p>
      <DataTable
        columns={[
          { key: 'creator', header: '크리에이터', render: (row) => row.creator },
          { key: 'platform', header: '플랫폼', render: (row) => platformLabel(row.platform) },
          {
            key: 'review',
            header: '검수',
            align: 'right',
            render: (row) => (row.approved ? <Badge tone="brand">승인</Badge> : <Badge tone="amber">검수 대기</Badge>),
          },
        ]}
        empty=""
        label="받은 클립"
        rowKey={(row) => String(row.id)}
        rows={frame.rows}
      />
    </div>
  );
}
```

- [ ] **Step 4: The section**

Create `apps/site/components/brand/solution-cards.tsx`:

```tsx
import type { ReactNode } from 'react';
import CampaignEditorDemo from '@/components/brand/demos/campaign-editor-demo';
import ClipSubmitDemo from '@/components/brand/demos/clip-submit-demo';
import ReceivedClipsDemo from '@/components/brand/demos/received-clips-demo';

// Spec §4.4, after the reference's "Introducing the new solution": a crop of the real product on top, fading out,
// then a centred title and one sentence.

const CARDS: { title: string; body: string; demo: ReactNode }[] = [
  { title: '예산과 조건만 정하세요', body: '캠페인 종류, 올릴 플랫폼, 예산만 정하면 준비가 끝나요.', demo: <CampaignEditorDemo /> },
  { title: '크리에이터가 만들어요', body: '승인된 크리에이터들이 각자 영상을 만들어 올리고, 링크로 제출해요.', demo: <ClipSubmitDemo /> },
  { title: '나머지는 Clipers가', body: '검수, 조회수 집계, 크리에이터 정산과 지급까지 Clipers가 맡아요.', demo: <ReceivedClipsDemo /> },
];

export default function SolutionCards() {
  return (
    <section aria-labelledby="solution-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="solution-title">
        정하기만 하면, 나머지는 Clipers가
      </h2>
      <div className="cl-solution">
        {CARDS.map((card) => (
          <article className="cl-solution__card" key={card.title}>
            <div aria-hidden className="cl-solution__visual">
              {card.demo}
            </div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Solution cards (reference: "Introducing the new solution") */
.cl-solution { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.cl-solution__card { display: flex; flex-direction: column; overflow: hidden; border-radius: 28px; background: var(--color-panel); text-align: center; }
.cl-solution__visual { position: relative; height: 360px; overflow: hidden; -webkit-mask-image: linear-gradient(180deg, #000 90%, transparent 100%); mask-image: linear-gradient(180deg, #000 90%, transparent 100%); }
.cl-solution__visual > .cl-bdemo { position: absolute; top: 24px; right: 24px; left: 24px; }
.cl-solution__card h3 { margin-top: 6px; padding: 0 28px; font-size: 22px; font-weight: 600; letter-spacing: -0.03em; }
.cl-solution__card p { max-width: 300px; margin: 10px auto 40px; padding: 0 20px; color: var(--color-text-muted); font-size: var(--font-size-3); line-height: 1.6; }
.cl-bdemo .cl-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cl-bdemo .cl-stat { gap: 10px; padding: 12px; }
.cl-bdemo .cl-stat__value { font-size: 18px; }
.cl-bdemo .cl-stat__label { font-size: 11.5px; }
.cl-bdemo .cl-table-wrap { overflow: visible; }
.cl-bdemo .cl-table { font-size: 12.5px; }
.cl-bdemo .cl-table th { padding: 6px 8px; font-size: 11.5px; }
.cl-bdemo .cl-table td { padding: 8px; }
.cl-bdemo--clips tbody tr:first-child { animation: cl-feed-in 0.45s ease both; }
.cl-bdemo-submit { position: absolute; inset: 0; }
.cl-bdemo-submit__clip { position: absolute; top: 26px; left: 24px; width: 132px; height: 236px; border-radius: 14px; background: #111; object-fit: cover; }
.cl-bdemo-submit__dialog { position: absolute; top: 40px; right: 20px; left: 96px; width: auto; max-height: none; font-size: 13px; text-align: left; }
.cl-bdemo-submit__dialog .cl-dialog__header { padding: 14px 16px 4px; }
.cl-bdemo-submit__dialog .cl-dialog__title { font-size: 14px; }
.cl-bdemo-submit__dialog .cl-dialog__body { gap: 12px; padding: 12px 16px; }
.cl-bdemo-submit__dialog .cl-dialog__footer { padding: 4px 16px 16px; }
.cl-bdemo-submit__dialog .cl-field__label { font-size: 12px; }
.cl-bdemo-submit__dialog .cl-input,
.cl-bdemo-submit__dialog .cl-select { height: 38px; font-size: 13px; }
.cl-bdemo-toast { position: absolute; top: 14px; left: 50%; z-index: 2; margin: 0; padding: 10px 14px; border-radius: 12px; background: rgba(40, 40, 40, 0.88); white-space: nowrap; opacity: 0; transform: translate(-50%, 8px); transition: opacity 0.3s ease, transform 0.3s ease; box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.5), inset 0 0.5px 0 rgba(255, 255, 255, 0.12), 0 10px 30px rgba(0, 0, 0, 0.25); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
.cl-bdemo-toast[data-on="true"] { opacity: 1; transform: translate(-50%, 0); }
@media (max-width: 960px) {
  .cl-solution { grid-template-columns: minmax(0, 1fr); max-width: 460px; margin: 0 auto; }
}
@media (prefers-reduced-motion: reduce) {
  .cl-demo-cursor, .cl-bdemo-toast { transition: none; }
  .cl-bdemo--clips tbody tr:first-child { animation: none; }
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors. (If `inert` is reported as an unknown prop, the React types are older than 19: replace `inert` with `{...{ inert: '' }}` in each demo and note it.)

```bash
git add apps/site/components/brand/demos/campaign-editor-demo.tsx apps/site/components/brand/demos/clip-submit-demo.tsx apps/site/components/brand/demos/received-clips-demo.tsx apps/site/components/brand/solution-cards.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand solution cards run the real product — editor, clip submit, received clips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Use-case tabs with the 제출 영상 window

**Files:**
- Create: `apps/site/components/brand/use-cases.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: The component**

Create `apps/site/components/brand/use-cases.tsx`:

```tsx
'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ChartLine, Film, House, Megaphone, MonitorPlay, Music, Package, Users } from 'lucide-react';
import { Avatar, PlatformIcon, StatusDot, formatCompactNumber } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { BRAND_CASES, caseThumbnails, type BrandCase } from '@/lib/brand-cases';
import type { ShowcaseKind, ShowcaseVideo } from '@/lib/youtube-showcase';

// Spec §4.5, after the reference's product tour: icon tabs over a progress track, then the brand app's 제출 영상
// screen for that case. Tabs advance every 6 seconds while on screen; a click jumps.

const ICONS: Record<BrandCase['id'], ReactNode> = {
  launch: <Package size={24} />,
  music: <Music size={24} />,
  channel: <MonitorPlay size={24} />,
};
const FRAMES = BRAND_CASES.map((item) => ({ ms: 6000, state: item.id }));
const NAV = [
  { label: '홈', icon: <House size={15} /> },
  { label: '캠페인', icon: <Megaphone size={15} /> },
  { label: '제출 영상', icon: <Film size={15} />, active: true },
  { label: '크리에이터', icon: <Users size={15} /> },
  { label: '분석', icon: <ChartLine size={15} /> },
];
const TILES = 5;

export default function UseCases({ videos = {} }: { videos?: Partial<Record<ShowcaseKind, ShowcaseVideo[]>> }) {
  const { ref, index, moving, go } = useDemoFrame<BrandCase['id'], HTMLElement>(FRAMES);
  const active = BRAND_CASES[index];
  const thumbnails = caseThumbnails(videos[active.showcase], TILES, index);

  return (
    <section aria-labelledby="cases-title" className="cl-landing-section cl-cases" ref={ref}>
      <h2 className="cl-landing-section__title" id="cases-title">
        이럴 때 캠페인을 열어요
      </h2>
      <div aria-label="사례" className="cl-cases__tabs" role="tablist">
        {BRAND_CASES.map((item, position) => (
          <button
            aria-controls="cases-panel"
            aria-selected={position === index}
            className="cl-cases__tab"
            id={`case-${item.id}`}
            key={item.id}
            onClick={() => go(position)}
            role="tab"
            type="button"
          >
            <span aria-hidden className="cl-cases__icon">
              {ICONS[item.id]}
            </span>
            <span className="cl-cases__label">{item.label}</span>
          </button>
        ))}
      </div>
      <div aria-hidden className="cl-cases__track" style={{ '--cases': BRAND_CASES.length, '--case': index } as CSSProperties}>
        <span data-moving={moving} key={index} />
      </div>

      <div aria-labelledby={`case-${active.id}`} className="cl-cases__panel" id="cases-panel" role="tabpanel">
        <p className="cl-cases__lead">{active.lead}</p>
        <div aria-hidden className="cl-demo cl-cases__window">
          <div className="cl-demo__titlebar">
            <span className="cl-traffic">
              <span className="cl-traffic__close" />
              <span className="cl-traffic__minimize" />
              <span className="cl-traffic__zoom" />
            </span>
            <span className="cl-demo__title">Clipers — 제출 영상</span>
            <span className="cl-demo__user">
              <Avatar name={active.brand} size="sm" />
              {active.brand}
            </span>
          </div>
          <div className="cl-demo__body">
            <nav className="cl-demo__nav">
              <img alt="" className="cl-demo__brand" src="/logo/clipers-wordmark.svg" />
              <span className="cl-demo__nav-heading">브랜드</span>
              {NAV.map((item) => (
                <span className="cl-demo__nav-item" data-active={item.active ?? false} key={item.label}>
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </nav>
            <div className="cl-cases__content">
              <header className="cl-live__head">
                <div>
                  <p className="cl-live__eyebrow">{active.kind}</p>
                  <p className="cl-live__title">{active.title}</p>
                </div>
                <StatusDot pulse tone="green">
                  진행 중
                </StatusDot>
              </header>
              <p className="cl-cases__filters">
                <span data-on="true">
                  전체<b>{active.counts.all}</b>
                </span>
                <span>
                  검수 대기<b>{active.counts.pending}</b>
                </span>
                <span>
                  승인<b>{active.counts.approved}</b>
                </span>
              </p>
              <ul className="cl-cases__grid">
                {active.clips.map((clip, position) => (
                  <li key={`${active.id}-${position}`} style={{ animationDelay: `${position * 60}ms` }}>
                    <img alt="" className="cl-cases__thumb" referrerPolicy="no-referrer" src={thumbnails[position]} />
                    <span className="cl-cases__who">
                      <Avatar name={clip.creator} size="sm" />
                      <span>{clip.creator}</span>
                      <PlatformIcon platform={clip.platform} size={13} />
                    </span>
                    <span className="cl-cases__row">
                      <span>조회수 {formatCompactNumber(clip.views)}</span>
                      {clip.pending ? (
                        <StatusDot pulse tone="yellow">
                          검수 대기
                        </StatusDot>
                      ) : (
                        <StatusDot tone="green">승인</StatusDot>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Use cases (reference: product tour) — icon tabs, a progress track, then the brand app's 제출 영상 screen */
.cl-cases__tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 200px)); justify-content: center; }
.cl-cases__tab { position: relative; display: grid; justify-items: center; gap: 14px; padding: 4px 0 26px; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.cl-cases__tab + .cl-cases__tab::before { position: absolute; top: 22px; left: 0; width: 1px; height: 40px; background: var(--gray-a4); content: ""; }
.cl-cases__icon { display: grid; place-items: center; width: 64px; height: 56px; border-radius: 16px; background: #fff; color: var(--color-text-subtle); box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 4px 14px rgba(0, 0, 0, 0.06); transition: color 0.2s ease; }
.cl-cases__label { color: #a1a1a6; font-size: 21px; font-weight: 600; letter-spacing: -0.03em; transition: color 0.2s ease; }
.cl-cases__tab[aria-selected="true"] .cl-cases__icon,
.cl-cases__tab[aria-selected="true"] .cl-cases__label,
.cl-cases__tab:hover .cl-cases__label { color: var(--color-text); }
.cl-cases__tab:focus-visible { outline: none; }
.cl-cases__tab:focus-visible .cl-cases__icon { box-shadow: var(--focus-ring); }
.cl-cases__track { position: relative; width: min(600px, 100%); height: 2px; margin: 0 auto; border-radius: 1px; background: var(--gray-a4); }
.cl-cases__track span { position: absolute; top: 0; bottom: 0; left: calc(var(--case) * 100% / var(--cases)); width: calc(100% / var(--cases)); overflow: hidden; border-radius: 1px; }
.cl-cases__track span::after { position: absolute; inset: 0; background: var(--brand-9); content: ""; transform-origin: left; }
.cl-cases__track span[data-moving="true"]::after { animation: cl-case-fill 6s linear both; }
@keyframes cl-case-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.cl-cases__lead { max-width: 560px; min-height: 58px; margin: 28px auto 36px; color: var(--color-text-muted); font-size: 17px; line-height: 1.7; text-align: center; text-wrap: balance; }
.cl-cases__window { width: min(1080px, 100%); margin: 0 auto; text-align: left; }
.cl-cases__window .cl-demo__body { min-height: 0; }
.cl-cases__content { display: grid; align-content: start; gap: 14px; min-width: 0; padding: 22px 28px 28px; }
.cl-cases__filters { display: flex; gap: 2px; width: max-content; margin: 0; padding: 3px; border-radius: 9px; background: var(--color-panel); color: var(--color-text-subtle); font-size: 12px; }
.cl-cases__filters span { padding: 5px 10px; border-radius: 7px; }
.cl-cases__filters span[data-on="true"] { background: var(--gray-a4); color: var(--color-text); }
.cl-cases__filters b { margin-left: 5px; color: var(--color-text-subtle); font-weight: 500; font-variant-numeric: tabular-nums; }
.cl-cases__grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
.cl-cases__grid li { display: grid; gap: 8px; min-width: 0; animation: cl-feed-in 0.45s ease both; }
.cl-cases__thumb { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: 10px; background: var(--color-panel); object-fit: cover; }
.cl-cases__who { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 12px; }
.cl-cases__who .cl-avatar { width: 18px; height: 18px; font-size: 9px; }
.cl-cases__who > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-cases__row { display: flex; align-items: center; justify-content: space-between; gap: 6px; color: var(--color-text-subtle); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.cl-cases__row .cl-status-dot { font-size: 11.5px; }
@media (max-width: 800px) {
  .cl-cases__tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cl-cases__icon { display: none; }
  .cl-cases__label { font-size: 15px; }
  .cl-cases__tab { padding-bottom: 14px; }
  .cl-cases__tab + .cl-cases__tab::before { top: 4px; height: 18px; }
  .cl-cases__window .cl-demo__body { grid-template-columns: minmax(0, 1fr); }
  .cl-cases__window .cl-demo__nav { display: none; }
  .cl-cases__content { padding: 16px; }
  .cl-cases__grid { grid-auto-columns: 40%; grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; scroll-snap-type: x mandatory; }
  .cl-cases__grid li { scroll-snap-align: start; }
}
@media (prefers-reduced-motion: reduce) {
  .cl-cases__grid li { animation: none; }
  .cl-cases__track span::after { transform: none; }
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.

```bash
git add apps/site/components/brand/use-cases.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand use cases — tabs over the brand app's 제출 영상 screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Controls bento

**Files:**
- Create: `apps/site/components/brand/demos/control-demos.tsx`
- Create: `apps/site/components/brand/controls-bento.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: The four small demos**

Create `apps/site/components/brand/demos/control-demos.tsx`:

```tsx
'use client';

import { useId } from 'react';
import { CAMPAIGN_REQUIREMENTS_MAX } from '@clipers/db';
import { Avatar, Field, Input, ProgressBar, StatusDot, SummaryList, Textarea, formatCompactKRW } from '@clipers/ui';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { APPLICANT_FRAMES, BUDGET_TOTAL, CAP_FRAMES, budgetFrames, requirementsFrames } from '@/lib/brand-demos';

// The four crops of the controls bento (spec §4.6), each a piece of the real brand app. None pairs won with views.

const REQUIREMENT_FRAMES = requirementsFrames();
const BUDGET_FRAMES = budgetFrames();

export function RequirementsDemo() {
  const { ref, frame } = useDemoFrame(REQUIREMENT_FRAMES);
  const id = useId();
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <Field count={frame.length} hint="검수 기준이 돼요." htmlFor={id} label="요구사항" maxLength={CAMPAIGN_REQUIREMENTS_MAX}>
        <Textarea id={id} readOnly rows={3} value={frame} />
      </Field>
    </div>
  );
}

const CAP_BARS = [
  { label: '하루 · 여름밤 후렴 챌린지', share: 1 },
  { label: '민지 · 여름밤 립싱크', share: 0.64 },
  { label: '도윤 · 퇴근길 여름밤', share: 0.31 },
];

export function ClipCapDemo() {
  const { ref, frame } = useDemoFrame(CAP_FRAMES);
  const id = useId();
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <Field htmlFor={id} label="클립당 최대 예산 (원)">
        <Input id={id} readOnly value="300000" />
      </Field>
      <ul className="cl-bdemo__bars">
        {CAP_BARS.map((bar) => (
          <li key={bar.label}>
            <span>{bar.label}</span>
            {bar.share === 1 && frame.capped ? <StatusDot tone="gray">상한 도달</StatusDot> : <span />}
            <ProgressBar label="상한 대비" value={frame.filled ? bar.share : 0} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const APPLICANTS = [
  { name: '하루', detail: '음악 · 유튜브 쇼츠' },
  { name: '민지', detail: '뷰티 · 인스타그램 릴스', waits: true },
  { name: '도윤', detail: '음악 · 틱톡' },
  { name: '서아', detail: '댄스 · 네이버 클립' },
];

export function ApplicantsDemo() {
  const { ref, frame: approved } = useDemoFrame(APPLICANT_FRAMES);
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <p className="cl-bdemo__label">지원한 크리에이터</p>
      <ul className="cl-bdemo__people">
        {APPLICANTS.map((person) => (
          <li key={person.name}>
            <Avatar name={person.name} size="sm" />
            <span className="cl-bdemo__person">
              <span>{person.name}</span>
              <small>{person.detail}</small>
            </span>
            {person.waits && !approved ? (
              <StatusDot pulse tone="yellow">
                검토 중
              </StatusDot>
            ) : (
              <StatusDot tone="green">승인</StatusDot>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetDemo() {
  const { ref, frame: remaining } = useDemoFrame(BUDGET_FRAMES);
  return (
    <div className="cl-app-dark cl-bdemo" inert ref={ref}>
      <p className="cl-bdemo__label">남은 예산</p>
      <p className="cl-bdemo__big">
        {formatCompactKRW(remaining)} <small>/ {formatCompactKRW(BUDGET_TOTAL)}</small>
      </p>
      <ProgressBar label="예산 사용률" value={1 - remaining / BUDGET_TOTAL} />
      <SummaryList rows={[{ label: '예산을 다 쓰면', value: '캠페인 자동 종료' }]} />
    </div>
  );
}
```

- [ ] **Step 2: The section**

Create `apps/site/components/brand/controls-bento.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ApplicantsDemo, BudgetDemo, ClipCapDemo, RequirementsDemo } from '@/components/brand/demos/control-demos';

// Spec §4.6, after the reference's "The best by design.": small and large cards alternate per row; a large title,
// one sentence, and a crop of the real app cut by the card's bottom-right edge.

const CARDS: { size: 's' | 'l'; title: string; body: string; demo: ReactNode }[] = [
  { size: 's', title: '꼭 지킬 조건', body: '적어 둔 조건이 그대로 검수 기준이 돼요.', demo: <RequirementsDemo /> },
  { size: 'l', title: '클립마다 상한', body: '영상 하나가 예산을 독차지하지 않도록, 클립 하나에 쓰일 예산의 상한을 정해요.', demo: <ClipCapDemo /> },
  { size: 'l', title: '승인된 크리에이터만', body: '크리에이터는 캠페인마다 지원하고, 운영팀이 승인한 사람만 영상을 올려요.', demo: <ApplicantsDemo /> },
  { size: 's', title: '남은 예산은 실시간으로', body: '예산을 다 쓰면 캠페인이 알아서 끝나요.', demo: <BudgetDemo /> },
];

export default function ControlsBento() {
  return (
    <section aria-labelledby="controls-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="controls-title">
        정한 대로, 정한 만큼만
      </h2>
      <div className="cl-bento2">
        {CARDS.map((card) => (
          <article className="cl-bento2__card" data-size={card.size} key={card.title}>
            <div className="cl-bento2__text">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
            <div aria-hidden className="cl-bento2__visual">
              {card.demo}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Controls bento (reference: "The best by design.") — 2 + 3 columns, then 3 + 2 */
.cl-bento2 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.cl-bento2__card { position: relative; min-height: 330px; overflow: hidden; border-radius: 28px; background: var(--color-panel); }
.cl-bento2__card[data-size="s"] { grid-column: span 2; }
.cl-bento2__card[data-size="l"] { grid-column: span 3; }
.cl-bento2__text { position: relative; z-index: 1; max-width: 330px; padding: 36px 36px 0; }
.cl-bento2__card[data-size="l"] .cl-bento2__text { position: absolute; top: 50%; left: 0; max-width: 300px; padding: 0 0 0 40px; transform: translateY(-50%); }
.cl-bento2__text h3 { font-size: 28px; font-weight: 600; letter-spacing: -0.035em; }
.cl-bento2__text p { margin-top: 8px; color: var(--color-text-muted); font-size: var(--font-size-3); line-height: 1.6; }
.cl-bento2__visual > .cl-bdemo { position: absolute; right: 0; bottom: 0; border-radius: 16px 0 0 0; }
.cl-bento2__card[data-size="s"] .cl-bento2__visual > .cl-bdemo { left: 36px; }
.cl-bento2__card[data-size="l"] .cl-bento2__visual > .cl-bdemo { top: 40px; left: 46%; }
.cl-bdemo__bars { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
.cl-bdemo__bars li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 6px 12px; }
.cl-bdemo__bars li > span:first-child { color: var(--color-text-muted); font-size: 12.5px; }
.cl-bdemo__bars .cl-progress { grid-column: 1 / -1; grid-row: 2; }
.cl-bdemo__bars .cl-progress__fill { transition: width 1.2s ease; }
.cl-bdemo__bars .cl-status-dot { font-size: 12.5px; }
.cl-bdemo__people { display: grid; margin: 0; padding: 0; list-style: none; }
.cl-bdemo__people li { display: flex; align-items: center; gap: 12px; padding: 11px 0; box-shadow: inset 0 -1px 0 var(--gray-a3); }
.cl-bdemo__people li:last-child { box-shadow: none; }
.cl-bdemo__person { display: grid; flex: 1 1 auto; min-width: 0; }
.cl-bdemo__person span { font-weight: 500; }
.cl-bdemo__person small { color: var(--color-text-subtle); font-size: 11.5px; }
.cl-bdemo__people .cl-status-dot { font-size: 12.5px; }
@media (max-width: 960px) {
  .cl-bento2 { grid-template-columns: minmax(0, 1fr); }
  .cl-bento2__card[data-size] { display: grid; grid-column: auto; min-height: 0; }
  .cl-bento2__card[data-size] .cl-bento2__text { position: relative; top: auto; max-width: none; padding: 32px 28px 0; transform: none; }
  .cl-bento2__visual { position: relative; margin-top: 24px; padding-left: 28px; }
  .cl-bento2__card[data-size] .cl-bento2__visual > .cl-bdemo { position: relative; top: auto; right: auto; bottom: auto; left: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .cl-bdemo__bars .cl-progress__fill { transition: none; }
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.

```bash
git add apps/site/components/brand/demos/control-demos.tsx apps/site/components/brand/controls-bento.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand controls bento — requirements, clip cap, approved creators, live budget

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verification flow

**Files:**
- Create: `apps/site/components/brand/demos/verified-views.tsx`
- Create: `apps/site/components/brand/verify-flow.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: The counter**

Create `apps/site/components/brand/demos/verified-views.tsx`:

```tsx
'use client';

import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { verifiedFrames } from '@/lib/brand-demos';

const FRAMES = verifiedFrames();

/** Verified views counting up in the verification flow's result panel (no money beside it). */
export default function VerifiedViews() {
  const { ref, frame } = useDemoFrame<number, HTMLElement>(FRAMES);
  return <strong ref={ref}>{frame.toLocaleString('ko-KR')}회</strong>;
}
```

- [ ] **Step 2: The section**

Create `apps/site/components/brand/verify-flow.tsx`:

```tsx
import { UserCheck } from 'lucide-react';
import { MeshGradient, PlatformIcon, StatusDot } from '@clipers/ui';
import VerifiedViews from '@/components/brand/demos/verified-views';

// Spec §4.7, after the reference's verification layer: a flow from platform data to verified views on the hero's
// mesh, then four plain points. No step numbers.

const SOURCES = [
  { platform: 'youtube_shorts', label: '유튜브 쇼츠', how: '조회수 자동 수집' },
  { platform: 'tiktok', label: '틱톡', how: '화면 캡처 대조' },
  { platform: 'instagram_reels', label: '인스타그램 릴스', how: '화면 캡처 대조' },
];
const CHECKS = [
  { label: '요구사항', tone: 'green' as const },
  { label: '조회수 대조', tone: 'green' as const },
  { label: '급증 감지', tone: 'yellow' as const, pulse: true },
];
const STAGES = ['플랫폼 데이터', '사람이 직접 검수', '이상 여부 확인', '검증된 조회수만 정산'];
const POINTS = [
  { lead: '사람이 직접 검수해요.', text: '올라온 영상은 운영팀이 48시간 안에 요구사항대로인지 확인해요. 통과한 영상만 정산돼요.' },
  { lead: '플랫폼에 맞게 확인해요.', text: '유튜브는 조회수를 자동으로 가져오고, 다른 플랫폼은 크리에이터가 낸 화면 캡처와 대조해요.' },
  { lead: '급증은 따로 봐요.', text: '짧은 시간에 비정상적으로 늘어난 조회수는 정산 전에 따로 확인해요.' },
  { lead: '걸러진 조회수엔 쓰이지 않아요.', text: '검증을 통과한 조회수만큼만 예산이 쓰여요.' },
];

export default function VerifyFlow() {
  return (
    <section aria-labelledby="verify-title" className="cl-landing-section">
      <h2 className="cl-landing-section__title" id="verify-title">
        검증된 조회수에만
        <br />
        예산이 쓰여요
      </h2>
      <div className="cl-verify-flow">
        <div aria-hidden className="cl-verify-flow__mesh">
          <MeshGradient />
        </div>
        <div aria-hidden className="cl-verify-flow__stage">
          <div className="cl-glass cl-verify-flow__sources">
            {SOURCES.map((source) => (
              <div key={source.platform}>
                <PlatformIcon platform={source.platform} size={22} />
                <span>
                  {source.label}
                  <small>{source.how}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="cl-verify-flow__rings">
            <i />
            <i />
            <i />
            <UserCheck size={28} />
          </div>
          <div className="cl-verify-flow__checks">
            {CHECKS.map((check) => (
              <div className="cl-glass" key={check.label}>
                <StatusDot pulse={check.pulse} tone={check.tone}>
                  {check.label}
                </StatusDot>
              </div>
            ))}
          </div>
          <div className="cl-glass cl-verify-flow__result">
            <StatusDot tone="green">
              <span>
                <VerifiedViews />
                <small>검증된 조회수</small>
              </span>
            </StatusDot>
          </div>
        </div>
        <ul className="cl-verify-flow__labels">
          {STAGES.map((stage) => (
            <li key={stage}>{stage}</li>
          ))}
        </ul>
      </div>
      <div className="cl-verify-points">
        {POINTS.map((point) => (
          <p key={point.lead}>
            <strong>{point.lead}</strong> {point.text}
          </p>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Verification flow (reference: verification layer), on the hero's mesh */
.cl-verify-flow { position: relative; overflow: hidden; border-radius: 32px; background: var(--color-panel); isolation: isolate; }
.cl-verify-flow__mesh,
.cl-start__mesh { position: absolute; inset: 0; z-index: -1; -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.45) 35%, #000 100%); mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.45) 35%, #000 100%); }
.cl-verify-flow__stage { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: center; justify-items: center; padding: 48px 40px; }
.cl-verify-flow__stage::before { position: absolute; top: 50%; right: 14%; left: 14%; border-top: 2px dashed rgba(0, 0, 0, 0.14); content: ""; }
.cl-glass { position: relative; padding: 14px 16px; border-radius: 16px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 10px 30px rgba(0, 0, 0, 0.07); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.cl-verify-flow__sources { display: grid; gap: 10px; width: 190px; }
.cl-verify-flow__sources div { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.cl-verify-flow__sources small { display: block; color: var(--color-text-subtle); font-size: 11.5px; }
.cl-verify-flow__rings { position: relative; display: grid; place-items: center; width: 176px; height: 176px; }
.cl-verify-flow__rings i { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.35); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7); }
.cl-verify-flow__rings i:nth-child(1) { inset: 0; }
.cl-verify-flow__rings i:nth-child(2) { inset: 26px; }
.cl-verify-flow__rings i:nth-child(3) { inset: 52px; background: #fff; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); }
.cl-verify-flow__rings svg { position: relative; }
.cl-verify-flow__rings::after { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 2px rgba(88, 185, 130, 0.5); animation: cl-verify-ripple 2.4s ease-out infinite; content: ""; }
@keyframes cl-verify-ripple { from { opacity: 1; transform: scale(0.4); } to { opacity: 0; transform: scale(1.05); } }
.cl-verify-flow__checks { display: grid; gap: 8px; }
.cl-verify-flow__checks .cl-glass { padding: 10px 14px; }
.cl-verify-flow__checks .cl-glass:nth-child(1) { transform: rotate(-4deg) translateX(10px); }
.cl-verify-flow__checks .cl-glass:nth-child(3) { transform: rotate(3deg) translateX(-6px); }
.cl-verify-flow__checks .cl-status-dot { font-size: 13px; }
.cl-verify-flow__result { width: 210px; }
.cl-verify-flow__result .cl-status-dot { align-items: center; gap: 12px; }
.cl-verify-flow__result strong { display: block; font-size: 22px; font-weight: 600; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.cl-verify-flow__result small { display: block; color: var(--color-text-subtle); font-size: 12px; font-weight: 400; }
.cl-verify-flow__labels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; padding: 4px 40px 48px; list-style: none; text-align: center; }
.cl-verify-flow__labels li { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
.cl-verify-flow__labels li + li { box-shadow: -1px 0 0 rgba(0, 0, 0, 0.1); }
.cl-verify-points { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 28px; }
.cl-verify-points p { margin: 0; padding: 28px 40px; color: var(--color-text-muted); font-size: var(--font-size-3); line-height: 1.7; }
.cl-verify-points strong { color: var(--color-text); font-weight: 600; }
.cl-verify-points p:nth-child(1) { box-shadow: 1px 0 0 var(--gray-a4), 0 1px 0 var(--gray-a4); }
.cl-verify-points p:nth-child(2) { box-shadow: 0 1px 0 var(--gray-a4); }
.cl-verify-points p:nth-child(3) { box-shadow: 1px 0 0 var(--gray-a4); }
@media (max-width: 900px) {
  .cl-verify-flow__stage { grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 40px 24px; }
  .cl-verify-flow__stage::before { top: 40px; right: auto; bottom: 40px; left: 50%; border-top: 0; border-left: 2px dashed rgba(0, 0, 0, 0.14); }
  .cl-verify-flow__labels { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 24px 32px; }
  .cl-verify-flow__labels li + li { box-shadow: none; }
  .cl-verify-points { grid-template-columns: minmax(0, 1fr); }
  .cl-verify-points p,
  .cl-verify-points p:nth-child(n) { padding: 20px 4px; box-shadow: 0 1px 0 var(--gray-a4); }
}
@media (prefers-reduced-motion: reduce) {
  .cl-verify-flow__rings::after { animation: none; }
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.

```bash
git add apps/site/components/brand/demos/verified-views.tsx apps/site/components/brand/verify-flow.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand verification flow on the hero mesh, with four plain points

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Start card with the deposit demo

**Files:**
- Create: `apps/site/components/brand/demos/deposit-demo.tsx`
- Create: `apps/site/components/brand/start-card.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css` (append)

- [ ] **Step 1: The deposit demo**

Create `apps/site/components/brand/demos/deposit-demo.tsx`:

```tsx
'use client';

import { Badge, Button, Card, SummaryList, formatKRW } from '@clipers/ui';
import DemoCursor from '@/components/brand/demo-cursor';
import { useDemoFrame } from '@/components/brand/use-demo-frame';
import { DEPOSIT_FRAMES, DEPOSIT_STATUS } from '@/lib/brand-demos';

/** The brand campaign page's deposit card: 입금했어요 → 입금 확인 중 → 진행 중. The real account number is never shown. */
export default function DepositDemo() {
  const { ref, frame } = useDemoFrame(DEPOSIT_FRAMES);
  const status = DEPOSIT_STATUS[frame.status];

  return (
    <div className="cl-app-dark cl-bdemo cl-bdemo--deposit" inert ref={ref}>
      <Card actions={<Badge tone={status.tone}>{status.label}</Badge>} description={status.lead} title="예산 입금">
        <div className="cl-stack-tight">
          <SummaryList
            rows={[
              { label: '입금 금액', value: formatKRW(3_000_000) },
              { label: '입금 계좌', value: 'Clipers 운영 계좌' },
              { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
            ]}
          />
          <div>
            <Button data-demo="deposit" disabled={frame.status !== 'draft'} variant="primary">
              {frame.sending ? '알리는 중…' : '입금했어요'}
            </Button>
          </div>
        </div>
      </Card>
      <DemoCursor click={frame.click} stage={ref} target={frame.cursor} />
    </div>
  );
}
```

- [ ] **Step 2: The section**

Create `apps/site/components/brand/start-card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Activity, Clock, Smartphone, Wallet } from 'lucide-react';
import { MIN_CAMPAIGN_BUDGET, PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { ButtonLink, MeshGradient } from '@clipers/ui';
import DepositDemo from '@/components/brand/demos/deposit-demo';
import { SIGN_UP } from '@/components/landing-chrome';

// Spec §4.8, after the reference's "Run your next campaign": four facts and the buttons on the left, the real deposit
// card on the right.

export const CONTACT = '/contact?from=/brands';

const FACTS: { icon: ReactNode; lead?: string; strong: string; rest: string }[] = [
  { icon: <Wallet size={18} />, strong: `${MIN_CAMPAIGN_BUDGET / 10_000}만 원`, rest: '부터 시작' },
  { icon: <Smartphone size={18} />, strong: `${PLATFORMS.length}개`, rest: ' 숏폼 플랫폼' },
  { icon: <Clock size={18} />, strong: `${Math.max(...REVIEW_SLA_OPTIONS)}시간`, rest: ' 안에 검수' },
  { icon: <Activity size={18} />, lead: '남은 예산 ', strong: '실시간', rest: ' 확인' },
];

export default function StartCard() {
  return (
    <section aria-labelledby="start-title" className="cl-landing-section">
      <div className="cl-start">
        <div aria-hidden className="cl-start__mesh">
          <MeshGradient />
        </div>
        <div>
          <h2 id="start-title">
            다음 캠페인을
            <br />
            Clipers에서
          </h2>
          <ul className="cl-start__facts">
            {FACTS.map((fact) => (
              <li key={fact.strong}>
                {fact.icon}
                <span>
                  {fact.lead}
                  <strong>{fact.strong}</strong>
                  {fact.rest}
                </span>
              </li>
            ))}
          </ul>
          <div className="cl-start__actions">
            <ButtonLink href={SIGN_UP} size="lg" variant="primary">
              캠페인 시작하기
            </ButtonLink>
            <ButtonLink href={CONTACT} size="lg" variant="secondary">
              상담 문의
            </ButtonLink>
          </div>
        </div>
        <div aria-hidden>
          <DepositDemo />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Styles**

Append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Start card (reference: "Run your next campaign") */
.cl-start { position: relative; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; gap: 40px; padding: 72px; overflow: hidden; border-radius: 32px; background: var(--color-panel); isolation: isolate; }
.cl-start h2 { font-size: clamp(34px, 4.4vw, 52px); font-weight: 600; letter-spacing: -0.035em; line-height: 1.12; }
.cl-start__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 28px; margin: 36px 0 40px; padding: 0; list-style: none; }
.cl-start__facts li { display: flex; align-items: center; gap: 10px; color: var(--color-text-muted); font-size: var(--font-size-3); }
.cl-start__facts svg { flex: 0 0 auto; color: var(--color-text); }
.cl-start__facts strong { color: var(--color-text); font-weight: 600; }
.cl-start__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.cl-bdemo--deposit { padding: 8px; }
.cl-bdemo--deposit .cl-card { border-radius: 12px; }
@media (max-width: 900px) {
  .cl-start { grid-template-columns: minmax(0, 1fr); padding: 40px 24px; }
  .cl-start__facts { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.

```bash
git add apps/site/components/brand/demos/deposit-demo.tsx apps/site/components/brand/start-card.tsx packages/ui/src/styles/brand-landing.css
git commit -m "feat(site): brand start card — four facts, sign-up and contact, the real deposit card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Assemble the page, remove the old brand-only styles, guard the brand rate

**Files:**
- Rewrite: `apps/site/app/brands/page.tsx`
- Modify: `packages/ui/src/styles/components.css` (delete old brand-only rules)
- Create: `apps/site/lib/brand-page.test.ts`

- [ ] **Step 1: Write the failing guard test**

Create `apps/site/lib/brand-page.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';

// The brand page and its components must never state the brand rate (spec §2).

const root = path.resolve(__dirname, '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
const sources = [path.join(root, 'app/brands/page.tsx'), ...files(path.join(root, 'components/brand')), path.join(root, 'lib/brand-demos.ts'), path.join(root, 'lib/brand-cases.ts')];

describe('brand page sources', () => {
  it('exist', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it.each(sources)('%s never states the brand rate', (file) => {
    const text = readFileSync(file, 'utf8');
    expect(text).not.toContain('brandCpm');
    expect(text).not.toContain('1천 회당');
    expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
  });

  it('uses the new sections', () => {
    const page = readFileSync(path.join(root, 'app/brands/page.tsx'), 'utf8');
    for (const name of ['CompareTable', 'SolutionCards', 'UseCases', 'ControlsBento', 'VerifyFlow', 'StartCard', 'ADVERTISER_FAQ']) {
      expect(page).toContain(name);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @clipers/site test brand-page`
Expected: FAIL in "uses the new sections" (`CompareTable` not found in the old page). The rate checks may already pass; that is fine.

- [ ] **Step 3: Rewrite the page**

Replace the whole content of `apps/site/app/brands/page.tsx` with:

```tsx
import type { Metadata } from 'next';
import { ButtonLink, MeshGradient } from '@clipers/ui';
import BrandLiveWindow from '@/components/brand-live-window';
import CompareTable from '@/components/brand/compare-table';
import ControlsBento from '@/components/brand/controls-bento';
import SolutionCards from '@/components/brand/solution-cards';
import StartCard, { CONTACT } from '@/components/brand/start-card';
import UseCases from '@/components/brand/use-cases';
import VerifyFlow from '@/components/brand/verify-flow';
import LandingChrome, { LandingFaq, SIGN_UP } from '@/components/landing-chrome';
import LogoWall from '@/components/logo-wall';
import { ADVERTISER_FAQ } from '@/lib/advertiser-faq';
import { loadShowcaseVideos } from '@/lib/youtube-showcase';

// Brand landing. Design: docs/superpowers/specs/2026-10-01-brand-page-redesign-design.md.
// Order follows what a buyer asks: will it waste money → how is it different → how much work → does it fit us →
// can we control it → are the views real → how do we start. The brand rate is never shown, and no visual pairs a
// won amount with views (that pair would reveal it).

export const revalidate = 300;

export const metadata: Metadata = {
  title: '브랜드 · Clipers — 조회수가 난 만큼만 예산을 쓰는 숏폼 캠페인',
  description: '크리에이터들이 각자 숏폼을 만들어 올리고, 예산은 검수를 통과한 영상의 검증된 조회수에만 쓰여요. 캠페인은 100만 원부터 열 수 있어요.',
  alternates: { canonical: '/brands' },
};

export default async function BrandsPage() {
  const showcaseVideos = await loadShowcaseVideos();

  return (
    <LandingChrome cta="캠페인 시작하기" path="/brands">
      <section className="cl-landing-hero cl-landing-hero--window">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--window">
          <MeshGradient />
        </div>
        <h1 className="cl-landing-hero__title">
          조회수가 난 만큼만,
          <br />
          예산을 쓰세요
        </h1>
        <p className="cl-landing-hero__lead">
          크리에이터들이 각자 숏폼을 만들어 올려요.
          <br />
          예산은 검증된 조회수에만 쓰여요.
        </p>
        <div className="cl-landing-hero__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href="/discover" size="lg" variant="secondary">
            진행 중인 캠페인 보기
          </ButtonLink>
        </div>
        <BrandLiveWindow />
      </section>

      <section aria-label="함께 쓰는 플랫폼" className="cl-landing-logos">
        <LogoWall />
      </section>

      <CompareTable />
      <SolutionCards />
      <UseCases videos={showcaseVideos} />
      <ControlsBento />
      <VerifyFlow />
      <StartCard />

      <LandingFaq items={ADVERTISER_FAQ} path="/brands" />

      <section className="cl-closing">
        <div aria-hidden className="cl-hero-mesh cl-hero-mesh--closing">
          <MeshGradient />
        </div>
        <h2 className="cl-closing__title">
          <span>다음 숏폼 캠페인을,</span> <span>오늘 열어 보세요</span>
        </h2>
        <p className="cl-closing__lead">캠페인은 100만 원부터 열 수 있어요. 예산은 검증된 조회수에만 쓰여요.</p>
        <div className="cl-closing__actions">
          <ButtonLink href={SIGN_UP} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink href={CONTACT} size="lg" variant="secondary">
            상담 문의
          </ButtonLink>
        </div>
      </section>
    </LandingChrome>
  );
}
```

- [ ] **Step 4: Run the guard test**

Run: `pnpm --filter @clipers/site test brand-page`
Expected: PASS.

- [ ] **Step 5: Check the old classes are unused, then delete their rules**

Run: `grep -rn "cl-features\|cl-feature\b\|cl-feature_\|cl-shot\|cl-verify\b\|cl-verify_\|cl-review\|cl-audience\|cl-figures\|cl-landing-cta\|cl-mock-review\|cl-mock-stats" apps packages --include=*.tsx | grep -v node_modules | grep -v "\.next"`
Expected: no output. (If anything is listed, keep that class's rules and remove it from the list in the next command.)

Then run from the repo root:

```bash
python - <<'EOF'
import re
path = 'packages/ui/src/styles/components.css'
prefixes = ('.cl-features', '.cl-feature', '.cl-shot', '.cl-verify', '.cl-review', '.cl-audience', '.cl-figures', '.cl-landing-cta', '.cl-mock-review', '.cl-mock-stats', '/* Brand verification: a real review screen', '/* Feature cards: copy top-left')
lines = open(path, encoding='utf-8').read().split('\n')
kept = [line for line in lines if not line.strip().startswith(prefixes)]
text = '\n'.join(kept)
text = re.sub(r'@media \([^)]*\) \{\s*\}\n?', '', text)  # media blocks left empty
open(path, 'w', encoding='utf-8').write(text)
print(len(lines) - len(kept), 'lines removed')
EOF
```

Expected: prints a count around 70.

Note: `.cl-verify-flow` and `.cl-verify-points` live in `brand-landing.css`, not `components.css`, so the `.cl-verify` prefix only removes the old rules.

- [ ] **Step 6: Typecheck and run every site test**

Run: `pnpm --filter @clipers/site exec tsc --noEmit` — Expected: no errors.
Run: `pnpm --filter @clipers/site test` — Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/site/app/brands/page.tsx apps/site/lib/brand-page.test.ts packages/ui/src/styles/components.css
git commit -m "feat(site): brand page rebuilt — comparison, real product demos, use cases, controls, verification, start card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Visual and policy verification

**Files:** none in the repo (screenshots go to the session scratchpad).

- [ ] **Step 1: Screenshot script**

Save this as `scrollshot.mjs` in the session scratchpad directory (not in the repo):

```js
// Scroll a page in headless Chrome and save one viewport screenshot per step (CDP over WebSocket, no deps).
// usage: node scrollshot.mjs <url> <prefix> [step=800] [width=1440] [height=900] [reducedMotion=0]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [url, prefix, stepArg = '800', widthArg = '1440', heightArg = '900', reduced = '0'] = process.argv.slice(2);
const [step, width, height] = [Number(stepArg), Number(widthArg), Number(heightArg)];
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars', `--window-size=${width},${height}`,
  `--user-data-dir=${process.env.TEMP}/cdp-${port}`, 'about:blank',
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(300);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let id = 0;
const pending = new Map();
ws.onmessage = (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); } };
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
if (reduced === '1') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(6000);
const total = (await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })).result.value;
let n = 0;
for (let y = 0; y < total; y += step) {
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
  await sleep(1300);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  writeFileSync(`${prefix}_${String(n++).padStart(2, '0')}.jpg`, Buffer.from(shot.data, 'base64'));
}
console.log('height', total, 'shots', n);
ws.close();
chrome.kill();
process.exit(0);
```

- [ ] **Step 2: Desktop**

Run (from the scratchpad): `node scrollshot.mjs http://localhost:3001/brands b1440 800`
Open every `b1440_*.jpg` and check, section by section:
- Order: hero → logos → comparison → solution cards → use cases → controls → verification → start card → FAQ → closing.
- Product crops are dark (app colours) on light-gray cards; nothing is cut by the fade except the crop's last ~10%.
- Cursors land on their targets (클리핑 card, each chip, the budget field, the select, the link field, 제출하기, 입금했어요).
- Nothing beige; no text overflow; tabs track sits under the selected tab.

- [ ] **Step 3: Phone width**

Run: `node scrollshot.mjs http://localhost:3001/brands b390 700 390 844`
Check: comparison stacks into cards, solution cards stack, tabs lose their icons, the window hides its sidebar and the clip tiles scroll sideways, bento cards stack, flow goes vertical, start card stacks. No horizontal page scroll (the first screenshot is exactly 390 wide with no cut text).

- [ ] **Step 4: Reduced motion**

Run: `node scrollshot.mjs http://localhost:3001/brands breduced 800 1440 900 1`
Check: every demo shows its finished state (editor 5/7 with budget typed, dialog with toast, deposit 진행 중, requirements fully typed) and nothing moves between two runs.

- [ ] **Step 5: The other landings after the palette change**

Run: `node scrollshot.mjs http://localhost:3001/ c1440 900`, `node scrollshot.mjs http://localhost:3001/contact k1440 900`, `node scrollshot.mjs http://localhost:3001/guides g1440 900`, `node scrollshot.mjs http://localhost:3001/discover d1440 900`.
Check: no beige left anywhere; dark product windows unchanged.

- [ ] **Step 6: Brand rate never rendered**

Run: `curl -s http://localhost:3001/brands | grep -c "1천 회당\|3,000원"`
Expected: `0`.

- [ ] **Step 7: Fix anything found**

For each problem, adjust the relevant rule in `packages/ui/src/styles/brand-landing.css` (or the component), re-run the matching screenshot, then commit with a message that says what was fixed, e.g.:

```bash
git add packages/ui/src/styles/brand-landing.css
git commit -m "style(site): brand demos — <what was fixed>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
