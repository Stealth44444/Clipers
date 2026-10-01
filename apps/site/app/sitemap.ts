import type { MetadataRoute } from 'next';
import { loadLiveCampaigns } from '@/lib/campaigns';
import { GUIDES } from '@/lib/guides';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await loadLiveCampaigns();
  return [
    { url: siteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: siteUrl('/brands'), changeFrequency: 'weekly', priority: 0.9 },
    { url: siteUrl('/discover'), changeFrequency: 'hourly', priority: 0.9 },
    { url: siteUrl('/guides'), changeFrequency: 'weekly', priority: 0.8 },
    ...GUIDES.map((guide) => ({ url: siteUrl(`/guides/${guide.slug}`), lastModified: guide.updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...campaigns.map((campaign) => ({ url: siteUrl(`/campaigns/${campaign.id}`), changeFrequency: 'daily' as const, priority: 0.7 })),
  ];
}
