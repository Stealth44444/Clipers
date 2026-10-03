# 작업판

> 여러 Claude 세션이 같은 저장소(main)와 같은 운영 DB를 함께 쓴다. 이 표 하나로 누가 무엇을 하는지, 무엇이 배포·적용을 기다리는지 본다.
> 각 세션은 작업을 시작할 때, 끝낼 때, DB에 적용할 때, 배포를 기다리게 될 때 **자기 줄만** 고치고 이 파일만 커밋한다.
> 마지막 갱신: 2026-10-03 (clipers-0b, 배포 확인 뒤)

## 규칙

- **push = 운영 배포.** main에 push하면 Vercel이 앱·사이트를 배포한다. 모든 세션의 커밋이 함께 나가므로 push는 사용자가 요청할 때만 한다.
- **커밋은 내 파일만.** `git commit -m … -- <파일들>`. 여러 세션이 함께 고치는 파일(`packages/db/src/index.ts`, `packages/ui/src/styles/components.css` 등)은 `git diff`로 내 줄만 들어가는지 확인한다.
- **DB를 먼저, 앱을 나중에.** 새 칸·표를 읽는 앱 코드는 마이그레이션을 운영 DB에 적용한 뒤 배포한다. 적용하지 않은 마이그레이션은 아래 표에 적는다.

## 세션별 작업

| 세션 | 맡은 일 | 상태 | 문서 | 메모 |
|---|---|---|---|---|
| clipers-0b | 클립 부정 방지: 캠페인 공개 이후 게시물만, 계정 인증 필수, 삭제·비공개 감지 후 정산 중단, 온보딩 만 19세 확인 | **완료** · DB 적용 · `e1b7e3e`로 배포(2026-10-03) · 실제 DB에서 제출 규칙과 조회수 수집(200) 확인 | `specs/2026-10-03-clip-fraud-guards-design.md`, `plans/2026-10-03-clip-fraud-guards.md` | 정책 4건 2026-10-03 회사 결정(구현 그대로). 변호사 확인만 남음 |
| clipers-8a | 알림(앱 안·메일), 예산 증액, Resend 메일 | **완료** · 알림·예산 증액 DB 적용 · 앱 배포됨(origin/main에 포함) · Resend 연결은 clipers-f1이 마침 | `specs/2026-10-03-notifications-design.md`, `specs/2026-10-03-budget-topup-design.md` | 이 작업은 이제 clipers-a1(같은 대화)이 이어서 봄 |
| clipers-a1 | 틱톡·인스타 OAuth 계정 연결, 조회수 자동 수집 | 코드 커밋 완료(로컬, push 전) · 마이그레이션 2개 **미적용** · 키 없으면 연결 버튼이 숨겨져 배포해도 안전 | `specs/2026-10-03-social-oauth-views-design.md` | 틱톡·릴스 제출은 서버 액션(`submit-social-clip-action.ts`)으로 바뀜. 연결 없으면 기존 수동 규칙 그대로 |
| clipers-f1 | Resend 메일 연결(완료), 알림 메일 디자인 개편, 활동 알림 메일 끄기 설정 | 구현·커밋 완료(`0a4379e`, `70f1efb`) · 마이그레이션 `notification_email_preferences` **운영 적용 완료** · 앱 **배포 대기** | `specs/2026-10-03-notifications-design.md` | 돈 관련 알림 메일은 항상 보냄. 메일 로고는 `app.clipers.site/logo/clipers-wordmark-email*.png`(출시 전 잠금에서 이 두 파일만 열어 둠). a1 요청으로 `connection_expired` 문구 추가 |

## 적용·배포를 기다리는 것

| 항목 | 기다리는 것 | 담당 |
|---|---|---|
| ~~origin/main 이후 커밋~~ | 완료: `e1b7e3e`까지 push·배포(앱·사이트 READY) | — |
| ~~`supabase/migrations/20261003160000_notification_email_cron.sql`~~ | 완료: `ea6eec1` 배포 뒤 운영 DB 적용, 5분마다 200 응답 확인 | clipers-f1 |
| `supabase/migrations/social_connections.sql` (버전 미정) | 운영 DB 적용(검증 SQL 실행 → 적용). 키를 넣기 전에만 적용하면 됨 | clipers-a1 · 사용자(SQL 편집기) |
| `supabase/migrations/social_views_cron.sql` (버전 미정) | `/api/cron/social-views`가 배포된 뒤 적용 | clipers-a1 |
| 틱톡·Meta 개발자 앱 | 앱 등록·심사 후 `TIKTOK_CLIENT_KEY`·`TIKTOK_CLIENT_SECRET`·`INSTAGRAM_APP_ID`·`INSTAGRAM_APP_SECRET`를 clipers-app에 등록 | 사용자 |
| Resend `clipers.site` 도메인 | DNS·인증·`RESEND_API_KEY`·`EMAIL_FROM`(clipers-app)은 완료(테스트 메일 받은편지함 도착). 남은 것: Supabase 인증 메일(SMTP) 연결 | 사용자 |

## 사용자가 할 일

1. ~~push~~ — 완료(`e1b7e3e`).
2. **화면 확인(선택)** — 제출 규칙은 실제 DB에서 확인함. 화면만 남음: 크리에이터 설정 '내 채널'에서 유튜브 채널 등록·'인증 확인', 운영자 '계정 인증', 클립 검수 확인 항목 두 개, 새 계정 온보딩의 '만 19세 이상' 스위치.
3. ~~부정 방지 정책~~ — 2026-10-03 결정 완료(공개 이후·인증 계정만, 확인한 주부터 제외, 운영팀 확인 후 재개, 인증 정보는 탈퇴 시까지). 변호사 검토 9번에 포함.
4. **출시 전** — 검색엔진 소유 확인 값 등록, 변호사 검토(`docs/legal/README.md` 1~9번), Supabase 인증 메일(SMTP)을 Resend로 연결, GitHub 저장소 비공개 전환(2026-10-03 확인 시 공개 상태), 출시 당일 잠금 해제.
