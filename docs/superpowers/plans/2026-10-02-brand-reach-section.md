# Brand Reach Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "팔로워가 아니라, 영상이 퍼져요" section to `/brands` in the creator page's sticky campaign-kinds grammar, move the 89% figure into it, and fold the solution cards into the controls bento.

**Architecture:** The sticky-stage logic in `CampaignTypes` moves into a `useStickySteps` hook that both `CampaignTypes` and the new `ReachStory` use. The short-form phone screen in `EarningsPhone` becomes a `ShortSlide` component so `ReachStory` draws the same phone. Scene data and the view-count climb live in `lib/brand-reach.ts` with tests.

**Tech Stack:** Next.js 15 (app router), React 19, `@clipers/ui`, lucide-react, vitest. Styles in `packages/ui/src/styles/{components,brand-landing}.css`.

Spec: `docs/superpowers/specs/2026-10-02-brand-reach-section-design.md`.

---

### Task 1: Scene data and the view climb (`lib/brand-reach.ts`)

**Files:**
- Create: `apps/site/lib/brand-reach.ts`
- Test: `apps/site/lib/brand-reach.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { PLATFORMS } from '@clipers/db';
import { hitProbability } from './views-math';
import { FEED_CLIP, FEED_VIEWS_FROM, HIT_PERCENT, HOOP_CLIPS, RANKED_CLIPS, climbViews, compactViews } from './brand-reach';

describe('reach scenes', () => {
  it('quotes the hit chance from the model', () => {
    expect(HIT_PERCENT).toBe(Math.round(hitProbability(10) * 100));
    expect(HIT_PERCENT).toBe(89);
  });
  it('uses real platforms', () => {
    const platforms = new Set<string>(PLATFORMS.map((platform) => platform.value));
    for (const clip of [FEED_CLIP, ...HOOP_CLIPS]) expect(platforms.has(clip.platform)).toBe(true);
    for (const row of RANKED_CLIPS) expect(platforms.has(row.platform)).toBe(true);
  });
  it('ranks the list by views, led by the clip the phones showed', () => {
    const views = RANKED_CLIPS.map((row) => row.views);
    expect([...views].sort((a, b) => b - a)).toEqual(views);
    const hit = HOOP_CLIPS.find((clip) => clip.hit)!;
    expect(RANKED_CLIPS[0]).toMatchObject({ title: hit.caption, views: hit.views });
  });
  it('climbs from the start to the clip views and holds', () => {
    expect(climbViews(0)).toBe(FEED_VIEWS_FROM);
    expect(climbViews(1)).toBe(FEED_CLIP.views);
    expect(climbViews(2)).toBe(FEED_CLIP.views);
    expect(climbViews(0.5)).toBeGreaterThan(FEED_VIEWS_FROM);
  });
  it('writes views like the apps do', () => {
    expect(compactViews(482_000)).toBe('48.2만');
    expect(compactViews(8_400)).toBe('8,400');
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @clipers/site test -- brand-reach` → FAIL (module not found).

- [ ] **Step 3: Implement** `brand-reach.ts`: `ReachClip` type (`video, poster, platform, handle, caption, likes, comments, views, hit?`), `FEED_CLIP` (pet, `dailypaws.new`, tiktok, 482,000), `FEED_FOLLOWERS = 312`, `FEED_VIEWS_FROM = 310_000`, `HOOP_CLIPS` (slow/close/late in left-centre-right order; close is `hit`, 314,000; slow 12,000 youtube_shorts; late 8,400 tiktok; close instagram_reels), `RANKED_CLIPS` (five rows from spec §4.2 with `creator, title, platform, views`), `HIT_PERCENT`, `climbViews(t)` (ease-out cubic, clamped, rounded to 100), `compactViews(n)` (≥ 10,000 → `x.x만`, else `toLocaleString('ko-KR')`).

- [ ] **Step 4: Run** the test → PASS.

- [ ] **Step 5: Commit** `feat(site): brand reach scenes — clips, ranked list, view climb`

### Task 2: `useStickySteps` hook out of `CampaignTypes`

**Files:**
- Create: `apps/site/components/use-sticky-steps.ts`
- Modify: `apps/site/components/campaign-types.tsx`

- [ ] **Step 1:** Move the scroll-progress effect, the one-wheel-one-step handler and `jumpTo` verbatim into `useStickySteps(count: number)` returning `{ rootRef, progress, active, jumpTo }` (`rootRef` typed `RefObject<HTMLElement | null>`).
- [ ] **Step 2:** `CampaignTypes` calls `const { rootRef, progress, active, jumpTo } = useStickySteps(KINDS.length);` and keeps its markup.
- [ ] **Step 3:** `pnpm --filter @clipers/site exec tsc --noEmit` passes; `/` capture at 1440×900 shows the kinds section unchanged and wheel steps still move one kind.
- [ ] **Step 4: Commit** `refactor(site): sticky steps hook out of the campaign kinds section`

### Task 3: `ShortSlide` out of `EarningsPhone`

**Files:**
- Create: `apps/site/components/short-slide.tsx`
- Modify: `apps/site/components/earnings-phone.tsx`

- [ ] **Step 1:** `ShortSlide({ clip, state, preload, videoRef, children })` renders one `cl-short__slide` (video, scrim, rail with avatar/likes/comments/send, info with handle/caption/optional tag/audio) and then `children` (EarningsPhone passes the heart burst and progress bar). `clip` type: `{ video, poster, handle, caption, tag?, likes, comments }`.
- [ ] **Step 2:** `EarningsPhone` maps `CLIPS` to `<ShortSlide …>`; output HTML unchanged.
- [ ] **Step 3:** Typecheck; `/` hero capture unchanged.
- [ ] **Step 4: Commit** `refactor(site): the short-form phone screen is its own component`

### Task 4: `ReachStory` section

**Files:**
- Create: `apps/site/components/brand/reach-story.tsx`
- Modify: `packages/ui/src/styles/brand-landing.css`, `apps/site/app/brands/page.tsx`, `apps/site/lib/brand-page.test.ts`

- [ ] **Step 1:** Section `cl-kinds cl-reach` with `aria-labelledby="reach-title"`, a visually hidden h2 "팔로워가 아니라, 영상이 퍼져요", `useStickySteps(3)`, three `cl-kinds__item` (data-kind `feed` / `more` / `ranked`) each with `cl-kinds__text` (icon `Send` / `Layers` / `ChartNoAxesColumn`, strong + body from spec §4.2, footnote markers ¹ ²) and a `cl-kinds__stack` of `cl-kinds__card` children:
  - feed: account card (`cl-earn__card`, "올린 계정", avatar + `@dailypaws.new`, "팔로워 312명"), phone (`DeviceFrame` + `cl-short` + `ShortSlide`, `cl-earn__views` with the climbing count), views card ("이 영상의 조회수", `compactViews(climbViews(t))`, `StatusDot green` "추천 피드에서").
  - more: three phones (`HOOP_CLIPS`) each with `cl-earn__views`; the hit's number in `--brand-11`.
  - ranked: `cl-app-dark cl-bdemo` panel, label "받은 클립 · 조회수 순", `RANKED_CLIPS` rows (avatar, title, "creator · platform name", views; first row `data-hit`).
  - The progress nav is the same `cl-kinds__progress` markup as `CampaignTypes`.
  - Videos play only while their scene is active and the section is on screen; reduced motion → posters, final counts.
  - Footnotes `<div class="cl-reach__notes">` after the stage (spec §4.3).
  - Visuals carry `aria-hidden` and `inert`.
- [ ] **Step 2:** CSS `cl-reach__*`: positions per data-kind for wide screens (phones 228px; feed phone centred, cards at top-right / mid-left; more: centre phone in front, side phones `--s: 0.82` behind; ranked: panel 440px centred), the ranked list rows, hit colour, notes (12px subtle, width like the stage); ≤ 860px overrides so phones and panel stack centred without overflow (single phone per scene visible at 220px, side phones hidden in `more`).
- [ ] **Step 3:** `page.tsx` order: HorizonHero, ViewsStory, ReachStory, CompareTable, UseCases, ControlsBento, VerifyFlow, StartCard; `brand-page.test.ts` list swaps `SolutionCards` for `ReachStory`.
- [ ] **Step 4:** Tests + typecheck; capture `/brands` at 1440×900, 1536×821, 390 and check the three scenes.
- [ ] **Step 5: Commit** `feat(site): brand reach section — videos spread, not followers`

### Task 5: ViewsStory loses the 89% figure

**Files:** Modify `apps/site/components/brand/views-story.tsx`, `packages/ui/src/styles/brand-landing.css`

- [ ] **Step 1:** Drop the third stat and the `hitProbability` import; ranges `[0.44, 0.58]`, `[0.60, 0.74]`.
- [ ] **Step 2:** `.cl-views__stats` 2 columns; remove the `:nth-child(3)` mobile rule.
- [ ] **Step 3:** Capture; commit `feat(site): data section keeps two numbers; the hit chance moved to the reach section`

### Task 6: One "정하기만 하면" bento; solution cards go

**Files:** Modify `controls-bento.tsx`; delete `solution-cards.tsx`, `demos/campaign-editor-demo.tsx`, `demos/clip-submit-demo.tsx`, `demos/received-clips-demo.tsx`; trim `lib/brand-demos.ts` + test; remove `cl-solution*` (and `cl-crop*` if nothing else uses it) from `brand-landing.css`.

- [ ] **Step 1:** Bento title "정하기만 하면, 나머지는 Clipers가", card copy from spec §5.
- [ ] **Step 2:** Delete files and the editor/received-clip data + their test block, after `rg` shows no other users.
- [ ] **Step 3:** Tests, typecheck, capture; commit `feat(site): solution cards fold into one bento — 정하기만 하면, 나머지는 Clipers가`
