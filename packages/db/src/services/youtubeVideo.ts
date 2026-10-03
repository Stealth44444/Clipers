import type { YouTubeChannelRef } from '../channels';
import { err, ok, type ServiceResult } from './errors';

// What a YouTube clip must be at submission: public, from a channel the creator verified, posted after the
// campaign went live. The app server reads the video here before it saves the clip.

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export type YouTubeVideoInfo = { videoId: string; channelId: string; publishedAt: string; privacyStatus: string };
export type YouTubeChannelInfo = { channelId: string; description: string };

type VideosResponse = {
  items?: Array<{ id?: string; snippet?: { channelId?: string; publishedAt?: string }; status?: { privacyStatus?: string } }>;
};
type ChannelsResponse = { items?: Array<{ id?: string; snippet?: { description?: string } }> };

async function getJson<T>(path: string, params: Record<string, string>, apiKey: string, fetcher: typeof fetch): Promise<ServiceResult<T>> {
  if (!apiKey.trim()) return err('MISSING_API_KEY', 'YouTube Data API 키가 설정되지 않았습니다.');
  const endpoint = new URL(`${API_BASE}/${path}`);
  endpoint.search = new URLSearchParams({ ...params, key: apiKey }).toString();
  try {
    const response = await fetcher(endpoint, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return err('YOUTUBE_API_ERROR', `YouTube Data API 요청이 HTTP ${response.status}로 실패했습니다.`);
    return ok((await response.json()) as T);
  } catch {
    return err('YOUTUBE_REQUEST_FAILED', 'YouTube Data API에 연결하지 못했습니다.');
  }
}

/** One video's channel, publish time and privacy; null when YouTube doesn't return it (deleted or private). */
export async function fetchYouTubeVideoInfo(videoId: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<YouTubeVideoInfo | null>> {
  const result = await getJson<VideosResponse>('videos', { part: 'snippet,status', id: videoId }, apiKey, fetcher);
  if (!result.ok) return result;
  const item = result.data.items?.find((entry) => entry.id === videoId);
  if (!item) return ok(null);
  const channelId = item.snippet?.channelId;
  const publishedAt = item.snippet?.publishedAt;
  const privacyStatus = item.status?.privacyStatus;
  if (!channelId || !publishedAt || !privacyStatus) return err('INVALID_VIDEO_INFO', 'YouTube API가 영상 정보를 온전히 돌려주지 않았습니다.');
  return ok({ videoId, channelId, publishedAt, privacyStatus });
}

/** A channel's id and description, found by handle or id; null when there is no such channel. */
export async function fetchYouTubeChannel(ref: YouTubeChannelRef, apiKey: string, fetcher: typeof fetch = fetch): Promise<ServiceResult<YouTubeChannelInfo | null>> {
  const lookup: Record<string, string> = 'handle' in ref ? { forHandle: ref.handle } : { id: ref.channelId };
  const result = await getJson<ChannelsResponse>('channels', { part: 'snippet', ...lookup }, apiKey, fetcher);
  if (!result.ok) return result;
  const item = result.data.items?.[0];
  if (!item?.id) return ok(null);
  return ok({ channelId: item.id, description: item.snippet?.description ?? '' });
}

export type YouTubeSubmissionRejection = 'not_found' | 'not_public' | 'channel_not_verified' | 'published_before_live';

/** The first rule the video breaks, or null when it can be submitted. */
export function evaluateYouTubeSubmission(
  video: YouTubeVideoInfo | null,
  rules: { verifiedChannelIds: readonly string[]; liveAt: string }
): YouTubeSubmissionRejection | null {
  if (!video) return 'not_found';
  if (video.privacyStatus !== 'public') return 'not_public';
  if (!rules.verifiedChannelIds.includes(video.channelId)) return 'channel_not_verified';
  if (Date.parse(video.publishedAt) < Date.parse(rules.liveAt)) return 'published_before_live';
  return null;
}

export const YOUTUBE_SUBMISSION_MESSAGES: Record<YouTubeSubmissionRejection, string> = {
  not_found: '영상을 찾을 수 없어요. 링크와 공개 상태를 확인해 주세요.',
  not_public: '공개 상태인 영상만 제출할 수 있어요.',
  channel_not_verified: "설정의 '내 채널'에서 인증한 채널의 영상만 제출할 수 있어요.",
  published_before_live: '캠페인이 공개된 뒤에 올린 영상만 제출할 수 있어요.',
};
