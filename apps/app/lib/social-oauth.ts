import {
  newVerificationCode,
  refreshInstagramToken,
  refreshTikTokToken,
  type OAuthTokens,
  type SocialAccount,
  type SocialPlatform,
} from '@clipers/db';
import { decryptPii, encryptPii, piiEncryptionReady } from './pii-crypto';
import { getSupabaseAdminClient } from './supabase-admin';

// Connected TikTok and Instagram accounts (OAuth). Tokens are encrypted here before they reach channel_connections,
// which only the service role can read. See docs/superpowers/specs/2026-10-03-social-oauth-views-design.md.

export const OAUTH_PLATFORMS: Record<string, SocialPlatform> = { tiktok: 'tiktok', instagram: 'instagram_reels' };
export const OAUTH_STATE_COOKIE = 'clipers_oauth_state';

export function tiktokKeys() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  return clientKey && clientSecret ? { clientKey, clientSecret } : null;
}

export function instagramKeys() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  return appId && appSecret ? { appId, appSecret } : null;
}

/** Which platforms creators can connect right now: keys present and tokens can be encrypted. */
export function connectablePlatforms(): SocialPlatform[] {
  if (!piiEncryptionReady() || !process.env.NEXT_PUBLIC_APP_URL) return [];
  return [...(tiktokKeys() ? (['tiktok'] as const) : []), ...(instagramKeys() ? (['instagram_reels'] as const) : [])];
}

export function oauthRedirectUri(slug: string): string {
  return new URL(`/api/oauth/${slug}/callback`, process.env.NEXT_PUBLIC_APP_URL).toString();
}

export type SaveConnectionResult = { ok: true } | { ok: false; reason: 'taken' | 'failed' };

/**
 * Marks the account verified for this creator (reusing their unverified registration of it, if any) and stores its
 * tokens. An account another creator already verified is refused.
 */
export async function saveConnection(creatorId: string, platform: SocialPlatform, account: SocialAccount, tokens: OAuthTokens): Promise<SaveConnectionResult> {
  const admin = getSupabaseAdminClient();
  const { data: taken } = await admin
    .from('creator_channels')
    .select('id')
    .eq('platform', platform)
    .neq('creator_id', creatorId)
    .not('verified_at', 'is', null)
    .or(`external_id.eq."${account.externalId}",url.eq."${account.url}"`)
    .limit(1);
  if (taken && taken.length > 0) return { ok: false, reason: 'taken' };

  const { data: existing } = await admin
    .from('creator_channels')
    .select('id')
    .eq('creator_id', creatorId)
    .eq('platform', platform)
    .or(`external_id.eq."${account.externalId}",url.eq."${account.url}"`)
    .limit(1)
    .maybeSingle();
  const verified = { url: account.url, external_id: account.externalId, verified_at: new Date().toISOString(), verified_by: 'oauth' };
  const saved = existing
    ? await admin.from('creator_channels').update(verified).eq('id', existing.id).select('id').single()
    : await admin
        .from('creator_channels')
        .insert({ creator_id: creatorId, platform, verification_code: newVerificationCode(), ...verified })
        .select('id')
        .single();
  if (saved.error) return { ok: false, reason: saved.error.code === '23505' ? 'taken' : 'failed' };

  const { error } = await admin.from('channel_connections').upsert({
    channel_id: saved.data.id,
    platform,
    access_token_ciphertext: encryptPii(tokens.accessToken),
    refresh_token_ciphertext: tokens.refreshToken ? encryptPii(tokens.refreshToken) : null,
    access_expires_at: tokens.accessExpiresAt,
    refresh_expires_at: tokens.refreshExpiresAt,
    last_error: null,
    reconnect_notified_at: null,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, reason: 'failed' } : { ok: true };
}

export type ConnectionRow = {
  channel_id: string;
  platform: SocialPlatform;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  access_expires_at: string;
  refresh_expires_at: string | null;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * A usable access token for a connection, renewing it first when it is close to expiry (TikTok: within an hour of
 * its 24 hours; Instagram: within 10 days of its 60, and at least a day old). Saves renewed tokens.
 */
export async function accessTokenFor(connection: ConnectionRow, now = Date.now()): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const admin = getSupabaseAdminClient();
  const expires = Date.parse(connection.access_expires_at);
  const current = decryptPii(connection.access_token_ciphertext);
  let renewed: OAuthTokens | null = null;

  if (connection.platform === 'tiktok' && expires - now < HOUR) {
    const keys = tiktokKeys();
    if (!keys || !connection.refresh_token_ciphertext) return { ok: false, message: 'TikTok keys or refresh token missing' };
    const result = await refreshTikTokToken(keys, decryptPii(connection.refresh_token_ciphertext));
    if (!result.ok) return { ok: false, message: result.message };
    renewed = result.data;
  } else if (connection.platform === 'instagram_reels' && expires - now < 10 * DAY) {
    if (expires <= now) return { ok: false, message: 'Instagram token expired' };
    const result = await refreshInstagramToken(current);
    if (!result.ok) return { ok: false, message: result.message };
    renewed = result.data;
  }

  if (!renewed) return { ok: true, token: current };
  await admin
    .from('channel_connections')
    .update({
      access_token_ciphertext: encryptPii(renewed.accessToken),
      refresh_token_ciphertext: renewed.refreshToken ? encryptPii(renewed.refreshToken) : connection.refresh_token_ciphertext,
      access_expires_at: renewed.accessExpiresAt,
      refresh_expires_at: renewed.refreshExpiresAt ?? connection.refresh_expires_at,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('channel_id', connection.channel_id);
  return { ok: true, token: renewed.accessToken };
}
