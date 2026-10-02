// Submits every sitemap URL to IndexNow, which Naver, Bing and other engines share. Run after launch and after each
// content batch, against the live site:
//   NEXT_PUBLIC_SITE_URL=https://<domain> INDEXNOW_KEY=<key> pnpm --filter @clipers/site indexnow
import { pathToFileURL } from 'node:url';

export const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

export function indexNowBody(siteUrl, key, urls) {
  const { host, origin } = new URL(siteUrl);
  return { host, key, keyLocation: `${origin}/indexnow.txt`, urlList: urls.filter((url) => new URL(url).host === host) };
}

async function main() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const key = process.env.INDEXNOW_KEY;
  if (!site || !key || !KEY_PATTERN.test(key)) {
    throw new Error('Set NEXT_PUBLIC_SITE_URL and INDEXNOW_KEY (8–128 letters, digits or dashes).');
  }
  const sitemap = await fetch(new URL('/sitemap.xml', site));
  if (sitemap.status === 401) throw new Error('The site is still locked (PRELAUNCH_PASSWORD). Submit after launch.');
  if (!sitemap.ok) throw new Error(`The sitemap answered ${sitemap.status}.`);
  const served = await fetch(new URL('/indexnow.txt', site));
  if ((await served.text()).trim() !== key) {
    throw new Error('/indexnow.txt does not serve this key. Set INDEXNOW_KEY on the site project and redeploy.');
  }

  const body = indexNowBody(site, key, sitemapUrls(await sitemap.text()));
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow answered ${response.status} for ${body.urlList.length} URLs.`);
  if (!response.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
