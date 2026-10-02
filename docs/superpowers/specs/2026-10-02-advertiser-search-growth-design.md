# 광고주 검색·AI 유입 고도화 설계 (SEO·AEO·GEO)

> 2026-10-02 확정. 대상: 마케팅 사이트(`apps/site`), 가이드 시스템(`apps/site/lib/guides`), 빌드 설정(`turbo.json`), 운영 문서(`docs/marketing`).
> 앞선 설계 `2026-10-01-creator-guides-aeo-design.md`, `2026-10-01-advertiser-aeo-design.md`의 틀(질문형 가이드, 인용용 한 줄 답, 확인된 사실만) 위에 쌓는다.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 공개 시점 | 출시 때 사이트와 앱을 함께 공개한다. 그전까지는 잠금(`PRELAUNCH_PASSWORD`) 유지. 이 작업은 출시 첫날 바로 수집·인용·측정되는 상태를 만드는 것이 목표 |
| 도메인 | 미정. 모든 주소는 `NEXT_PUBLIC_SITE_URL` 하나에서 나오게 유지하고, 고르는 기준은 출시 체크리스트에 적는다 |
| 우선 대상 | 광고주. 크리에이터 가이드는 공통 틀 개선만 받는다 |
| 콘텐츠 운영 | 출시 전에 한꺼번에 만든다. 지금처럼 코드 안의 데이터로 두고 품질 기준은 테스트로 지킨다 (CMS 없음) |
| 비교 페이지 | 방식 비교와 경쟁 서비스 실명 비교를 모두 만든다. 실명 비교 대상: 국내 인플루언서 마케팅 플랫폼, 국내 체험단 서비스, 해외 클리핑 플랫폼. 구체적인 서비스는 구현 때 공개 페이지를 조사해 회사 확인을 받는다. 출시 전 변호사 확인 [확인 필요] |
| 분석 | Vercel Web Analytics(쿠키 없음) + 구글 서치콘솔·네이버 서치어드바이저·빙 웹마스터. 구글 애널리틱스는 쓰지 않는다 |
| AI 수집 봇 | 검색·답변용과 학습용 모두 허용 |
| 방향 | 광고주 질문 지도 + 주제 묶음(A). 조합 페이지 대량 생성은 페이지마다 고유한 내용이 있을 때만(플랫폼 7개) |

**쓰지 않는 것** (기존 원칙 유지): 조회수 확인을 "화면 캡처"로 설명하는 표현(2026-10-02 회사 결정, 다른 플랫폼은 "운영팀이 영상에 표시된 조회수를 직접 확인"으로 쓴다), 브랜드 단가와 크리에이터 단가(광고주 쪽에 둘 다 보이면 수수료가 드러남), 지어낸 성과 수치·사례·고객사, 성과 보장, 확인되지 않은 기능, 음원을 쓰는 음악 캠페인이 지금 된다는 표현. **광고주용 예산 → 예상 조회수 계산기는 공개 페이지에 두지 않는다** (예산 ÷ 조회수로 브랜드 단가가 계산된다. 이 계산은 로그인한 브랜드의 캠페인 만들기 화면에만 있다).

## 2. 하위 프로젝트와 계획 분할

| 계획 | 범위 | 이 문서의 절 |
|---|---|---|
| P1 기반·AI 인용 구조 | 출시 스위치, 비운영 주소 noindex, 검색엔진 소유 확인, IndexNow, RSS, 분석, AI 봇 허용, `/about`, `llms-full.txt`, 구조화 데이터 확장, 기술 점검 | 3, 5 |
| P2 광고주 콘텐츠 | 가이드 데이터 확장, 새 페이지 약 21개, 기존 `clipping-marketing` 확장, `/guides` 재구성, 데이터 페이지 | 4, 5.4 |
| P3 운영 문서 | 출시 체크리스트, 외부 채널 운영안, AI 인용 측정 질문 목록 | 6 |

P1 → P2 → P3 순서. P2는 P1의 구조화 데이터·공통 틀 위에서 글만 더한다.

## 3. 기반 (P1)

### 3.1 출시 스위치와 비운영 주소
- 잠금 해제(`PRELAUNCH_PASSWORD` 삭제 + 두 앱 재배포)만으로 `robots.txt`·사이트맵·색인이 열린다. 지금 구조(`apps/site/app/robots.ts`, 미들웨어)를 그대로 쓴다.
- **비운영 주소 noindex**: 사이트 미들웨어가 요청 호스트를 `NEXT_PUBLIC_SITE_URL`의 호스트와 비교해, 다르면(`*.vercel.app`, 미리보기 배포) 응답에 `X-Robots-Tag: noindex`를 붙인다. 판정은 순수 함수(`isCanonicalHost(host, siteUrl)`)로 두고 테스트한다. 로컬(`localhost`)은 판정에서 제외해 개발을 방해하지 않는다.

### 3.2 검색엔진 소유 확인
- 환경변수 `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`을 루트 `metadata.verification`에 넣는다(구글은 `google`, 나머지는 `other`의 `naver-site-verification`, `msvalidate.01`). 값이 없으면 태그를 내지 않는다.
- 이 세 값은 빌드 때 메타데이터로 고정되므로 `turbo.json` 빌드 작업 `env`에 추가한다(2026-10-02 `PRELAUNCH_PASSWORD`가 빌드에서 빠졌던 문제의 재발 방지). 테스트로 "사이트가 읽는 서버 환경변수는 모두 `turbo.json`에 있다"를 검사한다(`apps/site`, `apps/app` 소스에서 `process.env.X`를 모아 `NEXT_PUBLIC_*` 제외 후 대조).
- 구글은 도메인 구매 후 DNS TXT 방식(도메인 속성)을 권장하고, 메타 태그는 대안으로 남긴다.

### 3.3 빠른 색인
- **IndexNow**: 환경변수 `INDEXNOW_KEY`(32자 16진수). `/indexnow.txt`가 키를 돌려준다(키가 없으면 404). 제출 스크립트 `pnpm --filter @clipers/site indexnow`가 사이트맵의 모든 주소를 `https://api.indexnow.org/indexnow`에 `keyLocation`과 함께 보낸다(네이버·빙이 공유). 잠금 중이면 실행을 거부한다. 순수 부분(주소 묶음, 요청 본문)은 테스트한다.
- **RSS** `/rss.xml`: 가이드 전체(제목, 주소, 설명, `updated`)를 최신순으로. 네이버 서치어드바이저 제출용. 형식은 RSS 2.0, 테스트로 필수 요소를 확인한다.

### 3.4 측정
- `@vercel/analytics`의 `<Analytics />`를 사이트 루트 레이아웃에만 둔다(앱은 비공개라 제외). 쿠키를 쓰지 않는다.
- Hobby 요금제에서는 사용자 정의 이벤트가 없으므로 전환은 기존 기록으로 본다: 상담 문의 `inquiries.source_path`, 가입 `signup_attributions.landing_path`·`utm_*`.
- 처리방침 초안에 🔸 한 줄: "홈페이지 방문 통계(방문 페이지, 유입 경로, 기기 종류)를 쿠키 없이 집계합니다(Vercel Web Analytics)." [확인 필요]

### 3.5 AI 수집 봇
`robots.ts` 공개 상태 규칙에 주요 봇을 명시적으로 허용한다(전체 허용 규칙과 같은 뜻이지만, 봇별 정책을 읽는 엔진을 위해 나열): `Googlebot`, `Bingbot`, `Yeti`(네이버), `Daumoa`, `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `Google-Extended`, `Applebot-Extended`. 잠금 중에는 지금처럼 전체 차단.

### 3.6 기술 점검 (P1 마지막 작업)
- 모든 공개 페이지: 고유한 `title`(60자 이하)과 `description`(60~160자), `canonical`, 공유 이미지. 테스트로 가이드 제목·설명 중복과 길이를 검사한다.
- `/brands`의 WebGL 히어로: 운영 빌드에서 Lighthouse로 LCP·CLS를 측정해 기록한다. LCP가 2.5초를 넘으면 측정값과 함께 회사에 알리고, 개선은 따로 설계한다. (2026-10-02 운영 측정: 모바일 LCP 3.2초·FCP 2.6초·TBT 440ms·CLS 0·점수 74, 데스크톱 LCP 1.0초·점수 97. LCP 요소는 히어로 제목 <h1>이고, 렌더 지연 2.1초의 주원인은 jsDelivr에서 받는 Pretendard CSS(렌더 차단 약 1.2초). WebGL 히어로 자체는 원인이 아님.)
- 이미지 `alt`, 탐색 경로(브레드크럼), 깨진 내부 링크(테스트: 가이드의 `related`·`links` 대상이 실제로 있는지).

## 4. 광고주 콘텐츠 (P2)

### 4.1 질문 지도
| 단계 | 대표 질문 | 페이지 | 새로 쓰는 수 |
|---|---|---|---|
| 인지 | 숏폼 마케팅 어떻게 해? / 클리핑 마케팅이 뭐야? | 중심 페이지 "숏폼 마케팅 가이드"(신규), 기존 `clipping-marketing`을 중심 페이지로 확장 | 1 (+확장 1) |
| 플랫폼 | 틱톡 마케팅 어떻게 해? | 유튜브 쇼츠, 틱톡, 인스타그램 릴스, 페이스북, X, 네이버 클립, 카카오 숏폼 마케팅 | 7 |
| 비교 | 인플루언서 마케팅이랑 뭐가 달라? / ○○랑 비교하면? | 방식 비교 3(인플루언서 섭외, 체험단, 숏폼 유료 광고) + 실명 비교 3~6 | 6~9 |
| 비용 | 숏폼 마케팅 비용 얼마야? | 방식별 비용 구조, 예산 정하는 법 | 2 |
| 실행·신뢰 | 브리프 어떻게 써? / 광고 표시 의무는? | 업종별 가이드 11 + 고민별 5(기존) + 브리프 작성법, 검수 기준, 광고 표시 의무 | 3 |
| 공통 | 용어 질문 | 용어집 1페이지 | 1 |
| 데이터 | 숏폼 얼마나 봐? | 국내 숏폼 이용 현황 (공공·공개 조사만, 5.4) | 1 |

새로 쓰는 페이지는 약 21~24개. 주소는 모두 `/guides/<slug>`(예: `/guides/short-form-marketing`, `/guides/tiktok-marketing`, `/guides/clipers-vs-<service>`, `/guides/glossary`). 기존 32개의 주소와 내용은 유지한다.

### 4.2 데이터 구조 확장 (`lib/guides/types.ts`)
- `GuideGroup`에 광고주용 `pillar`, `advertiser-platform`, `compare`, `cost`, `execution`, `glossary`, `data`를 더한다(크리에이터 `platform`과 구분).
- `Guide`에 추가:
  - `stage?: 'awareness' | 'platform' | 'compare' | 'cost' | 'execution'` — 광고주 가이드의 질문 지도 단계. 광고주 가이드는 필수(테스트).
  - `reviewed: string` — 마지막 사실 확인 날짜(ISO). 모든 가이드 필수. 화면에 "Clipers 운영팀 작성 · {reviewed} 확인"으로 보인다.
  - `sources?: { label: string; url: string; checked: string }[]` — 출처. `compare`·`data` 그룹은 1개 이상 필수.
  - `claims?: { text: string; source: number }[]` — 실명 비교에서 상대 서비스에 대한 주장. 각 주장은 `sources`의 번호를 가리킨다. `compare` 중 실명 비교는 필수, 출처 없는 주장은 테스트 실패.
  - `legalReviewed?: boolean` — 실명 비교 전용. 변호사 확인 전 `false`, 출시 체크리스트가 `false`인 페이지를 나열한다.
  - `terms?: { term: string; definition: string }[]` — 용어집 전용.
  - `rows?: { label: string; value: string; source: number }[]` — 데이터 페이지의 수치 표. 각 행은 출처 번호 필수.
- 기존 32개에 `reviewed`를 채운다(`updated`와 같은 값으로 시작).

### 4.3 공통 틀 (`components/guide-article.tsx`)
위에서 아래로: 브레드크럼 → 질문형 제목 → 인용용 답(`answer`) → 핵심 사실 표(서비스 숫자는 `@clipers/db`: `MIN_CAMPAIGN_BUDGET`, `REVIEW_SLA_OPTIONS`, 플랫폼 목록) → 본문 → 비교 표·용어·데이터 표(해당 그룹만) → FAQ → 출처와 확인 날짜 → "다음 질문" 링크(`related`, 같은 단계 다음 글 우선) → 상담 문의 버튼(광고주) / 가입 버튼(크리에이터). 크리에이터 가이드도 같은 틀을 쓴다(작성·검토 표시, 출처, 다음 질문).

### 4.4 `/guides` 목록
광고주 묶음을 질문 지도 단계 순서(인지 → 플랫폼 → 비교 → 비용 → 실행·신뢰 → 용어·데이터)로 다시 나눈다. 크리에이터 묶음은 그대로. `ItemList` 구조화 데이터.

### 4.5 품질 테스트 (`lib/guides/index.test.ts` 확장)
- 단가 금지: 1천 회당 금액 표현과 `DEFAULT_PRICING.brandCpm`·`creatorCpm`의 원 단위 문자열(크리에이터 가이드의 크리에이터 단가 예외는 기존 규칙 유지).
- 출처: `compare`·`data`는 `sources` 1개 이상, 모든 `claims`·`rows`가 유효한 출처 번호, 출처 `url`은 `https://`.
- 고유성: `slug`, `title`, `description` 중복 없음, 길이 규칙(3.6).
- 연결: `related`·`counterpart`·`links` 대상이 존재.
- 광고주 가이드는 `stage` 필수, 모든 가이드는 `reviewed` 필수.

### 4.6 실명 비교 원칙
- 상대 서비스가 **자기 공개 페이지에 직접 밝힌 내용**만, 출처 링크와 확인 날짜를 붙여 쓴다. 추측·평가 표현("비싸다", "느리다") 금지. 차이는 구조(과금 방식, 크리에이터 선정 방식, 조회수 검증 방식)로만 쓴다.
- 대상 서비스 목록은 구현 첫 단계에서 공개 페이지를 조사해 회사 확인을 받는다.
- 출시 전 변호사 확인 [확인 필요]. 확인 전까지 실명 비교 페이지는 사이트맵·목록에 넣되, 별도 플래그(`legalReviewed: false`)로 출시 체크리스트에 남긴다.

## 5. AI 인용 구조 (P1, 데이터 페이지는 P2)

### 5.1 회사 소개 `/about`
우리가 누구인지(국내 숏폼 클리핑 캠페인 플랫폼), 어떻게 돌아가는지(광고주 → 캠페인 → 크리에이터 → 검증 조회수 → 정산), 핵심 사실 표(최소 예산, 지원 플랫폼, 검수 시간, 조회수 검증 방식 — 모두 `@clipers/db` 값), 법인 정보(`COMPANY`), 연락처(상담 문의). `Organization` 구조화 데이터의 대표 페이지가 되고 루트 레이아웃의 `Organization`과 같은 `@id`를 쓴다. 공식 SNS가 생기면 `sameAs`에 넣을 자리를 `COMPANY`에 둔다(지금은 빈 배열). 푸터에 링크(상단 메뉴는 대상별 진입만 둔다).

### 5.2 `llms.txt` 확장과 `llms-full.txt`
- `llms.txt`: 광고주 섹션을 질문 지도 단계 순서로 다시 쓰고 새 페이지와 `/about`을 링크한다. 단가 비공개 원칙 유지. (광고주 섹션의 단계별 재구성은 P2에서 stage 필드를 만든 뒤 한다. P1은 /about·llms-full.txt 링크만 더한다.)
- `llms-full.txt`: 모든 가이드의 제목·답·본문·FAQ·출처를 마크다운 한 파일로. `revalidate` 1시간. 테스트: 단가 금지 규칙을 이 출력에도 적용.

### 5.3 구조화 데이터
| 위치 | 추가 |
|---|---|
| `/brands` | `Service`(서비스 범위·지역·제공자, 가격 없음) |
| 용어집 | `DefinedTermSet` + `DefinedTerm` |
| 모든 가이드 | `Article`(`author`·`publisher` = 회사, `dateModified` = `updated`), `BreadcrumbList` |
| `/guides` | `ItemList` |
| `/about` | `AboutPage` + `Organization` |

### 5.4 데이터 페이지 (P2)
"국내 숏폼 이용 현황": 정부·연구기관·공개 조사의 수치만, 행마다 출처와 조사 시점(`rows`). 지어낸 수치 금지. 출시 후 캠페인 데이터가 쌓이면 "Clipers 캠페인 리포트"를 같은 `data` 그룹으로 추가할 수 있게 둔다.

## 6. 운영 문서 (P3)
- `docs/marketing/launch-search-checklist.md`: 출시 당일 순서(도메인 연결 → `NEXT_PUBLIC_*_URL` 교체 → 소유 확인 값 입력 → 잠금 해제·재배포 → 서치콘솔·서치어드바이저·빙 등록과 사이트맵·RSS 제출 → IndexNow 일괄 제출 → AI 인용 1회차 측정), 실명 비교 변호사 확인 여부, 도메인 고르는 기준(`.com`과 `.co.kr` 비교, 짧고 발음 그대로, 브랜드명과 일치, 앱은 `app.` 하위 도메인).
- `docs/marketing/offsite-playbook.md`: 네이버 공식 블로그(가이드 요약 + 원문 링크), 마케터 커뮤니티(아이보스, 디스콰이엇), 유튜브(클리핑 예시 숏폼), 링크드인(B2B), 출시 보도자료. 채널별 주기와 담당. 회사 계정 활동의 광고 표시 원칙(추천·보증 심사지침).
- `docs/marketing/ai-citation-prompts.md`: 광고주 질문 20개와 기록 표(날짜, 엔진: ChatGPT·Perplexity·Gemini·네이버 AI 답변, Clipers 언급 여부, 인용된 주소).

## 7. 성공 지표
| 지표 | 출처 | 언제 |
|---|---|---|
| 색인된 페이지 수 | 서치콘솔, 서치어드바이저 | 출시 후 주간 |
| 검색 노출·클릭, 상위 검색어 | 같음 | 주간 |
| 방문과 유입 경로 | Vercel Web Analytics | 주간 |
| AI 답변 속 Clipers 언급 비율(20문항 중) | `ai-citation-prompts.md` | 월간 |
| 가이드 경유 상담 문의·브랜드 가입 | `inquiries.source_path`, `signup_attributions` | 월간 |

## 8. 범위 밖
CMS, 다국어, 구글 애널리틱스·광고 픽셀, 유료 검색 광고, 위키 문서 직접 작성, 크리에이터 대상 새 콘텐츠(공통 틀 개선만 받음), 공개 예산 계산기.
