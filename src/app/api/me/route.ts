// GET /api/me  → returns the current session info from cookies, or 401.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE } from '@/lib/api-server';

export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE.token)?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({
    empresa: jar.get(COOKIE.empresa)?.value ?? '',
    usuario: jar.get(COOKIE.username)?.value ?? ''
  });
}
