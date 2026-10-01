# Brand Hero and Views Data Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/brands` hero with a dark full-bleed "horizon" band drawn by a WebGL2 shader, add the scroll-linked "숏폼 조회수는 공평하지 않아요" data section right after it, and bring the deposit demo in line with the VAT billing change.

**Architecture:** The numbers come from pure functions in `apps/site/lib/views-math.ts` (tested). The shader source lives in `apps/site/lib/horizon-shader.ts` (tested for reversed `smoothstep` edges). Two client components render the sections: `horizon-hero.tsx` (canvas + copy, scroll-linked rise, fallbacks) and `views-story.tsx` (sticky pin, beats driven by native scroll — never hijacked). Styles go to `packages/ui/src/styles/brand-landing.css`; the old hero window and its styles are removed.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL2, vitest, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-01-brand-hero-data-design.md`

**Commands:** tests `pnpm --filter @clipers/site test [filter]`; typecheck `pnpm --filter @clipers/site exec tsc --noEmit`; dev site http://localhost:3001. Stage only the files each task names (another session works in parallel).

---

### Task 1: The numbers (`views-math.ts`)

**Files:** Create `apps/site/lib/views-math.ts`, `apps/site/lib/views-math.test.ts`

- [ ] **Step 1: Failing test** — `apps/site/lib/views-math.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PARETO_ALPHA,
  belowMeanShare,
  hitProbability,
  hitTiles,
  medianPricePer1kManwon,
  medianToMean,
  topShare,
  worstCostMultiple,
} from './views-math';

describe('views math (80:20 as a Pareto distribution)', () => {
  it('gives the top 20% of videos 80% of views', () => {
    expect(PARETO_ALPHA).toBeCloseTo(1.161, 3);
    expect(topShare(0.2)).toBeCloseTo(0.8, 6);
  });

  it('puts the median at a quarter of the mean', () => {
    expect(medianToMean()).toBeCloseTo(0.2519, 4);
    expect(medianPricePer1kManwon()).toBe(8);
  });

  it('leaves nine posts in ten below the mean, at worst about 7x the price per view', () => {
    expect(belowMeanShare()).toBeCloseTo(0.899, 3);
    expect(worstCostMultiple()).toBeCloseTo(7.21, 2);
  });

  it('gives ten clips an 89% chance of one top-20% hit', () => {
    expect(hitProbability(1)).toBeCloseTo(0.2, 6);
    expect(hitProbability(10)).toBeCloseTo(0.8926, 4);
  });

  it('scatters a fixed set of hit tiles', () => {
    const hits = hitTiles(100, 20);
    expect(hits).toHaveLength(20);
    expect(new Set(hits).size).toBe(20);
    expect(hits.every((index) => index >= 0 && index < 100)).toBe(true);
    expect(hitTiles(100, 20)).toEqual(hits);
  });
});
```

- [ ] **Step 2:** `pnpm --filter @clipers/site test views-math` → FAIL (module missing).

- [ ] **Step 3: Implementation** — `apps/site/lib/views-math.ts`:

```ts
// The numbers behind the brand page's data section (spec: docs/superpowers/specs/2026-10-01-brand-hero-data-design.md §3).
// Short-form views split 80:20 (SILC, UIUC·MIT 2026); modelled as a Pareto distribution, a few closed forms follow.
// Nothing here touches Clipers' own rates.

/** Pareto shape for which the top 20% of videos hold 80% of views: log 5 / log 4. */
export const PARETO_ALPHA = Math.log(5) / Math.log(4);

/** Sponsored short-form price basis: 20,000원 per 1,000 average views (Tagby, 2026). */
export const SPONSOR_PRICE_PER_1K = 20_000;

/** Share of all views held by the top `fraction` of videos. */
export function topShare(fraction: number, alpha = PARETO_ALPHA): number {
  return Math.pow(fraction, 1 - 1 / alpha);
}

/** Median views ÷ mean views. */
export function medianToMean(alpha = PARETO_ALPHA): number {
  return ((alpha - 1) / alpha) * Math.pow(2, 1 / alpha);
}

/** Share of posts that get fewer views than the mean they were priced on. */
export function belowMeanShare(alpha = PARETO_ALPHA): number {
  return 1 - Math.pow(alpha / (alpha - 1), -alpha);
}

/** The worst post's real cost per view, as a multiple of the agreed price (mean ÷ minimum). */
export function worstCostMultiple(alpha = PARETO_ALPHA): number {
  return alpha / (alpha - 1);
}

/** Chance that at least one of `clips` lands in the top `top` share of videos. */
export function hitProbability(clips: number, top = 0.2): number {
  return 1 - Math.pow(1 - top, clips);
}

/** What the median post really pays per 1,000 views, in 만 원, rounded. */
export function medianPricePer1kManwon(): number {
  return Math.round(SPONSOR_PRICE_PER_1K / medianToMean() / 10_000);
}

/** Which of `total` tiles are hits, in the order they fill: a fixed shuffle so server and client agree. */
export function hitTiles(total: number, hits: number, seed = 5): number[] {
  let state = seed;
  const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const order = Array.from({ length: total }, (_, index) => index);
  for (let index = total - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order.slice(0, hits);
}
```

- [ ] **Step 4:** `pnpm --filter @clipers/site test views-math` → PASS.
- [ ] **Step 5:** Commit `apps/site/lib/views-math.ts apps/site/lib/views-math.test.ts` — "feat(site): the numbers behind the views data section".

---

### Task 2: The horizon shader source (`horizon-shader.ts`)

**Files:** Create `apps/site/lib/horizon-shader.ts`, `apps/site/lib/horizon-shader.test.ts`

- [ ] **Step 1: Failing test** — `apps/site/lib/horizon-shader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HORIZON_FS, HORIZON_VS } from './horizon-shader';

describe('horizon shader', () => {
  it('is WebGL2 GLSL with the uniforms the hero sets', () => {
    expect(HORIZON_VS.startsWith('#version 300 es')).toBe(true);
    expect(HORIZON_FS.startsWith('#version 300 es')).toBe(true);
    for (const name of ['uRes', 'uTime', 'uRise', 'uMouse']) expect(HORIZON_FS).toContain(name);
  });

  it('never calls smoothstep with reversed constant edges (undefined in GLSL)', () => {
    const pairs = [...HORIZON_FS.matchAll(/smoothstep\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,/g)];
    expect(pairs.length).toBeGreaterThan(3);
    for (const [, a, b] of pairs) expect(Number(a)).toBeLessThan(Number(b));
  });
});
```

- [ ] **Step 2:** `pnpm --filter @clipers/site test horizon-shader` → FAIL.

- [ ] **Step 3: Implementation** — `apps/site/lib/horizon-shader.ts` (the approved prototype `proto-band3.html`, with every `smoothstep` written low-edge first):

```ts
// The brand hero's "horizon": a planet's rim lit green and lime, a haze, light shafts and rising specks — one per clip,
// their brightness drawn from a Pareto so only a few shine. One WebGL2 fragment shader over a full-screen quad.
// smoothstep is always called with edge0 < edge1 (reversed edges are undefined in GLSL; a prototype broke on it).

export const HORIZON_VS = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

export const HORIZON_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uRise;
uniform vec2 uMouse;
out vec4 o;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }

// rising clips: a scrolling grid, one speck per cell, brightness from a Pareto(1.16)
float clips(vec2 p, float scale, float speed, float t) {
  vec2 g = (p - vec2(0., t * speed)) * scale;
  vec2 id = floor(g), f = fract(g) - .5;
  float h = hash(id);
  if (h > 0.55) return 0.;
  vec2 pos = vec2(hash(id + 3.1), hash(id + 7.7)) - .5;
  float w = pow(1. - hash(id + 9.7) * 0.999, -1. / 1.16);
  float b = clamp(log(w) / 5., 0., 1.);
  float d = length(f - pos * .7);
  float twinkle = .65 + .35 * sin(t * (1.5 + h * 3.) + h * 40.);
  return (1. - smoothstep(0., 0.05 + 0.14 * b, d)) * (0.18 + 0.82 * b) * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - .5) * asp, uv.y);
  float t = uTime;

  float R = 2.9, top = 0.19 + uRise * 0.14;
  vec2 c = vec2((uMouse.x - .5) * 0.10, top - R);
  vec2 q = p - c; float r = length(q); float d = r - R;
  vec2 n = q / r;
  float ang = atan(n.x, n.y) - (uMouse.x - .5) * 0.06;
  float focus = exp(-ang * ang * 42.) * (.92 + .08 * sin(t * .45)) * (1. + uRise * 0.9);

  float above = step(0., d);
  float rim = exp(-abs(d) * 260.) * (0.30 + 0.70 * focus);
  float rimSoft = exp(-abs(d) * 46.) * (0.18 + 0.82 * focus);
  float halo = exp(-max(d, 0.) * (4.2 - uRise * 1.6)) * (0.10 + 0.90 * focus) * above;
  float haloWide = exp(-max(d, 0.) * 1.6) * (0.05 + 0.40 * focus) * above;
  float inner = exp(min(d, 0.) * 18.) * (1. - above) * (0.25 + 0.75 * focus);

  vec2 src = vec2(c.x, top - 0.22); vec2 rv = p - src; float ra = atan(rv.x, rv.y);
  float shafts = smoothstep(0.42, 0.95, fbm(vec2(ra * 7.0, t * 0.04))) * exp(-length(rv) * 1.7) * smoothstep(-0.01, 0.06, d) * exp(-ra * ra * 3.);

  float rise = above * exp(-d * 2.2) * smoothstep(0.0, 0.03, d) * (0.25 + 0.75 * exp(-ang * ang * 6.));
  float parts = (clips(p, 46., 0.035, t) + clips(p + 3.7, 90., 0.05, t) * 0.7 + clips(p + 9.1, 150., 0.07, t) * 0.45) * rise;
  float surface = (1. - above) * fbm(q * vec2(5., 9.) + vec2(0., t * 0.01)) * exp(min(d, 0.) * 7.) * (0.2 + 0.8 * focus);

  vec3 bg = vec3(0.012, 0.020, 0.016);
  vec3 green = vec3(0.345, 0.725, 0.510);
  vec3 deep = vec3(0.10, 0.36, 0.22);
  vec3 lime = vec3(0.804, 0.922, 0.471);
  vec3 col = bg + deep * haloWide * 0.55 + green * halo * 0.7 + mix(green, lime, 0.55) * rimSoft * 0.75
           + mix(lime, vec3(1.), 0.55) * rim * 1.6 + green * inner * 0.35 + mix(green, lime, 0.4) * shafts * 0.22
           + mix(lime, vec3(1.), 0.3) * parts * 1.5 + deep * surface * 0.22;
  col = 1. - exp(-col * 1.35);
  col *= 1. - 0.35 * smoothstep(0.55, 1.15, length((uv - vec2(.5, .45)) * vec2(asp * .8, 1.)));
  col += (hash(gl_FragCoord.xy + fract(t) * 91.) - .5) * 0.018;
  o = vec4(col, 1.);
}`;
```

- [ ] **Step 4:** test → PASS.
- [ ] **Step 5:** Commit both files — "feat(site): the brand hero's horizon shader".

---

### Task 3: Horizon hero component and page swap

**Files:** Create `apps/site/components/brand/horizon-hero.tsx`; modify `apps/site/app/brands/page.tsx`, `packages/ui/src/styles/brand-landing.css`, `packages/ui/src/styles/components.css`; delete `apps/site/components/brand-live-window.tsx`.

- [ ] **Step 1: Component** — `apps/site/components/brand/horizon-hero.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { ButtonLink } from '@clipers/ui';
import { HORIZON_FS, HORIZON_VS } from '@/lib/horizon-shader';

// Spec §4: a dark full-bleed band under the white nav, the horizon shader behind the headline. As the band scrolls
// away the planet rises a little (native scroll, never hijacked). Off screen or in a hidden tab it stops drawing;
// under reduced motion it draws one frame; without WebGL2 a CSS horizon stands in.

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function HorizonHero({ signUpHref }: { signUpHref: string }) {
  const bandRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current, canvas = canvasRef.current, copy = copyRef.current;
    if (!band || !canvas || !copy) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    const compile = (type: number, source: string) => {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) ? shader : null;
    };
    const vs = gl && compile(gl.VERTEX_SHADER, HORIZON_VS), fs = gl && compile(gl.FRAGMENT_SHADER, HORIZON_FS);
    if (!gl || !vs || !fs) {
      band.dataset.fallback = 'true';
      return;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      band.dataset.fallback = 'true';
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'uRes'), uTime = gl.getUniformLocation(program, 'uTime');
    const uRise = gl.getUniformLocation(program, 'uRise'), uMouse = gl.getUniformLocation(program, 'uMouse');

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas);

    const mouse = [0.5, 0.5], eased = [0.5, 0.5];
    const start = performance.now();
    const draw = (now: number) => {
      const rect = band.getBoundingClientRect();
      const leave = clamp(-rect.top / rect.height);
      const rise = (1 - Math.pow(1 - leave, 3)) * 0.6;
      copy.style.transform = `translateY(${(-40 * rise) / 0.6}px)`;
      eased[0] += (mouse[0] - eased[0]) * 0.04;
      eased[1] += (mouse[1] - eased[1]) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 20 + (now - start) / 1000);
      gl.uniform1f(uRise, rise);
      gl.uniform2f(uMouse, eased[0], eased[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(start);
      return () => sizer.disconnect();
    }

    let frame = 0, visible = false;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    seen.observe(band);
    const onMove = (event: PointerEvent) => {
      const rect = band.getBoundingClientRect();
      mouse[0] = (event.clientX - rect.left) / rect.width;
      mouse[1] = 1 - (event.clientY - rect.top) / rect.height;
    };
    band.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', update);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      sizer.disconnect();
      band.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <section className="cl-horizon" ref={bandRef}>
      <canvas aria-hidden className="cl-horizon__canvas" ref={canvasRef} />
      <div className="cl-horizon__copy" ref={copyRef}>
        <h1>
          조회수가 난 만큼만,
          <br />
          예산을 쓰세요
        </h1>
        <p>
          크리에이터들이 각자 숏폼을 만들어 올려요.
          <br />
          예산은 검증된 조회수에만 쓰여요.
        </p>
        <div className="cl-horizon__actions">
          <ButtonLink href={signUpHref} size="lg" variant="primary">
            캠페인 시작하기
          </ButtonLink>
          <ButtonLink className="cl-button--glass" href="/discover" size="lg" variant="secondary">
            진행 중인 캠페인 보기
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Styles** — append to `packages/ui/src/styles/brand-landing.css`:

```css
/* Hero: a dark full-bleed band under the white nav, the horizon shader behind the headline */
.cl-horizon { position: relative; height: min(70vh, 640px); min-height: 540px; margin-top: 56px; overflow: hidden; background: #040605; isolation: isolate; }
.cl-horizon__canvas { position: absolute; inset: 0; z-index: -1; display: block; width: 100%; height: 100%; }
.cl-horizon[data-fallback="true"] { background: radial-gradient(130% 70% at 50% 118%, #040605 58%, rgba(205, 235, 120, 0.85) 60%, rgba(88, 185, 130, 0.45) 63%, rgba(26, 92, 56, 0.25) 72%, transparent 88%), #040605; }
.cl-horizon__copy { display: grid; justify-items: center; gap: 22px; padding: 140px 24px 0; text-align: center; will-change: transform; }
.cl-horizon__copy h1 { color: #fff; font-size: clamp(40px, 5.4vw, 72px); font-weight: 600; letter-spacing: -0.04em; line-height: 1.04; }
.cl-horizon__copy p { color: rgba(255, 255, 255, 0.62); font-size: clamp(17px, 1.6vw, 20px); line-height: 1.6; }
.cl-horizon__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px; }
.cl-horizon .cl-button--glass { background: rgba(255, 255, 255, 0.08); color: #fff; box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
.cl-horizon .cl-button--glass:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }
@media (max-width: 860px) {
  .cl-horizon { height: min(72svh, 560px); min-height: 480px; }
  .cl-horizon__copy { padding-top: 96px; }
  .cl-horizon__copy h1 { font-size: 40px; }
}
```

- [ ] **Step 3: Page** — in `apps/site/app/brands/page.tsx` replace the whole `<section className="cl-landing-hero cl-landing-hero--window">…</section>` with `<HorizonHero signUpHref={SIGN_UP} />`, drop the `BrandLiveWindow` import, add `import HorizonHero from '@/components/brand/horizon-hero';`. Keep `MeshGradient` (the closing section uses it).

- [ ] **Step 4: Remove the old window** — `git rm apps/site/components/brand-live-window.tsx`; in `components.css` delete every rule whose selector starts with `.cl-landing-hero--window`, `.cl-hero-mesh--window`, `.cl-live ` / `.cl-live {`, `.cl-live__content`, `.cl-live__stats`, `.cl-live__grid`, `.cl-live__panel`, `.cl-live__feed` (keep `.cl-live__head`, `.cl-live__eyebrow`, `.cl-live__title`, `.cl-live__head .cl-status-dot` — the use-cases window uses them); change `.cl-landing-hero--split::after, .cl-landing-hero--window::after { display: none; }` to `.cl-landing-hero--split::after { display: none; }` and `.cl-clip-screen, .cl-clip-screen__progress, .cl-live__feed li { animation: none; }` to `.cl-clip-screen, .cl-clip-screen__progress { animation: none; }`.

- [ ] **Step 5:** typecheck → clean; open http://localhost:3001/brands → dark band with the horizon under the white nav, headline at the same height as the creator page's.
- [ ] **Step 6:** Commit the component, page, both stylesheets and the deletion — "feat(site): brand hero is a dark horizon band; the dashboard window leaves the hero".

---

### Task 4: Views data section

**Files:** Create `apps/site/components/brand/views-story.tsx`; modify `apps/site/app/brands/page.tsx`, `packages/ui/src/styles/brand-landing.css`.

- [ ] **Step 1: Component** — `apps/site/components/brand/views-story.tsx`:

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  SPONSOR_PRICE_PER_1K,
  belowMeanShare,
  hitProbability,
  hitTiles,
  medianPricePer1kManwon,
  medianToMean,
  worstCostMultiple,
} from '@/lib/views-math';

// Spec §5: why paying for views beats paying a fixed fee, from an 80:20 split. The section pins while native scroll
// fills 20 of 100 tiles, rolls four numbers into place and lands one line (never hijacked). Phones, short screens and
// reduced motion get the finished state in normal flow. Server HTML is the finished state too.

const TILES = 100;
const HITS = hitTiles(TILES, 20);
const STATIC = '(max-width: 860px), (max-height: 819px), (prefers-reduced-motion: reduce)';

const STATS: { value: number; from: number; unit: string; accent?: boolean; title: string; body: ReactNode; range: string }[] = [
  {
    value: medianPricePer1kManwon(),
    from: 2,
    unit: '만 원',
    accent: true,
    title: '중앙값 게시물의 실제 1천 회당 비용',
    body: (
      <>
        협찬비 기준이 1천 회당 {SPONSOR_PRICE_PER_1K / 10_000}만 원이어도,<sup>2</sup> 중앙값 게시물은 조회수가 평균의 {Math.round(medianToMean() * 100)}%라
        실제로는 약 {medianPricePer1kManwon()}만 원이에요.<sup>3</sup>
      </>
    ),
    range: '0.42 0.56',
  },
  {
    value: Math.round(belowMeanShare() * 100),
    from: 0,
    unit: '%',
    title: '평균에 못 미치는 게시물',
    body: (
      <>
        열 건 중 아홉 건은 약속한 단가보다 1회당 더 비싸게 사요. 많게는 {Math.floor(worstCostMultiple())}배예요.<sup>3</sup>
      </>
    ),
    range: '0.52 0.66',
  },
  {
    value: Math.round(hitProbability(10) * 100),
    from: 20,
    unit: '%',
    title: '영상 10편이면, 하나는 상위 20%',
    body: (
      <>
        1 − 0.8<sup>10</sup>. 조회수만큼만 내니까 빗나간 영상의 비용은 0원이에요.
      </>
    ),
    range: '0.62 0.76',
  },
  {
    value: 2,
    from: 1,
    unit: '배',
    title: '2027년 쇼츠 수익창출 문턱',
    body: (
      <>
        90일 쇼츠 조회수 1,000만 회에서 2,000만 회로.<sup>4</sup> 첫 1,000회부터 정산되는 캠페인에 크리에이터가 모여요.
      </>
    ),
    range: '0.72 0.84',
  },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => 1 - Math.pow(1 - value, 3);
const span = (value: number, a: number, b: number) => clamp((value - a) / (b - a));
const pair = (text: string | undefined) => (text ?? '0 1').split(' ').map(Number) as [number, number];

export default function ViewsStory() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const media = window.matchMedia(STATIC);
    const enters = [...track.querySelectorAll<HTMLElement>('[data-enter]')];
    const beats = [...track.querySelectorAll<HTMLElement>('[data-beat]')];
    const hits = [...track.querySelectorAll<HTMLElement>('[data-hit]')];
    const counts = [...track.querySelectorAll<HTMLElement>('[data-count]')];

    const apply = () => {
      if (media.matches) {
        [...enters, ...beats].forEach((el) => el.style.setProperty('--o', '1'));
        hits.forEach((el) => el.style.setProperty('--fill', '1'));
        counts.forEach((el) => (el.textContent = el.dataset.count ?? ''));
        return;
      }
      const rect = track.getBoundingClientRect();
      const enter = clamp(1 - rect.top / window.innerHeight);
      const progress = clamp(-rect.top / (rect.height - window.innerHeight));
      enters.forEach((el) => el.style.setProperty('--o', ease(span(enter, ...pair(el.dataset.enter))).toFixed(3)));
      beats.forEach((el) => el.style.setProperty('--o', ease(span(progress, ...pair(el.dataset.beat))).toFixed(3)));
      hits.forEach((el) => {
        const start = 0.05 + Number(el.dataset.hit) * 0.0165;
        el.style.setProperty('--fill', ease(span(progress, start, start + 0.06)).toFixed(3));
      });
      counts.forEach((el) => {
        const [a, b] = pair(el.dataset.range);
        const from = Number(el.dataset.from), to = Number(el.dataset.count);
        el.textContent = String(Math.round(from + (to - from) * ease(span(progress, a, b))));
      });
    };

    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };
    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <section aria-labelledby="views-title" className="cl-views">
      <div className="cl-views__track" ref={trackRef}>
        <div className="cl-views__pin">
          <div className="cl-views__inner">
            <div className="cl-views__intro" data-enter="0.15 0.6">
              <h2 id="views-title">
                숏폼 조회수는
                <br />
                공평하지 않아요
              </h2>
              <p>
                틱톡 추천 영상 265만 개를 분석하면, 영상 20%가 조회수의 80%를 가져가요.<sup>1</sup> 협찬비는 평균 조회수에 매겨지지만, 대부분의 게시물은 그
                평균에 닿지 못해요.
              </p>
            </div>
            <figure className="cl-views__tiles" data-enter="0.4 0.9">
              <div aria-hidden className="cl-views__grid">
                {Array.from({ length: TILES }, (_, index) => {
                  const order = HITS.indexOf(index);
                  return <i data-hit={order >= 0 ? order : undefined} key={index} />;
                })}
              </div>
              <figcaption>
                <span>
                  <b data-hit-key="" />이 20편이 조회수의 80%
                </span>
                <span>
                  <b />나머지 80편이 20%
                </span>
                <span className="cl-views__src">출처 1</span>
              </figcaption>
            </figure>
            <div className="cl-views__stats">
              {STATS.map((stat) => (
                <div className="cl-views__stat" data-accent={stat.accent || undefined} data-beat={`${pair(stat.range)[0]} ${pair(stat.range)[0] + 0.08}`} key={stat.title}>
                  <p className="cl-views__num">
                    <span data-count={stat.value} data-from={stat.from} data-range={stat.range}>
                      {stat.value}
                    </span>
                    <small>{stat.unit}</small>
                  </p>
                  <h3>{stat.title}</h3>
                  <p>{stat.body}</p>
                </div>
              ))}
            </div>
            <p className="cl-views__close" data-beat="0.86 0.94">
              <strong>협찬은 평균에 돈을 내요.</strong> <span>클리핑은 실제로 난 조회수에만 내요.</span>
            </p>
          </div>
        </div>
      </div>
      <ol className="cl-views__notes">
        <li>
          1. 2023년 11월~2024년 9월 실제 사용자에게 추천된 틱톡 영상 265만 개. Masood 외,{' '}
          <a href="https://arxiv.org/abs/2605.05188" rel="noreferrer" target="_blank">
            SILC
          </a>
          , UIUC·MIT, 2026.
        </li>
        <li>2. 릴스·쇼츠 협찬 단가 공식 (평균 조회수 ÷ 1,000) × 20,000원. 태그바이, 「2026 인플루언서 마케팅 제품 협찬 vs 원고료 지급 결정 가이드」.</li>
        <li>
          3. 1의 80:20 분포를 파레토 분포(α = log5/log4 ≈ 1.16)로 놓고, 한 크리에이터의 게시물도 같은 분포를 따른다고 가정한 계산. 중앙값/평균 = (α−1)/α · 2
          <sup>1/α</sup> ≈ 0.25, 평균 미만 확률 = 1 − (α/(α−1))<sup>−α</sup> ≈ 0.90.
        </li>
        <li>
          4.{' '}
          <a href="https://support.google.com/youtube/answer/12843009" rel="noreferrer" target="_blank">
            YouTube 고객센터, 「YouTube 파트너 프로그램 변경사항」
          </a>
          , 2027년 2월 1일 시행. 기존 파트너 채널은 해당 없음.
        </li>
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Styles** — append to `brand-landing.css`:

```css
/* Views data section: pinned while native scroll fills 20 of 100 tiles and rolls four numbers into place */
.cl-views__track { position: relative; height: 260vh; }
.cl-views__pin { position: sticky; top: 0; display: grid; align-content: center; height: 100vh; padding-top: 64px; box-sizing: border-box; }
.cl-views__inner { width: min(1160px, 100% - 48px); margin: 0 auto; }
.cl-views [data-enter], .cl-views [data-beat] { opacity: var(--o, 1); transform: translateY(calc((1 - var(--o, 1)) * 24px)); }
.cl-views sup { margin-left: 1px; color: var(--color-text-subtle); font-size: 0.6em; font-weight: 500; }
.cl-views__intro { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); align-items: end; gap: 64px; }
.cl-views__intro h2 { font-size: clamp(36px, 4.6vw, 58px); font-weight: 600; letter-spacing: -0.045em; line-height: 1.08; }
.cl-views__intro p { margin-bottom: 6px; color: var(--color-text-muted); font-size: 17px; line-height: 1.65; }
.cl-views__tiles { margin: 40px 0 0; }
.cl-views__grid { display: grid; grid-template-columns: repeat(25, minmax(0, 1fr)); gap: 6px; }
.cl-views__grid i { position: relative; overflow: hidden; aspect-ratio: 9 / 16; border-radius: 7px; background: #efeff2; }
.cl-views__grid i[data-hit]::after { position: absolute; inset: 0; background: var(--brand-11); clip-path: inset(calc((1 - var(--fill, 1)) * 100%) 0 0 0); content: ""; }
.cl-views__tiles figcaption { display: flex; align-items: center; gap: 24px; margin-top: 14px; color: var(--color-text-muted); font-size: 14px; }
.cl-views__tiles figcaption b { display: inline-block; width: 10px; height: 14px; margin-right: 8px; border-radius: 3px; background: #efeff2; vertical-align: -2px; }
.cl-views__tiles figcaption b[data-hit-key] { background: var(--brand-11); }
.cl-views__src { margin-left: auto; color: var(--color-text-subtle); font-size: 13px; }
.cl-views__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 36px; }
.cl-views__stat { padding: 22px 24px 0 0; box-shadow: inset 0 1px 0 var(--gray-a4); }
.cl-views__stat + .cl-views__stat { padding-left: 24px; box-shadow: inset 0 1px 0 var(--gray-a4), inset 1px 0 0 var(--gray-a4); }
.cl-views__num { font-size: clamp(36px, 4vw, 54px); font-weight: 600; letter-spacing: -0.05em; line-height: 1; font-variant-numeric: tabular-nums; }
.cl-views__num small { margin-left: 2px; font-size: 0.45em; letter-spacing: -0.02em; }
.cl-views__stat[data-accent] .cl-views__num { color: var(--brand-11); }
.cl-views__stat h3 { margin-top: 14px; font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
.cl-views__stat h3 + p { margin-top: 6px; color: var(--color-text-muted); font-size: 14px; line-height: 1.6; }
.cl-views__close { margin-top: 32px; font-size: clamp(20px, 2.2vw, 30px); font-weight: 600; letter-spacing: -0.035em; text-align: center; }
.cl-views__close span { color: var(--color-text-subtle); }
.cl-views__notes { width: min(1160px, 100% - 48px); margin: 0 auto; padding: 20px 0 40px; list-style: none; columns: 2; column-gap: 40px; color: var(--color-text-subtle); font-size: 12px; line-height: 1.8; box-shadow: inset 0 1px 0 var(--gray-a4); }
.cl-views__notes a { color: inherit; text-decoration: underline; }
@media (max-width: 860px), (max-height: 819px), (prefers-reduced-motion: reduce) {
  .cl-views__track { height: auto; }
  .cl-views__pin { position: static; height: auto; padding: 72px 0 40px; }
}
@media (max-width: 860px) {
  .cl-views__intro { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .cl-views__grid { grid-template-columns: repeat(10, minmax(0, 1fr)); }
  .cl-views__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 28px; }
  .cl-views__stat:nth-child(3) { padding-left: 0; box-shadow: inset 0 1px 0 var(--gray-a4); }
  .cl-views__notes { columns: 1; }
}
```

- [ ] **Step 3: Page** — in `page.tsx` put `<ViewsStory />` directly after `<HorizonHero … />` (before the logo section) and import it.
- [ ] **Step 4:** typecheck; scroll http://localhost:3001/brands → tiles fill, numbers roll 2→8, 0→90, 20→89, 1→2, closing line, then the notes.
- [ ] **Step 5:** Commit component, page and stylesheet — "feat(site): views data section — 20 of 100 tiles, four numbers, sources and the model".

---

### Task 5: Deposit demo matches the VAT billing

**Files:** Modify `apps/site/components/brand/demos/deposit-demo.tsx`, `apps/site/lib/brand-demos.ts`.

- [ ] **Step 1:** In `brand-demos.ts` change the draft lead to `'입금을 마치고 아래 버튼을 누르면 운영팀이 확인한 뒤 캠페인을 공개하고, 세금계산서를 발행해요.'`.
- [ ] **Step 2:** In `deposit-demo.tsx` import `depositAmount, vatOn` from `@clipers/db` and replace the rows with:

```tsx
rows={[
  { label: '서비스 대금', value: formatKRW(SERVICE_AMOUNT) },
  { label: '부가세 (10%)', value: formatKRW(vatOn(SERVICE_AMOUNT)) },
  { label: '입금 금액', value: <strong>{formatKRW(depositAmount(SERVICE_AMOUNT))}</strong> },
  { label: '입금 계좌', value: 'Clipers 운영 계좌' },
  { label: '입금자명', value: '브랜드명과 같게 입력해 주세요' },
]}
```

with `const SERVICE_AMOUNT = 3_000_000;` at module level.
- [ ] **Step 3:** `pnpm --filter @clipers/site test brand-demos` and typecheck → pass. Commit both files — "fix(site): deposit demo shows the service amount, VAT and the total like the app".

---

### Task 6: Guard and verification

**Files:** Modify `apps/site/lib/brand-page.test.ts`.

- [ ] **Step 1:** Replace the `expect(text).not.toContain('1천 회당')` check with `expect(text).not.toContain(`1천 회당 ${formatKRW(DEFAULT_PRICING.brandCpm)}`)` (the data section quotes the sponsor basis "1천 회당 2만 원", which is not our rate). Add `'HorizonHero'` and `'ViewsStory'` to the "uses the new sections" list; add `path.join(root, 'lib/views-math.ts')` and `path.join(root, 'lib/horizon-shader.ts')` to `sources`. Run all site tests → pass. Commit.
- [ ] **Step 2:** Screenshots with the scratchpad `scrollshot.mjs` (SwiftShader flags on): 1440×900 at steps of 300 px (hero, the pinned beats, the notes), 390×844, reduced motion (`… 800 1440 900 1`). Check: band under the white nav, shader drawn, headline height matches the creator page, tiles and numbers in order, nothing cut, static layout on phones.
- [ ] **Step 3:** `curl -s http://localhost:3001/brands | grep -c "1천 회당"` → the only hits are the footnote formula and stat copy (`1천 회당 2만 원` is the sponsor basis, not our rate); `grep -c "3,000원"` → 0.
- [ ] **Step 4:** Fix anything found, commit with what was fixed.
