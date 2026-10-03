'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button, ButtonLink, Field, IconButton, Input } from '@clipers/ui';
import AuthStatus from '@/components/auth-status';
import { authErrorMessage } from '@/lib/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { siteUrl } from '@/lib/urls';

// The page the password-reset mail lands on: /auth/callback has already turned the link into a session, so a new
// password is all that is left. Without a session the link was used, expired or never valid.

const WORKSPACE_BY_ROLE: Record<string, string> = { admin: '/admin', brand: '/brand', creator: '/creator' };
const MIN_PASSWORD = 8;

export default function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => setState(data.session ? 'ready' : 'expired'))
      .catch(() => setState('expired'));
  }, []);

  const mismatch = confirm !== '' && confirm !== password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    setError('');
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      router.replace(WORKSPACE_BY_ROLE[profile?.role ?? 'creator']);
      router.refresh();
    } catch (submitError) {
      setError(authErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  return (
    <main className="cl-auth">
      <section aria-labelledby="auth-title" className="cl-auth__card">
        <a className="cl-auth__logo" href={siteUrl('/')}>
          <img alt="Clipers" src="/logo/clipers-wordmark.svg" />
        </a>

        {state === 'expired' ? (
          <>
            <div>
              <h1 className="cl-auth__title" id="auth-title">
                링크가 만료됐어요
              </h1>
              <p className="cl-auth__subtitle">재설정 링크는 한 번만 쓸 수 있고, 시간이 지나면 만료돼요. 다시 요청해 주세요.</p>
            </div>
            <ButtonLink block href="/login?mode=reset" size="lg" variant="primary">
              재설정 메일 다시 받기
            </ButtonLink>
          </>
        ) : (
          <>
            <div>
              <h1 className="cl-auth__title" id="auth-title">
                새 비밀번호
              </h1>
              <p className="cl-auth__subtitle">새 비밀번호를 정하면 바로 로그인돼요.</p>
            </div>
            <form className="cl-auth__form" onSubmit={handleSubmit}>
              <Field hint={`${MIN_PASSWORD}자 이상 입력해 주세요.`} htmlFor="new-password" label="새 비밀번호">
                <div className="cl-auth__secret">
                  <Input
                    autoComplete="new-password"
                    autoFocus
                    disabled={state !== 'ready'}
                    id="new-password"
                    minLength={MIN_PASSWORD}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={show ? 'text' : 'password'}
                    value={password}
                  />
                  <IconButton label={show ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShow(!show)}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </div>
              </Field>
              <Field error={mismatch ? '비밀번호가 서로 달라요.' : null} htmlFor="confirm-password" label="새 비밀번호 확인">
                <Input
                  autoComplete="new-password"
                  disabled={state !== 'ready'}
                  id="confirm-password"
                  minLength={MIN_PASSWORD}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  type={show ? 'text' : 'password'}
                  value={confirm}
                />
              </Field>
              {error && <AuthStatus message={error} />}
              <Button block disabled={state !== 'ready' || submitting || mismatch} size="lg" type="submit" variant="primary">
                {submitting ? '저장 중…' : '비밀번호 바꾸기'}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
