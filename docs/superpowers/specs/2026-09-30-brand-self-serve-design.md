# Clipers — 브랜드 셀프서브: 캠페인 생성 + 예산 입금 확인 루프 설계

> 하위 프로젝트 순서 재조정 (2026-09-30): 기존에는 "1순위 파일럿 운영 도구 → 2순위 셀프서브 랜딩 → 3순위 본격 셀프서브 대시보드" 순으로 셀프서브를 뒤로 미뤄뒀으나, 완성형 플랫폼(브랜드/크리에이터/마켓플레이스/결제 전체)을 만드는 스타트업이라는 점을 재확인하고 브랜드 셀프서브를 앞당겨 착수한다. 3가지 남은 축(브랜드 셀프서브 / 크리에이터 마켓플레이스 디스커버리 / 결제·에스크로 자동화) 중 브랜드 셀프서브를 첫 순서로 정함 — 캠페인이 생성돼야 나머지 두 축(마켓플레이스에 노출할 캠페인, 정산할 예산)이 의미가 생기기 때문.

## 배경 / 스코프

지금까지는 캠페인이 운영팀의 수동 DB 등록으로만 생성됐다(`campaigns` 테이블에 직접 INSERT). 이 설계는 브랜드가 직접 가입해서 캠페인을 만들고, 예산을 입금하고, 운영자 확인을 거쳐 캠페인이 라이브로 전환되는 전체 루프를 다룬다.

**포함**: 브랜드 회원가입(역할 선택), 캠페인 생성 폼, 계좌이체 안내 + 입금완료 표시, 운영자의 입금 확인, 확인 시 자동 라이브 전환, 브랜드용 캠페인 현황 목록.

**제외 (다음 축으로 분리)**:
- PG/전자결제 자동화 — 스펙 4.4의 법적 검토(전자금융거래법 PG 등록 대상 여부) 선행 필요, 이 설계는 여전히 수동 계좌이체 + 상태 기록
- 크리에이터가 로그인 없이 캠페인을 "발견"하는 마켓플레이스 카드 그리드/캐러셀 화면(스펙 3.4) — `apps/site` 하위 프로젝트로 분리
- 캠페인 중도 수정(라이브 전환 후 예산/CPM 변경), 예산 추가 충전, 캠페인 조기 마감 브랜드 self-trigger — 이번 스코프에서는 다루지 않음(운영자가 필요 시 수동 개입)
- 매니지드 트랙 요청 폼 — 4순위, 별도 스펙

## Whop 벤치마킹 적용 범위 확인

Whop 실사용 확인 결과(2026-09-30 웹 조사): **예산 전액 선입금 후에만 라이브 전환**, 조회수 발생에 따른 단계적 예치가 아니다. 총예산을 충전하기 전까지 캠페인은 "Pending" 상태로 멤버(크리에이터)에게 노출되지 않고, 충전 즉시 라이브 전환 + 알림. Whop은 예치된 예산을 홀드하고 있다가 검증된 조회수만큼만 크리에이터에게 지급한다. 이 설계는 이 모델을 그대로 따르되 결제 수단만 카드/Cash App 등 대신 계좌이체+수동 확인으로 축소한다(스펙 4.4, PG 법률 검토 선행 필요).

벤치마킹은 두 레이어로 분리해서 적용한다:
- **디자인 토큰/레이아웃 그래머**(색상, 구분선, radius, 헤더+사이드바 셸) — 기존 `packages/ui/tokens.css`, `workspace-shell.tsx`를 그대로 재사용. 이 화면은 로그인 후 내부 워크스페이스이므로 admin/creator workspace와 동일한 테이블 기반 UI 문법을 따른다.
- **마켓플레이스 비주얼**(히어로 캐러셀, 카드 그리드+진행바, Top clips) — 이번 스코프에는 적용하지 않는다. `apps/site`(크리에이터가 로그인 없이 캠페인을 발견하는 화면) 하위 프로젝트에서 다룰 항목.

## 1. 데이터 모델 변경

**`profiles` 생성 트리거 변경** — 지금 `handle_new_user`는 무조건 `role='creator'`로 생성한다. 회원가입 시 브랜드를 선택할 수 있어야 하므로, `raw_user_meta_data->>'requested_role'` 값을 읽어 `'brand'` 또는 `'creator'`만 허용하고 그 외 값(특히 `'admin'`)은 전부 `'creator'`로 강제한다 — 클라이언트가 signUp 호출 시 임의로 admin을 요청해도 절대 부여되지 않도록 화이트리스트 방식으로 처리.

**`campaigns` RLS 강화** — 기존 `campaigns_brand_crud` 정책(`brand_id = auth.uid()`이면 모든 필드를 아무 때나 CRUD 가능)은 지금까지 실제 브랜드 사용자가 없어서 문제가 되지 않았지만, 이번에 실제 외부 사용자가 쓰게 되므로 다음으로 교체한다:
- INSERT: `brand_id = auth.uid() AND track = 'self_serve' AND status = 'draft'`만 허용
- UPDATE: `status = 'draft'`인 동안만 자유 수정 허용, 그리고 `draft → pending_escrow` 전환만 허용(다른 상태 전환은 금지). `live`/`closed` 등 이후 상태에서는 브랜드는 SELECT만 가능
- admin은 기존과 동일하게 전체 우회

**`campaign_escrow` 자동 생성** — 캠페인 INSERT 시 트리거(`prepare_campaign_creation`, SECURITY DEFINER)가 `campaign_escrow` 행을 `escrow_status = 'awaiting_manual_confirm'`으로 자동 생성한다. 브랜드는 이 테이블에 직접 쓰지 않는다(기존 `escrow_admin_insert`/`escrow_admin_update` 정책 유지).

**확인 시 자동 라이브 전환** — `campaign_escrow` UPDATE 트리거(`activate_campaign_on_escrow_confirmed`, SECURITY DEFINER)가 `escrow_status`가 `confirmed`로 바뀌는 순간 해당 `campaigns.status`를 `pending_escrow → live`로 전환한다.

## 2. UI

- `apps/app/app/brand/brand-workspace.tsx` 신설 — admin/creator workspace와 동일한 구조(`WorkspaceShell`에 `brand` role 케이스 추가)
- **캠페인 생성 폼**: 제목 / 콘텐츠타입(클리핑·UGC 라디오) / 카테고리 / 총예산 / CPM(1,000뷰당) / 허용 플랫폼(유튜브·틱톡·릴스 체크박스) / 클립당 지급 상한 / 검수 SLA 시간 — 스펙 4.1 필드 그대로, `campaigns` 테이블에 INSERT
- 생성 즉시 계좌이체 안내(계좌 정보는 환경변수 placeholder로 노출, 실제 계좌는 운영팀이 별도 관리) + 총예산 금액 표시 + "입금 완료했습니다" 버튼(누르면 `status: 'pending_escrow'`로 UPDATE)
- **캠페인 목록**: 브랜드 소유 캠페인만, 상태 배지(입금대기/입금확인중/라이브/마감) + 예산 소진율 바(관리자 화면의 `캠페인 현황` 섹션과 동일한 계산 로직 재사용, `brand_id` 필터만 다름)
- `login-form.tsx`에 회원가입 모드일 때 "크리에이터로 가입" / "브랜드로 가입" 선택 추가 → `signUp` 호출 시 `options.data.requested_role`로 전달

**운영자 화면 추가**: `admin-workspace.tsx`에 "입금 확인 대기" 섹션 추가 — `status='pending_escrow'`인 캠페인 목록 + "입금 확인" 버튼(누르면 `campaign_escrow.escrow_status = 'confirmed'`로 UPDATE, 트리거가 나머지 처리)

## 3. 에러 처리

- 캠페인 생성 폼 필드 검증(총예산>0, CPM>0, 클립당상한>0, 플랫폼 1개 이상)은 클라이언트에서 1차 처리, DB의 기존 `check` 제약(0001 마이그레이션에 이미 있음)이 최종 방어선
- RLS 정책이 상태 전환 순서(`draft→pending_escrow`만 허용 등)를 강제하므로 서비스 레이어의 별도 검증 함수는 만들지 않음(rejectClip.ts 패턴과 달리 이번엔 상태 전이가 단순해서 SQL 트리거+RLS로 충분)

## 4. 테스트

- 이번 설계는 새로운 순수 계산 로직이 없음(상태 전이는 SQL 트리거로 처리) — `packages/db`에 추가 테스트 없음
- 신규 마이그레이션은 기존과 동일하게 SQL 문법 검증 + `pnpm turbo run build`로 타입 체크
- 수동 확인 시나리오: 브랜드 가입→캠페인 생성→입금완료 클릭→운영자 확인→캠페인이 크리에이터 워크스페이스의 "지원 가능한 캠페인" 목록에 뜨는지 확인

## 다음 하위 프로젝트

이 설계 승인 후 구현 계획(writing-plans)으로 진행. 이후 순서: 크리에이터 마켓플레이스 디스커버리(`apps/site`, 로그인 없이 캠페인 발견) → 결제/에스크로 자동화(PG 연동, 법률 검토 선행) → 매니지드 트랙 전용 UI.
