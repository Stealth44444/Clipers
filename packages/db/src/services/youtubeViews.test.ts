import { describe, expect, it, vi } from 'vitest';
import { extractYouTubeVideoId, fetchYouTubeViewCount, fetchYouTubeViewCounts } from './youtubeViews';

const VIDEO_ID = 'dQw4w9WgXcQ';

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('extractYouTubeVideoId', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${VIDEO_ID}&feature=share`, VIDEO_ID],
    [`https://youtu.be/${VIDEO_ID}?t=30`, VIDEO_ID],
    [`https://youtube.com/shorts/${VIDEO_ID}`, VIDEO_ID],
    [`https://www.youtube.com/embed/${VIDEO_ID}`, VIDEO_ID],
    [`https://m.youtube.com/live/${VIDEO_ID}`, VIDEO_ID],
  ])('extracts the id from %s', (url, expected) => {
    expect(extractYouTubeVideoId(url)).toBe(expected);
  });

  it.each([
    'not a url',
    `http://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com.evil.example/watch?v=${VIDEO_ID}`,
    'https://www.youtube.com/watch?v=too-short',
    'https://example.com/watch?v=dQw4w9WgXcQ',
  ])('rejects unsupported URL %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBeNull();
  });
});

describe('fetchYouTubeViewCount', () => {
  it('requests statistics for the parsed video id', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [{ id: VIDEO_ID, statistics: { viewCount: '12500' } }] })
    );

    const result = await fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', fetcher);

    expect(result).toEqual({ ok: true, data: { videoId: VIDEO_ID, viewCount: 12500 } });
    const requestedUrl = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requestedUrl.pathname).toBe('/youtube/v3/videos');
    expect(requestedUrl.searchParams.get('part')).toBe('statistics');
    expect(requestedUrl.searchParams.get('id')).toBe(VIDEO_ID);
  });

  it('splits more than 50 videos into YouTube API batches', async () => {
    const videoIds = Array.from({ length: 51 }, (_, index) => `video${String(index).padStart(6, '0')}`);
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const requestedIds = new URL(input as URL).searchParams.get('id')?.split(',') ?? [];
      return response({
        items: requestedIds.map((id) => ({ id, statistics: { viewCount: '10' } })),
      });
    });

    const result = await fetchYouTubeViewCounts(
      videoIds.map((id) => `https://youtu.be/${id}`),
      'test-api-key',
      fetcher
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(51);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new URL(fetcher.mock.calls[0][0] as URL).searchParams.get('id')?.split(',')).toHaveLength(50);
    expect(new URL(fetcher.mock.calls[1][0] as URL).searchParams.get('id')?.split(',')).toHaveLength(1);
  });

  it('does not make a request without an API key', async () => {
    const fetcher = vi.fn<typeof fetch>();

    const result = await fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, '  ', fetcher);

    expect(result).toMatchObject({ ok: false, code: 'MISSING_API_KEY' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a provider error for unsuccessful HTTP responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({}, 403));

    const result = await fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', fetcher);

    expect(result).toMatchObject({ ok: false, code: 'YOUTUBE_API_ERROR' });
  });

  it('reports missing videos and invalid view counts', async () => {
    const missingVideoFetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ items: [] }));
    const invalidCountFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [{ id: VIDEO_ID, statistics: { viewCount: 'not-a-count' } }] })
    );

    await expect(
      fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', missingVideoFetcher)
    ).resolves.toMatchObject({ ok: false, code: 'VIDEO_NOT_FOUND' });
    await expect(
      fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', invalidCountFetcher)
    ).resolves.toMatchObject({ ok: false, code: 'INVALID_VIEW_COUNT' });
  });

  it('converts network failures into a service error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('network unavailable'));

    const result = await fetchYouTubeViewCount(`https://youtu.be/${VIDEO_ID}`, 'test-api-key', fetcher);

    expect(result).toMatchObject({ ok: false, code: 'YOUTUBE_REQUEST_FAILED' });
  });
});