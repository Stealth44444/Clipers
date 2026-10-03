# 틱톡·인스타그램 계정 연결과 조회수 자동 수집 설계

작성 2026-10-03. 틱톡과 인스타그램 릴스 조회수를 지금은 크리에이터 신고와 운영팀 확인으로 받는다. 공식 API로 계정을 연결해 소유를 확인하고 정확한 조회수를 매일 가져온다. 계정 인증(`creator_channels`, 2026-10-03 클립 부정 방지)은 이미 운영 중이며 그 위에 얹는다.

## 1. 결정 (2026-10-03)

| 항목 | 결정 |
|---|---|
| 방식 | 공식 API(OAuth). 서버에서 공개 페이지를 읽는 방식은 쓰지 않는다(틱톡은 봇 확인 화면, 인스타는 로그인 화면으로 막힘을 확인) |
| 기존 인증 | 인증 코드 + 운영팀 확인 방식은 그대로 둔다. 자동 수집은 OAuth로 연결한 계정의 클립만 |
| 처리방침 | 연결한 계정 정보(계정 ID·사용자명), 접근 토큰, 내 영상 조회수를 수집·보관. 연결 해제·탈퇴 시 토큰 즉시 파기. 정산에 쓴 조회수 기록은 지급 기록과 같이 5년 보관 |
| 키 | 회사가 TikTok for Developers와 Meta for Developers에 앱을 등록·심사한다. 키가 없으면 연결 버튼이 보이지 않고 지금 방식 그대로 |

## 2. 공식 API (2026-10-03 문서 확인)

| | 틱톡 (Login Kit + Display API) | 인스타그램 (Instagram API, Instagram 로그인) |
|---|---|---|
| 로그인 | `https://www.tiktok.com/v2/auth/authorize/` | `https://www.instagram.com/oauth/authorize` |
| 권한 | `user.info.basic`, `user.info.profile`, `video.list` | `instagram_business_basic`, `instagram_business_manage_insights` |
| 토큰 | `POST https://open.tiktokapis.com/v2/oauth/token/` 액세스 24시간, 리프레시 365일 | `POST https://api.instagram.com/oauth/access_token`(1시간) → `GET graph.instagram.com/access_token`(60일) → `refresh_access_token` |
| 계정 | `GET /v2/user/info/?fields=open_id,username,display_name` | `GET graph.instagram.com/me?fields=user_id,username` |
| 조회수 | `POST /v2/video/query/?fields=id,view_count,create_time` 본인 영상만, 20개씩 | `GET /{media-id}/insights?metric=views`(누적) |
| 영상 찾기 | 링크의 영상 ID(짧은 링크는 oEmbed로 ID 확인) | 연결 계정의 `/me/media`에서 링크의 shortcode와 맞는 게시물 |
| 조건 | 앱 심사 | 프로페셔널(비즈니스·크리에이터) 계정만, Meta 비즈니스 인증 + 앱 심사 |

## 3. 데이터

- `creator_channels.verified_by`에 `oauth` 추가. 연결하면 그 계정 행을 `verified_at = now(), verified_by = 'oauth', external_id = 플랫폼 계정 ID`로 만든다(같은 계정의 미인증 행이 있으면 그 행을 인증한다).
- 새 표 `channel_connections` (서비스 키 전용, RLS 켜고 정책 없음): `channel_id → creator_channels on delete cascade`, `access_token_ciphertext`, `refresh_token_ciphertext`, `access_expires_at`, `refresh_expires_at`, `last_error`, `updated_at`. 토큰은 앱 서버에서 AES-256-GCM(`PAYOUT_ENCRYPTION_KEY`)으로 암호화한다.
- `clips.external_video_id`: 틱톡 영상 ID, 인스타 미디어 ID. 서버가 연결 계정으로 확인한 클립만 채운다.

## 4. 흐름

1. **연결**: 설정 > 내 채널의 '틱톡 연결'·'인스타그램 연결' → `/api/oauth/{platform}/start`(무작위 state를 httpOnly 쿠키에 저장) → 플랫폼 동의 → `/api/oauth/{platform}/callback`(state 확인, 토큰 교환, 계정 조회, 저장) → 설정으로 돌아온다. 이미 다른 크리에이터가 인증한 계정이면 거절한다.
2. **연결 해제**: 토큰을 플랫폼에 폐기 요청하고(틱톡) `channel_connections`를 지운다. 계정의 인증은 함께 해제한다.
3. **클립 제출**: 틱톡·릴스는 서버 액션으로 제출한다.
   - 그 플랫폼에 OAuth 연결이 있으면 연결 계정으로 영상을 찾는다. 찾으면 `external_video_id`와 게시 시각을 저장하고, 캠페인 공개 이전 게시는 거절한다. 못 찾았는데 수동 인증 계정도 있으면 수동 클립으로 받는다(운영팀이 검수 때 확인). 수동 인증 계정이 없으면 "연결한 계정의 영상만 제출할 수 있어요"로 거절한다.
   - OAuth 연결이 없으면 지금처럼 수동 인증 계정 기준으로 받는다.
4. **조회수 수집**: 매일 한 번 `/api/cron/social-views`가 승인된 클립 중 `external_video_id`가 있는 것을 연결 계정별로 묶어 조회수를 가져와 `view_snapshots`에 넣는다. 필요하면 토큰을 먼저 갱신한다. 영상이 응답에 없으면 삭제·비공개로 표시한다(유튜브와 같은 칸). 토큰이 만료·철회되면 `last_error`를 남기고 크리에이터에게 다시 연결하라는 알림을 한 번 보낸다.

## 5. 회사가 할 일 (심사 자료는 별도 문서)

- 틱톡: 앱 등록, Login Kit·Display API, 리다이렉트 `https://app.clipers.site/api/oauth/tiktok/callback`, 키를 `TIKTOK_CLIENT_KEY`·`TIKTOK_CLIENT_SECRET`으로 등록.
- 인스타: Meta 비즈니스 인증, 앱 등록(Instagram API, Instagram 로그인), 리다이렉트 `https://app.clipers.site/api/oauth/instagram/callback`, 키를 `INSTAGRAM_APP_ID`·`INSTAGRAM_APP_SECRET`으로 등록.

## 6. 테스트

- 순수 함수: 로그인 URL, 링크에서 영상 ID·shortcode 추출, 토큰 응답 정리, 제출 판정(연결 계정 영상 여부, 게시 시각).
- API 클라이언트: 가짜 fetch로 요청 형식과 오류 처리.
- DB: 운영 DB에서 트랜잭션 안에서 확인하고 되돌린다.
