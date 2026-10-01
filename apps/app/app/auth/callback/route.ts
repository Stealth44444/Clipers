import { NextRequest, NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNextPath(request.nextUrl.searchParams.get('next')) ?? '/creator';
  const failed = () => NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));

  if (!code) return failed();

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed();

  // Middleware sends the user on to onboarding or their own workspace if `next` doesn't fit.
  return NextResponse.redirect(new URL(next, request.url));
}
