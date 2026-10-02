import { NextResponse, type NextRequest } from 'next/server';
import { prelaunchGate } from '@clipers/db/src/prelaunch';
import { isCanonicalHost } from '@/lib/canonical-host';
import { siteUrl } from '@/lib/urls';

/** Pre-launch lock first; then any host but the public one is answered with noindex. */
export function middleware(request: NextRequest) {
  const locked = prelaunchGate(request.nextUrl.pathname, request.headers.get('authorization'), process.env.PRELAUNCH_PASSWORD);
  if (locked) return locked;
  if (isCanonicalHost(request.headers.get('host'), siteUrl('/'))) return undefined;

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
