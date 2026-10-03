'use server';

import { extractInstagramShortcode, findInstagramMedia, postedAfterLive, queryTikTokVideos, resolveTikTokVideoId, type SocialVideo } from '@clipers/db';
import { accessTokenFor, type ConnectionRow } from '@/lib/social-oauth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { SubmitClipFailure, SubmitClipResult } from './submit-clip-action';

const failure = (reason: SubmitClipFailure, message = ''): SubmitClipResult => ({ ok: false, reason, message });

type Channel = { id: string; external_id: string | null; verified_by: string };

/**
 * TikTok and Instagram clips. With a connected account (OAuth) the server finds the video among that account's own
 * videos, so ownership and the posting time are checked before saving and views can be collected automatically.
 * Without one, the clip is saved as before and the operator checks it by hand.
 */
export async function submitSocialClip(campaignId: string, platform: 'tiktok' | 'instagram_reels', rawUrl: string): Promise<SubmitClipResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure('other', '다시 로그인해 주세요.');
  const url = rawUrl.trim();

  const admin = getSupabaseAdminClient();
  const [{ data: campaign }, { data: channelRows }] = await Promise.all([
    admin.from('campaigns').select('live_at').eq('id', campaignId).eq('status', 'live').maybeSingle(),
    admin.from('creator_channels').select('id, external_id, verified_by').eq('creator_id', user.id).eq('platform', platform).not('verified_at', 'is', null),
  ]);
  if (!campaign?.live_at) return failure('other', '지금은 이 캠페인에 제출할 수 없어요.');
  const channels = (channelRows ?? []) as Channel[];
  if (channels.length === 0) return failure('account_not_verified');
  const hasManualAccount = channels.some((channel) => channel.verified_by !== 'oauth');
  const oauthChannels = channels.filter((channel) => channel.verified_by === 'oauth');

  let match: { video: SocialVideo; channel: Channel } | null = null;
  let checkFailed = false;
  if (oauthChannels.length > 0) {
    const { data: connections } = await admin
      .from('channel_connections')
      .select('channel_id, platform, access_token_ciphertext, refresh_token_ciphertext, access_expires_at, refresh_expires_at')
      .in('channel_id', oauthChannels.map((channel) => channel.id));
    const videoKey = platform === 'tiktok' ? await resolveTikTokVideoId(url) : extractInstagramShortcode(url);
    if (!videoKey && !hasManualAccount) {
      return failure('other', platform === 'tiktok' ? '틱톡 영상 링크를 확인해 주세요.' : '인스타그램 릴스 링크를 확인해 주세요.');
    }
    for (const connection of (connections ?? []) as ConnectionRow[]) {
      if (!videoKey || match) break;
      const token = await accessTokenFor(connection);
      if (!token.ok) {
        checkFailed = true;
        continue;
      }
      if (platform === 'tiktok') {
        const videos = await queryTikTokVideos(token.token, [videoKey]);
        if (!videos.ok) checkFailed = true;
        const video = videos.ok ? videos.data.get(videoKey) : undefined;
        if (video) match = { video, channel: oauthChannels.find((channel) => channel.id === connection.channel_id)! };
      } else {
        const media = await findInstagramMedia(token.token, videoKey);
        if (!media.ok) checkFailed = true;
        if (media.ok && media.data) match = { video: media.data, channel: oauthChannels.find((channel) => channel.id === connection.channel_id)! };
      }
    }
  }

  if (match && !postedAfterLive(match.video.publishedAt, campaign.live_at)) {
    return failure('other', '캠페인이 공개된 뒤에 올린 영상만 제출할 수 있어요.');
  }
  if (!match && !hasManualAccount) {
    return failure(
      'other',
      checkFailed ? '지금은 영상을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.' : '연결한 계정의 영상만 제출할 수 있어요. 링크와 계정을 확인해 주세요.'
    );
  }

  // The insert trigger still checks the approved application, the platform, the daily limit and a verified account.
  const { error } = await admin.from('clips').insert({
    campaign_id: campaignId,
    creator_id: user.id,
    platform,
    url,
    ...(match ? { external_video_id: match.video.id, video_published_at: match.video.publishedAt, video_channel_id: match.channel.external_id } : {}),
  });
  if (error) {
    if (error.code === '23505') return failure('duplicate');
    if (error.message.includes('daily_clip_limit_reached')) return failure('daily_limit');
    if (error.message.includes('account_not_verified')) return failure('account_not_verified');
    return failure('other');
  }
  return { ok: true };
}
