# 검색·AI 유입 P1 — 기반과 AI 인용 구조 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출시(잠금 해제) 첫날부터 검색엔진과 AI가 사이트를 바로 수집·인용하고, 유입을 측정할 수 있는 상태를 만든다.

**Architecture:** 설계 문서 `docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md` 3절과 5절(5.4 데이터 페이지 제외). 판단 로직(호스트 판정, 소유 확인 메타, RSS, IndexNow 본문, 구조화 데이터, llms 전문)은 `apps/site/lib`의 순수 함수로 두고 Vitest로 검사한다. Next 라우트·미들웨어·레이아웃은 그 함수를 부르기만 한다.

**Tech Stack:** Next.js 15 App Router (`apps/site`), Vitest, `@clipers/db` 상수, `@vercel/analytics`, Turborepo strict env mode.

**작업 규칙:** 같은 작업 트리를 다른 세션이 함께 쓴다. 커밋은 항상 `git commit -m … -- <이 작업의 파일들>`로 자기 파일만 담는다. push하지 않는다. 명령은 저장소 루트(`C:/Users/Sony/Desktop/clipers`) 기준.

---

## File map

| 파일 | 역할 |
|---|---|
| `apps/site/lib/canonical-host.ts` (+test) | 요청 호스트가 운영 주소인지 판정 |
| `apps/site/middleware.ts` | 잠금 → 운영 주소가 아니면 `X-Robots-Tag: noindex` |
| `apps/site/lib/verification.ts` (+test) | 구글·네이버·빙 소유 확인 메타 |
| `apps/site/lib/turbo-env.test.ts` | 앱이 읽는 서버 환경변수가 `turbo.json`에 모두 있는지 |
| `turbo.json` | 빌드 `env`에 소유 확인 3종 + `INDEXNOW_KEY` |
| `apps/site/lib/crawlers.ts`, `apps/site/app/robots.ts` (+`lib/robots.test.ts`) | AI·검색 봇 허용 |
| `apps/site/lib/rss.ts` (+test), `apps/site/app/rss.xml/route.ts` | 가이드 RSS |
| `apps/site/scripts/indexnow.mjs` (+test), `apps/site/app/indexnow.txt/route.ts` | IndexNow 키 파일과 제출 스크립트 |
| `apps/site/app/layout.tsx` | 소유 확인, RSS 링크, 분석, 회사 `@id` |
| `apps/app/content/legal/privacy.md` | 방문 통계 🔸 한 줄 |
| `apps/site/lib/company.ts` | `ORGANIZATION_ID`, `sameAs` 자리 |
| `apps/site/app/about/page.tsx` | 회사 소개 |
| `apps/site/lib/structured-data.ts` (+test) | `Service`, `ItemList` |
| `apps/site/lib/llms-full.ts` (+test), `apps/site/app/llms-full.txt/route.ts` | 가이드 전문 |
| `apps/site/lib/guides/index.test.ts` | 제목·설명 길이·중복, 내부 링크 검사 |

---

### Task 1: 운영 주소가 아닌 곳은 noindex

**Files:**
- Create: `apps/site/lib/canonical-host.ts`
- Test: `apps/site/lib/canonical-host.test.ts`
- Modify: `apps/site/middleware.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/canonical-host.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { isCanonicalHost } from './canonical-host';

const SITE = 'https://clipers.co.kr/';

describe('isCanonicalHost', () => {
  it('accepts the public host in any case, with or without a port', () => {
    expect(isCanonicalHost('clipers.co.kr', SITE)).toBe(true);
    expect(isCanonicalHost('Clipers.co.kr', SITE)).toBe(true);
    expect(isCanonicalHost('clipers.co.kr:443', SITE)).toBe(true);
  });

  it('rejects vercel.app and preview hosts', () => {
    expect(isCanonicalHost('clipers-site.vercel.app', SITE)).toBe(false);
    expect(isCanonicalHost('clipers-site-abc123-team.vercel.app', SITE)).toBe(false);
    expect(isCanonicalHost('www.clipers.co.kr', SITE)).toBe(false);
  });

  it('lets local development through', () => {
    expect(isCanonicalHost('localhost:3001', SITE)).toBe(true);
    expect(isCanonicalHost('127.0.0.1:3001', SITE)).toBe(true);
  });

  it('treats a missing host header as canonical', () => {
    expect(isCanonicalHost(null, SITE)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/canonical-host.test.ts`
Expected: FAIL — `Failed to resolve import "./canonical-host"`

- [ ] **Step 3: 구현** — `apps/site/lib/canonical-host.ts`

```ts
// Pages answered on any host other than the public one (*.vercel.app, preview deployments) get noindex, so search
// engines never index the same content twice. Local development is left alone.

export function isCanonicalHost(host: string | null, siteUrl: string): boolean {
  if (!host) return true;
  const name = host.split(':')[0].toLowerCase();
  if (name === 'localhost' || name === '127.0.0.1') return true;
  return name === new URL(siteUrl).hostname.toLowerCase();
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/canonical-host.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 미들웨어 연결** — `apps/site/middleware.ts` 전체를 아래로 바꾼다

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { prelaunchGate } from '@clipers/db/src/prelaunch';
import { isCanonicalHost } from '@/lib/canonical-host';
import { siteUrl } from '@/lib/urls';

/** Pre-launch lock first; then any host but the public one is answered with noindex. */
export function middleware(request: NextRequest) {
  const locked = prelaunchGate(request.nextUrl.pathname, request.headers.get('authorization'), process.env.PRELAUNCH_PASSWORD);
  if (locked) return locked;
  if (isCanonicalHost(request.headers.get('host'), siteUrl('/'))) return undefined;

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
```

- [ ] **Step 6: 타입·lint 확인**

Run: `cd apps/site && npx tsc --noEmit -p . && npx eslint middleware.ts lib/canonical-host.ts`
Expected: 출력 없음(오류 0)

- [ ] **Step 7: 커밋**

```bash
git add apps/site/lib/canonical-host.ts apps/site/lib/canonical-host.test.ts
git commit -m "feat(site): any host but the public one answers with noindex" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/canonical-host.ts apps/site/lib/canonical-host.test.ts apps/site/middleware.ts
```

---

### Task 2: 검색엔진 소유 확인 메타

**Files:**
- Create: `apps/site/lib/verification.ts`
- Test: `apps/site/lib/verification.test.ts`
- Modify: `apps/site/app/layout.tsx` (metadata)

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/verification.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { siteVerification } from './verification';

describe('siteVerification', () => {
  it('emits nothing without values', () => {
    expect(siteVerification({})).toBeUndefined();
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: '' })).toBeUndefined();
  });

  it('puts Google in its own field and Naver and Bing under other', () => {
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: 'g-token' })).toEqual({ google: 'g-token' });
    expect(siteVerification({ NAVER_SITE_VERIFICATION: 'n-token', BING_SITE_VERIFICATION: 'b-token' })).toEqual({
      other: { 'naver-site-verification': 'n-token', 'msvalidate.01': 'b-token' },
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/verification.test.ts`
Expected: FAIL — `Failed to resolve import "./verification"`

- [ ] **Step 3: 구현** — `apps/site/lib/verification.ts`

```ts
import type { Metadata } from 'next';

// Search Console, Naver Search Advisor and Bing Webmaster ownership tags, from environment variables so a domain can
// be registered without a code change. These are read at build time: keep them in turbo.json's build env.

type VerificationEnv = Partial<Record<'GOOGLE_SITE_VERIFICATION' | 'NAVER_SITE_VERIFICATION' | 'BING_SITE_VERIFICATION', string>>;

export function siteVerification(env: VerificationEnv): Metadata['verification'] {
  const other: Record<string, string> = {};
  if (env.NAVER_SITE_VERIFICATION) other['naver-site-verification'] = env.NAVER_SITE_VERIFICATION;
  if (env.BING_SITE_VERIFICATION) other['msvalidate.01'] = env.BING_SITE_VERIFICATION;

  const verification: NonNullable<Metadata['verification']> = {};
  if (env.GOOGLE_SITE_VERIFICATION) verification.google = env.GOOGLE_SITE_VERIFICATION;
  if (Object.keys(other).length > 0) verification.other = other;
  return Object.keys(verification).length > 0 ? verification : undefined;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/verification.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 레이아웃 연결** — `apps/site/app/layout.tsx`

import 줄에 추가:
```ts
import { siteVerification } from '@/lib/verification';
```
`metadata` 객체의 `robots: { index: true, follow: true },` 바로 아래에 추가:
```ts
  verification: siteVerification({
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    NAVER_SITE_VERIFICATION: process.env.NAVER_SITE_VERIFICATION,
    BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION,
  }),
```
(`process.env.X`를 이름으로 적어야 Task 3의 환경변수 검사가 찾는다.)

- [ ] **Step 6: 커밋**

```bash
git add apps/site/lib/verification.ts apps/site/lib/verification.test.ts
git commit -m "feat(site): Google, Naver and Bing ownership tags come from environment variables" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/verification.ts apps/site/lib/verification.test.ts apps/site/app/layout.tsx
```

---

### Task 3: 빌드 환경변수 누락을 테스트로 막기

**Files:**
- Test: `apps/site/lib/turbo-env.test.ts`
- Modify: `turbo.json`

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/turbo-env.test.ts`

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

// Turbo's strict env mode hands a build only the variables listed in turbo.json. On 2026-10-02 PRELAUNCH_PASSWORD
// was dropped that way and robots.txt opened under the lock. Every server variable either app reads must be listed.

const repo = path.resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', '.vercel']);
const FRAMEWORK = /^(NEXT_PUBLIC_|NODE_ENV$|VERCEL)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mjs)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

it('lists every server env var the apps read in the turbo build env', () => {
  const turbo = JSON.parse(readFileSync(path.join(repo, 'turbo.json'), 'utf8'));
  const declared = new Set<string>(turbo.tasks.build.env ?? []);
  const read = new Set(
    ['apps/site', 'apps/app'].flatMap((app) =>
      sourceFiles(path.join(repo, app)).flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1])
      )
    )
  );
  const missing = [...read].filter((name) => !FRAMEWORK.test(name) && !declared.has(name)).sort();
  expect(missing).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/turbo-env.test.ts`
Expected: FAIL — `missing`에 `BING_SITE_VERIFICATION`, `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION`

- [ ] **Step 3: `turbo.json` 빌드 `env`에 추가** (Task 6에서 쓸 `INDEXNOW_KEY`도 함께)

`"PAYOUT_ENCRYPTION_KEY"` 줄을 아래로 바꾼다:
```json
        "PAYOUT_ENCRYPTION_KEY",
        "GOOGLE_SITE_VERIFICATION",
        "NAVER_SITE_VERIFICATION",
        "BING_SITE_VERIFICATION",
        "INDEXNOW_KEY"
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/turbo-env.test.ts`
Expected: PASS

- [ ] **Step 5: turbo가 읽는지 확인**

Run: `pnpm turbo run build --filter=@clipers/site --dry=json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).tasks.find(t=>t.taskId==='@clipers/site#build').environmentVariables.specified.env.join(',')))"`
Expected: 목록에 `GOOGLE_SITE_VERIFICATION`, `INDEXNOW_KEY` 포함

- [ ] **Step 6: 커밋**

```bash
git add apps/site/lib/turbo-env.test.ts
git commit -m "test(build): every server env var the apps read is in turbo's build env; ownership tags and IndexNow key added" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/turbo-env.test.ts turbo.json
```

---

### Task 4: AI·검색 봇 허용 목록

**Files:**
- Create: `apps/site/lib/crawlers.ts`
- Modify: `apps/site/app/robots.ts`
- Test: `apps/site/lib/robots.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/robots.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { WELCOMED_CRAWLERS } from './crawlers';

describe('robots', () => {
  beforeEach(() => {
    delete process.env.PRELAUNCH_PASSWORD;
  });
  afterEach(() => {
    delete process.env.PRELAUNCH_PASSWORD;
  });

  it('shuts every crawler out while the pre-launch lock is on', () => {
    process.env.PRELAUNCH_PASSWORD = 'locked';
    expect(robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });

  it('welcomes search, answer and training crawlers by name once open', () => {
    const result = robots();
    expect(result.rules).toEqual([
      { userAgent: '*', allow: '/' },
      { userAgent: WELCOMED_CRAWLERS, allow: '/' },
    ]);
    expect(String(result.sitemap)).toMatch(/\/sitemap\.xml$/);
    for (const bot of ['Yeti', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
      expect(WELCOMED_CRAWLERS).toContain(bot);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/robots.test.ts`
Expected: FAIL — `Failed to resolve import "./crawlers"`

- [ ] **Step 3: 봇 목록** — `apps/site/lib/crawlers.ts`

```ts
// Crawlers named in robots.txt once the site is open. Everyone is already allowed by `*`; naming them helps engines
// that read per-bot rules. Training crawlers are included on purpose (2026-10-02): our pages are there to be learned.
export const WELCOMED_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'Yeti',
  'Daumoa',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Google-Extended',
  'Applebot-Extended',
];
```

- [ ] **Step 4: robots 수정** — `apps/site/app/robots.ts` 전체

```ts
import type { MetadataRoute } from 'next';
import { WELCOMED_CRAWLERS } from '@/lib/crawlers';
import { siteUrl } from '@/lib/urls';

/** While the pre-launch lock is on (PRELAUNCH_PASSWORD set at build), crawlers are asked to stay out entirely. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.PRELAUNCH_PASSWORD) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: WELCOMED_CRAWLERS, allow: '/' },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/'),
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/robots.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: 커밋**

```bash
git add apps/site/lib/crawlers.ts apps/site/lib/robots.test.ts
git commit -m "feat(site): robots.txt names search, answer and training crawlers once the site opens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/crawlers.ts apps/site/lib/robots.test.ts apps/site/app/robots.ts
```

---

### Task 5: 가이드 RSS

**Files:**
- Create: `apps/site/lib/rss.ts`, `apps/site/app/rss.xml/route.ts`
- Test: `apps/site/lib/rss.test.ts`
- Modify: `apps/site/app/layout.tsx`, `apps/site/app/guides/page.tsx` (alternates)

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/rss.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { GUIDES } from './guides';
import type { Guide } from './guides';
import { guidesRss } from './rss';

const url = (path: string) => `https://clipers.co.kr${path}`;

describe('guidesRss', () => {
  it('is an RSS 2.0 channel with one item per guide', () => {
    const xml = guidesRss(GUIDES, url);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml.match(/<item>/g)).toHaveLength(GUIDES.length);
    for (const guide of GUIDES) expect(xml).toContain(`<link>${url(`/guides/${guide.slug}`)}</link>`);
  });

  it('puts the newest guide first and escapes markup', () => {
    const base = GUIDES[0];
    const older: Guide = { ...base, slug: 'older', title: 'A & B <old>', updated: '2026-01-01' };
    const newer: Guide = { ...base, slug: 'newer', title: 'Newer', updated: '2026-09-01' };
    const xml = guidesRss([older, newer], url);
    expect(xml.indexOf('/guides/newer')).toBeLessThan(xml.indexOf('/guides/older'));
    expect(xml).toContain('<title>A &amp; B &lt;old&gt;</title>');
    expect(xml).toContain('<pubDate>Mon, 31 Aug 2026 15:00:00 GMT</pubDate>');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/rss.test.ts`
Expected: FAIL — `Failed to resolve import "./rss"`

- [ ] **Step 3: 구현** — `apps/site/lib/rss.ts`

```ts
import type { Guide } from './guides';

// RSS 2.0 feed of the guides, newest first. Naver Search Advisor takes feeds as one of its collection hints.

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Guide dates are Korean calendar days (YYYY-MM-DD).
const rssDate = (day: string) => new Date(`${day}T00:00:00+09:00`).toUTCString();

export function guidesRss(guides: Guide[], siteUrl: (path: string) => string): string {
  const sorted = [...guides].sort((left, right) => right.updated.localeCompare(left.updated) || left.slug.localeCompare(right.slug));
  const items = sorted.map((guide) => {
    const link = siteUrl(`/guides/${guide.slug}`);
    return [
      '<item>',
      `<title>${escapeXml(guide.title)}</title>`,
      `<link>${link}</link>`,
      `<guid isPermaLink="true">${link}</guid>`,
      `<description>${escapeXml(guide.description)}</description>`,
      `<pubDate>${rssDate(guide.updated)}</pubDate>`,
      '</item>',
    ].join('');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>Clipers 가이드</title>',
    `<link>${siteUrl('/guides')}</link>`,
    '<description>숏폼 캠페인을 여는 광고주와 참여하는 크리에이터가 자주 묻는 질문에 답해요.</description>',
    '<language>ko</language>',
    sorted[0] ? `<lastBuildDate>${rssDate(sorted[0].updated)}</lastBuildDate>` : '',
    ...items,
    '</channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/rss.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 라우트** — `apps/site/app/rss.xml/route.ts`

```ts
import { GUIDES } from '@/lib/guides';
import { guidesRss } from '@/lib/rss';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

export function GET() {
  return new Response(guidesRss(GUIDES, siteUrl), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
```

- [ ] **Step 6: 피드 링크** — `apps/site/app/layout.tsx`의 `metadata`에 추가(`verification` 아래):

```ts
  alternates: { types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Clipers 가이드' }] } },
```
`apps/site/app/guides/page.tsx`의 `alternates: { canonical: '/guides' },`를 아래로 바꾼다(페이지의 `alternates`는 레이아웃 값을 덮어쓰므로):
```ts
  alternates: { canonical: '/guides', types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Clipers 가이드' }] } },
```

- [ ] **Step 7: 커밋**

```bash
git add apps/site/lib/rss.ts apps/site/lib/rss.test.ts apps/site/app/rss.xml/route.ts
git commit -m "feat(site): guides RSS feed at /rss.xml, linked from the layout and the guides page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/rss.ts apps/site/lib/rss.test.ts apps/site/app/rss.xml/route.ts apps/site/app/layout.tsx apps/site/app/guides/page.tsx
```

---

### Task 6: IndexNow 키 파일과 제출 스크립트

**Files:**
- Create: `apps/site/scripts/indexnow.mjs`, `apps/site/app/indexnow.txt/route.ts`
- Test: `apps/site/scripts/indexnow.test.ts`
- Modify: `apps/site/package.json` (scripts)

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/scripts/indexnow.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { KEY_PATTERN, indexNowBody, sitemapUrls } from './indexnow.mjs';

describe('IndexNow', () => {
  it('reads every <loc> from a sitemap', () => {
    const xml = '<urlset><url><loc>https://clipers.co.kr/</loc></url><url><loc> https://clipers.co.kr/guides </loc></url></urlset>';
    expect(sitemapUrls(xml)).toEqual(['https://clipers.co.kr/', 'https://clipers.co.kr/guides']);
  });

  it('builds a body for this host only, with the key file location', () => {
    const body = indexNowBody('https://clipers.co.kr', 'abcd1234abcd1234', [
      'https://clipers.co.kr/guides',
      'https://elsewhere.example/page',
    ]);
    expect(body).toEqual({
      host: 'clipers.co.kr',
      key: 'abcd1234abcd1234',
      keyLocation: 'https://clipers.co.kr/indexnow.txt',
      urlList: ['https://clipers.co.kr/guides'],
    });
  });

  it('accepts only protocol-valid keys', () => {
    expect(KEY_PATTERN.test('abcd1234abcd1234')).toBe(true);
    expect(KEY_PATTERN.test('short')).toBe(false);
    expect(KEY_PATTERN.test('has space in it!')).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run scripts/indexnow.test.ts`
Expected: FAIL — `Failed to resolve import "./indexnow.mjs"`

- [ ] **Step 3: 스크립트** — `apps/site/scripts/indexnow.mjs`

```js
// Submits every sitemap URL to IndexNow, which Naver, Bing and other engines share. Run after launch and after each
// content batch, against the live site:
//   NEXT_PUBLIC_SITE_URL=https://<domain> INDEXNOW_KEY=<key> pnpm --filter @clipers/site indexnow
import { pathToFileURL } from 'node:url';

export const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

export function indexNowBody(siteUrl, key, urls) {
  const { host, origin } = new URL(siteUrl);
  return { host, key, keyLocation: `${origin}/indexnow.txt`, urlList: urls.filter((url) => new URL(url).host === host) };
}

async function main() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const key = process.env.INDEXNOW_KEY;
  if (!site || !key || !KEY_PATTERN.test(key)) {
    throw new Error('Set NEXT_PUBLIC_SITE_URL and INDEXNOW_KEY (8–128 letters, digits or dashes).');
  }
  const sitemap = await fetch(new URL('/sitemap.xml', site));
  if (sitemap.status === 401) throw new Error('The site is still locked (PRELAUNCH_PASSWORD). Submit after launch.');
  if (!sitemap.ok) throw new Error(`The sitemap answered ${sitemap.status}.`);
  const served = await fetch(new URL('/indexnow.txt', site));
  if ((await served.text()).trim() !== key) {
    throw new Error('/indexnow.txt does not serve this key. Set INDEXNOW_KEY on the site project and redeploy.');
  }

  const body = indexNowBody(site, key, sitemapUrls(await sitemap.text()));
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow answered ${response.status} for ${body.urlList.length} URLs.`);
  if (!response.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run scripts/indexnow.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 키 파일 라우트** — `apps/site/app/indexnow.txt/route.ts`

```ts
// IndexNow key file: engines fetch it to confirm a submission came from this site.
export const dynamic = 'force-dynamic';

export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
```

- [ ] **Step 6: 실행 스크립트 등록** — `apps/site/package.json`의 `scripts`에 `"test": "vitest run"` 다음 줄로 추가

```json
    "indexnow": "node scripts/indexnow.mjs"
```

- [ ] **Step 7: 잠금 상태 거부 확인** (실제 제출은 하지 않는다)

Run: `cd apps/site && NEXT_PUBLIC_SITE_URL=https://clipers-site.vercel.app INDEXNOW_KEY=abcd1234abcd1234 node scripts/indexnow.mjs`
Expected: `Error: The site is still locked (PRELAUNCH_PASSWORD). Submit after launch.`

- [ ] **Step 8: 커밋**

```bash
git add apps/site/scripts/indexnow.mjs apps/site/scripts/indexnow.test.ts apps/site/app/indexnow.txt/route.ts
git commit -m "feat(site): IndexNow key file and a script that submits the sitemap once the site is open" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/scripts/indexnow.mjs apps/site/scripts/indexnow.test.ts apps/site/app/indexnow.txt/route.ts apps/site/package.json
```

---

### Task 7: 쿠키 없는 방문 분석

**Files:**
- Modify: `apps/site/package.json`, `pnpm-lock.yaml`, `apps/site/app/layout.tsx`, `apps/app/content/legal/privacy.md`

- [ ] **Step 1: 설치**

Run: `pnpm --filter @clipers/site add @vercel/analytics`
Expected: `apps/site/package.json` dependencies에 `@vercel/analytics` 추가

- [ ] **Step 2: 레이아웃** — `apps/site/app/layout.tsx`

import에 추가:
```ts
import { Analytics } from '@vercel/analytics/next';
```
`<body>` 안의 `<JsonLd data={ORGANIZATION} />` 다음 줄에 추가:
```tsx
        <Analytics />
```

- [ ] **Step 3: 처리방침 초안** — `apps/app/content/legal/privacy.md` 8절, "홈페이지는 가입 링크를 누를 때까지 …" 줄 바로 아래에 추가

```markdown
- 홈페이지는 방문 통계(본 페이지, 이전 페이지의 주소, 기기·브라우저 종류, 국가)를 쿠키 없이 집계합니다(Vercel Web Analytics). 방문자를 구별하는 쿠키를 저장하지 않으며, 운영팀은 집계된 숫자만 봅니다. <!-- 🔸 2026-10-02 추가, 변호사 확인 -->
```

- [ ] **Step 4: 빌드 확인**

Run: `cd apps/site && npx tsc --noEmit -p . && npx eslint app/layout.tsx`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(site): cookieless visit analytics (Vercel Web Analytics); privacy draft says so" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/package.json pnpm-lock.yaml apps/site/app/layout.tsx apps/app/content/legal/privacy.md
```

- [ ] **Step 6: 사람이 할 일 (보고에 적는다)** — Vercel → `clipers-site` → Analytics → Enable. 켜기 전에는 스크립트가 있어도 수집되지 않는다.

---

### Task 8: 회사 소개 `/about`

**Files:**
- Modify: `apps/site/lib/company.ts`, `apps/site/app/layout.tsx`, `apps/site/components/landing-chrome.tsx`, `apps/site/app/sitemap.ts`
- Create: `apps/site/app/about/page.tsx`

- [ ] **Step 1: 회사 식별자** — `apps/site/lib/company.ts` 전체

```ts
import { siteUrl } from './urls';

// Operator details shown in the footer, the about page and the trust guide. Add a contact email once the domain is
// bought, and official channel URLs to sameAs as they open (they become Organization.sameAs).
export const COMPANY = {
  legalName: '주식회사 오디오닉스',
  representative: '안준성',
  registrationNumber: '544-87-03492',
  address: '경기도 용인시 수지구 풍덕천로129번길 16-5 에이52호(풍덕천동, 선용빌딩)',
  sameAs: [] as string[],
};

/** One @id for the company across every page's structured data. */
export const ORGANIZATION_ID = `${siteUrl('/')}#organization`;
```

- [ ] **Step 2: 레이아웃이 같은 식별자를 쓰게** — `apps/site/app/layout.tsx`

import를 `import { COMPANY, ORGANIZATION_ID } from '@/lib/company';`로 바꾸고, `ORGANIZATION`의 회사 노드에서
`'@id': \`${siteUrl('/')}#organization\`,` → `'@id': ORGANIZATION_ID,`
`url: siteUrl('/'),` 다음 줄에 `...(COMPANY.sameAs.length > 0 ? { sameAs: COMPANY.sameAs } : {}),` 추가,
`WebSite` 노드의 `publisher: { '@id': \`${siteUrl('/')}#organization\` },` → `publisher: { '@id': ORGANIZATION_ID },`

- [ ] **Step 3: 페이지** — `apps/site/app/about/page.tsx`

```tsx
import type { Metadata } from 'next';
import { MIN_CAMPAIGN_BUDGET, PLATFORMS, REVIEW_SLA_OPTIONS } from '@clipers/db';
import { ButtonLink, formatKRW } from '@clipers/ui';
import JsonLd from '@/components/json-ld';
import LandingChrome from '@/components/landing-chrome';
import { COMPANY, ORGANIZATION_ID } from '@/lib/company';
import { siteUrl } from '@/lib/urls';

export const metadata: Metadata = {
  title: 'Clipers 소개 — 검증된 조회수만큼 쓰는 숏폼 캠페인 플랫폼',
  description:
    'Clipers는 광고주가 연 숏폼 캠페인에 크리에이터가 참여하고, 검수를 통과한 영상의 검증된 조회수만큼만 정산하는 국내 플랫폼이에요.',
  alternates: { canonical: '/about' },
};

// Every number here comes from @clipers/db so the page never drifts from the product. No rates (brand or creator).
const FACTS: { label: string; value: string }[] = [
  { label: '캠페인 최소 예산', value: `${formatKRW(MIN_CAMPAIGN_BUDGET)} (부가세 별도)` },
  { label: '올릴 수 있는 플랫폼', value: PLATFORMS.map((platform) => platform.label).join(' · ') },
  { label: '영상 검수', value: `캠페인마다 ${REVIEW_SLA_OPTIONS.map((hours) => `${hours}시간`).join(' 또는 ')} 안에` },
  { label: '조회수 확인', value: '유튜브는 자동 수집, 다른 플랫폼은 화면 캡처를 운영팀이 대조' },
  { label: '크리에이터 참여', value: '캠페인마다 지원하고 운영팀 승인 후 참여, 가입과 지원은 무료' },
];

const STEPS = [
  '광고주가 캠페인을 만들고 예산을 입금해요. 운영팀이 입금을 확인하면 캠페인이 공개돼요.',
  '크리에이터가 캠페인에 지원하고, 운영팀이 승인해요.',
  '크리에이터가 숏폼을 올리고 링크를 제출하면, 운영팀이 정해진 시간 안에 검수해요.',
  '검수를 통과한 영상의 조회수를 매주 확인해 크리에이터에게 정산하고, 광고주 예산에서 그만큼 차감해요.',
];

export default function AboutPage() {
  return (
    <LandingChrome cta="캠페인 시작하기" path="/about">
      <article className="cl-guide">
        <h1 className="cl-guide__title">Clipers 소개</h1>
        <div className="cl-guide__answer">
          <p>
            Clipers는 국내 숏폼 클리핑 캠페인 플랫폼이에요. 브랜드·아티스트·방송사 같은 광고주가 캠페인을 열면, 크리에이터가 정해진
            영상을 편집하거나 제품을 소개하는 숏폼을 만들어 유튜브 쇼츠·틱톡·릴스 등에 올려요.
          </p>
          <p>
            광고주는 검수를 통과한 영상의 검증된 조회수만큼만 비용을 내고, 크리에이터는 그 조회수만큼 Clipers에서 정산받아요. 구독자
            수와 상관없이 누구나 지원할 수 있어요.
          </p>
        </div>

        <section className="cl-guide__section">
          <h2>어떻게 돌아가나요</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="cl-guide__section">
          <h2>한눈에 보기</h2>
          <table className="cl-guide__table">
            <tbody>
              {FACTS.map((fact) => (
                <tr key={fact.label}>
                  <th scope="row">{fact.label}</th>
                  <td>{fact.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cl-guide__section">
          <h2>운영하는 회사</h2>
          <table className="cl-guide__table">
            <tbody>
              <tr>
                <th scope="row">상호</th>
                <td>{COMPANY.legalName}</td>
              </tr>
              <tr>
                <th scope="row">대표</th>
                <td>{COMPANY.representative}</td>
              </tr>
              <tr>
                <th scope="row">사업자등록번호</th>
                <td>{COMPANY.registrationNumber}</td>
              </tr>
              <tr>
                <th scope="row">주소</th>
                <td>{COMPANY.address}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="cl-guide__section">
          <h2>문의</h2>
          <p>캠페인 구성, 예산, 일정이 궁금하면 상담 문의를 남겨 주세요. 운영팀이 이메일로 답해 드려요.</p>
          <div className="cl-status-page__actions">
            <ButtonLink href="/contact?from=/about" variant="primary">
              상담 문의
            </ButtonLink>
            <ButtonLink href="/discover" variant="secondary">
              캠페인 둘러보기
            </ButtonLink>
          </div>
        </section>
      </article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          url: siteUrl('/about'),
          name: 'Clipers 소개',
          inLanguage: 'ko-KR',
          mainEntity: { '@id': ORGANIZATION_ID },
        }}
      />
    </LandingChrome>
  );
}
```

- [ ] **Step 4: 푸터 링크** — `apps/site/components/landing-chrome.tsx` 하단 메뉴의 `<Link href="/guides">가이드</Link>` 다음 줄에 추가

```tsx
          <Link href="/about">회사 소개</Link>
```

- [ ] **Step 5: 사이트맵** — `apps/site/app/sitemap.ts`의 `/contact` 항목 다음 줄에 추가

```ts
    { url: siteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
```

- [ ] **Step 6: 로컬 확인** (사이트 dev 서버가 3001에서 돌고 있으면)

Run: `curl -s http://localhost:3001/about | grep -o "Clipers 소개\|544-87-03492\|AboutPage" | sort -u`
Expected: 세 문자열 모두 출력

- [ ] **Step 7: 커밋**

```bash
git add apps/site/app/about/page.tsx
git commit -m "feat(site): about page with how Clipers works, product facts and the operating company; one Organization @id" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/company.ts apps/site/app/layout.tsx apps/site/app/about/page.tsx apps/site/components/landing-chrome.tsx apps/site/app/sitemap.ts
```

---

### Task 9: 구조화 데이터 — `Service`(브랜드)와 `ItemList`(가이드 목록)

**Files:**
- Create: `apps/site/lib/structured-data.ts`
- Test: `apps/site/lib/structured-data.test.ts`
- Modify: `apps/site/app/brands/page.tsx`, `apps/site/app/guides/page.tsx`

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/structured-data.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { ORGANIZATION_ID } from './company';
import { GUIDES } from './guides';
import { brandServiceJsonLd, guideListJsonLd } from './structured-data';

describe('structured data', () => {
  it('describes the brand service without any price', () => {
    const service = brandServiceJsonLd();
    expect(service['@type']).toBe('Service');
    expect(service.provider).toEqual({ '@id': ORGANIZATION_ID });
    const json = JSON.stringify(service);
    for (const word of ['offers', 'price', '1천 회당', formatKRW(DEFAULT_PRICING.brandCpm), formatKRW(DEFAULT_PRICING.creatorCpm)]) {
      expect(json).not.toContain(word);
    }
  });

  it('lists every guide once, in order', () => {
    const list = guideListJsonLd(GUIDES);
    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement.map((item) => item.position)).toEqual(GUIDES.map((_, index) => index + 1));
    expect(new Set(list.itemListElement.map((item) => item.url)).size).toBe(GUIDES.length);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/structured-data.test.ts`
Expected: FAIL — `Failed to resolve import "./structured-data"`

- [ ] **Step 3: 구현** — `apps/site/lib/structured-data.ts`

```ts
import { ORGANIZATION_ID } from './company';
import type { Guide } from './guides';
import { siteUrl } from './urls';

// schema.org nodes shared by pages. No prices anywhere: the brand rate is private, and the creator rate shown next to
// it would reveal the margin.

export function brandServiceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Clipers 숏폼 클리핑 캠페인',
    serviceType: '숏폼 바이럴 마케팅',
    description: '광고주가 연 캠페인에 크리에이터가 숏폼을 올리고, 검수를 통과한 영상의 검증된 조회수만큼만 비용을 내는 서비스',
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'Country', name: 'KR' },
    audience: { '@type': 'BusinessAudience' },
    url: siteUrl('/brands'),
  };
}

export function guideListJsonLd(guides: Guide[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Clipers 가이드',
    itemListElement: guides.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: siteUrl(`/guides/${guide.slug}`),
      name: guide.title,
    })),
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/structured-data.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 페이지 연결**

`apps/site/app/brands/page.tsx`: import에 `import JsonLd from '@/components/json-ld';`와 `import { brandServiceJsonLd } from '@/lib/structured-data';`를 더하고, `<LandingChrome cta="캠페인 시작하기" overDark path="/brands">` 바로 다음 줄에 추가:
```tsx
      <JsonLd data={brandServiceJsonLd()} />
```
`apps/site/app/guides/page.tsx`: import에 `import JsonLd from '@/components/json-ld';`와 `import { guideListJsonLd } from '@/lib/structured-data';`를 더하고, `<div className="cl-guides">` 바로 다음 줄에 추가:
```tsx
        <JsonLd data={guideListJsonLd(GUIDES)} />
```

- [ ] **Step 6: 커밋**

```bash
git add apps/site/lib/structured-data.ts apps/site/lib/structured-data.test.ts
git commit -m "feat(site): Service structured data on the brand page and an ItemList of guides, no prices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/structured-data.ts apps/site/lib/structured-data.test.ts apps/site/app/brands/page.tsx apps/site/app/guides/page.tsx
```

---

### Task 10: `llms-full.txt`와 `llms.txt` 링크

**Files:**
- Create: `apps/site/lib/llms-full.ts`, `apps/site/app/llms-full.txt/route.ts`
- Test: `apps/site/lib/llms-full.test.ts`
- Modify: `apps/site/app/llms.txt/route.ts` ('## 페이지' 목록)

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/site/lib/llms-full.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { GUIDES, guideFaqs } from './guides';
import { guidesFullText } from './llms-full';

const url = (path: string) => `https://clipers.co.kr${path}`;

describe('guidesFullText', () => {
  it('carries every guide with its address, answer, sections and FAQ', () => {
    const text = guidesFullText(GUIDES, url);
    for (const guide of GUIDES) {
      expect(text).toContain(`## ${guide.title}`);
      expect(text).toContain(url(`/guides/${guide.slug}`));
      expect(text).toContain(guide.answer[0]);
      expect(text).toContain(`### ${guide.sections[0].heading}`);
      expect(text).toContain(guideFaqs(guide)[0].q);
    }
  });

  it('keeps per-view rates out of the advertiser guides', () => {
    for (const guide of GUIDES.filter((item) => item.audience === 'advertiser')) {
      const text = guidesFullText([guide], url);
      expect(text).not.toContain('1천 회당');
      expect(text).not.toContain(formatKRW(DEFAULT_PRICING.brandCpm));
      expect(text).not.toContain(formatKRW(DEFAULT_PRICING.creatorCpm));
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/llms-full.test.ts`
Expected: FAIL — `Failed to resolve import "./llms-full"`

- [ ] **Step 3: 구현** — `apps/site/lib/llms-full.ts`

```ts
import { guideFaqs } from './guides';
import type { Guide } from './guides';

// llms-full.txt: every guide in one Markdown file, so an answer engine can read the whole library without crawling.
// Same words as the pages; the rate rules of the guide tests apply here too.

const AUDIENCE = { advertiser: '광고주', creator: '크리에이터' } as const;

export function guidesFullText(guides: Guide[], siteUrl: (path: string) => string): string {
  const lines = [
    '# Clipers 가이드 전문',
    '',
    '> Clipers는 광고주가 연 숏폼 캠페인에 크리에이터가 참여하고, 검수를 통과한 영상의 검증된 조회수만큼 정산하는 국내 플랫폼입니다. 아래는 사이트의 모든 가이드 본문입니다.',
    '',
  ];
  for (const guide of guides) {
    lines.push(`## ${guide.title}`, '', `- 주소: ${siteUrl(`/guides/${guide.slug}`)}`, `- 대상: ${AUDIENCE[guide.audience]}`, `- 마지막 수정: ${guide.updated}`, '');
    lines.push(guide.answer.join(' '), '');
    for (const section of guide.sections) {
      lines.push(`### ${section.heading}`, '', ...section.paragraphs.flatMap((paragraph) => [paragraph, '']));
      if (section.list) lines.push(...section.list.map((item) => `- ${item}`), '');
    }
    lines.push('### 자주 묻는 질문', '', ...guideFaqs(guide).map((faq) => `- **${faq.q}** ${faq.a}`), '');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @clipers/site exec vitest run lib/llms-full.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 라우트** — `apps/site/app/llms-full.txt/route.ts`

```ts
import { GUIDES } from '@/lib/guides';
import { guidesFullText } from '@/lib/llms-full';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

export function GET() {
  return new Response(guidesFullText(GUIDES, siteUrl), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
```

- [ ] **Step 6: `llms.txt` 페이지 목록** — `apps/site/app/llms.txt/route.ts`의 `'## 페이지',` 아래 `/brands` 줄 다음에 두 줄 추가

```ts
    `- [회사 소개](${siteUrl('/about')}): Clipers가 하는 일, 운영 방식, 핵심 사실, 운영 회사 정보`,
    `- [가이드 전문](${siteUrl('/llms-full.txt')}): 모든 가이드의 본문을 한 파일로`,
```

- [ ] **Step 7: 커밋**

```bash
git add apps/site/lib/llms-full.ts apps/site/lib/llms-full.test.ts apps/site/app/llms-full.txt/route.ts
git commit -m "feat(site): llms-full.txt carries every guide in one file; llms.txt links it and the about page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/llms-full.ts apps/site/lib/llms-full.test.ts apps/site/app/llms-full.txt/route.ts apps/site/app/llms.txt/route.ts
```

---

### Task 11: 가이드 검색 스니펫·내부 링크 검사

**Files:**
- Modify: `apps/site/lib/guides/index.test.ts` (끝의 `describe` 안에 두 테스트 추가)

- [ ] **Step 1: 테스트 추가** — `describe('guides', () => {` 블록의 마지막 `it(...)` 다음에

```ts
  it('keeps titles and descriptions unique and within search snippet lengths', () => {
    for (const guide of GUIDES) {
      expect(`${guide.title} — Clipers`.length).toBeLessThanOrEqual(60);
      expect(guide.description.length).toBeGreaterThanOrEqual(60);
      expect(guide.description.length).toBeLessThanOrEqual(160);
    }
    expect(new Set(GUIDES.map((guide) => guide.title)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((guide) => guide.description)).size).toBe(GUIDES.length);
  });

  it('links only to pages that exist', () => {
    const routes = new Set(['/', '/brands', '/discover', '/guides', '/contact', '/about']);
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        for (const link of section.links ?? []) {
          if (link.href.startsWith('https://')) continue;
          const pathname = link.href.split(/[?#]/)[0];
          if (pathname.startsWith('/guides/')) expect(guideBySlug(pathname.slice('/guides/'.length))).toBeDefined();
          else expect(routes.has(pathname)).toBe(true);
        }
      }
    }
  });
```

- [ ] **Step 2: 실행** (지금 가이드는 통과해야 한다: 제목 최대 46자, 설명 62~92자, 중복 0, 내부 링크 `/discover`·`/contact`·`/guides/*`)

Run: `pnpm --filter @clipers/site exec vitest run lib/guides/index.test.ts`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git commit -m "test(site): guide titles and descriptions stay unique and snippet-sized; internal links resolve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/guides/index.test.ts
```

---

### Task 12: 전체 검증, 설계 문서 정리, 히어로 속도 측정

**Files:**
- Modify: `docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md`

- [ ] **Step 1: 전체 검사**

Run: `pnpm turbo run lint test && (cd apps/site && npx tsc --noEmit -p .) && (cd apps/app && npx tsc --noEmit -p .)`
Expected: lint 오류 0, 모든 테스트 통과, 타입 오류 0

- [ ] **Step 1b: 이미지 대체 텍스트 점검**

Run: `grep -rnE "<img(?![^>]*\balt=)" apps/site/app apps/site/components --include=*.tsx -P`
Expected: 출력 없음. 출력이 있으면 그 `<img>`에 내용을 설명하는 `alt`(장식이면 `alt=""`)를 넣고 이 Task 커밋에 함께 담는다.

- [ ] **Step 2: 프로덕션 빌드** (dev 서버와 `.next`가 겹치지 않게 임시 worktree에서)

```bash
WT="$TMPDIR/clipers-p1-build" && git worktree add --detach "$WT" HEAD -q \
  && cp apps/site/.env.local "$WT/apps/site/" && cp apps/app/.env.local "$WT/apps/app/" \
  && (cd "$WT" && pnpm install --frozen-lockfile --prefer-offline >/dev/null && pnpm turbo run build --filter=@clipers/site --filter=@clipers/app --concurrency=1 | grep -E "✓ Generating|Tasks|Error")
git worktree remove --force "$WT"
```
Expected: `Tasks: 2 successful, 2 total`, 라우트 목록에 `/about`, `/rss.xml`, `/llms-full.txt`, `/indexnow.txt`
(Windows에서 worktree 삭제가 긴 경로로 실패하면 robocopy로 비운 뒤 `git worktree prune`)

- [ ] **Step 3: 설계 문서를 실제와 맞추기** — `docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md`

3.6절 첫 항목의 `` `description`(80~160자) `` → `` `description`(60~160자) ``
5.1절 마지막 문장 `푸터와 상단 메뉴에 링크.` → `푸터에 링크(상단 메뉴는 대상별 진입만 둔다).`
3.6절 히어로 항목 `LCP가 2.5초를 넘으면 히어로 첫 화면을 정적 이미지로 먼저 그리는 개선을 P1에 포함한다.` → `LCP가 2.5초를 넘으면 측정값과 함께 회사에 알리고, 개선은 따로 설계한다.`
5.2절 `llms.txt` 항목 끝에 추가: `(광고주 섹션의 단계별 재구성은 P2에서 stage 필드를 만든 뒤 한다. P1은 /about·llms-full.txt 링크만 더한다.)`

- [ ] **Step 4: 히어로 속도 측정** (push·배포 뒤, 잠금 비밀번호로)

```bash
AUTH=$(printf 'x:%s' "$PRELAUNCH_PASSWORD" | base64)
CHROME_PATH="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npx -y lighthouse https://clipers-site.vercel.app/brands \
  --only-categories=performance --form-factor=mobile --quiet --chrome-flags="--headless=new" \
  --extra-headers="{\"Authorization\":\"Basic $AUTH\"}" --output=json --output-path=./lh-brands.json
node -e "const r=require('./lh-brands.json').audits;console.log('LCP',r['largest-contentful-paint'].displayValue,'CLS',r['cumulative-layout-shift'].displayValue)"
rm lh-brands.json
```
측정값을 설계 문서 3.6절 히어로 항목 끝에 `(2026-10-0X 측정: LCP …, CLS …)`로 적는다. LCP > 2.5초면 보고에 올린다.

- [ ] **Step 5: 커밋**

```bash
git commit -m "docs: search growth spec matches P1 as built; brand hero speed recorded" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md
```

- [ ] **Step 6: 보고에 넣을 사람 할 일**
  - Vercel `clipers-site` → Analytics → Enable
  - 출시 체크리스트(P3)에서: 도메인 연결 후 `GOOGLE_SITE_VERIFICATION`·`NAVER_SITE_VERIFICATION`·`BING_SITE_VERIFICATION`·`INDEXNOW_KEY`를 `clipers-site`에 넣고 재배포
