import { safeNextPath } from '@/lib/auth';
import LoginForm from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const { next, error, mode } = await searchParams;
  return (
    <LoginForm
      callbackFailed={error === 'auth_callback_failed'}
      initialMode={mode === 'sign-up' ? 'sign-up' : 'sign-in'}
      next={safeNextPath(next)}
    />
  );
}
