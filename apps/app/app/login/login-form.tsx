'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type FormMode = 'sign-in' | 'sign-up';
type SignUpRole = 'creator' | 'brand';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>('sign-in');
  const [signUpRole, setSignUpRole] = useState<SignUpRole>('creator');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: displayName.trim(), requested_role: signUpRole },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/${signUpRole === 'brand' ? 'brand' : 'creator'}`,
          },
        });

        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('가입 확인 메일을 보냈습니다. 메일의 링크를 열어 가입을 완료해 주세요.');
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user?.id)
        .maybeSingle();
      const destination =
        profile?.role === 'admin' ? '/admin' : profile?.role === 'brand' ? '/brand' : '/creator';

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '요청을 처리하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-page app-auth-page">
      <section className="app-auth-panel" aria-labelledby="auth-title">
        <a className="app-wordmark" href="/">
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </a>
        <h1 id="auth-title">
          {mode === 'sign-in' ? '다시 오셨네요' : signUpRole === 'brand' ? '브랜드로 시작하기' : '크리에이터로 시작하기'}
        </h1>
        <p className="app-muted">
          {mode === 'sign-in'
            ? '계정에 로그인해 작업을 이어가세요.'
            : signUpRole === 'brand'
              ? '가입 후 캠페인을 개설할 수 있습니다.'
              : '가입 후 공개 캠페인에 지원할 수 있습니다.'}
        </p>

        <form className="app-form" onSubmit={handleSubmit}>
          {mode === 'sign-up' && (
            <div className="app-action-row" role="radiogroup" aria-label="가입 유형">
              <label>
                <input
                  checked={signUpRole === 'creator'}
                  onChange={() => setSignUpRole('creator')}
                  type="radio"
                  value="creator"
                />
                {' '}크리에이터로 가입
              </label>
              <label>
                <input
                  checked={signUpRole === 'brand'}
                  onChange={() => setSignUpRole('brand')}
                  type="radio"
                  value="brand"
                />
                {' '}브랜드로 가입
              </label>
            </div>
          )}
          {mode === 'sign-up' && (
            <label>
              이름
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
          )}
          <label>
            이메일
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            비밀번호
            <input
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button className="app-button app-button-primary" disabled={submitting} type="submit">
            {submitting ? '처리 중...' : mode === 'sign-in' ? '로그인' : '계정 만들기'}
          </button>
        </form>

        {message && <p className="app-message" role="status">{message}</p>}
        {error && <p className="app-error" role="alert">{error}</p>}

        <p className="app-auth-switch">
          {mode === 'sign-in' ? '처음이신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            className="app-link-button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage('');
              setError('');
            }}
            type="button"
          >
            {mode === 'sign-in' ? '회원가입' : '로그인'}
          </button>
        </p>
      </section>
    </main>
  );
}