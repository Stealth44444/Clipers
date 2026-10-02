import type { MetadataRoute } from 'next';
import { WELCOMED_CRAWLERS } from '@/lib/crawlers';
import { siteUrl } from '@/lib/urls';

/** While the pre-launch lock is on (PRELAUNCH_PASSWORD set at build), crawlers are asked to stay out entirely. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.PRELAUNCH_PASSWORD) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: WELCOMED_CRAWLERS, allow: '/' },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/'),
  };
}
