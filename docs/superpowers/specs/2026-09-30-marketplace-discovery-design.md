# Clipers — 크리에이터 마켓플레이스 디스커버리 + 캠페인 상세 설계

> 하위 프로젝트: 브랜드 셀프서브(완료) 다음 순서. 스펙 3.4(Whop 실측)와 사용자 제공 스크린샷(캠페인 상세 페이지: 배너/플랫폼별 정산표/예산현황/리더보드/조회수 차트)을 근거로 함. Whop의 Content Rewards 자체 소스코드는 비공개(GitHub 조사 완료, `whopio`/`contentrewards` 조직 모두 관련 코드 없음) — 실측 스크린샷과 `frosted-ui`(공식 디자인 토큰, 별도 확인 완료)가 유일한 신뢰 가능 레퍼런스.

## 배경 / 스코프

지금까지 캠페인은 생성만 가능했고(브랜드 셀프서브), 크리에이터가 로그인 없이 캠페인을 발견하는 화면이 없었다. 이 설계는 `apps/site`에 공개 마켓플레이스(디스커버리 그리드 + 캠페인 상세 페이지)를 추가한다.

**포함**: 플랫폼별 CPM 데이터 모델 전환, 캠페인 배너 이미지 업로드, 디스커버리 그리드(히어로+카드+Top clips+키워드검색), 캠페인 상세 페이지(정산표+예산+요구사항+리더보드+조회수 차트), 필요한 공개 RLS 확장.

**제외**: 실제 AI 자연어 검색(키워드 필터로 대체), 참여자 수 공개는 포함하되 별도 소셜 기능(팔로우 등)은 없음, PG/에스크로 자동화(별도 하위 프로젝트), Facebook/X/네이버클립/카카오쇼츠의 조회수 자동 수집(공식 API 미확인 — 전부 기존 수동신고 경로로 처리).

## 1. 데이터 모델 변경

**플랫폼 확장**: `allowed_platforms`에 담기는 값 집합을 7개로 확정 — `youtube_shorts`, `tiktok`, `instagram_reels`, `facebook`, `x`, `naver_clip`, `kakao_shorts`. 스키마 변경 없음(이미 `text[]`).

**`campaign_platform_rates` 신설** (캠페인당 플랫폼별 CPM/지급액):
```sql
create table campaign_platform_rates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  platform text not null,
  cpm_rate numeric(10,2) not null check (cpm_rate > 0),
  min_payout numeric(12,2) not null check (min_payout >= 0),
  max_payout numeric(12,2) not null check (max_payout >= min_payout),
  unique (campaign_id, platform)
);
```

**`campaigns` 컬럼 변경**: 기존 `cpm_rate`, `per_clip_cap`(단일값) 컬럼 제거 — `campaign_platform_rates`로 완전히 대체(이중 소스 방지). 추가: `cover_image_url text`, `content_requirements text`, `reference_url text` (전부 nullable).

**핵심 로직 재계산 방식 변경**: `packages/db/src/services/settlement.ts`/`budget.ts`가 지금은 캠페인당 단일 `cpmRate`/`perClipCap`을 받는데, 클립의 `platform` 필드로 해당 플랫폼 행을 찾아 요율을 적용하도록 시그니처 변경. 클립당 상한(`perClipCap` 역할)은 `max_payout`이 대체.

**Storage**: `campaign-banners` 버킷(public-read) 신설. 업로드 경로 `<brand_id>/<campaign_id>`로 제한, RLS로 본인 폴더만 쓰기 가능.

## 2. 신규 공개(RLS) 노출 범위

전부 `campaigns.track = 'self_serve' AND campaigns.status = 'live'` 조건에 한정:
- `campaign_platform_rates`: 공개 SELECT (상세 페이지 정산표용)
- `campaigns`: 이미 공개 정책 있음(변경 없음)
- `campaign_applications`: 공개 SELECT를 카운트 용도로 허용(참여자 수 배지)
- `settlements`: 공개 SELECT — 크리에이터별 합산 후 리더보드 표시용. Whop도 실제로 크리에이터명+수익을 공개 노출하므로 의도된 공개
- `view_snapshots`: 공개 SELECT — 일별 누적 조회수 차트, Top clips 순위용
- Storage `campaign-banners` 객체: 공개 읽기

## 3. UI — 캠페인 상세 페이지 (`apps/site/app/campaigns/[id]/page.tsx`)

- 배너 이미지(없으면 기본 placeholder) + 브랜드명 + 제목 + 설명
- 상태 배지(모집중/마감) + 허용 플랫폼 아이콘/라벨 + 참여자 수 + "지원하기"(미로그인 시 `app.clipers.com/login?next=/creator`로 이동)
- **플랫폼별 정산표**: 플랫폼 | 1,000뷰당 | 최소지급 | 최대지급 (campaign_platform_rates 그대로 렌더)
- **예산 카드**: 총예산 / 소진액 / 잔여액 + 소진율 바(기존 계산 로직 재사용)
- **Content requirements**(자유텍스트), **Reference materials**(참고 링크 단일 필드, 있을 때만 노출)
- **리더보드**: 해당 캠페인 `settlements`를 `creator_id`로 합산 → 내림차순 상위 3명, 금/은/동 표기 + 크리에이터명 + 합산액. 평균 수익 문구(`전체 합계 / 참여 크리에이터 수`)
- **누적 조회수 차트**: `view_snapshots`를 클립별 최신값 기준 날짜별로 롤업해 누적 합계 라인차트. Views/Submissions 토글(Submissions는 날짜별 누적 클립 제출 건수)

## 4. UI — 디스커버리 그리드 (`apps/site/app/page.tsx` 또는 `/discover`)

(이전 설계 확정 사항 그대로) 히어로 캐러셀(예산 상위 5개 라이브 캠페인) + 카드 그리드(전체 라이브 캠페인, 클릭 시 상세 페이지로 이동) + 키워드 검색(제목/카테고리 텍스트 매칭) + Top clips 섹션(승인 클립 최신 조회수 상위, 유튜브만 썸네일 지원) + 사이드바(실제 존재하는 항목만: 홈/Discover/크리에이터 안내/브랜드 안내/로그인).

카드의 CPM 배지는 플랫폼별 요율이 다르므로 해당 캠페인의 `campaign_platform_rates` 중 최소~최대 범위로 표시(예: "₩1~2 / 1,000뷰"). 단일 값이면 그 값만 표시.

## 5. 영향받는 기존 코드 (플랫폼별 CPM 전환으로 인한 변경)

- `packages/db/src/services/settlement.ts`, `budget.ts` + 각 테스트 — 시그니처 변경(campaignBudget/perClipCap 단일값 → platform 기준 조회)
- `apps/app/app/brand/brand-workspace.tsx` — `PLATFORM_OPTIONS` 상수를 7개로 확장, 캠페인 생성 폼에 플랫폼별 CPM/최소/최대 입력 UI(선택된 플랫폼마다 동적으로 입력 행 추가), 배너 이미지 업로드 input 추가
- `apps/app/app/creator/creator-workspace.tsx` — 단일 CPM 표시 → 플랫폼별 표
- `apps/app/app/admin/admin-workspace.tsx`, `settlement-panel.tsx` — 정산 생성 로직이 플랫폼별 요율 조회하도록 수정

## 6. 테스트

- `settlement.ts`/`budget.ts` 기존 테스트를 플랫폼별 요율 기준으로 재작성(TDD, 실패 확인 후 구현)
- 신규 순수 함수: 일별 조회수 롤업 계산, 리더보드 랭킹 계산 — `packages/db`에 순수 함수로 구현 후 단위 테스트(UI가 직접 집계하지 않고 재사용 가능하게)
- 마이그레이션은 기존과 동일하게 SQL 문법 확인 후 MCP로 적용

## 다음 하위 프로젝트

이 설계 완료 후: 결제/에스크로 자동화(PG 연동, 법률 검토 선행) → 매니지드 트랙 전용 UI.
