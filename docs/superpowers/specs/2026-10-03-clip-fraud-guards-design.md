# 클립 부정 방지 설계 — 게시일, 계정 인증, 삭제·비공개, 연령 확인

> 2026-10-03 확정. 방향은 2026-10-02 회사 결정(진단 보고 후): 캠페인 공개 이후 게시한 영상만 인정(조회수는 0부터), 인증 코드로 계정 소유 확인, 삭제·비공개 영상은 표시하고 그 주부터 정산 중단, 온보딩에서 만 19세 확인.
> 대상: `supabase/migrations`, `packages/db`, `apps/app`(제출, 설정, 운영자 검수, 온보딩, 정기 작업), 약관·처리방침 초안, 크리에이터 FAQ·가이드.

## 1. 문제

- 남의 유튜브 영상 링크를 내도 시스템이 막지 못한다. 운영팀의 눈 검수뿐이다.
- 첫 정산은 조회수 0부터 센다(`packages/db/src/services/settlement.ts`). 캠페인 전에 이미 조회수가 많던 영상이 영상당 상한까지 바로 지급될 수 있다.
- 영상이 삭제·비공개로 바뀌어도 조회수 수집이 조용히 건너뛴다. 약관 제13조(게시 후 30일 유지)를 확인할 방법이 없다.
- 만 19세 확인은 지급 정보 등록 때만 한다. 미성년자도 제출·승인까지는 진행된다.

## 2. 결정

| 항목 | 결정 |
|---|---|
| 플랫폼 | 유튜브는 자동(공식 API), 다른 플랫폼은 운영팀이 검수할 때 확인 |
| 계정 수 | 플랫폼당 여러 개 허용. 한 계정(유튜브는 채널 ID, 다른 플랫폼은 정규화한 주소)은 한 사람만 인증 |
| 기존 클립 | 그대로. 새 규칙(게시일, 인증 계정)은 적용 이후 제출분부터. 삭제·비공개 감지는 기존 승인 클립에도 적용 |
| 검사 시점 | 유튜브 클립은 제출 순간 앱 서버에서 확인(방식 A). 크리에이터가 DB에 유튜브 클립을 직접 넣는 경로는 막는다 |
| 다시 공개된 영상 | 자동 재개하지 않는다. 운영팀이 확인 후 표시를 지우면 재개 [확인 필요 — 정책] |
| 연령 확인 | 온보딩 약관 단계의 필수 스위치. 크리에이터·브랜드 모두 |

## 3. 데이터 (마이그레이션 하나)

- `campaigns.live_at timestamptz` — `before insert or update` 트리거가 `status`가 처음 `live`가 될 때(`new.status = 'live' and new.live_at is null`) `now()`를 넣는다. 지금 공개 경로는 입금 확인 트리거(`activate_campaign_on_escrow_confirmed`)지만, 다른 경로가 생겨도 빠지지 않게 컬럼 기준으로 잡는다. 이미 `live`·`closed`인 캠페인은 `created_at`으로 채운다(기존 클립 원칙과 같다).
- 새 표 `creator_channels`:
  `id uuid pk`, `creator_id uuid → profiles on delete cascade`, `platform` (클립 플랫폼 값과 같은 집합), `url text`(정규화한 계정 주소, 500자 이하), `external_id text`(유튜브 채널 ID, 다른 플랫폼은 null), `verification_code text`(`CLIPERS-` + 영문·숫자 5자), `verified_at timestamptz`, `verified_by text check in ('auto','admin')`, `created_at`.
  - 유일성: `(creator_id, platform, url)`; 인증된 계정끼리 `(platform, coalesce(external_id, url))` 부분 유니크(`where verified_at is not null`).
  - RLS: 크리에이터는 자기 행 조회만, 운영자는 전체 조회·수정. 추가·인증·삭제는 앱 서버(서비스 키)와 운영자만 한다(크리에이터가 `verified_at`을 직접 쓰지 못하게).
- `clips`: `video_published_at timestamptz`, `video_channel_id text`, `unavailable_at timestamptz`, `unavailable_reason text check in ('missing','unlisted','manual')`. API 키 조회는 비공개 영상을 돌려주지 않아 삭제와 비공개를 가를 수 없으므로 둘 다 `missing`(화면 문구 "삭제·비공개")이다.
- `profiles.adult_confirmed_at timestamptz`. 프로필 보호 트리거(`prevent_profile_role_escalation`)가 이 칸도 지킨다(본인이 직접 못 바꾼다).
- `campaigns`는 칸별 조회 권한을 쓰므로 `live_at`에 `authenticated` 조회 권한을 준다(`anon`은 주지 않는다).
- `clips_creator_insert_own` 정책에 `platform <> 'youtube_shorts'`를 더한다. 유튜브 클립은 서버만 넣는다.
- `prepare_clip_submission` 트리거: 서비스 역할(`auth.jwt()->>'role' = 'service_role'`)일 때는 `creator_id = auth.uid()` 검사를 건너뛴다(서버가 이미 세션으로 확인했다). 나머지(승인된 지원, 라이브, 플랫폼, 하루 한도)는 그대로. 또 `unavailable_*`는 항상 비우고, 서비스 역할이 아니면 `video_published_at`·`video_channel_id`도 비운다(크리에이터가 직접 써넣지 못하게).
- `complete_onboarding`에 `p_adult_confirmed boolean`을 더한다(기존 함수는 지우고 새 시그니처로, PostgREST 오버로드 모호성 방지). `true`가 아니면 예외, `true`면 `adult_confirmed_at = now()`.

## 4. 흐름

### 4.1 계정 등록·인증 — 크리에이터 설정 "내 채널"
1. 플랫폼과 계정 주소를 넣으면 서버가 주소를 정규화하고(유튜브는 `@handle`·`/channel/UC…` 주소만) 인증 코드를 만든다.
2. 크리에이터가 채널 설명(유튜브)이나 프로필 소개(다른 플랫폼)에 코드를 넣고 "인증 확인"을 누른다.
3. 유튜브: 서버가 Data API `channels.list`(`forHandle` 또는 `id`, `part=snippet`)로 채널을 찾아 설명에 코드가 있으면 `external_id`·`verified_at`·`verified_by='auto'`를 기록한다. 없으면 "채널 설명에서 코드를 찾지 못했어요"를 보여 준다.
4. 다른 플랫폼: "운영팀 확인 대기". 운영자 새 화면 `/admin/channels`에서 계정을 열어 소개의 코드를 확인하고 인증하거나 거절한다. 거절하면 그 등록을 지우고, 크리에이터는 다시 등록할 수 있다.
5. 인증이 끝나면 크리에이터는 채널 설명·소개에서 코드를 지워도 된다. 크리에이터는 아직 인증 안 된 등록만 스스로 지울 수 있다(인증된 계정 해제는 운영팀 요청).

### 4.2 유튜브 클립 제출 — 서버 액션
제출 대화상자는 유튜브일 때 서버 액션을 부른다. 서버는 세션으로 사용자를 확인하고, 영상 ID를 뽑아 `videos.list`(`part=snippet,status`)를 조회해 판정 함수 `evaluateYouTubeSubmission`에 넣는다.

| 판정 | 사용자에게 보이는 문구 |
|---|---|
| 영상을 찾을 수 없음 | 영상을 찾을 수 없어요. 링크와 공개 상태를 확인해 주세요. |
| 공개가 아님(`privacyStatus` ≠ `public`) | 공개 상태인 영상만 제출할 수 있어요. |
| 인증된 내 채널이 아님 | 설정의 '내 채널'에서 인증한 채널의 영상만 제출할 수 있어요. |
| 캠페인 공개 전 게시(`publishedAt < live_at`) | 캠페인이 공개된 뒤에 올린 영상만 제출할 수 있어요. |

모두 통과하면 서비스 키로 `clips`에 `video_published_at`, `video_channel_id`와 함께 넣는다(하루 한도·중복 영상은 DB가 그대로 막는다). 유튜브 API 오류나 키가 없으면 "지금은 유튜브 영상을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요."로 거절한다(통과시키지 않는다).

### 4.3 다른 플랫폼 클립 — 검수 확인 항목
제출은 지금처럼 받는다. 운영자 클립 검수에서 유튜브가 아닌 클립은 "캠페인 공개({live_at}) 이후 게시" "인증된 계정({인증 목록})의 게시물" 두 항목을 체크해야 승인 버튼이 켜진다. 유튜브 클립은 게시일·채널 자동 확인 결과를 표시만 한다.

### 4.4 삭제·비공개 감지
- 조회수 수집(`/api/cron/youtube-views`)이 `part=statistics,status`로 조회한다. 응답에 영상이 없으면(삭제 또는 비공개) `missing`, `privacyStatus`가 `unlisted`면 `unlisted`로 `unavailable_at`(비어 있을 때만)과 `unavailable_reason`을 기록하고, 새로 표시한 클립을 슬랙에 한 번 알린다. 이미 표시된 클립은 수집 대상에서 빼고 다시 알리지 않는다.
- 운영자: 캠페인 상세의 "승인된 클립"에서 "삭제·비공개로 표시"(사유 `manual`), 클립 검수 화면의 "정산이 멈춘 클립"에서 "표시 해제".
- 정산: `calculateWeeklySettlementDrafts` 입력에 `unavailableAt`을 더해, `unavailableAt < periodEnd`인 클립은 그 주부터 건너뛴다(이미 지급한 돈은 그대로).
- 크리에이터 제출 현황: "영상이 삭제되거나 비공개로 바뀌어 정산이 멈췄어요. 다시 공개했다면 운영팀에 알려 주세요."

### 4.5 만 19세 확인
온보딩 `terms` 단계에 세 번째 필수 스위치 "만 19세 이상이에요"를 넣고, `canContinueOnboarding('terms')`가 셋 모두 켜졌을 때만 통과한다. `complete_onboarding(p_adult_confirmed => true)`.

## 5. 코드 구조

| 위치 | 역할 |
|---|---|
| `packages/db/src/channels.ts` (+test) | `parseChannelUrl(platform, input)` → 정규화 주소와 유튜브 핸들·채널 ID, `newVerificationCode()`, `descriptionHasCode(text, code)` |
| `packages/db/src/services/youtubeVideo.ts` (+test) | `fetchYouTubeVideoInfo(videoId, key)`(snippet·status), `evaluateYouTubeSubmission(info, { verifiedChannelIds, liveAt })` → `{ ok } | { ok:false, reason }`, `fetchYouTubeChannel(ref, key)` |
| `packages/db/src/services/youtubeViews.ts` | `fetchYouTubeViewCounts`가 `privacyStatus`와 "응답에 없음"을 함께 돌려준다 |
| `packages/db/src/services/settlement.ts` (+test) | `unavailableAt` 제외 규칙 |
| `apps/app/app/creator/settings/channel-actions.ts`, `channels-card.tsx` | 내 채널 등록·인증·삭제 |
| `apps/app/app/creator/campaigns/submit-clip-action.ts`, `submit-clip-dialog.tsx` | 유튜브 서버 제출 |
| `apps/app/app/admin/channels/page.tsx`, 사이드바 | 계정 인증 목록 |
| `apps/app/app/admin/review-actions.tsx`, `admin/clips/page.tsx`, `admin/campaigns/[id]/page.tsx` | 확인 항목, 자동 확인 표시, 삭제·비공개 표시(캠페인 상세)·해제(클립 검수) |
| `apps/app/app/api/cron/youtube-views/route.ts` | 감지·기록·알림 |
| `packages/db/src/onboarding.ts` (+test), `onboarding-flow.tsx` | 연령 스위치 |

## 6. 문구·법률
- 약관 초안 🔸 [확인 필요]: 제12~13조에 "캠페인 공개 이후 게시한 영상만, 인증한 계정에서 올린 영상만 인정", 제13조에 "삭제·비공개로 바뀐 영상은 그 주부터 정산 중단". `docs/legal/README.md`의 변호사 질문에 추가.
- 처리방침 초안 🔸 [확인 필요]: 수집 항목에 "등록한 플랫폼 계정 주소와 채널 ID(계정 인증용)", 보유는 탈퇴 시까지.
- 크리에이터 FAQ: 새 질문 하나로 "캠페인 공개 이후, 인증한 내 계정에 올린 영상만" 규칙과 인증 방법을 안내한다(랜딩·llms.txt가 같은 목록을 쓴다). "화면 캡처" 표현 금지(기존 규칙).

## 7. 검증
- 순수 함수 테스트: 주소 정규화(핸들, 채널 ID, 잘못된 주소), 코드 생성·포함 판정, 유튜브 판정 4가지 거절과 통과, 정산 제외(표시 전 주 지급, 표시된 주부터 제외), 온보딩 통과 조건.
- DB: 마이그레이션 적용 뒤 실제 DB에서 `live_at` 트리거, 유튜브 직접 insert 거부, 서비스 역할 insert 허용을 쿼리로 확인.
- 화면: 로컬에서 내 채널 등록, 유튜브 제출 거절 문구, 운영자 확인 항목, 온보딩 스위치를 확인.

## 8. 범위 밖
틱톡·인스타그램 공식 API 연동(크리에이터 OAuth), 자동 재개, 이미 지급한 금액 회수, 생년월일 수집.
