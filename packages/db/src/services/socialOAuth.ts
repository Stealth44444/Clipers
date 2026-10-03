import { parseChannelUrl } from '../channels';
import { err, ok, type ServiceResult } from './errors';

// TikTok (Login Kit + Display API) and Instagram (Instagram API with Instagram login) for creators who connect their
// account: who the account is, which videos are theirs, and how many views they have. Endpoints checked against the
// official docs on 2026-10-03; see docs/superpowers/specs/2026-10-03-social-oauth-views-design.md.

export type SocialPlatform = 'tiktok' | 'instagram_reels';
export type OAuthTokens = { accessToken: string; refreshToken: string | null; accessExpiresAt: string; refreshExpiresAt: string | null };
export type SocialAccount = { externalId: string; username: string; url: string };
export type SocialVideo = { id: string; publishedAt: string; views: number | null };

export const TIKTOK_SCOPES = ['user.info.basic', 'user.info.profile', 'video.list'];
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'];

const TIKTOK_API = 'https://open.tiktokapis.com/v2';
const INSTAGRAM_GRAPH = 'https://graph.instagram.com';

const expiresAt = (seconds: unknown, now: number) => new Date(now + Math.max(0, Number(seconds) || 0) * 1000).toISOString();

export function tiktokAuthorizeUrl(clientKey: string, redirectUri: string, state: string): string {
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
  url.search = new URLSearchParams({ client_key: clientKey, response_type: 'code', scope: TIKTOK_SCOPES.join(','), redirect_uri: redirectUri, state }).toString();
  return url.toString();
}

export function instagramAuthorizeUrl(appId: string, redirectUri: string, state: string): string {
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.search = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: 'code', scope: INSTAGRAM_SCOPES.join(','), state }).toString();
  return url.toString();
}

/** The video id in a full TikTok link (…/video/123…); short links (vt.tiktok.com) need resolveTikTokVideoId. */
export function extractTikTokVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) return null;
    return url.pathname.match(/\/(?:video|v)\/(\d{10,25})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The shortcode in an Instagram post or reel link. */
export function extractInstagramShortcode(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
    return url.pathname.match(/^\/(?:[^/]+\/)?(?:reel|reels|p)\/([A-Za-z0-9_-]{5,})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** A TikTok video id from any share link, asking TikTok's public oEmbed when the link is short. */
export async function resolveTikTokVideoId(input: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const direct = extractTikTokVideoId(input);
  if (direct) return direct;
  try {
    const response = await fetcher(`https://www.tiktok.com/oembed?url=${encodeURIComponent(input.trim())}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as { html?: string };
    return body.html?.match(/data-video-id="(\d{10,25})"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** A video can be submitted once it was posted after the campaign went live. */
export function postedAfterLive(publishedAt: string, liveAt: string): boolean {
  return Date.parse(publishedAt) >= Date.parse(liveAt);
}

async function request<T>(fetcher: typeof fetch, input: string, init: RequestInit, label: string): Promise<ServiceResult<T>> {
  try {
    const response = await fetcher(input, { ...init, cache: 'no-store' });
    const body = (await response.json().catch(() => ({}))) as T & { error?: unknown; error_message?: string };
    if (!response.ok) return err(`${label}_HTTP_${response.status}`, JSON.stringify(body).slice(0, 300));
    return ok(body);
  } catch (cause) {
    return err(`${label}_REQUEST_FAILED`, cause instanceof Error ? cause.message : String(cause));
  }
}

// ---------- TikTok ----------

type TikTokTokenBody = { access_token?: string; refresh_token?: string; expires_in?: number; refresh_expires_in?: number; open_id?: string; error?: string; error_description?: string };

function tiktokTokens(body: TikTokTokenBody, now: number): ServiceResult<OAuthTokens & { openId: string }> {
  if (!body.access_token || !body.refresh_token || !body.open_id) return err('TIKTOK_TOKEN', body.error_description ?? body.error ?? 'no token in response');
  return ok({
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    accessExpiresAt: expiresAt(body.expires_in, now),
    refreshExpiresAt: expiresAt(body.refresh_expires_in, now),
    openId: body.open_id,
  });
}

const form = (values: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(values).toString(),
});

export async function exchangeTikTokCode(
  keys: { clientKey: string; clientSecret: string },
  code: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
  now = Date.now()
): Promise<ServiceResult<OAuthTokens & { openId: string }>> {
  const result = await request<TikTokTokenBody>(
    fetcher,
    `${TIKTOK_API}/oauth/token/`,
    form({ client_key: keys.clientKey, client_secret: keys.clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
    'TIKTOK_TOKEN'
  );
  return result.ok ? tiktokTokens(result.data, now) : result;
}

export async function refreshTikTokToken(
  keys: { clientKey: string; clientSecret: string },
  refreshToken: string,
  fetcher: typeof fetch = fetch,
  now = Date.now()
): Promise<ServiceResult<OAuthTokens & { openId: string }>> {
  const result = await request<TikTokTokenBody>(
    fetcher,
    `${TIKTOK_API}/oauth/token/`,
    form({ client_key: keys.clientKey, client_secret: keys.clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
    'TIKTOK_TOKEN'
  );
  return result.ok ? tiktokTokens(result.data, now) : result;
}

export async function revokeTikTokToken(keys: { clientKey: string; clientSecret: string }, accessToken: string, fetcher: typeof fetch = fetch): Promise<void> {
  await request(fetcher, `${TIKTOK_API}/oauth/revoke/`, form({ client_key: keys.clientKey, client_secret: keys.clientSecret, token: accessToken }), 'TIKTOK_REVOKE');
}

type TikTokEnvelope<T> = { data?: T; error?: { code?: string; message?: string } };

export async function fetchTikTokAccount(accessToken: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<SocialAccount>> {
  const result = await request<TikTokEnvelope<{ user?: { open_id?: string; username?: string } }>>(
    fetcher,
    `${TIKTOK_API}/user/info/?fields=open_id,username,display_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    'TIKTOK_USER'
  );
  if (!result.ok) return result;
  const user = result.data.data?.user;
  const url = user?.username ? parseChannelUrl('tiktok', `https://www.tiktok.com/@${user.username}`)?.url : null;
  if (!user?.open_id || !user.username || !url) return err('TIKTOK_USER', result.data.error?.message ?? 'no user in response');
  return ok({ externalId: user.open_id, username: user.username, url });
}

/** The creator's own videos among `ids` (TikTok only returns videos of the token's account), 20 per request. */
export async function queryTikTokVideos(accessToken: string, ids: string[], fetcher: typeof fetch = fetch): Promise<ServiceResult<Map<string, SocialVideo>>> {
  const videos = new Map<string, SocialVideo>();
  for (let index = 0; index < ids.length; index += 20) {
    const result = await request<TikTokEnvelope<{ videos?: Array<{ id?: string; view_count?: number; create_time?: number }> }>>(
      fetcher,
      `${TIKTOK_API}/video/query/?fields=id,view_count,create_time`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: { video_ids: ids.slice(index, index + 20) } }),
      },
      'TIKTOK_VIDEOS'
    );
    if (!result.ok) return result;
    if (result.data.error?.code && result.data.error.code !== 'ok') return err('TIKTOK_VIDEOS', result.data.error.message ?? result.data.error.code);
    for (const video of result.data.data?.videos ?? []) {
      if (!video.id || !video.create_time) continue;
      videos.set(video.id, {
        id: video.id,
        publishedAt: new Date(video.create_time * 1000).toISOString(),
        views: Number.isSafeInteger(video.view_count) ? (video.view_count as number) : null,
      });
    }
  }
  return ok(videos);
}

// ---------- Instagram ----------

/** Code → short-lived token (1 hour) → long-lived token (60 days). */
export async function exchangeInstagramCode(
  keys: { appId: string; appSecret: string },
  code: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
  now = Date.now()
): Promise<ServiceResult<OAuthTokens>> {
  const short = await request<{ access_token?: string; error_message?: string }>(
    fetcher,
    'https://api.instagram.com/oauth/access_token',
    form({ client_id: keys.appId, client_secret: keys.appSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
    'INSTAGRAM_TOKEN'
  );
  if (!short.ok) return short;
  if (!short.data.access_token) return err('INSTAGRAM_TOKEN', short.data.error_message ?? 'no token in response');
  const long = await request<{ access_token?: string; expires_in?: number }>(
    fetcher,
    `${INSTAGRAM_GRAPH}/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: keys.appSecret, access_token: short.data.access_token })}`,
    {},
    'INSTAGRAM_LONG_TOKEN'
  );
  if (!long.ok) return long;
  if (!long.data.access_token) return err('INSTAGRAM_LONG_TOKEN', 'no token in response');
  return ok({ accessToken: long.data.access_token, refreshToken: null, accessExpiresAt: expiresAt(long.data.expires_in, now), refreshExpiresAt: null });
}

/** A long-lived token renewed for another 60 days (it must be at least a day old). */
export async function refreshInstagramToken(accessToken: string, fetcher: typeof fetch = fetch, now = Date.now()): Promise<ServiceResult<OAuthTokens>> {
  const result = await request<{ access_token?: string; expires_in?: number }>(
    fetcher,
    `${INSTAGRAM_GRAPH}/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken })}`,
    {},
    'INSTAGRAM_REFRESH'
  );
  if (!result.ok) return result;
  if (!result.data.access_token) return err('INSTAGRAM_REFRESH', 'no token in response');
  return ok({ accessToken: result.data.access_token, refreshToken: null, accessExpiresAt: expiresAt(result.data.expires_in, now), refreshExpiresAt: null });
}

export async function fetchInstagramAccount(accessToken: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<SocialAccount>> {
  const result = await request<{ user_id?: string; id?: string; username?: string }>(
    fetcher,
    `${INSTAGRAM_GRAPH}/me?${new URLSearchParams({ fields: 'user_id,username', access_token: accessToken })}`,
    {},
    'INSTAGRAM_USER'
  );
  if (!result.ok) return result;
  const externalId = result.data.user_id ?? result.data.id;
  const url = result.data.username ? parseChannelUrl('instagram_reels', `https://www.instagram.com/${result.data.username}`)?.url : null;
  if (!externalId || !result.data.username || !url) return err('INSTAGRAM_USER', 'no user in response');
  return ok({ externalId: String(externalId), username: result.data.username, url });
}

/** The connected account's post with this shortcode, looking through its latest posts (up to `maxPages` × 50). */
export async function findInstagramMedia(accessToken: string, shortcode: string, fetcher: typeof fetch = fetch, maxPages = 6): Promise<ServiceResult<SocialVideo | null>> {
  let next: string | null = `${INSTAGRAM_GRAPH}/me/media?${new URLSearchParams({ fields: 'id,shortcode,timestamp', limit: '50', access_token: accessToken })}`;
  for (let page = 0; next && page < maxPages; page += 1) {
    const result: ServiceResult<{ data?: Array<{ id?: string; shortcode?: string; timestamp?: string }>; paging?: { next?: string } }> = await request(
      fetcher,
      next,
      {},
      'INSTAGRAM_MEDIA'
    );
    if (!result.ok) return result;
    const match = (result.data.data ?? []).find((media) => media.shortcode === shortcode);
    if (match?.id && match.timestamp) return ok({ id: match.id, publishedAt: new Date(match.timestamp).toISOString(), views: null });
    next = result.data.paging?.next ?? null;
  }
  return ok(null);
}

/** Lifetime views of one post; null when Instagram no longer returns it (deleted, or no longer the account's). */
export async function fetchInstagramViews(accessToken: string, mediaId: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<number | null>> {
  const result = await request<{ data?: Array<{ name?: string; values?: Array<{ value?: number }>; total_value?: { value?: number } }> }>(
    fetcher,
    `${INSTAGRAM_GRAPH}/${mediaId}/insights?${new URLSearchParams({ metric: 'views', access_token: accessToken })}`,
    {},
    'INSTAGRAM_INSIGHTS'
  );
  // 400 with code 190 is a token problem; other 400s mean the post is gone or no longer this account's.
  if (!result.ok) return result.code === 'INSTAGRAM_INSIGHTS_HTTP_400' && !result.message.includes('"code":190') ? ok(null) : result;
  const metric = (result.data.data ?? []).find((entry) => entry.name === 'views');
  const value = metric?.values?.[0]?.value ?? metric?.total_value?.value;
  return ok(Number.isSafeInteger(value) ? (value as number) : null);
}
