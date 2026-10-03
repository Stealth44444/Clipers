import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { safeNextPath } from '@/lib/auth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Links from our email templates carry token_hash and work in any browser.
// A `code` (PKCE) only works in the browser that asked for the mail, so it stays for older mails.
const EMAIL_LINK_TYPES: readonly EmailOtpType[] = ['email', 'recovery'];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = EMAIL_LINK_TYPES.find((value) => value === params.get('type'));
  const next = safeNextPath(params.get('next')) ?? '/creator';
  const failed = () => NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));

  const supabase = await getSupabaseServerClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return failed();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed();
  } else {
    return failed();
  }

  // Middleware sends the user on to onboarding or their own workspace if `next` doesn't fit.
  return NextResponse.redirect(new URL(next, request.url));
}
