import { timingSafeEqual } from 'node:crypto';
import { exchangeInstagramCode, exchangeTikTokCode, fetchInstagramAccount, fetchTikTokAccount } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_PLATFORMS, OAUTH_STATE_COOKIE, connectablePlatforms, instagramKeys, oauthRedirectUri, saveConnection, tiktokKeys } from '@/lib/social-oauth';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const same = (left: string, right: string) => left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));

/** Where TikTok and Instagram send the creator back: checks the state, keeps the tokens, verifies the account. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: slug } = await params;
  const platform = OAUTH_PLATFORMS[slug];
  const back = (result: string) => {
    const url = new URL('/creator/settings', request.url);
    url.searchParams.set('connect', result);
    url.hash = 'channels';
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/api/oauth' });
    return response;
  };
  if (!platform || !connectablePlatforms().includes(platform)) return back('unavailable');

  const query = request.nextUrl.searchParams;
  const saved = request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? '';
  const state = query.get('state') ?? '';
  if (!state || !same(saved, `${slug}:${state}`)) return back('expired');
  const code = query.get('code');
  if (!code) return back(query.get('error') ? 'cancelled' : 'failed');

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const redirectUri = oauthRedirectUri(slug);
  const tokens = platform === 'tiktok' ? await exchangeTikTokCode(tiktokKeys()!, code, redirectUri) : await exchangeInstagramCode(instagramKeys()!, code, redirectUri);
  if (!tokens.ok) return back('failed');
  const account = platform === 'tiktok' ? await fetchTikTokAccount(tokens.data.accessToken) : await fetchInstagramAccount(tokens.data.accessToken);
  if (!account.ok) return back('failed');

  const result = await saveConnection(user.id, platform, account.data, tokens.data);
  return back(result.ok ? `${slug}-connected` : result.reason);
}
