// Server-side helpers for talking to the upstream Reportes Zempac API.
// This module runs only inside Next.js route handlers (server). Tokens never
// leave the server — the browser holds httpOnly cookies set by /api/auth/login.
//
// Mirrors lib/services/api_service.dart + lib/services/app_session.dart in
// the Flutter app: login + refresh + bearer GETs with 1-retry on 401.

import { cookies } from 'next/headers';

export const UPSTREAM_HOST = process.env.UPSTREAM_API_HOST ?? 'https://reporteszempacapi.azurewebsites.net';

export const COOKIE = {
  token: 'zempac_token',
  refresh: 'zempac_refresh',
  username: 'zempac_user',
  empresa: 'zempac_empresa'
} as const;

const ONE_DAY = 60 * 60 * 24;
const THIRTY_DAYS = ONE_DAY * 30;

export type CookieJar = Awaited<ReturnType<typeof cookies>>;

export function cookieOptions(persist: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: persist ? THIRTY_DAYS : ONE_DAY
  };
}

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

type LoginResult = {
  token: string;
  refreshToken: string | null;
  username: string;
  empresa: string;
};

export async function upstreamLogin(input: { empresaCodigo: string; username: string; password: string }): Promise<LoginResult> {
  const res = await fetch(`${UPSTREAM_HOST}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store'
  });

  const text = await res.text();
  const body = safeJson(text);

  if (res.status === 401) {
    throw new UpstreamError(401, (body as { detail?: string })?.detail ?? 'Credenciales incorrectas', body);
  }
  if (res.status === 403) {
    throw new UpstreamError(403, (body as { message?: string })?.message ?? 'Error de acceso. Por favor, contacte al equipo de soporte.', body);
  }
  if (!res.ok || !body || typeof body !== 'object') {
    throw new UpstreamError(res.status, 'Error de autenticación', body ?? text);
  }

  const b = body as Record<string, unknown>;
  const token = String(b.token ?? '');
  if (!token) {
    throw new UpstreamError(res.status, 'Respuesta inválida del servidor', body);
  }
  return {
    token,
    refreshToken: b.refreshToken ? String(b.refreshToken) : null,
    username: b.username ? String(b.username) : input.username,
    empresa: b.empresa ? String(b.empresa) : input.empresaCodigo
  };
}

async function upstreamRefresh(refreshToken: string): Promise<{ token: string; refreshToken: string | null } | null> {
  try {
    const res = await fetch(`${UPSTREAM_HOST}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const token = body.token ? String(body.token) : '';
    if (!token) return null;
    return {
      token,
      refreshToken: body.refreshToken ? String(body.refreshToken) : null
    };
  } catch {
    return null;
  }
}

// Mutex: while a refresh is in flight for a given refreshToken value, any
// concurrent request gets to await the SAME promise instead of firing N
// parallel refresh calls (which the upstream rejects/rotates inconsistently).
// Keyed by refreshToken so distinct sessions don't block each other.
const refreshInflight = new Map<string, Promise<{ token: string; refreshToken: string | null } | null>>();

async function refreshOnce(refreshToken: string): Promise<{ token: string; refreshToken: string | null } | null> {
  const existing = refreshInflight.get(refreshToken);
  if (existing) return existing;
  const p = upstreamRefresh(refreshToken).finally(() => {
    refreshInflight.delete(refreshToken);
  });
  refreshInflight.set(refreshToken, p);
  return p;
}

export async function upstreamRevoke(refreshToken: string, token: string): Promise<void> {
  try {
    await fetch(`${UPSTREAM_HOST}/api/auth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store'
    });
  } catch {
    // best-effort; don't block logout if upstream is down
  }
}

/**
 * Server-side GET that auto-refreshes the token on a 401 and retries once.
 * On success returns the parsed JSON; on failure throws UpstreamError.
 * If the refresh fails the caller should treat that as a session-expired event
 * and the consumer route handler should clear the auth cookies.
 */
export async function upstreamGetJson(jar: CookieJar, path: string, search?: Record<string, string | undefined>): Promise<{ data: unknown; updatedToken?: string; updatedRefresh?: string }> {
  const token = jar.get(COOKIE.token)?.value;
  const refresh = jar.get(COOKIE.refresh)?.value;
  if (!token) {
    throw new UpstreamError(401, 'No autenticado');
  }

  const url = new URL(path, UPSTREAM_HOST);
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }

  let res = await doGet(url.toString(), token);
  let updatedToken: string | undefined;
  let updatedRefresh: string | undefined;

  if (res.status === 401 && refresh) {
    const refreshed = await refreshOnce(refresh);
    if (refreshed) {
      updatedToken = refreshed.token;
      updatedRefresh = refreshed.refreshToken ?? undefined;
      res = await doGet(url.toString(), refreshed.token);
    }
  }

  if (res.status === 401) {
    throw new UpstreamError(401, 'Sesión expirada');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(res.status, `Upstream ${res.status}`, text);
  }

  const data = await res.json().catch(() => null);
  return { data, updatedToken, updatedRefresh };
}

async function doGet(url: string, token: string) {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  });
}

function safeJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
