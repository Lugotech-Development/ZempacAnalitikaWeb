// POST /api/auth/logout  → revokes the upstream refresh token and clears cookies.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE, upstreamRevoke } from '@/lib/api-server';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(COOKIE.token)?.value;
  const refresh = jar.get(COOKIE.refresh)?.value;
  if (token && refresh) {
    await upstreamRevoke(refresh, token);
  }
  const res = NextResponse.json({ ok: true });
  for (const name of Object.values(COOKIE)) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
