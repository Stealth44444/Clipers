# 작업판

> 여러 Claude 세션이 같은 저장소(main)와 같은 운영 DB를 함께 쓴다. 이 표 하나로 누가 무엇을 하는지, 무엇이 배포·적용을 기다리는지 본다.
> 각 세션은 작업을 시작할 때, 끝낼 때, DB에 적용할 때, 배포를 기다리게 될 때 **자기 줄만** 고치고 이 파일만 커밋한다.
> 마지막 갱신: 2026-10-03 (clipers-0b, 4d6a151 배포 확인 뒤)

## 규칙

- **push = 운영 배포.** main에 push하면 Vercel이 앱·사이트를 배포한다. 모든 세션의 커밋이 함께 나가므로 push는 사용자가 요청할 때만 한다.
- **커밋은 내 파일만.** `git commit -m … -- <파일들>`. 여러 세션이 함께 고치는 파일(`packages/db/src/index.ts`, `packages/ui/src/styles/components.css` 등)은 `git diff`로 내 줄만 들어가는지 확인한다.
- **DB를 먼저, 앱을 나중에.** 새 칸·표를 읽는 앱 코드는 마이그레이션을 운영 DB에 적용한 뒤 배포한다. 적용하지 않은 마이그레이션은 아래 표에 적는다.

## 세션별 작업

| 세션 | 맡은 일 | 상태 | 문서 | 메모 |
|---|---|---|---|---|
| clipers-0b | 클립 부정 방지: 캠페인 공개 이후 게시물만, 계정 인증 필수, 삭제·비공개 감지 후 정산 중단, 온보딩 만 19세 확인 | **완료** · DB 적용 · `e1b7e3e`로 배포(2026-10-03) · 실제 DB에서 제출 규칙과 조회수 수집(200) 확인 | `specs/2026-10-03-clip-fraud-guards-design.md`, `plans/2026-10-03-clip-fraud-guards.md` | 정책 4건 2026-10-03 회사 결정(구현 그대로) → clipers-a1이 약관 제13조 4·5항·처리방침 '계정 인증' 행으로 확정(시행 2026-10-04, 근거 `docs/legal/README.md` 0절). 추가: 정산 멈춤·재개 알림(`9d51145`, 마이그레이션 `20261003190000` 운영 적용, `4d6a151`로 배포) |
| clipers-8a | 알림(앱 안·메일), 예산 증액, Resend 메일 | **완료** · 알림·예산 증액 DB 적용 · 앱 배포됨(origin/main에 포함) · Resend 연결은 clipers-f1이 마침 | `specs/2026-10-03-notifications-design.md`, `specs/2026-10-03-budget-topup-design.md` | 이 작업은 이제 clipers-a1(같은 대화)이 이어서 봄 |
| clipers-a1 | 틱톡·인스타 OAuth 계정 연결·조회수 자동 수집, 매니지드 캠페인, 약관·처리방침 확정, 실명 비교 가이드 법률 점검 | **완료** · DB 적용 · `4d6a151`로 배포 · 조회수 수집 정기 작업 적용(200 확인) · 연결 버튼은 틱톡·Meta 키가 들어오면 켜짐 | `specs/2026-10-03-social-oauth-views-design.md`, `specs/2026-10-03-managed-campaigns-design.md`, `docs/social-app-registration.md`, `docs/legal/README.md` 0절 | 남은 것: 사용자의 틱톡·Meta 앱 등록·심사 후 키 4개 등록 |
| clipers-f1 | Resend 메일 연결(완료), 알림 메일 디자인 개편, 활동 알림 메일 끄기 설정 | 구현·커밋 완료(`0a4379e`, `70f1efb`) · 마이그레이션 `notification_email_preferences` **운영 적용 완료** · 앱 **배포 대기** | `specs/2026-10-03-notifications-design.md` | 돈 관련 알림 메일은 항상 보냄. 메일 로고는 `app.clipers.site/logo/clipers-wordmark-email*.png`(출시 전 잠금에서 이 두 파일만 열어 둠). a1 요청으로 `connection_expired` 문구 추가 |

## 적용·배포를 기다리는 것

| 항목 | 기다리는 것 | 담당 |
|---|---|---|
| ~~origin/main 이후 커밋~~ | 완료: `4d6a151`까지 push·배포(2026-10-03, 앱·사이트 READY; 조회수 수집·알림 메일 정기 작업 200, 메일 로고 경로 200) | — |
| ~~`supabase/migrations/20261003160000_notification_email_cron.sql`~~ | 완료: `ea6eec1` 배포 뒤 운영 DB 적용, 5분마다 200 응답 확인 | clipers-f1 |
| ~~`supabase/migrations/social_views_cron.sql`~~ | 완료: `4d6a151` 배포 뒤 `20261003134450_social_views_cron`으로 적용(매일 10:30), 직접 호출해 200 확인 | clipers-a1 |
| 틱톡·Meta 개발자 앱 | 앱 등록·심사 후 `TIKTOK_CLIENT_KEY`·`TIKTOK_CLIENT_SECRET`·`INSTAGRAM_APP_ID`·`INSTAGRAM_APP_SECRET`를 clipers-app에 등록 | 사용자 |
| Resend `clipers.site` 도메인 | DNS·인증·`RESEND_API_KEY`·`EMAIL_FROM`(clipers-app), DMARC(`p=none`), Supabase 인증 메일 SMTP(`supabase-auth-smtp` 키) 모두 완료. 남은 것: 인증 메일 한국어 템플릿 적용 확인(아래 0-1) | 사용자 |

## 사용자가 할 일

0. **help@clipers.site** — 사이트·약관·처리방침에 주소 반영(커밋, 배포 전). Resend 받기 켜짐, MX 기록 Vercel DNS에 추가, 메일함 생성, 받기 MX 인증, 수신 테스트까지 완료(2026-10-03). `4d6a151` 배포로 사이트·문서에 공개됨. 받은 메일은 Resend Inbox에서 읽고 답한다.
0-1. ~~인증 메일 한국어 템플릿~~ — 완료(2026-10-03 22:43 KST). 사용자가 `docs/ops/auth-email-templates/`의 두 템플릿을 Supabase에 붙여 넣었고, 재설정 메일이 "Clipers 비밀번호를 다시 설정해 주세요" 제목으로 Resend를 거쳐 전달된 것을 확인(clipers-a1 요청, clipers-0b 확인).

1. ~~push~~ — 완료(`e1b7e3e`).
2. **화면 확인(선택)** — 제출 규칙은 실제 DB에서 확인함. 화면만 남음: 크리에이터 설정 '내 채널'에서 유튜브 채널 등록·'인증 확인', 운영자 '계정 인증', 클립 검수 확인 항목 두 개, 새 계정 온보딩의 '만 19세 이상' 스위치.
3. ~~부정 방지 정책~~ — 2026-10-03 결정·약관 확정 완료(공개 이후·인증 계정만, 확인한 주부터 제외, 운영팀 확인 후 재개, 인증 정보는 탈퇴 시까지).
4. **출시** — 2026-10-03 잠금 해제 완료(clipers-a1): 운영 `PRELAUNCH_PASSWORD` 삭제(앱·사이트, Preview는 유지), `693b41c` 배포, robots 허용·사이트맵 65개·`clipers.site` index 확인, IndexNow 202. 구글·네이버 확인 파일(HTML 파일 방식)은 `apps/site/public/`에 올라감. 남은 것: 사용자가 서치콘솔·서치어드바이저에서 '확인'과 사이트맵 제출, 빙은 서치콘솔에서 가져오기. 약관 확정으로 변호사 검토는 필수 아님(`docs/legal/README.md` 0절). GitHub 저장소 비공개 전환은 여전히 권장.
