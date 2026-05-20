import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE, UpstreamError, upstreamGetJson, cookieOptions } from '@/lib/api-server';
import { parsePantallaPrincipal } from '@/lib/types';

export async function GET() {
  const jar = await cookies();
  try {
    const { data, updatedToken, updatedRefresh } = await upstreamGetJson(jar, '/api/Reportes/pantalla-principal');
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Sin datos para pantalla principal' }, { status: 204 });
    }
    const res = NextResponse.json(parsePantallaPrincipal(data[0] as Record<string, unknown>));
    if (updatedToken) {
      const opts = cookieOptions(true);
      res.cookies.set(COOKIE.token, updatedToken, opts);
      if (updatedRefresh) res.cookies.set(COOKIE.refresh, updatedRefresh, opts);
    }
    return res;
  } catch (e) {
    if (e instanceof UpstreamError) {
      if (e.status === 401) {
        const r = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
        for (const n of Object.values(COOKIE)) r.cookies.set(n, '', { path: '/', maxAge: 0 });
        return r;
      }
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 502 });
  }
}
