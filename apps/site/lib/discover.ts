// Discover filters live in the URL so every view can be linked and shared.

/** Campaign kinds as campaigns.content_type stores them, with the names the site uses for creators. */
export const CAMPAIGN_KINDS = [
  { id: 'clipping', label: '클리핑' },
  { id: 'ugc', label: '소개' },
] as const;

export type CampaignKindId = (typeof CAMPAIGN_KINDS)[number]['id'];

export type DiscoverFilters = { q?: string | null; group?: string | null; type?: string | null; platform?: string | null };

/** The discover URL for the given filters; empty values drop out. */
export function discoverUrl(filters: DiscoverFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.group) params.set('group', filters.group);
  if (filters.type) params.set('type', filters.type);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return query ? `/discover?${query}` : '/discover';
}
