import { safeNextPath } from '@/lib/auth';
import LoginForm from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <LoginForm callbackFailed={error === 'auth_callback_failed'} next={safeNextPath(next)} />;
}
