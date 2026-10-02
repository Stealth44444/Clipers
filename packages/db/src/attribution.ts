// Where a sign-up came from. The public site captures this on the first page view, carries it to the app's login
// page as query parameters, and the app sends it as sign-up metadata; a database trigger stores it (see
// docs/superpowers/specs/2026-10-02-signup-attribution-design.md). Only these keys travel, each cut to a safe length.

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export const ATTRIBUTION_KEYS = [...UTM_KEYS, 'ref', 'referrer_host', 'landing_path', 'landed_at'] as const;
export const ATTRIBUTION_MAX_LENGTH = 200;
/** Prefix on the login URL's query, so attribution never collides with the page's own parameters. */
export const ATTRIBUTION_PARAM_PREFIX = 'a_';

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>> & { landing_path: string; landed_at: string };

function clean(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? '').trim().slice(0, ATTRIBUTION_MAX_LENGTH);
  return trimmed === '' ? undefined : trimmed;
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/** The first page view on the site: its utm/ref query, where the visitor came from, and which page they landed on. */
export function captureAttribution(url: URL, referrer: string, now: Date): Attribution {
  const attribution: Attribution = { landing_path: clean(url.pathname) ?? '/', landed_at: now.toISOString() };
  for (const key of UTM_KEYS) {
    const value = clean(url.searchParams.get(key));
    if (value) attribution[key] = value;
  }
  const ref = clean(url.searchParams.get('ref'));
  if (ref) attribution.ref = ref;
  const referrerHost = hostOf(referrer);
  if (referrerHost && referrerHost !== url.host.toLowerCase()) attribution.referrer_host = referrerHost;
  return attribution;
}

/** The attribution as `a_*` query parameters for the app's login link. */
export function attributionToParams(attribution: Attribution): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(attribution[key]);
    if (value) params.set(ATTRIBUTION_PARAM_PREFIX + key, value);
  }
  return params;
}

/** Reads `a_*` parameters back; null when there is no landing page (nothing was carried). */
export function attributionFromParams(params: URLSearchParams): Attribution | null {
  const landingPath = clean(params.get(ATTRIBUTION_PARAM_PREFIX + 'landing_path'));
  if (!landingPath) return null;
  const attribution: Attribution = {
    landing_path: landingPath,
    landed_at: clean(params.get(ATTRIBUTION_PARAM_PREFIX + 'landed_at')) ?? new Date(0).toISOString(),
  };
  for (const key of ATTRIBUTION_KEYS) {
    if (key === 'landing_path' || key === 'landed_at') continue;
    const value = clean(params.get(ATTRIBUTION_PARAM_PREFIX + key));
    if (value) attribution[key] = value;
  }
  return attribution;
}

/** `href` with the attribution appended, keeping the link's own query and hash. */
export function withAttribution(href: string, attribution: Attribution): string {
  const [withoutHash, hash = ''] = href.split('#', 2);
  const [path, query = ''] = withoutHash.split('?', 2);
  const params = new URLSearchParams(query);
  attributionToParams(attribution).forEach((value, key) => params.set(key, value));
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
}
