'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@clipers/ui';
import { authErrorMessage } from '@/lib/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type FormMode = 'sign-in' | 'sign-up';

const WORKSPACE_BY_ROLE: Record<string, string> = { admin: '/admin', brand: '/brand', creator: '/creator' };

export default function LoginForm({ next, callbackFailed, initialMode = 'sign-in' }: { next: string | null; callbackFailed: boolean; initialMode?: FormMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(callbackFailed ? '인증 링크가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.' : '');
  const [submitting, setSubmitting] = useState(false);
  const isSignUp = mode === 'sign-up';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage(`${email}로 인증 메일을 보냈습니다. 메일의 링크를 열면 가입이 완료됩니다.`);
          return;
        }
        router.replace('/onboarding');
        router.refresh();
        return;
      }

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
    } catch (submitError) {
      setError(authErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isSignUp ? 'sign-in' : 'sign-up');
    setMessage('');
    setError('');
  }

  return (
    <main className="cl-auth">
      <section aria-labelledby="auth-title" className="cl-auth__card">
        <a className="cl-auth__logo" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </a>

        <div>
          <h1 className="cl-auth__title" id="auth-title">
            {isSignUp ? '계정 만들기' : '로그인'}
          </h1>
          <p className="cl-auth__subtitle">
            {isSignUp ? '가입 후 크리에이터 또는 브랜드로 시작할 수 있어요.' : 'Clipers 계정으로 계속하세요.'}
          </p>
        </div>

        <form className="cl-auth__form" onSubmit={handleSubmit}>
          {isSignUp && (
            <Field htmlFor="auth-name" label="이름">
              <Input
                autoComplete="name"
                id="auth-name"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="활동명 또는 브랜드명"
                required
                value={displayName}
              />
            </Field>
          )}
          <Field htmlFor="auth-email" label="이메일">
            <Input
              autoComplete="email"
              id="auth-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </Field>
          <Field hint={isSignUp ? '8자 이상 입력해 주세요.' : undefined} htmlFor="auth-password" label="비밀번호">
            <Input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              id="auth-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>

          {error && <p className="cl-alert cl-tone-tomato" role="alert">{error}</p>}
          {message && <p className="cl-alert cl-tone-brand" role="status">{message}</p>}

          <Button block disabled={submitting} size="lg" type="submit" variant="primary">
            {submitting ? '처리 중…' : isSignUp ? '계정 만들기' : '로그인'}
          </Button>
        </form>

        <p className="cl-auth__footer">
          {isSignUp ? '이미 계정이 있으신가요?' : '처음이신가요?'}{' '}
          <button className="cl-link" onClick={switchMode} type="button">
            {isSignUp ? '로그인' : '계정 만들기'}
          </button>
        </p>
      </section>
    </main>
  );
}
