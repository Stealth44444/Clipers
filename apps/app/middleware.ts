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

  const requiredRole = Object.entries(WORKSPACE_BY_ROLE).find(([, prefix]) =>
    request.nextUrl.pathname.startsWith(prefix)
  )?.[0];
  if (!requiredRole) return response;

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === requiredRole) return response;

  const ownWorkspace = profile?.role ? WORKSPACE_BY_ROLE[profile.role] : undefined;
  return NextResponse.redirect(new URL(ownWorkspace ?? '/login', request.url));
}

export const config = {
  matcher: ['/brand/:path*', '/creator/:path*', '/admin/:path*'],
};
