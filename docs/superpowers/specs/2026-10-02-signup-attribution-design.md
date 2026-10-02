# 회원가입 개선과 유입 경로 수집 설계

> 2026-10-02 확정. 대상: 앱 가입·로그인(`apps/app/app/login`), 온보딩(`apps/app/app/onboarding`), 사이트의 가입 링크(`apps/site`), DB(`supabase/migrations`), 처리방침 초안.
> 범위 밖: 구글·카카오 로그인, 추천 코드와 보상, Resend 메일 설정(회사 계정 작업).

## 1. 문제

- 가입자가 어디서 왔는지 아무 데도 남지 않는다. UTM·리퍼러·랜딩 페이지도, 자기 보고도, 분석 도구도 없다. 상담 문의만 `source_path`를 남긴다.
- 크리에이터 페이지·브랜드 페이지·가이드·마켓의 모든 버튼이 같은 `/login?mode=sign-up`으로 간다. 브랜드 페이지에서 온 사람도 "가입 후 크리에이터 또는 브랜드로 시작할 수 있어요"를 보고, 온보딩에서 "수익 창출 시작하기 — 추천"을 먼저 본다.
- 인증 메일을 보낸 뒤 다시 보낼 수 없고, 비밀번호를 잊으면 방법이 없다. 비밀번호 보기, 입력 중 안내도 없다.
- DB 트리거 `handle_new_user`는 `requested_role`을 받을 수 있지만 폼이 보내지 않는다.

## 2. 지켜야 할 것

| 항목 | 규칙 |
|---|---|
| 쿠키 | 사이트에 새 쿠키를 두지 않는다. 처리방침 8절 "광고·분석 목적의 쿠키는 쓰지 않습니다"를 그대로 지킨다. 유입 정보는 브라우저 세션 저장소에만 잠시 둔다 |
| 호스트 | 사이트(`NEXT_PUBLIC_SITE_URL`)와 앱(`NEXT_PUBLIC_APP_URL`)은 다른 호스트다. 운영 도메인은 미정이라 쿠키 공유에 기대지 않고 링크로 넘긴다 |
| 노출 | `signup_attributions`는 공개 API로 읽을 수 없다. 운영자만 읽는다 |
| 크기 | 값은 모두 allow-list 키만, 각 200자 이하로 자른다. 메타데이터 크기와 로그 오염을 막는다 |
| 역할 | 클라이언트가 보낸 `requested_role`은 트리거가 `brand`만 인정하고 나머지는 `creator`로 둔다(기존 화이트리스트 유지). `admin`은 절대 불가 |
| 법 | 새 수집 항목은 처리방침 1·2·8절에 🔸 초안으로 적는다. 근거는 정당한 이익(서비스 개선, 마케팅 효과 측정). 변호사 확인 전까지 잠정 |
| 문구 | 해요체. 대문자 라벨·장식 금지(기존 UI 규칙) |

## 3. 데이터

### 3.1 유입 정보 (`Attribution`, `packages/db/src/attribution.ts`)

| 키 | 출처 | 예 |
|---|---|---|
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | 첫 방문 주소의 쿼리 | `instagram`, `paid`, `oct_launch` |
| `ref` | 첫 방문 주소의 `ref` 쿼리(링크 공유용 짧은 식별값) | `creator_minji` |
| `referrer_host` | `document.referrer`의 호스트(사이트 자신이면 비움) | `www.google.com` |
| `landing_path` | 사이트에서 처음 연 경로(쿼리 제외) | `/brands` |
| `landed_at` | 첫 방문 시각(ISO) | — |

- 사이트는 세션 저장소 키 `clipers.attribution`에 첫 방문 때 한 번만 적는다(이미 있으면 유지: 첫 접점 기준).
- 사용자가 앱의 `/login`으로 가는 링크를 누르면 그 값을 쿼리로 붙인다(`a_utm_source=…` 식으로 `a_` 접두). 링크를 고치지 않고 `click`·`auxclick`을 문서에서 받아 `href`를 바꾼다. 새 탭 열기도 같은 값을 받는다.
- 앱의 `/login` 페이지는 `a_*` 쿼리를 읽어 폼에 넘기고, `signUp`의 `options.data.attribution`(객체)으로 보낸다. `requested_role`도 함께 보낸다.
- 트리거 `handle_new_user`가 `raw_user_meta_data->'attribution'`을 읽어 `signup_attributions`에 한 줄 넣는다. 메일 인증 전, 사용자 생성 시점이다.

### 3.2 자기 보고 (`heard_from`)

온보딩 약관 직전 단계. 고르지 않아도 계속할 수 있다. `HEARD_FROM_OPTIONS`:

| id | 라벨 |
|---|---|
| `search` | 검색 (네이버·구글) |
| `youtube_shortform` | 유튜브·숏폼에서 봤어요 |
| `instagram_tiktok` | 인스타그램·틱톡 |
| `friend_creator` | 지인·크리에이터 추천 |
| `community_blog` | 커뮤니티·블로그 |
| `press` | 기사·뉴스 |
| `other` | 기타 |

`complete_onboarding(p_role, p_interests, p_on_camera, p_experience_level, p_heard_from default null)`가 `signup_attributions.heard_from`과 `heard_from_at`을 채운다. 기존 4인자 함수는 지우고 5인자로 바꾼다(PostgREST 오버로드 모호성 방지).

### 3.3 테이블 `signup_attributions`

```
user_id uuid primary key references profiles(id) on delete cascade
created_at timestamptz not null default now()
requested_role text          -- 가입 때 고른 역할 ('brand' | 'creator' | null)
landing_path text, landed_at timestamptz
referrer_host text
utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text
ref text
heard_from text check (heard_from in (…HEARD_FROM ids…)), heard_from_at timestamptz
```

- 각 text 칸은 200자 이하 check. RLS 켜고 정책은 `select … using (current_role_is('admin'))` 하나. `anon`·`authenticated`에게 insert/update/delete 권한 없음(트리거·RPC는 security definer).
- 보유: 회원 정보와 같이 탈퇴(프로필 삭제) 시 함께 지워진다(cascade).

## 4. 화면

### 4.1 사이트 가입 링크
- `landing-chrome.tsx`: `SIGN_UP` 대신 `signUpUrl(role)` → `/login?mode=sign-up&role=brand|creator`. 헤더 버튼은 `path`가 `/brands`면 brand. 브랜드 페이지 CTA 전부 brand, 크리에이터 페이지·마켓·가이드는 creator(광고주 가이드는 brand).
- `apps/site/components/attribution-carrier.tsx`(클라이언트, 렌더 없음)를 루트 레이아웃에 둔다.

### 4.2 가입·로그인 화면 (`login-form.tsx`)
- 제목: 가입은 "브랜드 계정 만들기" / "크리에이터 계정 만들기". 그 위에 세그먼트(`Tabs`)로 역할 전환. 부제: 브랜드 "캠페인을 열고 검증된 조회수만큼만 예산을 써요." / 크리에이터 "숏폼을 올리고 검증된 조회수만큼 받아요."
- 이름 칸: 브랜드 "브랜드명 (회사명)", 크리에이터 "활동명". 첫 칸 자동 포커스.
- 비밀번호: 보기/숨기기 아이콘 버튼(Lucide Eye/EyeOff). 입력 중 안내: 8자 미만이면 힌트가 오류색으로, 이메일 형식이 아니면 blur 때 오류.
- 가입 → 세션 없이 성공하면 **메일 확인 화면**으로 바뀐다: 보낸 주소, "스팸함도 확인해 주세요", "다시 보내기"(60초 후 활성, `auth.resend({type:'signup'})`), "다른 이메일로 가입" 링크.
- 로그인 모드에 "비밀번호를 잊으셨나요?" → 재설정 모드: 이메일만 입력 → `resetPasswordForEmail(email, {redirectTo: origin + '/auth/callback?next=/reset-password'})` → "재설정 메일을 보냈어요" 상태.
- 오류 문구 추가: 메일 발송 한도(`over_email_send_rate_limit`, `email rate limit exceeded`) → "메일 발송 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.", `signup disabled` → "지금은 가입을 받지 않아요."
- 모드 전환 시 메시지·오류를 지운다. `mode` 쿼리는 `sign-up`·`sign-in`·`reset`.

### 4.3 비밀번호 재설정 (`/reset-password`)
- 클라이언트 페이지. 세션이 있으면 새 비밀번호(8자 이상, 확인 칸)를 받아 `auth.updateUser({password})` → 역할별 워크스페이스로. 세션이 없으면 "링크가 만료됐거나 올바르지 않아요"와 다시 요청 링크.
- 미들웨어 matcher에 넣지 않는다(세션은 페이지가 직접 확인).

### 4.4 온보딩
- `OnboardingFlow`에 `initialRole`(세션 프로필의 role; brand면 brand, 아니면 creator)을 넘겨 역할 단계가 미리 선택된다. "추천" 배지는 뺀다.
- 새 단계 `source`("Clipers를 어떻게 알게 되셨어요?", 설명 "건너뛰어도 괜찮아요. 더 잘 알리는 데 참고해요.")가 `terms` 바로 앞에 들어간다. 크리에이터·브랜드 모두. `OptionCard` 목록(아이콘 없이), 다시 누르면 해제. 계속 버튼은 항상 활성.
- `complete_onboarding`에 `p_heard_from`을 넘긴다.

### 4.5 운영자
- `/admin` 현황 아래에 "가입 경로 (최근 30일)" 섹션: 표 두 개 — 자기 보고 채널별 가입 수, `utm_source`별 가입 수(없으면 "직접 방문·기타"). 역할별 열(브랜드/크리에이터). 데이터는 `signup_attributions`를 운영자 세션으로 읽는다.

## 5. 처리방침 초안 (🔸)
- 1절 표에 행 추가: 구분 "유입 경로", 항목 "가입 링크에 담긴 유입 정보(광고·링크 식별값, 이전 페이지의 도메인, 처음 연 홈페이지 주소), 가입 때 답한 알게 된 경로", 목적 "서비스 개선, 마케팅 효과 측정", 근거 "정당한 이익 (법 제15조 제1항 제6호)".
- 2절 보유 기간: "유입 경로 — 탈퇴할 때까지".
- 8절: "홈페이지는 가입 링크를 누를 때까지 유입 정보를 브라우저 세션 저장소에 잠시 둡니다(쿠키가 아니며 탭을 닫으면 사라집니다)."

## 6. 구현 구조

| 파일 | 역할 |
|---|---|
| `packages/db/src/attribution.ts` (+test) | `Attribution` 타입, 키 allow-list, 길이 제한, `captureAttribution(url, referrer, siteHost, now)`, `attributionToParams`/`attributionFromParams`, `HEARD_FROM_OPTIONS` |
| `packages/db/src/onboarding.ts` (+test) | `source` 단계, `heardFrom` 답, `onboardingSteps`에 `source` 추가 |
| `supabase/migrations/20261002…_signup_attributions.sql` | 테이블, RLS, 트리거 교체, `complete_onboarding` 5인자 |
| `apps/site/components/attribution-carrier.tsx` | 첫 방문 기록, 앱 로그인 링크에 쿼리 부착 |
| `apps/site/components/landing-chrome.tsx` 외 CTA | `signUpUrl(role)` |
| `apps/app/app/login/page.tsx`, `login-form.tsx` | 역할 세그먼트, 메타데이터, 메일 확인 화면, 재설정 모드, 입력 다듬기 |
| `apps/app/app/reset-password/page.tsx` | 새 비밀번호 |
| `apps/app/lib/auth.ts` | 오류 문구 추가 |
| `apps/app/app/onboarding/page.tsx`, `onboarding-flow.tsx` | `initialRole`, `source` 단계, `p_heard_from` |
| `apps/app/lib/admin-data.ts`, `apps/app/app/admin/page.tsx` | 가입 경로 집계와 표 |
| `apps/app/content/legal/privacy.md` | 🔸 초안 |
| `packages/ui/src/styles/components.css` | 비밀번호 토글, 메일 확인 화면에 필요한 작은 스타일 |

## 7. 확인
- `packages/db`·`apps/site` 테스트, `apps/app`·`apps/site` 타입 검사.
- 가입(브랜드·크리에이터)·메일 확인·재설정 화면을 1440·390에서 캡처.
- 마이그레이션은 파일만 만들고, 호스팅 DB 적용(`supabase db push`)은 회사가 정한 뒤에.
