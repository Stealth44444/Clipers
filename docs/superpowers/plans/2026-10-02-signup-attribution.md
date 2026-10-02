# 회원가입 개선과 유입 경로 수집 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가입자가 어디서 왔는지(자동 수집 + 자기 보고) 남기고, 진입 경로에 맞는 가입 화면, 인증 메일 다시 보내기, 비밀번호 재설정을 넣는다.

**Architecture:** 사이트는 첫 방문 유입 정보를 세션 저장소에 두었다가 앱 로그인 링크에 쿼리로 붙인다. 앱은 그 값을 `signUp` 메타데이터로 보내고, DB 트리거가 `signup_attributions`에 적는다. 온보딩의 자기 보고는 `complete_onboarding`의 새 인자로 같은 행에 들어간다.

**Tech Stack:** Next.js 15, Supabase Auth(PKCE), Postgres 트리거/RLS, vitest.

설계: `docs/superpowers/specs/2026-10-02-signup-attribution-design.md`

---

### Task 1: `packages/db` — 유입 정보 모델과 온보딩 단계

**Files:** Create `packages/db/src/attribution.ts`, `packages/db/src/attribution.test.ts`. Modify `packages/db/src/onboarding.ts`, `packages/db/src/onboarding.test.ts`, `packages/db/src/index.ts`.

- [ ] 테스트 작성: `captureAttribution`이 utm·ref·referrer host·landing path를 잘라 담고, 사이트 자신의 리퍼러는 비우며, 200자를 넘기지 않는다. `attributionToParams` ↔ `attributionFromParams` 왕복. `HEARD_FROM_OPTIONS` id 유일.
- [ ] 온보딩 테스트 수정: `onboardingSteps`에 `source`가 `terms` 앞에 있고, `canContinueOnboarding('source')`는 항상 true, `emptyOnboardingAnswers().heardFrom === null`.
- [ ] 구현. `index.ts`에서 export.
- [ ] `pnpm --filter @clipers/db test` 통과. 커밋.

### Task 2: 마이그레이션

**Files:** Create `supabase/migrations/20261002<time>_signup_attributions.sql`.

- [ ] 테이블·check·RLS·grant, `handle_new_user` 교체(attribution jsonb → 행 insert, 키별 200자 left()), `complete_onboarding` 4인자 drop → 5인자 create, revoke/grant.
- [ ] `onboarding.test.ts`의 `heard_from` id가 마이그레이션 check와 같은지 확인하는 테스트 추가(interests와 같은 방식).
- [ ] 커밋. **호스팅 DB 적용은 회사 확인 후.**

### Task 3: 사이트 — 유입 기록과 역할 링크

**Files:** Create `apps/site/components/attribution-carrier.tsx`. Modify `apps/site/app/layout.tsx`, `apps/site/components/landing-chrome.tsx`, `apps/site/app/page.tsx`, `apps/site/app/brands/page.tsx`, `apps/site/components/guide-article.tsx`, `apps/site/components/site-shell.tsx`, `apps/site/lib/brand-page.test.ts`(필요 시).

- [ ] `signUpUrl(role)` 추가, 호출처 교체. 브랜드 페이지 `signUpHref={signUpUrl('brand')}`.
- [ ] carrier: 마운트 때 `captureAttribution` 저장(이미 있으면 유지), 문서 `click`/`auxclick` 위임으로 `APP_URL + '/login'` 링크에 `attributionToParams` 부착.
- [ ] `pnpm --filter @clipers/site test`, tsc. 커밋.

### Task 4: 앱 — 가입·로그인 화면

**Files:** Modify `apps/app/app/login/page.tsx`, `login-form.tsx`, `apps/app/lib/auth.ts`. Create `apps/app/app/reset-password/page.tsx`, `reset-password-form.tsx`. Modify `packages/ui/src/styles/components.css`.

- [ ] page: `role`, `a_*` 쿼리 파싱 → 폼 props.
- [ ] form: 역할 세그먼트·제목·부제·이름 힌트, 비밀번호 토글, 입력 안내, 메타데이터(`requested_role`, `attribution`), 메일 확인 화면(다시 보내기 60초), 재설정 모드.
- [ ] reset-password: 세션 확인 → 새 비밀번호 → `updateUser` → 워크스페이스.
- [ ] `auth.ts` 문구 추가. tsc. 커밋.

### Task 5: 앱 — 온보딩

**Files:** Modify `apps/app/app/onboarding/page.tsx`, `onboarding-flow.tsx`.

- [ ] page에서 세션 프로필 role → `initialRole`. 역할 단계 미리 선택, 배지 제거.
- [ ] `source` 단계 UI, `p_heard_from` 전달. tsc. 커밋.

### Task 6: 운영자 — 가입 경로 표

**Files:** Modify `apps/app/lib/admin-data.ts`, `apps/app/app/admin/page.tsx`.

- [ ] `getSignupSources(days=30)`: 행을 읽어 채널별·utm_source별·역할별 집계(순수 함수는 `packages/db`에 두고 테스트).
- [ ] 현황 페이지에 섹션 추가. tsc. 커밋.

### Task 7: 처리방침 초안

**Files:** Modify `apps/app/content/legal/privacy.md`.

- [ ] 1·2·8절에 🔸 행·문장 추가. 커밋.

### Task 8: 확인

- [ ] 앱 dev 서버(3000)로 가입(브랜드/크리에이터), 메일 확인 화면, 재설정 화면을 1440·390에서 캡처.
- [ ] 보고: 바꾼 것, 캡처, 대표가 정할 것(마이그레이션 적용, 처리방침 확인, Resend), 확인하지 못한 것(실제 메일 발송, 온보딩 캡처는 로그인 필요).
