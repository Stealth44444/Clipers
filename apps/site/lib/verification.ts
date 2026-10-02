import type { Metadata } from 'next';

// Search Console, Naver Search Advisor and Bing Webmaster ownership tags, from environment variables so a domain can
// be registered without a code change. These are read at build time: keep them in turbo.json's build env.

type VerificationEnv = Partial<Record<'GOOGLE_SITE_VERIFICATION' | 'NAVER_SITE_VERIFICATION' | 'BING_SITE_VERIFICATION', string>>;

export function siteVerification(env: VerificationEnv): Metadata['verification'] {
  const other: Record<string, string> = {};
  if (env.NAVER_SITE_VERIFICATION) other['naver-site-verification'] = env.NAVER_SITE_VERIFICATION;
  if (env.BING_SITE_VERIFICATION) other['msvalidate.01'] = env.BING_SITE_VERIFICATION;

  const verification: NonNullable<Metadata['verification']> = {};
  if (env.GOOGLE_SITE_VERIFICATION) verification.google = env.GOOGLE_SITE_VERIFICATION;
  if (Object.keys(other).length > 0) verification.other = other;
  return Object.keys(verification).length > 0 ? verification : undefined;
}
