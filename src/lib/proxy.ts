// Shared helper for route handlers that proxy a GET to upstream and map JSON.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE, UpstreamError, upstreamGetJson, cookieOptions } from './api-server';

export async function proxyGet<T>(upstreamPath: string, mapper: (data: unknown) => T, search?: Record<string, string | undefined>): Promise<NextResponse> {
  const jar = await cookies();
  try {
    const { data, updatedToken, updatedRefresh } = await upstreamGetJson(jar, upstreamPath, search);
    const res = NextResponse.json(mapper(data));
    // Keep cookies fresh if upstream rotated them during a refresh.
    if (updatedToken) {
      const opts = cookieOptions(true);
      res.cookies.set(COOKIE.token, updatedToken, opts);
      if (updatedRefresh) {
        res.cookies.set(COOKIE.refresh, updatedRefresh, opts);
      }
    }
    return res;
  } catch (e) {
    if (e instanceof UpstreamError) {
      if (e.status === 401) {
        const res = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
        for (const name of Object.values(COOKIE)) {
          res.cookies.set(name, '', { path: '/', maxAge: 0 });
        }
        return res;
      }
      return NextResponse.json({ error: e.message }, { status: e.status >= 400 && e.status < 600 ? e.status : 502 });
    }
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 502 });
  }
}
