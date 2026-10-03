import { timingSafeEqual } from 'node:crypto';
import { fetchInstagramViews, queryTikTokVideos } from '@clipers/db';
import { NextRequest, NextResponse } from 'next/server';
import { accessTokenFor, type ConnectionRow } from '@/lib/social-oauth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Once a day: views of approved TikTok and Reels clips that the server matched to a connected account, read with that
// account's token and stored like the YouTube collection (view_snapshots, source 'api'). A video the account no
// longer returns is marked missing, which stops its settlement from that week (the same column YouTube uses).

type ClipRow = { id: string; platform: 'tiktok' | 'instagram_reels'; creator_id: string; external_video_id: string; video_channel_id: string | null };

function isAuthorized(request: NextRequest, secret: string): boolean {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'Cron endpoint is not configured.' }, { status: 503 });
  if (!isAuthorized(request, cronSecret)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: clipData, error } = await admin
    .from('clips')
    .select('id, platform, creator_id, external_video_id, video_channel_id')
    .eq('status', 'approved')
    .in('platform', ['tiktok', 'instagram_reels'])
    .not('external_video_id', 'is', null)
    .is('unavailable_at', null)
    .order('id')
    .limit(2000);
  if (error) return NextResponse.json({ error: 'Could not load clips.' }, { status: 502 });
  const clips = (clipData ?? []) as ClipRow[];
  if (clips.length === 0) return NextResponse.json({ snapshots: 0, unavailable: 0, failedAccounts: 0 });

  // Each clip belongs to the connected account it was matched to (platform + account id).
  const { data: channelData } = await admin
    .from('creator_channels')
    .select('id, creator_id, platform, external_id')
    .eq('verified_by', 'oauth')
    .in('creator_id', [...new Set(clips.map((clip) => clip.creator_id))]);
  const channels = (channelData ?? []) as Array<{ id: string; creator_id: string; platform: string; external_id: string | null }>;
  const { data: connectionData } = await admin
    .from('channel_connections')
    .select('channel_id, platform, access_token_ciphertext, refresh_token_ciphertext, access_expires_at, refresh_expires_at, reconnect_notified_at')
    .in('channel_id', channels.map((channel) => channel.id));
  const connections = new Map(((connectionData ?? []) as Array<ConnectionRow & { reconnect_notified_at: string | null }>).map((row) => [row.channel_id, row]));

  const byChannel = new Map<string, ClipRow[]>();
  for (const clip of clips) {
    const channel = channels.find((row) => row.creator_id === clip.creator_id && row.platform === clip.platform && row.external_id === clip.video_channel_id);
    if (!channel || !connections.has(channel.id)) continue;
    byChannel.set(channel.id, [...(byChannel.get(channel.id) ?? []), clip]);
  }

  const capturedAt = new Date().toISOString();
  const snapshots: Array<{ clip_id: string; view_count: number; captured_at: string; source: 'api' }> = [];
  const missing: string[] = [];
  let failedAccounts = 0;

  for (const [channelId, channelClips] of byChannel) {
    const connection = connections.get(channelId)!;
    const token = await accessTokenFor(connection);
    if (!token.ok) {
      failedAccounts += 1;
      await admin.from('channel_connections').update({ last_error: token.message.slice(0, 300), updated_at: capturedAt }).eq('channel_id', channelId);
      if (!connection.reconnect_notified_at) {
        await admin.from('notifications').insert({
          user_id: channelClips[0].creator_id,
          kind: 'connection_expired',
          data: { platform: connection.platform },
          link: '/creator/settings#channels',
          // Once per connection: a reconnect brings a new expiry, so a later break is told again.
          dedupe_key: `connection_expired:${channelId}:${connection.access_expires_at}`,
        });
        await admin.from('channel_connections').update({ reconnect_notified_at: capturedAt }).eq('channel_id', channelId);
      }
      continue;
    }

    if (connection.platform === 'tiktok') {
      const videos = await queryTikTokVideos(token.token, channelClips.map((clip) => clip.external_video_id));
      if (!videos.ok) {
        failedAccounts += 1;
        continue;
      }
      for (const clip of channelClips) {
        const video = videos.data.get(clip.external_video_id);
        if (!video) missing.push(clip.id);
        else if (video.views !== null) snapshots.push({ clip_id: clip.id, view_count: video.views, captured_at: capturedAt, source: 'api' });
      }
    } else {
      for (const clip of channelClips) {
        const views = await fetchInstagramViews(token.token, clip.external_video_id);
        if (!views.ok) {
          failedAccounts += 1;
          break;
        }
        if (views.data === null) missing.push(clip.id);
        else snapshots.push({ clip_id: clip.id, view_count: views.data, captured_at: capturedAt, source: 'api' });
      }
    }
  }

  if (snapshots.length > 0) {
    const { error: insertError } = await admin.from('view_snapshots').insert(snapshots);
    if (insertError) return NextResponse.json({ error: 'Could not save views.' }, { status: 502 });
  }
  if (missing.length > 0) {
    await admin.from('clips').update({ unavailable_at: capturedAt, unavailable_reason: 'missing' }).in('id', missing).is('unavailable_at', null);
  }
  return NextResponse.json({ snapshots: snapshots.length, unavailable: missing.length, failedAccounts });
}
