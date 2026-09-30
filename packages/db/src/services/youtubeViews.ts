import { err, ok, type ServiceResult } from './errors';

export type YouTubeViewCount = {
  videoId: string;
  viewCount: number;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    statistics?: {
      viewCount?: string;
    };
  }>;
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(videoUrl: string): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== 'https:' || !YOUTUBE_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    return null;
  }

  let videoId: string | undefined;
  if (parsedUrl.hostname.toLowerCase() === 'youtu.be') {
    videoId = parsedUrl.pathname.split('/').filter(Boolean)[0];
  } else if (parsedUrl.pathname === '/watch') {
    videoId = parsedUrl.searchParams.get('v') ?? undefined;
  } else {
    const [, route, pathVideoId] = parsedUrl.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/) ?? [];
    if (route) videoId = pathVideoId;
  }

  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

export async function fetchYouTubeViewCount(
  videoUrl: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<ServiceResult<YouTubeViewCount>> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) return err('INVALID_VIDEO_URL', '유효한 YouTube 영상 URL이 필요합니다.');

  const result = await fetchYouTubeViewCounts([videoUrl], apiKey, fetcher);
  if (!result.ok) return result;
  const viewCount = result.data.find((item) => item.videoId === videoId);
  if (!viewCount) return err('VIDEO_NOT_FOUND', 'YouTube 영상 통계를 찾을 수 없습니다.');

  return ok(viewCount);
}

export async function fetchYouTubeViewCounts(
  videoUrls: string[],
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<ServiceResult<YouTubeViewCount[]>> {
  const videoIds = videoUrls.map(extractYouTubeVideoId);
  if (videoIds.some((videoId) => videoId === null)) {
    return err('INVALID_VIDEO_URL', '유효한 YouTube 영상 URL이 필요합니다.');
  }
  if (!apiKey.trim()) return err('MISSING_API_KEY', 'YouTube Data API 키가 설정되지 않았습니다.');

  const uniqueVideoIds = [...new Set(videoIds as string[])];
  const viewCounts = new Map<string, number>();

  for (let index = 0; index < uniqueVideoIds.length; index += 50) {
    const batch = uniqueVideoIds.slice(index, index + 50);
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
    endpoint.search = new URLSearchParams({
      part: 'statistics',
      id: batch.join(','),
      key: apiKey,
    }).toString();

    try {
      const response = await fetcher(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        return err('YOUTUBE_API_ERROR', `YouTube Data API 요청이 HTTP ${response.status}로 실패했습니다.`);
      }

      const payload = (await response.json()) as YouTubeVideosResponse;
      for (const item of payload.items ?? []) {
        if (!item.id || !batch.includes(item.id)) continue;

        const viewCount = Number(item.statistics?.viewCount);
        if (!Number.isSafeInteger(viewCount) || viewCount < 0) {
          return err('INVALID_VIEW_COUNT', 'YouTube API가 유효하지 않은 조회수를 반환했습니다.');
        }
        viewCounts.set(item.id, viewCount);
      }
    } catch {
      return err('YOUTUBE_REQUEST_FAILED', 'YouTube Data API에 연결하지 못했습니다.');
    }
  }

  return ok([...viewCounts].map(([videoId, viewCount]) => ({ videoId, viewCount })));
}
