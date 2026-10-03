import { describe, expect, it, vi } from 'vitest';
import {
  evaluateYouTubeSubmission,
  fetchYouTubeChannel,
  fetchYouTubeVideoInfo,
  YOUTUBE_SUBMISSION_MESSAGES,
  type YouTubeVideoInfo,
} from './youtubeVideo';

const VIDEO_ID = 'dQw4w9WgXcQ';
const CHANNEL_ID = 'UCabcdefghijklmnopqrstuv';

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('fetchYouTubeVideoInfo', () => {
  it('reads the channel, publish time and privacy of one video', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({ items: [{ id: VIDEO_ID, snippet: { channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z' }, status: { privacyStatus: 'public' } }] })
    );
    const result = await fetchYouTubeVideoInfo(VIDEO_ID, 'key', fetcher);
    expect(result).toEqual({ ok: true, data: { videoId: VIDEO_ID, channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z', privacyStatus: 'public' } });
    const requested = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requested.searchParams.get('part')).toBe('snippet,status');
    expect(requested.searchParams.get('id')).toBe(VIDEO_ID);
  });

  it('returns null when YouTube does not return the video (deleted or private)', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ items: [] }));
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', fetcher)).toEqual({ ok: true, data: null });
  });

  it('fails without a key, on HTTP errors and on network errors', async () => {
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, ' ', vi.fn<typeof fetch>())).toMatchObject({ ok: false, code: 'MISSING_API_KEY' });
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', vi.fn<typeof fetch>().mockResolvedValue(response({}, 403)))).toMatchObject({ ok: false, code: 'YOUTUBE_API_ERROR' });
    expect(await fetchYouTubeVideoInfo(VIDEO_ID, 'key', vi.fn<typeof fetch>().mockRejectedValue(new Error('down')))).toMatchObject({ ok: false, code: 'YOUTUBE_REQUEST_FAILED' });
  });
});

describe('fetchYouTubeChannel', () => {
  it('looks a handle up with forHandle and returns its id and description', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ items: [{ id: CHANNEL_ID, snippet: { description: 'CLIPERS-7K3Q9' } }] }));
    const result = await fetchYouTubeChannel({ handle: '@clipers_kr' }, 'key', fetcher);
    expect(result).toEqual({ ok: true, data: { channelId: CHANNEL_ID, description: 'CLIPERS-7K3Q9' } });
    const requested = new URL(fetcher.mock.calls[0][0] as URL);
    expect(requested.pathname).toBe('/youtube/v3/channels');
    expect(requested.searchParams.get('forHandle')).toBe('@clipers_kr');
  });

  it('looks a channel id up with id, and returns null when there is no such channel', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({}));
    expect(await fetchYouTubeChannel({ channelId: CHANNEL_ID }, 'key', fetcher)).toEqual({ ok: true, data: null });
    expect(new URL(fetcher.mock.calls[0][0] as URL).searchParams.get('id')).toBe(CHANNEL_ID);
  });
});

describe('evaluateYouTubeSubmission', () => {
  const video: YouTubeVideoInfo = { videoId: VIDEO_ID, channelId: CHANNEL_ID, publishedAt: '2026-10-05T01:00:00Z', privacyStatus: 'public' };
  const rules = { verifiedChannelIds: [CHANNEL_ID], liveAt: '2026-10-04T00:00:00Z' };

  it('accepts a public video from a verified channel posted after the campaign went live', () => {
    expect(evaluateYouTubeSubmission(video, rules)).toBeNull();
  });

  it('names the first rule a video breaks', () => {
    expect(evaluateYouTubeSubmission(null, rules)).toBe('not_found');
    expect(evaluateYouTubeSubmission({ ...video, privacyStatus: 'unlisted' }, rules)).toBe('not_public');
    expect(evaluateYouTubeSubmission(video, { ...rules, verifiedChannelIds: [] })).toBe('channel_not_verified');
    expect(evaluateYouTubeSubmission({ ...video, publishedAt: '2026-10-03T23:59:59Z' }, rules)).toBe('published_before_live');
  });

  it('has a message for every rejection', () => {
    expect(Object.keys(YOUTUBE_SUBMISSION_MESSAGES).sort()).toEqual(['channel_not_verified', 'not_found', 'not_public', 'published_before_live']);
  });
});
