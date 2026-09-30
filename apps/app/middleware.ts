import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const WORKSPACE_BY_ROLE: Record<string, string> = {
  brand: '/brand',
  creator: '/creator',
  admin: '/admin',
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() revalidates the JWT with Supabase Auth; getSession() trusts the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirects must carry any auth cookies Supabase refreshed above.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { pathname } = request.nextUrl;
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const requiredRole = Object.entries(WORKSPACE_BY_ROLE).find(([, prefix]) => pathname.startsWith(prefix))?.[0];
  if (!requiredRole && !isOnboarding) return response;

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return redirectTo(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed_at')
    .eq('id', user.id)
    .single();
  const ownWorkspace = profile?.role ? WORKSPACE_BY_ROLE[profile.role] : undefined;
  const needsOnboarding = !!profile && profile.role !== 'admin' && !profile.onboarding_completed_at;

  if (isOnboarding) {
    return needsOnboarding ? response : redirectTo(new URL(ownWorkspace ?? '/login', request.url));
  }
  if (needsOnboarding) return redirectTo(new URL('/onboarding', request.url));
  if (profile?.role === requiredRole) return response;

  return redirectTo(new URL(ownWorkspace ?? '/login', request.url));
}

export const config = {
  matcher: ['/brand/:path*', '/creator/:path*', '/admin/:path*', '/onboarding/:path*'],
};
