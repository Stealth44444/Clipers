# 작업판

> 여러 Claude 세션이 같은 저장소(main)와 같은 운영 DB를 함께 쓴다. 이 표 하나로 누가 무엇을 하는지, 무엇이 배포·적용을 기다리는지 본다.
> 각 세션은 작업을 시작할 때, 끝낼 때, DB에 적용할 때, 배포를 기다리게 될 때 **자기 줄만** 고치고 이 파일만 커밋한다.
> 마지막 갱신: 2026-10-03 (clipers-0b)

## 규칙

- **push = 운영 배포.** main에 push하면 Vercel이 앱·사이트를 배포한다. 모든 세션의 커밋이 함께 나가므로 push는 사용자가 요청할 때만 한다.
- **커밋은 내 파일만.** `git commit -m … -- <파일들>`. 여러 세션이 함께 고치는 파일(`packages/db/src/index.ts`, `packages/ui/src/styles/components.css` 등)은 `git diff`로 내 줄만 들어가는지 확인한다.
- **DB를 먼저, 앱을 나중에.** 새 칸·표를 읽는 앱 코드는 마이그레이션을 운영 DB에 적용한 뒤 배포한다. 적용하지 않은 마이그레이션은 아래 표에 적는다.

## 세션별 작업

| 세션 | 맡은 일 | 상태 | 문서 | 메모 |
|---|---|---|---|---|
| clipers-0b | 클립 부정 방지: 캠페인 공개 이후 게시물만, 계정 인증 필수, 삭제·비공개 감지 후 정산 중단, 온보딩 만 19세 확인 | 구현 완료 · DB 적용 완료 · **배포 대기** | `specs/2026-10-03-clip-fraud-guards-design.md`, `plans/2026-10-03-clip-fraud-guards.md` | 배포 전까지 운영 앱의 유튜브 제출·온보딩 완료가 막혀 있음(DB가 먼저 바뀜) |
| clipers-8a | 알림(앱 안·메일), 예산 증액, Resend 메일 | 알림·예산 증액 DB 적용 완료 · 예산 증액 앱 **배포 대기** · Resend 도메인 `pending`(DNS 인증 전) | `specs/2026-10-03-notifications-design.md`, `specs/2026-10-03-budget-topup-design.md` | 지금 세션 목록에 없음. 알림 메일 정기 작업은 배포 뒤 적용(아래) |
| clipers-a1 | 틱톡·인스타 OAuth 계정 연결, 조회수 자동 수집 | 설계 커밋 · 구현 중 | `specs/2026-10-03-social-oauth-views-design.md` | 새 마이그레이션 예정(`creator_channels.verified_by`에 `oauth`, 토큰 표, `clips.external_video_id`) |
| clipers-f1 | (세션이 채워 주세요) | | | |

## 적용·배포를 기다리는 것

| 항목 | 기다리는 것 | 담당 |
|---|---|---|
| origin/main 이후 커밋(부정 방지, 예산 증액 앱, 알림 문구 등) | 사용자의 push | 사용자 |
| `supabase/migrations/20261003160000_notification_email_cron.sql` | 앱 배포 뒤 운영 DB 적용 | clipers-8a(없으면 아무 세션) |
| Resend `clipers.site` 도메인 | DNS(DKIM·SPF) 기록 → 인증 → `RESEND_API_KEY`·`EMAIL_FROM` 등록 → Supabase 인증 메일(SMTP) 연결 | clipers-8a / 사용자 |

## 사용자가 할 일

1. **push** — 위 배포 대기분이 한 번에 나간다.
2. **배포 뒤 부정 방지 확인** — 크리에이터 설정 '내 채널'에서 유튜브 채널 등록·코드 넣기·'인증 확인'; 인증 안 된 계정이나 캠페인 공개 전 영상 제출이 막히는지; 운영자 '계정 인증'에서 틱톡 계정 인증; 클립 검수 확인 항목 두 개; 새 계정 온보딩의 '만 19세 이상' 스위치.
3. **[확인 필요] 정책** — 약관 제13조 4·5항(인증 계정·공개 이후 게시물만, 삭제·비공개는 그 주부터 정산 제외), 처리방침 '크리에이터 계정 인증' 행, 다시 공개된 영상은 운영팀 확인 후에만 재개.
4. **출시 전** — 검색엔진 소유 확인 값 등록, 변호사 검토(`docs/legal/README.md` 1~9번), Vercel Analytics 켜기, GitHub 저장소 비공개 여부 확인, 출시 당일 잠금 해제.
