import { NextResponse, type NextRequest } from 'next/server';

// Cookie name must mirror src/lib/api-server.ts → COOKIE.token. Hardcoded here
// because middleware runs on the edge and can't import server-only modules.
const TOKEN_COOKIE = 'zempac_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get(TOKEN_COOKIE)?.value);

  if (pathname.startsWith('/dashboard')) {
    if (!hasToken) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === '/login' && hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
