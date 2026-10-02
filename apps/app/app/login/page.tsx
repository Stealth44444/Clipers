import { attributionFromParams } from '@clipers/db';
import { safeNextPath } from '@/lib/auth';
import LoginForm, { type FormMode } from './login-form';

type Query = Record<string, string | string[] | undefined>;

const MODES: FormMode[] = ['sign-in', 'sign-up', 'reset'];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === 'string') params.set(key, value);
  const mode = MODES.find((candidate) => candidate === query.mode) ?? 'sign-in';

  return (
    <LoginForm
      attribution={attributionFromParams(params)}
      callbackFailed={query.error === 'auth_callback_failed'}
      initialMode={mode}
      initialRole={query.role === 'brand' ? 'brand' : 'creator'}
      next={safeNextPath(typeof query.next === 'string' ? query.next : null)}
    />
  );
}
