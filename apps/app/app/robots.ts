import type { MetadataRoute } from 'next';

/** The workspace app is private; only the marketing/marketplace site should be crawled. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
