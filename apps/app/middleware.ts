import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const ROLE_ROUTE_PREFIX: Record<string, string> = {
  brand: '/brand',
  creator: '/creator',
  admin: '/admin',
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          response.cookies.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          response.cookies.set(name, '', { ...options, maxAge: 0 }),
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const matchedRole = Object.entries(ROLE_ROUTE_PREFIX).find(([, prefix]) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!matchedRole) {
    return response;
  }

  const [requiredRole] = matchedRole;

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== requiredRole) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/brand/:path*', '/creator/:path*', '/admin/:path*'],
};
