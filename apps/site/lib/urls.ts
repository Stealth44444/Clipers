const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function appUrl(path = '/'): string {
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const creatorLoginUrl = appUrl('/login?next=/creator');
