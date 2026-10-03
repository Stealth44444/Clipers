import { randomBytes } from 'node:crypto';
import { instagramAuthorizeUrl, tiktokAuthorizeUrl } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_PLATFORMS, OAUTH_STATE_COOKIE, connectablePlatforms, instagramKeys, oauthRedirectUri, tiktokKeys } from '@/lib/social-oauth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** Sends a signed-in creator to TikTok or Instagram to connect an account, with a one-time state in a cookie. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: slug } = await params;
  const platform = OAUTH_PLATFORMS[slug];
  const settings = new URL('/creator/settings#channels', request.url);
  if (!platform || !connectablePlatforms().includes(platform)) return NextResponse.redirect(settings);

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'creator') return NextResponse.redirect(settings);

  const state = randomBytes(24).toString('base64url');
  const redirectUri = oauthRedirectUri(slug);
  const target =
    platform === 'tiktok' ? tiktokAuthorizeUrl(tiktokKeys()!.clientKey, redirectUri, state) : instagramAuthorizeUrl(instagramKeys()!.appId, redirectUri, state);

  const response = NextResponse.redirect(target);
  response.cookies.set(OAUTH_STATE_COOKIE, `${slug}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/oauth',
    maxAge: 600,
  });
  return response;
}
