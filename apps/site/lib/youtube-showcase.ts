// Real YouTube videos for the creator landing's illustrative campaign cards (not the live campaigns rail).
// Each kind draws from a channel's latest uploads or a US popular chart, optionally with one channel's latest video
// pinned to the front slot. All calls are cached for 6 hours (about 10 quota units per refresh).
// Without a key, or if the API fails, the cards keep their gradient covers.

export type ShowcaseKind = 'clipping' | 'ugc' | 'music';
export type ShowcaseVideo = {
  id: string;
  /** A campaign title the way a brand would write one (never the raw video title). */
  campaign: string;
  channel: string;
  channelId: string;
  avatar?: string;
  thumbnail: string;
};

type Source = {
  /** Take every card from this channel's latest uploads ("brand" = the channel). */
  channel?: string;
  /** Otherwise take them from the US popular chart for this category. */
  categoryId?: string;
  minSeconds: number;
  maxSeconds?: number;
  /** Put this channel's latest qualifying upload in the front slot. */
  front?: string;
};

const SOURCES: Record<ShowcaseKind, Source> = {
  // Clipping campaigns cut long streams into shorts: long-form gaming videos, with Kai Cenat's latest in front.
  clipping: { categoryId: '20', minSeconds: 10 * 60, front: '@KaiCenat' },
  // UGC: vlogs, reviews and hauls (People & Blogs).
  ugc: { categoryId: '22', minSeconds: 60 },
  // Music videos, with Drake's latest in front.
  music: { categoryId: '10', minSeconds: 60, maxSeconds: 10 * 60, front: '@drakeofficial' },
};

const PER_KIND = 3;
/** Card slot that renders on top of the stack. */
const FRONT_SLOT = PER_KIND - 1;
const REVALIDATE_SECONDS = 6 * 60 * 60;

// Example campaign titles per kind and card slot, built from the channel (and, for music, the song).
const CAMPAIGN_TITLES: Record<ShowcaseKind, ((channel: string, song: string) => string)[]> = {
  clipping: [(c) => `${c} 라이브 명장면 클리핑`, (c) => `${c} 스트림 하이라이트 클리핑`, (c) => `${c} 에피소드 숏폼 클리핑`],
  ugc: [(c) => `${c} 추천템 리뷰 숏폼`, (c) => `${c}와 함께하는 일상 브이로그`, (c) => `${c} 콜라보 언박싱 챌린지`],
  music: [(_, s) => `'${s}' 립싱크 챌린지`, (_, s) => `'${s}' 댄스 커버 챌린지`, (c, s) => `${c} '${s}' 숏폼 챌린지`],
};

type ApiVideo = {
  id: string;
  snippet: { title: string; channelId: string; channelTitle: string; thumbnails: Record<string, { url: string } | undefined> };
  contentDetails: { duration: string };
  status?: { madeForKids?: boolean };
};

/** "Taylor Swift - Patient Zero (Official Music Video)" → "Patient Zero"; "DRAKE - QUEBEC" → "QUEBEC". */
function songOf(title: string): string {
  const afterDash = title.includes(' - ') ? title.slice(title.lastIndexOf(' - ') + 3) : title;
  const song = afterDash.replace(/[([{【].*$/, '').replace(/\s+(ft\.?|feat\.?)\s.*$/i, '').trim();
  return song || title;
}

/** Channel names without the "- Topic" / "VEVO" suffixes, for titles. */
const displayName = (channel: string) => channel.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
// One video per artist: "Taylor Swift", "Taylor Swift - Topic" and "TaylorSwiftVEVO" are the same person.
const artistKey = (channel: string) => displayName(channel).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

function seconds(isoDuration: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoDuration);
  if (!match) return 0;
  const [, days = '0', hours = '0', minutes = '0', secs = '0'] = match;
  return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(secs);
}

async function api<T>(path: string, params: Record<string, string>, key: string): Promise<T | null> {
  const endpoint = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  endpoint.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(endpoint, { next: { revalidate: REVALIDATE_SECONDS } });
  return response.ok ? ((await response.json()) as T) : null;
}

/** Popular US videos in a category (1 unit). */
async function chartVideos(categoryId: string, key: string): Promise<ApiVideo[]> {
  const data = await api<{ items?: ApiVideo[] }>(
    'videos',
    { part: 'snippet,contentDetails,status', chart: 'mostPopular', regionCode: 'US', videoCategoryId: categoryId, maxResults: '25' },
    key
  );
  return data?.items ?? [];
}

/** A channel's latest uploads by handle (3 units: channel → uploads playlist → video details). */
async function channelUploads(handle: string, key: string): Promise<ApiVideo[]> {
  const channel = await api<{ items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
    'channels',
    { part: 'contentDetails', forHandle: handle },
    key
  );
  const uploads = channel?.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) return [];
  const playlist = await api<{ items?: { contentDetails: { videoId: string } }[] }>('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '15' }, key);
  const ids = playlist?.items?.map((item) => item.contentDetails.videoId) ?? [];
  if (ids.length === 0) return [];
  const videos = await api<{ items?: ApiVideo[] }>('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') }, key);
  return videos?.items ?? [];
}

/** Usable videos in order: right length, not for kids, not an auto-generated "- Topic" channel, with a thumbnail. */
function usable(items: ApiVideo[], { minSeconds, maxSeconds = Infinity }: Source): (ApiVideo & { thumbnail: string })[] {
  return items.flatMap((item) => {
    const length = seconds(item.contentDetails.duration);
    // hqdefault is 4:3 with letterbox bars that object-fit: cover crops away exactly in a 16:9 cover.
    const thumbnail = item.snippet.thumbnails.maxres?.url ?? item.snippet.thumbnails.high?.url;
    if (item.status?.madeForKids || /-\s*Topic$/i.test(item.snippet.channelTitle) || length < minSeconds || length > maxSeconds || !thumbnail) return [];
    return [{ ...item, thumbnail }];
  });
}

async function loadKind(kind: ShowcaseKind, key: string): Promise<ShowcaseVideo[]> {
  const source = SOURCES[kind];
  const [pool, front] = await Promise.all([
    source.channel ? channelUploads(source.channel, key) : chartVideos(source.categoryId!, key),
    source.front ? channelUploads(source.front, key) : Promise.resolve([]),
  ]);

  const frontPick = usable(front, source)[0];
  const artists = new Set(frontPick ? [artistKey(frontPick.snippet.channelTitle)] : []);
  const picks = usable(pool, source).filter((item) => {
    // A single-channel source keeps every upload; a chart keeps one video per artist.
    if (source.channel) return true;
    const artist = artistKey(item.snippet.channelTitle);
    if (artists.has(artist)) return false;
    artists.add(artist);
    return true;
  });
  const slots = picks.slice(0, frontPick ? PER_KIND - 1 : PER_KIND);
  if (frontPick) slots.splice(FRONT_SLOT, 0, frontPick);

  return slots.map((item, slot) => ({
    id: item.id,
    campaign: CAMPAIGN_TITLES[kind][slot](displayName(item.snippet.channelTitle), songOf(item.snippet.title)),
    channel: displayName(item.snippet.channelTitle),
    channelId: item.snippet.channelId,
    thumbnail: item.thumbnail,
  }));
}

/** Channel profile photos for up to 50 channels in one call (1 unit). */
async function loadChannelAvatars(channelIds: string[], key: string): Promise<Map<string, string>> {
  const ids = [...new Set(channelIds)];
  if (ids.length === 0) return new Map();
  const data = await api<{ items?: { id: string; snippet: { thumbnails: Record<string, { url: string } | undefined> } }[] }>(
    'channels',
    { part: 'snippet', id: ids.join(','), maxResults: '50' },
    key
  );
  return new Map(
    (data?.items ?? []).flatMap((item) => {
      const url = item.snippet.thumbnails.default?.url ?? item.snippet.thumbnails.medium?.url;
      return url ? [[item.id, url] as const] : [];
    })
  );
}

export async function loadShowcaseVideos(): Promise<Partial<Record<ShowcaseKind, ShowcaseVideo[]>>> {
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) return {};
  const kinds = Object.keys(SOURCES) as ShowcaseKind[];
  const results = await Promise.all(kinds.map((kind) => loadKind(kind, key).catch(() => [])));
  const avatars = await loadChannelAvatars(results.flat().map((video) => video.channelId), key).catch(() => new Map<string, string>());
  results.forEach((videos) => videos.forEach((video) => (video.avatar = avatars.get(video.channelId))));
  return Object.fromEntries(kinds.map((kind, index) => [kind, results[index]]).filter(([, videos]) => videos.length === PER_KIND));
}
