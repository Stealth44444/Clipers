// Pages answered on any host other than the public one (*.vercel.app, preview deployments) get noindex, so search
// engines never index the same content twice. Local development is left alone.

export function isCanonicalHost(host: string | null, siteUrl: string): boolean {
  if (!host) return true;
  const name = host.split(':')[0].toLowerCase();
  if (name === 'localhost' || name === '127.0.0.1') return true;
  return name === new URL(siteUrl).hostname.toLowerCase();
}
