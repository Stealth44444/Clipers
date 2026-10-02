# 검색·AI 유입 P2 — 광고주 콘텐츠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 광고주 질문 지도(인지 → 플랫폼 → 비교 → 비용 → 실행·신뢰 → 용어·데이터)에 맞춰 새 가이드 24개를 더하고, 가이드 시스템이 출처·확인 날짜·실명 비교 주장·용어·데이터 표를 구조로 담고 검사하게 한다.

**Architecture:** 설계 `docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md` 4절과 5.4절. 기존 가이드 시스템(`apps/site/lib/guides`, `components/guide-article.tsx`, `/guides`, `llms.txt`, `llms-full.txt`, `rss.xml`)을 확장한다. 단계는 별도 필드 없이 광고주 `GUIDE_GROUPS`의 순서로 표현한다.

**Tech Stack:** Next.js 15 App Router (`apps/site`), Vitest, `@clipers/db` 상수.

**글 본문에 대한 약속:** 새 가이드 24개는 아래 브리프(주소, 제목, 핵심 답, 필수 사실·출처, 규칙)대로 구현 단계에서 본문을 쓴다. 본문을 계획에 미리 적지 않는 대신, 4.5절 품질 테스트(단가 금지, 출처 필수, 캡처 표현 금지, 길이·중복, 내부 링크)가 모든 글을 검사한다.

**실행 순서:** 1 → 2 → 5 → 6 → 7 → 8 → 9 → 10 → 4 → 11. 중심 페이지(Task 4)는 다른 묶음 모두로 링크하므로, 링크 대상이 다 생긴 뒤에 쓴다(내부 링크 테스트가 없는 주소를 막는다). 각 Task의 `related`·`links`는 그 시점에 이미 있는 가이드만 가리킨다.

**작업 규칙:** 같은 작업 트리를 다른 세션이 함께 쓴다. 커밋은 `git commit -m … -- <이 작업의 파일들>`로 자기 파일만. push하지 않는다(요청 시에만). 테스트는 `cd apps/site && npx vitest run <파일>`.

**글쓰기 규칙 (모든 새 글):**
- 해요체. 제목은 질문형(`?`로 끝남), `title — Clipers`가 60자 이하. 설명 60~160자. 답 2문장 이상, 섹션 3개 이상, FAQ id 3개 이상(`ADVERTISER_FAQ`), `related` 3개(광고주 가이드).
- 쓰지 않는 것: 브랜드·크리에이터 단가와 `1천 회당`, 지어낸 수치·사례·고객사, 성과 보장, 확인되지 않은 기능, 음원 캠페인이 지금 된다는 표현, "화면 캡처/캡쳐/스크린샷". 다른 플랫폼 조회수는 "운영팀이 영상에 표시된 조회수를 직접 확인"으로 쓴다.
- 우리 서비스 숫자는 `lib/guides/facts.ts`·`common.ts`의 값을 템플릿 문자열로 쓴다(직접 숫자를 적지 않는다).
- 외부 사실(플랫폼 규칙, 법령, 통계, 경쟁 서비스)은 공식·1차 출처에서 확인하고 `sources`에 `{label, url, checked: '2026-10-02'}`로 남긴다. 공식 출처를 찾지 못한 사실은 쓰지 않는다.

---

## File map

| 파일 | 역할 |
|---|---|
| `apps/site/lib/guides/types.ts` | 새 그룹, `reviewed`, `sources`, `claims`, `legalReviewed`, `terms`, `rows` |
| `apps/site/lib/guides/index.ts` | 광고주 그룹을 질문 지도 순서로, 새 글 모음 등록 |
| `apps/site/lib/guides/*.ts` (기존 6개) | 모든 글에 `reviewed` |
| `apps/site/lib/guides/index.test.ts` | 개수, 구조 규칙(출처·주장·용어·데이터), `reviewed` |
| `apps/site/components/guide-article.tsx` | 작성·확인 표시, 비교 표, 용어 목록, 데이터 표, 출처, 용어집 구조화 데이터 |
| `apps/site/lib/guides/pillar.ts` | 중심 페이지 1 |
| `apps/site/lib/guides/advertiser-problem.ts` | `clipping-marketing` 확장 |
| `apps/site/lib/guides/advertiser-platform.ts` | 플랫폼 7 |
| `apps/site/lib/guides/compare.ts` | 방식 비교 3 + 실명 비교 6 |
| `apps/site/lib/guides/cost.ts` | 비용 2 |
| `apps/site/lib/guides/execution.ts` | 실행·신뢰 3 |
| `apps/site/lib/guides/glossary.ts` | 용어집 1 |
| `apps/site/lib/guides/data.ts` | 숏폼 이용 현황 1 |

---

### Task 1: 가이드 데이터 구조 확장과 `reviewed`

**Files:**
- Modify: `apps/site/lib/guides/types.ts`, `apps/site/lib/guides/index.ts`, `apps/site/lib/guides/{topic,situation,problem,platform,industry,advertiser-problem}.ts`, `apps/site/lib/guides/index.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `index.test.ts`의 `describe('guides', …)` 안 끝에 추가

```ts
  it('records when every guide was last fact-checked', () => {
    for (const guide of GUIDES) expect(guide.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('backs comparisons, data and named claims with dated https sources', () => {
    for (const guide of GUIDES) {
      const sources = guide.sources ?? [];
      for (const source of sources) {
        expect(source.url.startsWith('https://')).toBe(true);
        expect(source.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (guide.group === 'compare' || guide.group === 'data') expect(sources.length).toBeGreaterThan(0);
      for (const claim of guide.claims ?? []) expect(sources[claim.source]).toBeDefined();
      for (const row of guide.rows ?? []) expect(sources[row.source]).toBeDefined();
      if (guide.claims?.length) expect(typeof guide.legalReviewed).toBe('boolean');
      if (guide.group === 'glossary') expect(guide.terms?.length ?? 0).toBeGreaterThanOrEqual(10);
    }
  });
```

- [ ] **Step 2: 실패 확인** — Run: `cd apps/site && npx vitest run lib/guides/index.test.ts` → Expected: FAIL (`reviewed` undefined; TS 타입 오류는 Vitest가 무시)

- [ ] **Step 3: 타입** — `types.ts`에서 `GuideGroup`과 `Guide`를 바꾼다

```ts
export type GuideGroup =
  | 'topic'
  | 'situation'
  | 'problem'
  | 'platform'
  | 'pillar'
  | 'advertiser-platform'
  | 'compare'
  | 'cost'
  | 'industry'
  | 'advertiser-problem'
  | 'execution'
  | 'glossary'
  | 'data';

export type GuideSource = { label: string; url: string; checked: string };
```
`Guide` 타입의 `updated` 위에 추가:
```ts
  /** ISO date the facts were last checked against their sources; shown as "… 확인". */
  reviewed: string;
  /** Primary sources for outside facts. Required for compare and data guides. */
  sources?: GuideSource[];
  /** Named comparisons: what the other service says about itself, each pointing at a source index. */
  claims?: { subject: string; text: string; source: number }[];
  /** Named comparisons stay flagged until a lawyer has read them (launch checklist lists the false ones). */
  legalReviewed?: boolean;
  /** Glossary only. */
  terms?: { term: string; definition: string }[];
  /** Data pages: one figure per row, each pointing at a source index. */
  rows?: { label: string; value: string; source: number }[];
```

- [ ] **Step 4: 그룹 순서** — `index.ts`의 `GUIDE_GROUPS`를 아래로 바꾼다(광고주는 질문 지도 순서). 새 모음 import는 Task 4~10에서 하나씩 더한다.

```ts
export const GUIDE_GROUPS: { id: GuideGroup; audience: GuideAudience; label: string }[] = [
  { id: 'topic', audience: 'creator', label: '시작하기' },
  { id: 'situation', audience: 'creator', label: '상황별' },
  { id: 'problem', audience: 'creator', label: '고민별' },
  { id: 'platform', audience: 'creator', label: '플랫폼' },
  { id: 'pillar', audience: 'advertiser', label: '숏폼 마케팅 기본' },
  { id: 'advertiser-platform', audience: 'advertiser', label: '플랫폼별 마케팅' },
  { id: 'compare', audience: 'advertiser', label: '비교' },
  { id: 'cost', audience: 'advertiser', label: '비용과 예산' },
  { id: 'industry', audience: 'advertiser', label: '업종별' },
  { id: 'advertiser-problem', audience: 'advertiser', label: '고민별' },
  { id: 'execution', audience: 'advertiser', label: '실행과 신뢰' },
  { id: 'glossary', audience: 'advertiser', label: '용어' },
  { id: 'data', audience: 'advertiser', label: '데이터' },
];
```
`index.test.ts`의 그룹 순서 검사(`expect(GUIDE_GROUPS.map(...)).toEqual([...])`)를 위 13개 순서로 바꾼다.

- [ ] **Step 5: 기존 31개에 `reviewed`** — `common.ts`에 `export const REVIEWED = '2026-10-02';`를 더하고, 기존 6개 파일의 모든 `updated: UPDATED,` 다음 줄에 `reviewed: REVIEWED,`를 넣고 import에 `REVIEWED`를 더한다.

Run: `cd apps/site && node -e "const fs=require('fs');for(const f of ['topic','situation','problem','platform','industry','advertiser-problem']){const p='lib/guides/'+f+'.ts';let s=fs.readFileSync(p,'utf8');s=s.replace(/updated: UPDATED,\n/g,'updated: UPDATED,\n    reviewed: REVIEWED,\n');s=s.replace(/import \{([^}]*)UPDATED([^}]*)\} from '.\/common';/, (m,a,b)=>'import {'+a+'REVIEWED, UPDATED'+b+'} from \'./common\';');fs.writeFileSync(p,s)}"`

- [ ] **Step 6: 통과 확인** — Run: `cd apps/site && npx vitest run lib/guides && npx tsc --noEmit -p .` → Expected: PASS, 타입 오류 0

- [ ] **Step 7: 커밋** — `git commit -m "feat(site): guides carry a fact-check date, sources, named claims, terms and data rows; advertiser groups follow the question map" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/lib/guides`

---

### Task 2: 화면 틀 — 확인 표시, 비교·용어·데이터, 출처

**Files:** Modify `apps/site/components/guide-article.tsx`

- [ ] **Step 1: 확인 표시** — 제목 아래 `cl-guide__updated` 문단을 아래로 바꾼다

```tsx
        <p className="cl-guide__updated">
          Clipers 운영팀 작성 · <time dateTime={guide.reviewed}>{guide.reviewed.split('-').join('. ')}.</time> 확인
        </p>
```

- [ ] **Step 2: 구조 블록** — `guide.sections.map(...)` 블록 바로 다음에 추가

```tsx
        {guide.claims && guide.claims.length > 0 && (
          <section className="cl-guide__section">
            <h2>각 서비스가 밝힌 내용</h2>
            <table className="cl-guide__table">
              <tbody>
                {guide.claims.map((claim) => (
                  <tr key={`${claim.subject}-${claim.text}`}>
                    <th scope="row">{claim.subject}</th>
                    <td>
                      {claim.text} <sup>[{claim.source + 1}]</sup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {guide.terms && (
          <section className="cl-guide__section">
            <h2>용어</h2>
            <dl className="cl-guide__terms">
              {guide.terms.map((item) => (
                <div id={`term-${encodeURIComponent(item.term)}`} key={item.term}>
                  <dt>{item.term}</dt>
                  <dd>{item.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {guide.rows && (
          <section className="cl-guide__section">
            <h2>숫자로 보기</h2>
            <table className="cl-guide__table">
              <tbody>
                {guide.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>
                      {row.value} <sup>[{row.source + 1}]</sup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {guide.sources && guide.sources.length > 0 && (
          <section className="cl-guide__section cl-guide__sources">
            <h2>출처</h2>
            <ol>
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a className="cl-link" href={source.url} rel="noopener" target="_blank">
                    {source.label}
                  </a>{' '}
                  <span>({source.checked.split('-').join('. ')}. 확인)</span>
                </li>
              ))}
            </ol>
          </section>
        )}
```

- [ ] **Step 3: 용어집 구조화 데이터** — `Article` JsonLd 앞에 추가

```tsx
      {guide.terms && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: guide.title,
            url: siteUrl(path),
            hasDefinedTerm: guide.terms.map((item) => ({
              '@type': 'DefinedTerm',
              name: item.term,
              description: item.definition,
              url: siteUrl(`${path}#term-${encodeURIComponent(item.term)}`),
            })),
          }}
        />
      )}
```

- [ ] **Step 4: 스타일** — `packages/ui/src/styles/components.css`의 `.cl-guide__table` 규칙들 근처에 추가

```css
.cl-guide__terms { display: grid; gap: var(--space-4); margin-top: var(--space-3); }
.cl-guide__terms dt { font-weight: 600; }
.cl-guide__terms dd { margin: var(--space-1) 0 0; color: var(--color-text-muted); line-height: 1.7; }
.cl-guide__sources ol { padding-left: 1.2em; color: var(--color-text-muted); font-size: var(--font-size-2); line-height: 1.7; }
```

- [ ] **Step 5: 확인** — Run: `cd apps/site && npx tsc --noEmit -p . && npx eslint components/guide-article.tsx` → 오류 0. dev 서버에서 기존 가이드 하나(`/guides/pay-per-view`)가 "Clipers 운영팀 작성 · 2026. 10. 02. 확인"으로 보이는지 확인.

- [ ] **Step 6: 커밋** — `git commit -m "feat(site): guides show who wrote them and when they were checked, with comparison, glossary, data and source blocks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- apps/site/components/guide-article.tsx packages/ui/src/styles/components.css`

---

### Task 3: 개수 검사 갱신 방식

새 모음을 더할 때마다 `index.test.ts` 첫 테스트의 광고주 개수와 그룹별 개수를 함께 고친다. 최종 기대값(Task 10 끝): 크리에이터 15, 광고주 40, 그룹별 `[pillar 1, advertiser-platform 7, compare 9, cost 2, industry 11, advertiser-problem 5, execution 3, glossary 1, data 1]`.

---

### Task 4: 중심 페이지와 `clipping-marketing` 확장

**Files:** Create `apps/site/lib/guides/pillar.ts` (`export const PILLAR_GUIDES: Guide[]`), Modify `index.ts`(import·등록), `advertiser-problem.ts`(`clipping-marketing`)

- [ ] **브리프 — `short-form-marketing`** (group `pillar`)
  - 제목: `숏폼 마케팅, 어떻게 시작하면 되나요?`
  - 답: 숏폼 마케팅은 쇼츠·릴스·틱톡 같은 짧은 세로 영상으로 브랜드를 알리는 일이고, 방법은 크게 광고 집행·인플루언서 섭외·클리핑 캠페인 세 가지라는 요지.
  - 섹션: ① 세 가지 방법(광고 집행/인플루언서/클리핑 캠페인 — 비용이 생기는 시점이 다름: 노출 입찰, 섭외 건당, 검증된 조회수) ② 목표에 맞게 고르기(인지·출시·재가공) ③ 플랫폼 고르기(플랫폼 7 가이드로 링크) ④ 예산 정하기(비용 가이드로 링크, `ADVERTISER_NOTES`의 최소 예산) ⑤ 시작 순서(캠페인 만들기→입금→검수→정산).
  - `links`: 각 섹션에서 해당 그룹 가이드로(Task 5~10에서 만든 slug). `faqIds`: `cost`, `min-budget`, `platforms`, `creators`. `related`: `clipping-marketing`, `short-form-marketing-cost`, `clipers-vs-influencer-marketing`.
- [ ] **브리프 — `clipping-marketing` 확장**: group을 `pillar`로 옮기지 않고(주소·그룹 유지) 섹션 2개 추가 — "어떤 브랜드에 맞나요"(업종 가이드 11개 중 4개 링크), "인플루언서 마케팅과 무엇이 다른가요"(`clipers-vs-influencer-marketing` 링크). `updated`·`reviewed`를 `'2026-10-02'`로.
- [ ] 테스트 개수 갱신(Task 3), `npx vitest run lib/guides` PASS, 커밋 `feat(site): short-form marketing pillar guide; clipping marketing guide grows two sections`.

---

### Task 5: 플랫폼별 마케팅 7개

**Files:** Create `apps/site/lib/guides/advertiser-platform.ts` (`ADVERTISER_PLATFORM_GUIDES`), Modify `index.ts`

- [ ] **먼저 조사**: 각 플랫폼 공식 도움말에서 (a) 숏폼 길이·형식 (b) 유료 광고 표시 기능(유료 프로모션·브랜디드 콘텐츠 표시)을 확인해 `sources`에 남긴다. 공정거래위원회 「추천·보증 등에 관한 표시·광고 심사지침」은 공통 출처로 쓴다. 공식 출처가 없는 항목은 쓰지 않는다.
- [ ] **공통 틀**: 제목 `{플랫폼} 마케팅, 숏폼으로 어떻게 하나요?` / 섹션 ① 이 플랫폼 숏폼의 특징(출처 있는 사실만) ② 광고 표시(플랫폼 기능 + 공정위 지침) ③ Clipers 캠페인에서는(조회수 확인 방식: 유튜브 쇼츠는 자동 수집, 나머지는 "운영팀이 영상에 표시된 조회수를 직접 확인"; 캠페인마다 올릴 플랫폼을 고름) ④ 함께 쓰면 좋은 플랫폼(다른 플랫폼 가이드 링크). `faqIds`: `platforms`, `view-verification`, `creators`. `counterpart`(있으면): 크리에이터 `platforms` 가이드 slug.
- [ ] 7개 slug: `youtube-shorts-marketing`, `tiktok-marketing`, `instagram-reels-marketing`, `facebook-reels-marketing`, `x-video-marketing`, `naver-clip-marketing`, `kakao-shortform-marketing`. 플랫폼 이름은 `PLATFORMS` 라벨과 맞춘다(릴스는 "인스타그램 릴스"로 풀어 씀).
- [ ] 테스트 개수 갱신, PASS, 커밋 `feat(site): seven platform marketing guides for advertisers, facts from each platform's own help pages`.

---

### Task 6: 비교 9개 (방식 3 + 실명 6)

**Files:** Create `apps/site/lib/guides/compare.ts` (`COMPARE_GUIDES`), Modify `index.ts`

- [ ] **방식 비교 3** (`claims` 없음, `sources`에 공정위 지침·플랫폼 광고 도움말 등 일반 출처 1개 이상)
  - `clipers-vs-influencer-marketing` — `인플루언서 마케팅과 클리핑 캠페인, 무엇이 다른가요?` 비교 축: 비용이 생기는 시점(섭외 건당 vs 검증된 조회수), 참여 방식(섭외 vs 지원·승인), 결과물 수(1편 vs 여러 버전), 위험(조회수 미달에도 비용 vs 조회수만큼).
  - `clipers-vs-review-campaigns` — `체험단과 숏폼 클리핑 캠페인, 무엇이 다른가요?` 축: 보상(제품·이용권 vs 조회수 정산), 채널(블로그 중심 vs 숏폼), 목표(검색 후기 vs 숏폼 확산). 두 방식을 함께 쓰는 경우도 설명.
  - `clipers-vs-short-form-ads` — `숏폼 유료 광고와 클리핑 캠페인, 무엇이 다른가요?` 축: 노출 구매(입찰) vs 크리에이터 게시물, 광고 표시, 계정 운영.
- [ ] **실명 비교 6** (`claims` 필수, `legalReviewed: false`, `checked: '2026-10-02'`). 각 서비스의 공식 페이지에서 2026-10-02 확인한 내용만 쓴다:

| slug | 제목 | claims (출처) |
|---|---|---|
| `clipers-vs-revu` | `레뷰와 Clipers, 무엇이 다른가요?` | 지역·매장 체험단 절차 "상권 진단 → 상품 설계 → 전담 컨설턴트 운영 → 방문 일정 조율 → 콘텐츠 검수 → 보고서 제공", 레뷰가 "매장에 맞는 인플루언서를 직접 선정", 채널: 블로그·네이버 플레이스·인스타그램·숏폼·유튜브 체험단, 리포트: 콘텐츠 URL·리뷰 상태·키워드 노출·플레이스 반응 (https://biz.revu.net/local/process), 제품 블로그 체험단 "AI가 분석해 광고에 적합한 블로그를 점수로" (https://biz.revu.net/product/products/blog?prod=blog). 공개 가격 없음 |
| `clipers-vs-featuring` | `피처링과 Clipers, 무엇이 다른가요?` | "All-In-One 인플루언서 마케팅 플랫폼", 광고주가 조건으로 인플루언서를 검색·선정, 요금제 스탠다드 월 420,000원·프리미엄 월 837,000원·엔터프라이즈 별도, 지원 플랫폼 인스타그램·유튜브·틱톡·엑스·네이버 블로그, 리포트 ER·CPR·CPE (https://www.featuring.co/pricing, https://www.featuring.co) |
| `clipers-vs-reviewnote` | `리뷰노트와 Clipers, 무엇이 다른가요?` | "대한민국 체험단 수 1위, 신뢰받는 리뷰"(자체 표현), 캠페인마다 모집 기간·신청자 수·제공 혜택(제품·이용권·포인트) 공개, 채널 블로그·릴스·유튜브 (https://www.reviewnote.co.kr). 광고주 비용 공개 정보 없음 |
| `clipers-vs-gangnam-matzip` | `강남맛집 체험단과 Clipers, 무엇이 다른가요?` | 블로그 배송형·방문형·기자단, "업종과 지역에 딱 맞는 리뷰어를 선별", 보고서: 리뷰 노출 현황·유입 키워드·마케팅 성과, 자체 공개 누적 수치(리뷰어·광고주·캠페인·리뷰) (https://xn--939au0g4vj8sq.net/business). 공개 가격 없음 |
| `clipers-vs-whop` | `Whop Content Rewards와 Clipers, 무엇이 다른가요?` | 캠페인 주인이 1,000회당 금액·총예산·영상당 최대 지급액을 정함, 캠페인 주인이 제출물을 승인·반려, 클리핑 지원 플랫폼 TikTok·YouTube Shorts·X·Instagram Reels, 승인 후 조회수만큼 자동 지급 (https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards) |
| `clipers-vs-vyro` | `Vyro와 Clipers, 무엇이 다른가요?` | 1,000회당 지급, 최소 출금 $10 주 1회, 캠페인 규칙 기준 검토, 지원 Instagram·TikTok·YouTube Shorts·X, 조회수·예상 수익 매시간 갱신·캠페인 종료 시 최종 확인, Stripe·PayPal 출금 (https://vyro.com) |

  - Clipers 쪽 사실은 우리 값만: 최소 예산(`MIN_BUDGET`), 검증된 조회수만큼, 운영팀 승인, 검수 시간(`REVIEW_HOURS`), 7개 국내외 플랫폼, 한국어·원화·국내 계좌 정산, 영상당 상한·1인 상한. 평가 표현 금지("싸다/비싸다/느리다/낫다"). 마지막 섹션은 "이런 경우엔 ○○가, 이런 경우엔 Clipers가 맞아요"처럼 목적 기준으로 쓴다.
  - 테스트 추가(`index.test.ts`): 실명 비교 본문에 평가어 금지 — `['저렴', '비싸', '느리', '더 낫', '최고', '최악']`가 `compare` 그룹 텍스트에 없을 것.
- [ ] 테스트 개수 갱신, PASS, 커밋 `feat(site): comparison guides — three by method and six named, each claim from the service's own page with a date`.

---

### Task 7: 비용과 예산 2개

**Files:** Create `apps/site/lib/guides/cost.ts` (`COST_GUIDES`), Modify `index.ts`
- [ ] `short-form-marketing-cost` — `숏폼 마케팅 비용은 어떻게 정해지나요?` 방식별 비용 구조(광고 입찰·섭외 건당·구독형 도구·체험단·검증된 조회수형)를 구조로만 설명, Clipers는 `MIN_BUDGET`부터·검증된 조회수만큼·부가세 별도·남은 금액은 잔액(`leftover` FAQ와 같은 표현). 단가 없음.
- [ ] `short-form-budget-planning` — `숏폼 캠페인 예산은 얼마로 잡아야 하나요?` 목표(테스트·출시·지속)별 예산 정하는 순서, 캠페인 만들기 화면에서 예산을 넣으면 최대 조회수를 보여 준다는 사실, 영상당·1인 상한과 하루 제출 한도로 예산이 나뉘는 방식. 단가·예상 조회수 수치 없음.
- [ ] `faqIds`: `min-budget`, `cost`, `expected-views`, `leftover`, `clip-cap` 중 3~4개. 테스트 개수 갱신, PASS, 커밋 `feat(site): cost and budget guides that explain how spend works, with no rates`.

---

### Task 8: 실행과 신뢰 3개

**Files:** Create `apps/site/lib/guides/execution.ts` (`EXECUTION_GUIDES`), Modify `index.ts`
- [ ] `campaign-brief-guide` — `숏폼 캠페인 브리프는 어떻게 쓰나요?` 캠페인 만들기 화면의 실제 입력 항목(제목, 종류, 카테고리, 요구사항, 참고 링크, 플랫폼, 예산, 하루 제출 한도, 검수 시간)에 맞춰 무엇을 적으면 좋은지.
- [ ] `clip-review-criteria` — `올라온 숏폼은 무엇을 기준으로 검수하나요?` 요구사항 일치, 광고 표시, 허락된 영상만, 반려 시 사유 안내, 검수 시간(`REVIEW_HOURS`), 통과한 영상만 정산.
- [ ] `ad-disclosure-rules` — `숏폼 광고 표시는 어떻게 해야 하나요?` 공정거래위원회 추천·보증 심사지침(공식 출처)과 플랫폼 표시 기능(Task 5에서 찾은 출처 재사용). "법률 자문이 아님" 한 줄.
- [ ] 테스트 개수 갱신, PASS, 커밋 `feat(site): brief, review and ad disclosure guides`.

---

### Task 9: 용어집

**Files:** Create `apps/site/lib/guides/glossary.ts` (`GLOSSARY_GUIDES`), Modify `index.ts`
- [ ] `glossary` — `숏폼 마케팅 용어, 무엇이 있나요?` `terms` 12개 이상: 클리핑, 클리핑 캠페인, 소개 캠페인, UGC, 숏폼, CPM, 검증된 조회수, 검수, 시딩, 브랜디드 콘텐츠, 광고 표시(#유료광고), 리텐션, 영상당 지급 상한, 하루 제출 한도. 정의는 한두 문장, 단가 없음. 섹션 3개(용어를 읽는 법, 자주 헷갈리는 짝 — CPM vs 검증된 조회수, 클리핑 vs UGC 등).
- [ ] 테스트 개수 갱신, PASS(용어 10개 이상 규칙 포함), 커밋 `feat(site): short-form marketing glossary with DefinedTermSet data`.

---

### Task 10: 데이터 페이지

**Files:** Create `apps/site/lib/guides/data.ts` (`DATA_GUIDES`), Modify `index.ts`
- [ ] **먼저 조사**: 정부·공공기관·연구기관의 최신 공개 조사에서 국내 숏폼·동영상 이용 수치를 찾는다(예: 과학기술정보통신부·한국지능정보사회진흥원 「인터넷이용실태조사」, 방송통신위원회 「방송매체 이용행태 조사」, 정보통신정책연구원 KISDI STAT Report). 수치마다 조사명·발표 연도·쪽 또는 표를 `rows`와 `sources`에 남긴다. 5개 미만이면 찾은 것만 쓴다.
- [ ] `korea-short-form-usage` — `국내 숏폼 이용, 숫자로 보면 어떤가요?` 섹션: 조사 읽는 법(조사 시점·대상), 광고주에게 의미(해석은 수치에서 바로 나오는 것만), 출시 후 Clipers 캠페인 리포트로 넓힐 예정이라는 한 줄.
- [ ] 테스트 개수 갱신(최종값, Task 3), PASS, 커밋 `feat(site): Korean short-form usage in numbers, every figure with its survey`.

---

### Task 11: 전체 검증과 출시 플래그

- [ ] Run: `pnpm turbo run lint test && (cd apps/site && npx tsc --noEmit -p .)` → 오류 0
- [ ] 임시 worktree에서 사이트 프로덕션 빌드(P1 Task 12와 같은 방법). 기대: `/guides/<새 slug 24개>` 생성, `Tasks: 1 successful`.
- [ ] dev 서버에서 확인: `/guides`의 광고주 묶음이 질문 지도 순서, 실명 비교 한 곳의 "각 서비스가 밝힌 내용" 표와 출처, `/guides/glossary`의 `DefinedTermSet`, `/llms.txt` 광고주 섹션 순서, `/rss.xml` 항목 55개.
- [ ] `legalReviewed: false`인 slug 목록을 P3 출시 체크리스트에 넘길 수 있게 보고에 적는다.
