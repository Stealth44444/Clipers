import { GUIDES } from '@/lib/guides';
import { guidesFullText } from '@/lib/llms-full';
import { siteUrl } from '@/lib/urls';

export const revalidate = 3600;

export function GET() {
  return new Response(guidesFullText(GUIDES, siteUrl), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
