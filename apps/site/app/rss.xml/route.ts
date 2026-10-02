import { GUIDES } from '@/lib/guides';
import { guidesRss } from '@/lib/rss';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

export function GET() {
  return new Response(guidesRss(GUIDES, siteUrl), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
