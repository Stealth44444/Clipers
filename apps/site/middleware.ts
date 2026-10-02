import type { NextRequest } from 'next/server';
import { prelaunchGate } from '@clipers/db/src/prelaunch';

/** Pre-launch lock only: with PRELAUNCH_PASSWORD unset every request passes straight through. */
export function middleware(request: NextRequest) {
  return prelaunchGate(request.nextUrl.pathname, request.headers.get('authorization'), process.env.PRELAUNCH_PASSWORD) ?? undefined;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
