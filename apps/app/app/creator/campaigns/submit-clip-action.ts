'use server';

import { evaluateYouTubeSubmission, extractYouTubeVideoId, fetchYouTubeVideoInfo, YOUTUBE_SUBMISSION_MESSAGES } from '@clipers/db';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type SubmitClipFailure = 'duplicate' | 'daily_limit' | 'account_not_verified' | 'other';
export type SubmitClipResult = { ok: true } | { ok: false; reason: SubmitClipFailure; message: string };

const failure = (reason: SubmitClipFailure, message = ''): SubmitClipResult => ({ ok: false, reason, message });

/**
 * YouTube clips are read from YouTube before they're saved: public, from a channel the creator verified, posted
 * after the campaign went live. Creators can't insert YouTube clips directly (clips_creator_insert_own).
 */
export async function submitYouTubeClip(campaignId: string, rawUrl: string): Promise<SubmitClipResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure('other', '다시 로그인해 주세요.');

  const url = rawUrl.trim();
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return failure('other', '유튜브 영상 링크를 확인해 주세요.');

  const admin = getSupabaseAdminClient();
  const [{ data: campaign }, { data: channels }] = await Promise.all([
    admin.from('campaigns').select('live_at').eq('id', campaignId).eq('status', 'live').maybeSingle(),
    admin.from('creator_channels').select('external_id').eq('creator_id', user.id).eq('platform', 'youtube_shorts').not('verified_at', 'is', null),
  ]);
  if (!campaign?.live_at) return failure('other', '지금은 이 캠페인에 제출할 수 없어요.');

  const video = await fetchYouTubeVideoInfo(videoId, process.env.YOUTUBE_DATA_API_KEY ?? '');
  if (!video.ok) return failure('other', '지금은 유튜브 영상을 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.');
  const rejection = evaluateYouTubeSubmission(video.data, {
    verifiedChannelIds: (channels ?? []).flatMap((channel) => (channel.external_id ? [channel.external_id] : [])),
    liveAt: campaign.live_at,
  });
  if (rejection || !video.data) return failure('other', YOUTUBE_SUBMISSION_MESSAGES[rejection ?? 'not_found']);

  // The insert trigger still checks the approved application, the platform and the daily limit.
  const { error } = await admin.from('clips').insert({
    campaign_id: campaignId,
    creator_id: user.id,
    platform: 'youtube_shorts',
    url,
    video_published_at: video.data.publishedAt,
    video_channel_id: video.data.channelId,
  });
  if (error) {
    if (error.code === '23505') return failure('duplicate');
    if (error.message.includes('daily_clip_limit_reached')) return failure('daily_limit');
    if (error.message.includes('account_not_verified')) return failure('account_not_verified');
    return failure('other');
  }
  return { ok: true };
}
