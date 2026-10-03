# 출시 당일 검색·AI 체크리스트

> 설계: `docs/superpowers/specs/2026-10-02-advertiser-search-growth-design.md` 6절. 사이트(`clipers-site`)와 앱(`clipers-app`)은 출시 전까지 비밀번호 잠금(`PRELAUNCH_PASSWORD`)으로 닫혀 있다. 이 문서는 잠금을 풀고 검색엔진·AI가 바로 수집하게 만드는 순서다. 비밀값은 이 문서에 적지 않는다.

## 0. 출시 전에 끝내 둘 것

| 항목 | 상태 확인 방법 |
|---|---|
| 실명 비교 가이드 6개 변호사 확인 | `apps/site/lib/guides/compare.ts`에서 `legalReviewed: false`인 글: `clipers-vs-revu`, `clipers-vs-featuring`, `clipers-vs-reviewnote`, `clipers-vs-gangnam-matzip`, `clipers-vs-whop`, `clipers-vs-vyro`. 확인이 끝난 글만 `true`로 바꾸고, 확인을 받지 못한 글은 출시 전에 `COMPARE_GUIDES`에서 빼거나 출시를 미룬다 |
| 약관·처리방침 확정 | `apps/app/app/legal-document.tsx`의 `DRAFT_NOTICE`를 지우고 시행일을 넣는다. 처리방침의 🔸 항목(방문 통계, 유입 경로 등)을 변호사 확인 후 확정 |
| 인증 메일 발송 | Resend SMTP를 Supabase에 연결한다(기본 메일은 시간당 2통 제한) |
| 실명 비교·데이터 출처 재확인 | 각 가이드의 출처를 다시 열어 내용이 바뀌지 않았는지 확인하고 `checked`·`reviewed` 날짜를 새로 적는다 |

## 1. 도메인 고르기와 연결

**고르는 기준**
- 브랜드 이름과 같은 철자, 짧고 발음 그대로 적을 수 있는 주소
- `.com`은 국제적으로 익숙하고, `.co.kr`·`.kr`은 국내 이용자에게 익숙하다. 둘 다 살 수 있으면 하나를 대표로 정하고 나머지는 대표 주소로 영구 이동(308)시킨다
- 사이트는 루트(`example.com`), 앱은 하위 도메인(`app.example.com`)으로 나눈다
- 한 번 정하면 바꾸지 않는다. 주소를 바꾸면 쌓인 검색 평가가 대부분 처음부터 다시 시작된다

**연결**
1. Vercel `clipers-site` → Settings → Domains에 루트 도메인, `clipers-app`에 `app.` 하위 도메인을 추가하고 안내대로 DNS를 설정한다.
2. 두 프로젝트 모두 환경변수 `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`을 새 주소로 바꾼다(Production·Preview).
3. Supabase → Authentication → URL Configuration: Site URL을 앱 주소로, Redirect URLs에 `https://app.<도메인>/auth/callback**`을 더한다.
4. Supabase SQL Editor에서 정기 작업이 부를 앱 주소를 바꾼다.
   ```sql
   select vault.update_secret(id, 'https://app.<도메인>') from vault.secrets where name = 'clipers_app_url';
   ```

## 2. 검색엔진 소유 확인 값 준비 (잠금 해제 전에 해도 된다)

| 서비스 | 받는 값 | 넣는 곳 (`clipers-site` 환경변수) |
|---|---|---|
| 구글 서치콘솔 | 도메인 속성(DNS TXT)을 권장. 메타 태그 방식이면 content 값 | `GOOGLE_SITE_VERIFICATION` |
| 네이버 서치어드바이저 | HTML 태그 방식의 content 값 | `NAVER_SITE_VERIFICATION` |
| 빙 웹마스터 | 서치콘솔에서 가져오기, 또는 `msvalidate.01` content 값 | `BING_SITE_VERIFICATION` |
| IndexNow | 직접 만든 키(8~128자 영문·숫자·대시). 예: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"` | `INDEXNOW_KEY` |

빌드 때 쓰이는 값이라 `turbo.json`의 빌드 `env`에 이미 들어 있다. 값을 넣은 뒤에는 재배포해야 반영된다.

## 3. 잠금 해제

1. `clipers-site`와 `clipers-app`에서 `PRELAUNCH_PASSWORD`를 지운다.
2. 두 프로젝트를 재배포한다(사이트의 `robots.txt`는 빌드 때 정해지므로 재배포가 꼭 필요하다).
3. 확인한다.
   - `https://<도메인>/robots.txt`: `Allow: /`, 봇 목록, `Sitemap:` 줄이 보인다
   - `https://<도메인>/`: 비밀번호 없이 열린다
   - `https://<도메인>/indexnow.txt`: 키가 보인다
   - `*.vercel.app` 주소의 응답 헤더에 `X-Robots-Tag: noindex`가 있다

## 4. 등록과 제출

1. 구글 서치콘솔: 속성 확인 → Sitemaps에 `https://<도메인>/sitemap.xml` 제출 → 홈, `/brands`, `/guides`, `/guides/short-form-marketing`을 URL 검사로 색인 요청.
2. 네이버 서치어드바이저: 사이트 등록·소유 확인 → 요청 → 사이트맵 제출(`/sitemap.xml`), RSS 제출(`/rss.xml`) → 웹페이지 수집 요청으로 홈과 `/guides` 요청.
3. 빙 웹마스터: 서치콘솔에서 가져오기 → 사이트맵 확인.
4. IndexNow 일괄 제출(네이버·빙 공유).
   ```bash
   NEXT_PUBLIC_SITE_URL=https://<도메인> INDEXNOW_KEY=<키> pnpm --filter @clipers/site indexnow
   ```
   "IndexNow answered 200(또는 202) for N URLs"가 나오면 끝. 새 가이드를 추가할 때마다 다시 실행한다.
5. Vercel `clipers-site` → Analytics → Enable(아직 안 켰다면).

## 5. 첫 측정 (출시 당일과 7일 뒤)

- `docs/marketing/ai-citation-prompts.md`의 질문 20개를 1회차로 기록한다.
- 서치콘솔·서치어드바이저에서 색인된 페이지 수를 적는다(첫 주에는 적은 게 정상이다).

## 6. 출시 뒤 정기 작업

| 주기 | 할 일 |
|---|---|
| 주간 | 서치콘솔·서치어드바이저 노출·클릭, 상위 검색어, 색인 오류 확인 |
| 월간 | AI 인용 측정, 가이드 경유 상담 문의(`inquiries.source_path`)와 브랜드 가입(`signup_attributions`) 집계 |
| 분기 | 비교·플랫폼·데이터 가이드의 출처를 다시 확인하고 `reviewed` 날짜 갱신, 바뀐 내용 수정 |
| 새 가이드 추가 시 | 테스트 통과 → 배포 → IndexNow 제출 |
