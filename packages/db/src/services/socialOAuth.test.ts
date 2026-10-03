import { describe, expect, it } from 'vitest';
import {
  exchangeInstagramCode,
  exchangeTikTokCode,
  extractInstagramShortcode,
  extractTikTokVideoId,
  fetchInstagramAccount,
  fetchInstagramViews,
  fetchTikTokAccount,
  findInstagramMedia,
  instagramAuthorizeUrl,
  postedAfterLive,
  queryTikTokVideos,
  resolveTikTokVideoId,
  tiktokAuthorizeUrl,
} from './socialOAuth';

const NOW = Date.parse('2026-10-03T00:00:00Z');

/** Answers each request with the next queued response and records what was asked. */
function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as typeof fetch;
  return { fetcher, calls };
}

describe('authorize urls', () => {
  it('asks TikTok for the profile and video scopes', () => {
    const url = new URL(tiktokAuthorizeUrl('key1', 'https://app.clipers.site/api/oauth/tiktok/callback', 'st'));
    expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');
    expect(url.searchParams.get('scope')).toBe('user.info.basic,user.info.profile,video.list');
    expect(url.searchParams.get('state')).toBe('st');
  });

  it('asks Instagram for basic and insights scopes', () => {
    const url = new URL(instagramAuthorizeUrl('app1', 'https://app.clipers.site/api/oauth/instagram/callback', 'st'));
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('instagram_business_basic,instagram_business_manage_insights');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});

describe('links', () => {
  it('reads TikTok video ids from full links only', () => {
    expect(extractTikTokVideoId('https://www.tiktok.com/@someone/video/7106594312292453675?lang=ko')).toBe('7106594312292453675');
    expect(extractTikTokVideoId('https://vt.tiktok.com/ZSabc123/')).toBeNull();
    expect(extractTikTokVideoId('https://example.com/video/7106594312292453675')).toBeNull();
  });

  it('resolves short TikTok links through oEmbed', async () => {
    const { fetcher, calls } = fakeFetch([{ body: { html: '<blockquote data-video-id="7106594312292453675">' } }]);
    expect(await resolveTikTokVideoId('https://vt.tiktok.com/ZSabc123/', fetcher)).toBe('7106594312292453675');
    expect(calls[0].url).toContain('https://www.tiktok.com/oembed?url=');
  });

  it('reads Instagram shortcodes from reel and post links', () => {
    expect(extractInstagramShortcode('https://www.instagram.com/reel/C8xYz12AbCd/?igsh=1')).toBe('C8xYz12AbCd');
    expect(extractInstagramShortcode('https://instagram.com/someone/reel/C8xYz12AbCd')).toBe('C8xYz12AbCd');
    expect(extractInstagramShortcode('https://www.instagram.com/p/C8xYz12AbCd/')).toBe('C8xYz12AbCd');
    expect(extractInstagramShortcode('https://www.instagram.com/someone/')).toBeNull();
  });

  it('accepts videos posted at or after the campaign went live', () => {
    expect(postedAfterLive('2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(true);
    expect(postedAfterLive('2026-09-30T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(false);
  });
});

describe('TikTok', () => {
  it('exchanges a code for tokens with their expiry times', async () => {
    const { fetcher, calls } = fakeFetch([{ body: { access_token: 'a', refresh_token: 'r', expires_in: 86400, refresh_expires_in: 31536000, open_id: 'o1' } }]);
    const result = await exchangeTikTokCode({ clientKey: 'k', clientSecret: 's' }, 'code1', 'https://cb', fetcher, NOW);
    expect(result).toEqual({
      ok: true,
      data: { accessToken: 'a', refreshToken: 'r', accessExpiresAt: '2026-10-04T00:00:00.000Z', refreshExpiresAt: '2027-10-03T00:00:00.000Z', openId: 'o1' },
    });
    expect(String(calls[0].init?.body)).toContain('grant_type=authorization_code');
  });

  it('turns an error body into a failure', async () => {
    const { fetcher } = fakeFetch([{ body: { error: 'invalid_grant', error_description: 'Code expired' } }]);
    const result = await exchangeTikTokCode({ clientKey: 'k', clientSecret: 's' }, 'code1', 'https://cb', fetcher, NOW);
    expect(result.ok).toBe(false);
  });

  it('reads the account and stores its profile url', async () => {
    const { fetcher } = fakeFetch([{ body: { data: { user: { open_id: 'o1', username: 'Clipper.One' } }, error: { code: 'ok' } } }]);
    expect(await fetchTikTokAccount('a', fetcher)).toEqual({ ok: true, data: { externalId: 'o1', username: 'Clipper.One', url: 'https://tiktok.com/@clipper.one' } });
  });

  it('queries videos 20 at a time and keeps only those returned', async () => {
    const ids = Array.from({ length: 21 }, (_, index) => String(7000000000000000000n + BigInt(index)));
    const { fetcher, calls } = fakeFetch([
      { body: { data: { videos: [{ id: ids[0], view_count: 1234, create_time: 1790000000 }] }, error: { code: 'ok' } } },
      { body: { data: { videos: [] }, error: { code: 'ok' } } },
    ]);
    const result = await queryTikTokVideos('a', ids, fetcher);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[0].init?.body)).filters.video_ids).toHaveLength(20);
    expect(result.ok && [...result.data.values()]).toEqual([{ id: ids[0], publishedAt: new Date(1790000000 * 1000).toISOString(), views: 1234 }]);
  });
});

describe('Instagram', () => {
  it('exchanges a code for a long-lived token', async () => {
    const { fetcher, calls } = fakeFetch([{ body: { access_token: 'short', user_id: 1 } }, { body: { access_token: 'long', expires_in: 5184000 } }]);
    const result = await exchangeInstagramCode({ appId: 'i', appSecret: 's' }, 'c', 'https://cb', fetcher, NOW);
    expect(result).toEqual({ ok: true, data: { accessToken: 'long', refreshToken: null, accessExpiresAt: '2026-12-02T00:00:00.000Z', refreshExpiresAt: null } });
    expect(calls[1].url).toContain('grant_type=ig_exchange_token');
  });

  it('reads the account', async () => {
    const { fetcher } = fakeFetch([{ body: { user_id: '178', username: 'Clipper_One' } }]);
    expect(await fetchInstagramAccount('t', fetcher)).toEqual({ ok: true, data: { externalId: '178', username: 'Clipper_One', url: 'https://instagram.com/clipper_one' } });
  });

  it('finds a post by shortcode across pages', async () => {
    const { fetcher } = fakeFetch([
      { body: { data: [{ id: '1', shortcode: 'AAA', timestamp: '2026-10-01T00:00:00+0000' }], paging: { next: 'https://graph.instagram.com/next' } } },
      { body: { data: [{ id: '2', shortcode: 'BBB', timestamp: '2026-10-02T03:00:00+0000' }] } },
    ]);
    expect(await findInstagramMedia('t', 'BBB', fetcher)).toEqual({ ok: true, data: { id: '2', publishedAt: '2026-10-02T03:00:00.000Z', views: null } });
  });

  it('returns null when the post is not among the latest pages', async () => {
    const { fetcher } = fakeFetch([{ body: { data: [] } }]);
    expect(await findInstagramMedia('t', 'ZZZ', fetcher)).toEqual({ ok: true, data: null });
  });

  it('reads lifetime views, and tells a missing post from a token problem', async () => {
    expect(await fetchInstagramViews('t', 'm', fakeFetch([{ body: { data: [{ name: 'views', values: [{ value: 4321 }] }] } }]).fetcher)).toEqual({ ok: true, data: 4321 });
    expect(await fetchInstagramViews('t', 'm', fakeFetch([{ status: 400, body: { error: { code: 100 } } }]).fetcher)).toEqual({ ok: true, data: null });
    expect((await fetchInstagramViews('t', 'm', fakeFetch([{ status: 400, body: { error: { code: 190 } } }]).fetcher)).ok).toBe(false);
  });
});
