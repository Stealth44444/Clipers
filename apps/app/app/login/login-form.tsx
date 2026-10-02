'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import type { Attribution, OnboardingRole } from '@clipers/db';
import { Button, Field, IconButton, Input, Tabs } from '@clipers/ui';
import { authErrorMessage } from '@/lib/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// Sign-in, sign-up and password reset on one card. Sign-up opens for the role the visitor came for (the site's
// links say which) and sends the role plus the site's attribution as user metadata; a database trigger stores
// both as the account is created. Design: docs/superpowers/specs/2026-10-02-signup-attribution-design.md.

export type FormMode = 'sign-in' | 'sign-up' | 'reset';

const WORKSPACE_BY_ROLE: Record<string, string> = { admin: '/admin', brand: '/brand', creator: '/creator' };
const ROLE_TABS: { value: OnboardingRole; label: string }[] = [
  { value: 'creator', label: '크리에이터' },
  { value: 'brand', label: '브랜드' },
];
const ROLE_COPY: Record<OnboardingRole, { title: string; subtitle: string; nameLabel: string; namePlaceholder: string }> = {
  creator: { title: '크리에이터 계정 만들기', subtitle: '숏폼을 올리고 검증된 조회수만큼 받아요.', nameLabel: '활동명', namePlaceholder: '채널에서 쓰는 이름' },
  brand: { title: '브랜드 계정 만들기', subtitle: '캠페인을 열고 검증된 조회수만큼만 예산을 써요.', nameLabel: '브랜드명', namePlaceholder: '회사 또는 브랜드 이름' },
};
const MIN_PASSWORD = 8;
const RESEND_WAIT = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Sent = { kind: 'signup' | 'reset'; email: string };

export default function LoginForm({
  next,
  callbackFailed,
  initialMode = 'sign-in',
  initialRole = 'creator',
  attribution = null,
}: {
  next: string | null;
  callbackFailed: boolean;
  initialMode?: FormMode;
  initialRole?: OnboardingRole;
  attribution?: Attribution | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [role, setRole] = useState<OnboardingRole>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState(callbackFailed ? '인증 링크가 만료됐거나 올바르지 않아요. 다시 로그인해 주세요.' : '');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [wait, setWait] = useState(0);

  const isSignUp = mode === 'sign-up';
  const copy = ROLE_COPY[role];
  const emailError = touched.email && email !== '' && !EMAIL.test(email) ? '이메일 주소 형식을 확인해 주세요.' : null;
  const passwordError = isSignUp && touched.password && password.length > 0 && password.length < MIN_PASSWORD ? `${MIN_PASSWORD}자 이상 입력해 주세요.` : null;

  // The resend button opens again after a minute, so one tap cannot flood the mailbox or the mail quota.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const callbackUrl = (to: string) => `${window.location.origin}/auth/callback?next=${to}`;

  async function sendSignUpMail() {
    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: displayName.trim(), requested_role: role, ...(attribution ? { attribution } : {}) },
        emailRedirectTo: callbackUrl('/onboarding'),
      },
    });
    if (signUpError) throw signUpError;
    if (data.session) {
      router.replace('/onboarding');
      router.refresh();
      return;
    }
    setSent({ kind: 'signup', email });
    setWait(RESEND_WAIT);
  }

  async function sendResetMail(to: string) {
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(to, { redirectTo: callbackUrl('/reset-password') });
    if (resetError) throw resetError;
    setSent({ kind: 'reset', email: to });
    setWait(RESEND_WAIT);
  }

  async function signIn() {
    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    // Middleware reroutes to onboarding or the right workspace when `next` doesn't fit this account.
    let destination = next;
    if (!destination) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      destination = WORKSPACE_BY_ROLE[profile?.role ?? 'creator'];
    }
    router.replace(destination);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'sign-up') await sendSignUpMail();
      else if (mode === 'reset') await sendResetMail(email);
      else await signIn();
    } catch (submitError) {
      setError(authErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!sent || wait > 0) return;
    setError('');
    setSubmitting(true);
    try {
      if (sent.kind === 'reset') await sendResetMail(sent.email);
      else {
        const { error: resendError } = await getSupabaseBrowserClient().auth.resend({
          type: 'signup',
          email: sent.email,
          options: { emailRedirectTo: callbackUrl('/onboarding') },
        });
        if (resendError) throw resendError;
        setWait(RESEND_WAIT);
      }
    } catch (resendError) {
      setError(authErrorMessage(resendError));
    } finally {
      setSubmitting(false);
    }
  }

  function switchTo(nextMode: FormMode) {
    setMode(nextMode);
    setSent(null);
    setError('');
    setTouched({ email: false, password: false });
  }

  const passwordField = (
    <Field
      error={passwordError}
      hint={isSignUp ? `${MIN_PASSWORD}자 이상 입력해 주세요.` : undefined}
      htmlFor="auth-password"
      label="비밀번호"
    >
      <div className="cl-auth__secret">
        <Input
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          id="auth-password"
          minLength={MIN_PASSWORD}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          onChange={(event) => setPassword(event.target.value)}
          required
          type={showPassword ? 'text' : 'password'}
          value={password}
        />
        <IconButton label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconButton>
      </div>
    </Field>
  );

  return (
    <main className="cl-auth">
      <section aria-labelledby="auth-title" className="cl-auth__card">
        <a className="cl-auth__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </a>

        {sent ? (
          <>
            <div>
              <h1 className="cl-auth__title" id="auth-title">
                {sent.kind === 'signup' ? '메일을 확인해 주세요' : '재설정 메일을 보냈어요'}
              </h1>
              <p className="cl-auth__subtitle">
                <strong>{sent.email}</strong>로 {sent.kind === 'signup' ? '인증 메일을 보냈어요. 메일의 링크를 열면 가입이 끝나요.' : '보냈어요. 메일의 링크를 열어 새 비밀번호를 정해 주세요.'}
              </p>
            </div>
            <p className="cl-auth__note">메일이 안 보이면 스팸함도 확인해 주세요. 몇 분이 걸릴 수 있어요.</p>
            {error && <p className="cl-alert cl-tone-tomato" role="alert">{error}</p>}
            <Button block disabled={wait > 0 || submitting} onClick={() => void resend()} size="lg" variant="secondary">
              {wait > 0 ? `다시 보내기 (${wait}초)` : submitting ? '보내는 중…' : '다시 보내기'}
            </Button>
            <p className="cl-auth__footer">
              <button className="cl-link" onClick={() => switchTo(sent.kind === 'signup' ? 'sign-up' : 'sign-in')} type="button">
                {sent.kind === 'signup' ? '다른 이메일로 가입' : '로그인으로 돌아가기'}
              </button>
            </p>
          </>
        ) : (
          <>
            {isSignUp && <Tabs items={ROLE_TABS} label="가입 유형" onChange={setRole} value={role} />}
            <div>
              <h1 className="cl-auth__title" id="auth-title">
                {mode === 'sign-up' ? copy.title : mode === 'reset' ? '비밀번호 재설정' : '로그인'}
              </h1>
              <p className="cl-auth__subtitle">
                {mode === 'sign-up' ? copy.subtitle : mode === 'reset' ? '가입한 이메일로 재설정 링크를 보내 드려요.' : 'Clipers 계정으로 계속하세요.'}
              </p>
            </div>

            <form className="cl-auth__form" onSubmit={handleSubmit}>
              {isSignUp && (
                <Field htmlFor="auth-name" label={copy.nameLabel}>
                  <Input
                    autoComplete={role === 'brand' ? 'organization' : 'nickname'}
                    autoFocus
                    id="auth-name"
                    maxLength={50}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={copy.namePlaceholder}
                    required
                    value={displayName}
                  />
                </Field>
              )}
              <Field error={emailError} htmlFor="auth-email" label="이메일">
                <Input
                  autoComplete="email"
                  autoFocus={!isSignUp}
                  id="auth-email"
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
              </Field>
              {mode !== 'reset' && passwordField}
              {mode === 'sign-in' && (
                <p className="cl-auth__forgot">
                  <button className="cl-link" onClick={() => switchTo('reset')} type="button">
                    비밀번호를 잊으셨나요?
                  </button>
                </p>
              )}

              {error && <p className="cl-alert cl-tone-tomato" role="alert">{error}</p>}

              <Button block disabled={submitting} size="lg" type="submit" variant="primary">
                {submitting ? '처리 중…' : mode === 'sign-up' ? '계정 만들기' : mode === 'reset' ? '재설정 메일 보내기' : '로그인'}
              </Button>
            </form>

            <p className="cl-auth__footer">
              {mode === 'reset' ? (
                <button className="cl-link" onClick={() => switchTo('sign-in')} type="button">
                  로그인으로 돌아가기
                </button>
              ) : (
                <>
                  {isSignUp ? '이미 계정이 있으신가요?' : '처음이신가요?'}{' '}
                  <button className="cl-link" onClick={() => switchTo(isSignUp ? 'sign-in' : 'sign-up')} type="button">
                    {isSignUp ? '로그인' : '계정 만들기'}
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
