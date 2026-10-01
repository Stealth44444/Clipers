// Real YouTube videos for the creator landing's illustrative campaign cards (not the live campaigns rail).
// Popular US videos per category via the Data API's mostPopular chart (1 quota unit per call), cached for 6 hours.
// Without a key, or if the API fails, the cards keep their gradient covers.

export type ShowcaseKind = 'clipping' | 'ugc' | 'music';
export type ShowcaseVideo = {
  id: string;
  /** The video's own title (for the link's label). */
  title: string;
  /** A campaign title the way a brand would write one (never the raw video title). */
  campaign: string;
  channel: string;
  channelId: string;
  avatar?: string;
  thumbnail: string;
  url: string;
};

// Example campaign titles per kind and card slot, built from the channel (and, for music, the song).
const CAMPAIGN_TITLES: Record<ShowcaseKind, ((channel: string, song: string) => string)[]> = {
  clipping: [(c) => `${c} 라이브 명장면 클리핑`, (c) => `${c} 스트림 하이라이트 클리핑`, (c) => `${c} 에피소드 숏폼 클리핑`],
  ugc: [(c) => `${c} 추천템 리뷰 숏폼`, (c) => `${c}와 함께하는 일상 브이로그`, (c) => `${c} 콜라보 언박싱 챌린지`],
  music: [(c, s) => `${c} '${s}' 숏폼 챌린지`, (c, s) => `'${s}' 립싱크 챌린지`, (c, s) => `'${s}' 댄스 커버 챌린지`],
};

/** "Taylor Swift - Patient Zero (Official Music Video)" → "Patient Zero"; "DRAKE - QUEBEC" → "QUEBEC". */
function songOf(title: string): string {
  const afterDash = title.includes(' - ') ? title.slice(title.lastIndexOf(' - ') + 3) : title;
  const song = afterDash.replace(/[([{【].*$/, '').replace(/\s+(ft\.?|feat\.?)\s.*$/i, '').trim();
  return song || title;
}

/** Channel names without the "- Topic" / "VEVO" suffixes, for titles. */
const displayName = (channel: string) => channel.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();

const SOURCES: Record<ShowcaseKind, { categoryId: string; minSeconds: number }> = {
  // Clipping campaigns cut long streams and podcasts into shorts, so pick long-form gaming videos.
  clipping: { categoryId: '20', minSeconds: 10 * 60 },
  // UGC: vlogs, reviews and hauls.
  ugc: { categoryId: '22', minSeconds: 60 },
  music: { categoryId: '10', minSeconds: 60 },
};

const PER_KIND = 3;
const REVALIDATE_SECONDS = 6 * 60 * 60;

// One video per artist: "Taylor Swift", "Taylor Swift - Topic" and "TaylorSwiftVEVO" are the same person.
const artistKey = (channel: string) => channel.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

type ApiVideo = {
  id: string;
  snippet: { title: string; channelId: string; channelTitle: string; thumbnails: Record<string, { url: string } | undefined> };
  contentDetails: { duration: string };
  status?: { madeForKids?: boolean };
};

function seconds(isoDuration: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoDuration);
  if (!match) return 0;
  const [, days = '0', hours = '0', minutes = '0', secs = '0'] = match;
  return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(secs);
}

async function loadKind(kind: ShowcaseKind, key: string): Promise<ShowcaseVideo[]> {
  const { categoryId, minSeconds } = SOURCES[kind];
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.search = new URLSearchParams({
    part: 'snippet,contentDetails,status',
    chart: 'mostPopular',
    regionCode: 'US',
    videoCategoryId: categoryId,
    maxResults: '25',
    key,
  }).toString();
  const response = await fetch(endpoint, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) return [];
  const { items = [] } = (await response.json()) as { items?: ApiVideo[] };

  const channels = new Set<string>();
  const picked: ShowcaseVideo[] = [];
  for (const item of items) {
    if (picked.length === PER_KIND) break;
    const artist = artistKey(item.snippet.channelTitle);
    // Auto-generated "- Topic" channels are skipped; the artist's own channel is the one to show.
    if (item.status?.madeForKids || /-\s*Topic$/i.test(item.snippet.channelTitle) || seconds(item.contentDetails.duration) < minSeconds || channels.has(artist)) continue;
    // hqdefault is 4:3 with letterbox bars that object-fit: cover crops away exactly in a 16:9 cover.
    const thumbnail = item.snippet.thumbnails.maxres?.url ?? item.snippet.thumbnails.high?.url;
    if (!thumbnail) continue;
    channels.add(artist);
    picked.push({
      id: item.id,
      title: item.snippet.title,
      campaign: CAMPAIGN_TITLES[kind][picked.length](displayName(item.snippet.channelTitle), songOf(item.snippet.title)),
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    });
  }
  return picked;
}

/** Channel profile photos for up to 50 channels in one call (1 quota unit). */
async function loadChannelAvatars(channelIds: string[], key: string): Promise<Map<string, string>> {
  const ids = [...new Set(channelIds)];
  if (ids.length === 0) return new Map();
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/channels');
  endpoint.search = new URLSearchParams({ part: 'snippet', id: ids.join(','), maxResults: '50', key }).toString();
  const response = await fetch(endpoint, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) return new Map();
  const { items = [] } = (await response.json()) as { items?: { id: string; snippet: { thumbnails: Record<string, { url: string } | undefined> } }[] };
  return new Map(
    items.flatMap((item) => {
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
