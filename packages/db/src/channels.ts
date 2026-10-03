// Accounts creators register to prove they own them (creator_channels). Each account reduces to one url, so the
// database can let only one person verify it; the creator proves ownership by putting a code in its description.

export type YouTubeChannelRef = { handle: string } | { channelId: string };
export type ParsedChannelUrl = { url: string; youtube: YouTubeChannelRef | null };

// Profile hosts per platform (subdomains allowed). twitter.com is stored as x.com.
const PLATFORM_HOSTS: Record<string, string[]> = {
  tiktok: ['tiktok.com'],
  instagram_reels: ['instagram.com'],
  facebook: ['facebook.com'],
  x: ['x.com', 'twitter.com'],
  naver_clip: ['naver.com'],
  kakao_shorts: ['kakao.com'],
};
// Usernames on these are case-insensitive, so one account has one stored url.
const CASE_INSENSITIVE = new Set(['tiktok', 'instagram_reels', 'facebook', 'x']);

const HANDLE = /^@[\p{L}\p{N}._-]{3,30}$/u;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The account url to store for `platform`, or null when `input` isn't a profile on that platform. */
export function parseChannelUrl(platform: string, input: string): ParsedChannelUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);

  if (platform === 'youtube_shorts') {
    if (host !== 'youtube.com') return null;
    const first = segments[0] ? decode(segments[0]) : null;
    if (first && HANDLE.test(first)) {
      const handle = first.toLowerCase();
      return { url: `https://www.youtube.com/${handle}`, youtube: { handle } };
    }
    if (first === 'channel' && segments[1] && CHANNEL_ID.test(segments[1])) {
      return { url: `https://www.youtube.com/channel/${segments[1]}`, youtube: { channelId: segments[1] } };
    }
    return null;
  }

  const hosts = PLATFORM_HOSTS[platform];
  if (!hosts?.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;
  if (segments.length === 0) return null;
  const path = `/${segments.join('/')}`;
  return {
    url: `https://${host === 'twitter.com' ? 'x.com' : host}${CASE_INSENSITIVE.has(platform) ? path.toLowerCase() : path}`,
    youtube: null,
  };
}

// No 0/O, 1/I/L: the code is read off a screen and typed into a channel description.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function secureRandomInt(max: number): number {
  const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1));
  return value % max;
}

export function newVerificationCode(randomInt: (max: number) => number = secureRandomInt): string {
  let code = '';
  for (let index = 0; index < 5; index += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `CLIPERS-${code}`;
}

export function descriptionHasCode(text: string | null | undefined, code: string): boolean {
  return !!text && text.toUpperCase().includes(code.toUpperCase());
}
