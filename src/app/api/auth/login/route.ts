// POST /api/auth/login  → proxies to upstream and sets httpOnly cookies.
import { NextResponse } from 'next/server';
import { COOKIE, UpstreamError, cookieOptions, upstreamLogin } from '@/lib/api-server';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const b = body as {
    empresa?: string;
    usuario?: string;
    password?: string;
    keepSession?: boolean;
  };
  if (!b?.empresa || !b?.usuario || !b?.password) {
    return NextResponse.json({ error: 'Empresa, usuario y contraseña son obligatorios' }, { status: 400 });
  }

  try {
    const result = await upstreamLogin({
      empresaCodigo: b.empresa,
      username: b.usuario,
      password: b.password
    });
    const res = NextResponse.json({
      usuario: result.username,
      empresa: result.empresa
    });
    const opts = cookieOptions(Boolean(b.keepSession));
    res.cookies.set(COOKIE.token, result.token, opts);
    if (result.refreshToken) {
      res.cookies.set(COOKIE.refresh, result.refreshToken, opts);
    }
    res.cookies.set(COOKIE.username, result.username, {
      ...opts,
      httpOnly: false
    });
    res.cookies.set(COOKIE.empresa, result.empresa, {
      ...opts,
      httpOnly: false
    });
    return res;
  } catch (e) {
    if (e instanceof UpstreamError) {
      return NextResponse.json({ error: e.message }, { status: e.status === 0 ? 502 : e.status });
    }
    return NextResponse.json({ error: 'No se pudo conectar con el servidor' }, { status: 502 });
  }
}
