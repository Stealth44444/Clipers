const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export function siteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
