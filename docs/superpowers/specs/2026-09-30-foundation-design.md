# Clipers — 공통 기반(Foundation) 설계

> 하위 프로젝트 1/6. `clipping-platform-spec.md`에서 정의한 완성형 플랫폼을 여러 독립 하위 프로젝트로 분해한 것 중 가장 먼저 착수하는 공통 기반. 이 위에 운영 어드민 도구, 마케팅/마켓플레이스 사이트, 브랜드 셀프서브 대시보드, 크리에이터 앱, 매니지드 트랙 UI가 순서대로 올라간다.

## 배경 / 스코프

`clipping-platform-spec.md`는 원래 MVP(파일럿 운영 도구)만 먼저 만들 것을 권장했으나, 완성형 플랫폼 개발에 착수하기로 결정됨에 따라 전체 시스템이 공유할 기반(저장소 구조, 데이터 모델, 인증/권한, 디자인 토큰, 비즈니스 로직 배치, 테스트 전략)을 먼저 확정한다. 이 스펙은 화면/기능이 아니라 **인프라/구조**를 다룬다 — 실제 화면 설계는 각 하위 프로젝트 스펙에서 진행.

## 1. 저장소/프로젝트 구조

pnpm + Turborepo 모노레포.

```
clipers/
├── apps/
│   ├── site/          # 마케팅/마켓플레이스 (공개, GEO/AEO 대상, 별도 도메인 배포)
│   └── app/            # 브랜드·크리에이터·운영자 (로그인 필요)
│       ├── (brand)/
│       ├── (creator)/
│       └── (admin)/
├── packages/
│   ├── ui/              # 디자인 토큰 + 공유 컴포넌트
│   ├── db/               # Supabase 클라이언트, DB 타입, 비즈니스 로직 서비스 함수
│   └── config/            # 공유 eslint/tsconfig
└── supabase/              # 마이그레이션, RLS 정책
```

- `apps/site`와 `apps/app`은 별개 도메인으로 배포(예: `clipers.com` / `app.clipers.com`), `packages/ui`를 공통 참조해 디자인 이탈 방지.
- `apps/site`는 여러 진입 경로를 가진다: 회사소개, 크리에이터용 히어로, 광고주용 히어로 등(상세 라우팅은 마케팅 사이트 하위 프로젝트 스펙에서 결정).

## 2. 데이터 모델 (Supabase Postgres)

**사용자/인증**
- `profiles` — `id`(auth.users 참조), `role`(`brand` | `creator` | `admin`), `display_name`, `created_at`
- 소셜로그인: 구글/카카오는 Supabase 내장 OAuth 프로바이더, 네이버는 Edge Function 기반 커스텀 OAuth 흐름 구현 필요

**캠페인 도메인**
- `campaigns` — `id`, `brand_id`, `track`(`managed` | `self_serve`), `title`, `content_type`(`clipping` | `ugc`), `category`, `total_budget`, `cpm_rate`, `per_clip_cap`, `review_sla_hours`, `allowed_platforms`(배열), `status`(`draft` | `pending_escrow` | `pending_managed_review` | `live` | `paused` | `closed`)
- `campaign_escrow` — `campaign_id`, `escrow_status`(`awaiting_manual_confirm` | `confirmed` | `pg_pending` — 향후 PG 연동 확장용), `confirmed_by`, `confirmed_at`

**크리에이터/제출물**
- `campaign_applications` — `campaign_id`, `creator_id`, `status`(`applied` | `approved` | `rejected`)
- `clips` — `id`, `campaign_id`, `creator_id`, `platform`, `url`, `status`(`pending_review` | `approved` | `rejected`), `rejection_reason`, `submitted_at`, `sla_deadline`
- `view_snapshots` — `clip_id`, `view_count`, `captured_at`

**정산**
- `settlements` — `creator_id`, `campaign_id`, `clip_id`, `amount`, `status`(`pending` | `requested` | `paid`), `period`

스키마는 Supabase 마이그레이션 단위로 관리하며 이후 자유롭게 확장/수정 가능.

## 3. 인증/권한(RLS) 및 트랙 분기 로직

- Supabase RLS로 역할별 테이블 접근 제어: `brand`는 자기 `campaigns`만, `creator`는 자기 `clips`/`campaign_applications`만, `admin`은 전체
- `apps/app` 미들웨어가 세션 `role`을 읽어 `(brand)`/`(creator)`/`(admin)` 라우트 그룹 접근을 서버 단에서 차단
- 트랙 분기: `track='self_serve' AND status='live'`만 마켓플레이스 피드 노출. `track='managed'`는 피드 쿼리에서 항상 제외되고, RLS로도 이중 차단(크리에이터는 초대된 매니지드 캠페인만 조회 가능) — 프론트/DB 양쪽에서 강제하는 이중 방어

## 4. 디자인 토큰 패키지 (`packages/ui`)

- `clipping-platform-spec.md` 2장에 실측된 값(색상 hex, 0.8px 구분선, 8px radius, 아바타 스택 겹침 등)을 근사치가 아니라 그대로 코드화
- 스펙 7장에 명시된 미조사 항목(카드 내부 padding/radius 정확값, 프로그레스 바 정확 hex)은 임의로 채우지 않고 재조사 태스크로 남김
- 레이아웃 패턴(히어로 캐러셀, 카드 그리드, 탭 구조, 아바타 스택 오버랩 등 스펙 3장 전체)은 구조적으로 최대한 근접하게 재현
- Whop의 로고·브랜드명·실제 이미지 자산·카피 문구는 사용하지 않음 — 레이아웃/컬러/타이포 같은 기능적 UI 패턴만 벤치마킹, Clipers 고유 콘텐츠로 대체 (경쟁사 UI 패턴 벤치마킹은 통상적 관행이나, 로고/상표/저작물 복제는 별개 문제이므로 구분)
- 상태색(포지티브)은 브랜드색(민트)과 구분되는 별도 톤(앰버/옐로우 계열)으로 분리

## 5. 비즈니스 로직 배치 & 에러 처리

- 핵심 비즈니스 로직(예산 소진 계산, SLA 마감시간 계산, 트랙별 노출 여부)은 `packages/db`의 서비스 함수로 구현 — Supabase는 저장소 + RLS 보안 경계, 로직은 앱 레이어. `site`/`app` 양쪽이 재사용
- 에러 처리: 서비스 레이어에서 타입화된 에러(`{ ok: false, code, message }`)로 감싸 반환, API 라우트/서버 액션이 사용자 메시지로 매핑
- 반려(rejection) 액션은 `rejection_reason` 없이는 서비스 레이어에서 거부되도록 강제 — 스펙 4.2의 "반려 사유 명시 필수" 요구사항 반영

## 6. 테스트 전략

- 단위 테스트(Vitest): `packages/db`의 계산 로직(예산 소진율, SLA 마감시간, 정산 금액) 우선 커버 — 금액 관련 로직이라 최우선
- e2e(Playwright): 파운데이션 단계는 셋업만, 실제 시나리오 테스트는 각 하위 프로젝트 구현 시점에 추가
- CI에서 두 테스트 자동 실행

## GEO/AEO, 디자인 품질 요구사항의 위치

이 문서는 인프라 설계이므로 GEO/AEO 최적화(구조화 데이터, 메타데이터, 정적 생성 전략)와 화면 단위 디자인 품질("바이브코딩처럼 보이지 않기")은 **마케팅/마켓플레이스 사이트** 하위 프로젝트 스펙에서 상세히 다룬다. 단, 이 문서의 4번(디자인 토큰) 결정이 그 하위 프로젝트의 시각적 기반이 된다.

## 다음 하위 프로젝트

이 설계 승인 후 구현 계획(writing-plans)으로 진행. 이후 순서: 운영 어드민 도구 → 마케팅/마켓플레이스 사이트(GEO/AEO) → 브랜드 셀프서브 대시보드 → 크리에이터 앱 → 매니지드 트랙 전용 UI.
