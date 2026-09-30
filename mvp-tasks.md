# MVP 1순위 작업 목록 — 파일럿 캠페인 운영 도구

> `clipping-platform-spec.md` 6장(개발 우선순위) 기준. 이 문서는 1순위 스코프만 다룬다: 조회수 트래킹 대시보드 / 정산 자동화 / 크리에이터 지원서+검수 워크플로우. 2~4순위(셀프서브 랜딩, 본격 대시보드, 매니지드 전용 UI)는 범위 밖.

## 전제 / 스코프 경계

- 이 단계는 "완성형 플랫폼"이 아니라 **파일럿 캠페인 1~N개를 운영팀이 돌리기 위한 내부 도구**. 셀프서브 가입/캠페인 개설 UI는 만들지 않는다(캠페인은 운영팀이 수동으로 등록).
- 크리에이터용 화면은 최소 기능(지원서 제출, 클립 URL 제출, 대시보드 조회)만.
- 결제/에스크로 자동화(4.4의 법적 확인 필요 항목)는 이 단계에서 자동화하지 않음 — 수동 계좌이체 + 상태 기록으로 대체.

---

## A. 조회수 트래킹 대시보드

- [x] 데이터 모델 설계: 캠페인 / 크리에이터 / 제출 클립(URL, 플랫폼, 상태) / 조회수 스냅샷(시계열) (`supabase/migrations/0001_init.sql` 등)
- [x] 유튜브 Data API 연동 (API 키 기준 공개 조회수 수집) (`packages/db/src/services/youtubeViews.ts` + `/api/cron/youtube-views`)
- [x] 틱톡·릴스 조회수 수집 방식 확정 → **2026-09-30 결정: 공식 API 없이 우회(비공식 스크래핑)는 하지 않음.** 틱톡 Display API·인스타 Graph API 모두 "크리에이터 본인이 OAuth로 앱을 연동해야만" 조회수 조회 가능(공개 URL 임의 조회 불가), 승인도 각각 2~6주/4~6주 소요. 파일럿 기간엔 **크리에이터 자진 신고(스크린샷 증빙) + 운영자 스팟체크**로 대체 구현 완료(`packages/db/src/services/manualViewReport.ts`, `supabase/migrations/0007_manual_view_reports.sql`, 크리에이터/운영자 화면). 사업자 계정으로 정식 심사는 별도 병행 신청 필요(코드 밖 작업)
- [x] 조회수 폴링 스케줄러 (예: 1일 N회 배치) — 실시간 요구사항 여부 재확인 → 유튜브 1일 1회 GitHub Actions 배치(`youtube-view-snapshots.yml`)로 구현. SLA 에스컬레이션도 동일 방식으로 시간당 배치 추가(`sla-escalations.yml`) — 기존엔 크론 엔드포인트만 있고 아무것도 호출하지 않던 상태였음
- [x] 예산 소진 계산 로직: 클립별 확정 조회수 × CPM 단가 누적 → 캠페인 총예산 대비 소진율 (`packages/db/src/services/settlement.ts`)
- [x] 클립당 지급 상한 적용 로직 (스펙 4.1 자체 추가 요구사항) (`settlement.ts`의 `perClipCap` 처리)
- [x] 예산 소진 시 캠페인 자동 마감 트리거 (`packages/db/src/services/campaignClosure.ts`, `settlement-panel.tsx`에서 정산 생성 직후 호출)
- [x] 이상 트래픽 플래그 로직 — 최소 기준 정의 필요(스파이크 임계값, 지역 편중 기준 등은 별도 결정 필요) → `packages/db/src/services/anomalyDetection.ts`에 1시간/3배·5만뷰 임계값의 **잠정 기본값**으로 1차 구현. 실제 임계값은 실사용 데이터로 재조정 필요, 지역 편중 로직은 아직 없음(플랫폼 API가 지역별 데이터를 제공하지 않아 A섹션의 OAuth 연동 이후 착수)
- [x] 운영자용 대시보드 화면: 캠페인별 소진율 / 클립별 조회수 추이 / 플래그된 클립 목록 → "캠페인 현황"(소진율 바) + "이상 트래픽 플래그" 섹션으로 구현(`admin-workspace.tsx`). 클립별 조회수 추이(시계열 그래프)는 아직 없음 — 스냅샷 raw 데이터는 있으니 필요 시 차트만 추가하면 됨
- [x] 크리에이터용 대시보드 화면: 본인 클립 조회수 · 정산대기금 · 누적 수익 → 상단 요약 통계 타일로 구현(`creator-workspace.tsx`)

**미결정 사항 (착수 전 확인 필요)**
- 조회수 갱신 주기(실시간 vs 배치) — 인프라 비용과 직결되므로 초기 결정 필요. 현재 유튜브는 24시간 주기 배치(`REFRESH_WINDOW_HOURS`), 틱톡/릴스는 크리에이터가 신고하는 시점 기준(수동)

---

## B. 정산 자동화 (수동 엑셀 대체)

- [x] 정산 대상 산출: 검증 완료(승인된) 클립 × 확정 조회수 × CPM → 크리에이터별 정산 금액 자동 계산 (`settlement.ts` `calculateWeeklySettlementDrafts` + `settlement-panel.tsx`)
- [x] 정산 주기 확정 — 스펙 4.4에서 "주간 또는 실시간" 미결정, 파일럿 단계는 주간으로 우선 고정 권장 → 주간 고정으로 구현 (`getPreviousWeekPeriod`, 한국시간 기준)
- [x] 정산 대기/완료 상태 관리 (대기중 → 정산요청 → 지급완료) (`settlements.status` pending/requested/paid + 크리에이터/운영자 화면 전이 버튼)
- [x] 크리에이터별 정산 내역 리포트(엑셀/CSV 내보내기) — 완전 자동 이체 전 단계이므로 운영자가 내보내서 수동 이체 처리 (`settlement-panel.tsx` `exportCreatorCsv`)
- [x] 지급 처리 후 상태 업데이트 UI (운영자가 이체 완료 체크) (`settlement-panel.tsx` `markPaid`)
- [x] 원천징수 관련 필드 placeholder만 확보 (세무 처리 로직은 법적 확인 후 별도 작업으로 분리 — 스펙 4.4 참고) (`settlements.withholding_amount` 컬럼, 항상 0으로 기록)

**미결정/보류 사항**
- 전자금융거래법상 PG 등록 대상 여부 — 실제 계좌 자동이체 자동화 전에 법률 검토 필요, 파일럿 단계는 수동 이체로 우회
- 세무 처리(사업소득 원천징수) — 국세청 확인 후 반영, 1순위 스코프에서는 데이터 필드만 준비

---

## C. 크리에이터 지원서 + 검수 워크플로우

- [x] 크리에이터 지원서 폼 (캠페인별 또는 플랫폼 공통 — 파일럿 규모 기준 결정 필요, 소규모면 캠페인별 구글폼 대체도 검토) → 플랫폼 공통 인앱 폼으로 구현 (`creator-workspace.tsx` `applyToCampaign`, `campaign_applications` 테이블)
- [x] 클립 제출 폼: 게시된 URL 제출 방식 (파일 업로드 아님, 스펙 4.2 확인) (`creator-workspace.tsx` `submitClip`)
- [x] 검수 SLA 필드: 캠페인 생성 시 설정한 SLA 시간 저장 (`campaigns.review_sla_hours` → `clips.sla_deadline` 트리거로 자동 계산)
- [x] 검수 대기열 화면 (운영자용): 제출된 클립 목록, 승인/반려 버튼 (`admin-workspace.tsx`)
- [x] 반려 시 사유 입력 필수 처리 (스펙 4.2 — Whop의 "사유 불투명" 불만 대응) (`admin-workspace.tsx` 반려 사유 필수 입력 + `clips_rejection_reason_required` DB 제약)
- [x] SLA 초과 자동 에스컬레이션 알림 (Whop에 없는 차별화 기능 — 스펙 4.2) (`packages/db/src/services/escalation.ts` + `/api/cron/sla-escalations`)
- [x] 승인된 클립만 조회수 트래킹(A 섹션) 대상으로 편입되도록 연결 (`youtube-views` 크론이 승인된 클립만 대상으로 조회수 수집)
- [x] 이의제기 프로세스: 자동 판정(이상 트래픽 플래그 등)에 대한 이의 제기 창구 + 사람 검토 경로 (최소: 문의 폼 + 운영자 처리 화면) → `packages/db/src/services/dispute.ts` + `supabase/migrations/0006_clip_disputes.sql` + 크리에이터 화면 이의제기 폼 / 운영자 화면 처리 큐로 1차 구현

**결정 완료 (2026-09-30)**
- 지원서 심사 기준 → **셀프서브도 심사 있음.** 스펙 4.2의 "셀프서브는 심사 없음, 즉시 참여"는 이 파일럿에는 적용하지 않기로 결정. 현재 구현(`admin-workspace.tsx` 지원서 승인/반려 큐, `campaign_applications.status` applied→approved/rejected)이 이미 이 결정과 일치하므로 코드 변경 없음
- 알림 채널 → **슬랙.** `/api/cron/sla-escalations`가 SLA 초과 시 `packages/db/src/services/slackNotifier.ts`로 슬랙 웹훅에 메시지 전송(캠페인/크리에이터/마감시각/클립 URL 포함). `SLACK_WEBHOOK_URL` 환경변수 설정 필요(`.env.example` 참고) — 미설정 시 DB 플래그만 기록되고 알림은 조용히 스킵

---

## 착수 순서 제안

1. 데이터 모델(캠페인/크리에이터/클립/정산) 확정 — A/B/C 전체의 기반
2. C: 지원서 + 클립 제출 + 검수 워크플로우 (데이터가 없으면 A/B가 동작 못 함)
3. A: 유튜브 API 연동부터 우선 (틱톡/릴스는 API 접근 확보 확인 후 순차 추가)
4. B: 정산 계산 로직 + 리포트 내보내기 (A의 확정 조회수 데이터에 의존)

## 이 문서에서 다루지 않은 것 (2~4순위, 범위 밖)

- 셀프서브 랜딩 페이지 / 캠페인 개설 신청폼 (2순위)
- 브랜드용 셀프서브 대시보드, 캠페인 마켓플레이스 UI (3순위)
- 매니지드 트랙 전용 UI, 유출 방지 기술 레이어 (4순위)
