# 틱톡·인스타그램 개발자 앱 등록 안내

작성 2026-10-03. 크리에이터가 틱톡·인스타그램 계정을 연결하고(계정 소유 확인), 클립 조회수를 매일 자동으로 가져오려면 회사 명의로 두 플랫폼에 앱을 등록하고 심사를 받아야 한다. 코드는 이미 들어가 있고, 아래 키를 등록하면 크리에이터 설정 '내 채널'에 연결 버튼이 나타난다.

공통으로 쓰는 주소
- 앱: `https://app.clipers.site`
- 개인정보 처리방침: `https://app.clipers.site/privacy`
- 이용약관: `https://app.clipers.site/terms`
- 로고: `apps/app/public/logo/` 폴더의 이미지

## 1. 틱톡 (TikTok for Developers)

1. https://developers.tiktok.com 에 회사 이메일로 가입하고 조직(Organization)을 만든다.
2. 앱을 만들고 플랫폼에 **Web**을 고른다. 앱 이름은 `Clipers`, 카테고리는 마케팅·비즈니스 도구로 한다.
3. 제품(Products)에서 **Login Kit**과 **Display API**를 추가한다.
4. 권한(Scopes): `user.info.basic`, `user.info.profile`, `video.list`
5. 리다이렉트 URI: `https://app.clipers.site/api/oauth/tiktok/callback`
6. 앱 설명(영문 권장) 예시: "Clipers pays short-form creators for verified views of the clips they post for brand campaigns. Creators connect their TikTok account so we can confirm the clips they submit are their own and read each clip's view count once a day. We never post on the creator's behalf."
7. 심사 제출 → 승인되면 **Client key**와 **Client secret**을 받는다.

## 2. 인스타그램 (Meta for Developers)

1. https://business.facebook.com 에서 회사 비즈니스 포트폴리오를 만들고 **비즈니스 인증**(사업자등록증 등)을 마친다.
2. https://developers.facebook.com 에서 앱을 만든다. 용도는 비즈니스, 제품은 **Instagram → Instagram API(Instagram 로그인)**를 고른다.
3. 권한: `instagram_business_basic`, `instagram_business_manage_insights`. 다른 회원(크리에이터) 계정에 쓰려면 두 권한 모두 **고급 액세스(Advanced Access)** 심사가 필요하다.
4. 비즈니스 로그인 설정의 리다이렉트 URI: `https://app.clipers.site/api/oauth/instagram/callback`
5. 데이터 삭제 요청 안내: 처리방침 주소를 넣고, "설정 > 내 채널에서 연결 해제하면 토큰을 즉시 삭제" 라고 적는다.
6. 심사 제출 → 승인되면 **Instagram 앱 ID**와 **Instagram 앱 시크릿**을 받는다(페이스북 앱 ID가 아님).
7. 인스타그램은 **프로페셔널(비즈니스·크리에이터) 계정**만 연결된다. 개인 계정 크리에이터는 무료로 전환할 수 있고, 전환하지 않으면 지금처럼 인증 코드 방식으로 참여한다.

## 3. 심사 시연 영상 (두 플랫폼 공통 순서)

1. 크리에이터 계정으로 `app.clipers.site` 로그인
2. 설정 > 내 채널 > '틱톡 연결'(또는 '인스타그램 연결') → 플랫폼 동의 화면 → 돌아와서 '연결됨' 표시
3. 캠페인 화면에서 그 계정의 영상 링크를 제출 → 제출 현황에 표시
4. (다음 날) 제출 현황·수익 화면에 조회수와 정산이 표시되는 화면
5. 설정 > 내 채널 > '연결 해제'

심사 기간에는 각 플랫폼의 **테스트 사용자(샌드박스)**로 등록한 계정으로 위 과정을 녹화한다.

## 4. 키를 받은 뒤 할 일

1. Vercel → `clipers-app` → Settings → Environment Variables(Production)에 등록하고 다시 배포한다. 키는 채팅·문서에 적지 않는다.
   - `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
   - `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
2. 심사 시연 영상을 찍으려면 심사 전에 받은 샌드박스(틱톡)·개발 모드(Meta) 키를 먼저 같은 이름으로 넣는다. 승인 뒤 운영 키로 바꾼다.

DB 마이그레이션(`social_connections`, `social_views_cron`)과 처리방침의 TikTok·Meta 항목은 2026-10-03에 이미 적용했다.
