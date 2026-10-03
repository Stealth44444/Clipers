# 인증 메일 템플릿 (Supabase Auth)

Supabase가 보내는 인증 메일은 기본값이 영어("Reset your password")다. 앱이 쓰는 두 가지를 알림 메일(`packages/db/src/notifications.ts`)과 같은 디자인의 한국어 템플릿으로 바꾼다. 2026-10-03 작성.

## 붙여 넣는 곳

Supabase 대시보드 → Authentication → Emails → Templates. 템플릿마다 **Subject**와 **Message body**(Source 보기)를 아래 파일 내용으로 바꾸고 저장한다.

| Supabase 템플릿 | Subject | Message body |
|---|---|---|
| Confirm signup | `Clipers 가입을 확인해 주세요` | `confirm-signup.html` 전체 |
| Reset password | `Clipers 비밀번호를 다시 설정해 주세요` | `reset-password.html` 전체 |

- 앱은 가입 확인(`signUp`, 확인 메일 다시 보내기)과 비밀번호 재설정(`resetPasswordForEmail`)만 쓴다. Magic Link·Invite·Change Email·Reauthentication은 쓰지 않으므로 기본값 그대로 둔다.
- 링크는 `{{ .ConfirmationURL }}`이 아니라 `https://app.clipers.site/auth/callback?next=…&type=…&token_hash={{ .TokenHash }}`로 직접 만든다. `ConfirmationURL`은 PKCE 코드를 돌려줘서 메일을 요청한 브라우저에서만 열리고, 다른 브라우저·휴대폰에서 열면 "인증 링크가 만료됐거나" 오류가 난다(2026-10-03 운영에서 확인). `token_hash`는 어디서 열어도 `/auth/callback`의 `verifyOtp`로 처리된다. 가입은 `type=email`, 재설정은 `type=recovery`.
- 보내는 이름·주소는 SMTP 설정(Sender name `Clipers`, `noreply@clipers.site`)을 따른다.
- 로고 이미지(`app.clipers.site/logo/clipers-email-mark.png`)는 잠금 예외 경로로 열려 있어야 보인다. 그 예외는 다음 배포에 포함된다(2026-10-03 확인 시 운영은 아직 401). 안 보여도 메일은 정상이다.

## 확인 방법

저장한 뒤 로그인 화면에서 "비밀번호 재설정"을 요청한다. Resend → Emails에서 제목이 `Clipers 비밀번호를 다시 설정해 주세요`로 바뀌어 나가는지 본다.

## 문구 규칙

사이트·앱과 같다: 해요체, 영어 라벨 없음, "화면 캡처" 같은 표현 없음. 문구를 바꾸면 이 폴더의 HTML도 함께 고친다(대시보드에만 고치면 기록이 남지 않는다).
