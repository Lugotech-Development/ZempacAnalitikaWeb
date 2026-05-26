// Client-side API layer. Calls the upstream Reportes Zempac API directly.
// Auth tokens are stored in localStorage. On 401 we attempt a silent refresh;
// if that fails we throw UnauthorizedError so the UI redirects to /login.

import type { RptCuadreCajaLinea, RptCuentasPorCobrar, RptCxcDetalleFactura, RptDevolucion, RptPantallaPrincipal, RptProductoMasVendido, RptVenta, SessionInfo, Sucursal } from './types';
import {
  parseCuadreLinea,
  parseCxcAntiguedad,
  parseCxcDetalleFactura,
  parseCxcResumen,
  parseCxcTopCliente,
  parseDevolucion,
  parsePantallaPrincipal,
  parseProducto,
  parseSucursal,
  parseVenta
} from './types';

const UPSTREAM = 'https://reporteszempacapi.azurewebsites.net';

const STORAGE_KEY = 'zempac.session';

// ─── Session helpers ────────────────────────────────────────────────────────

type StoredSession = {
  token: string;
  refreshToken: string | null;
  empresa: string;
  usuario: string;
};

export function getSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function setSession(s: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Error classes ──────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor(message = 'Sesión expirada') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class UpstreamApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'UpstreamApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'No se pudo conectar con el servidor') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ─── Token refresh ──────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session?.refreshToken) return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${UPSTREAM}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken })
      });
      if (!res.ok) return null;
      const body = (await res.json()) as Record<string, unknown>;
      const newToken = body.token ? String(body.token) : null;
      if (newToken) {
        setSession({
          ...session,
          token: newToken,
          refreshToken: body.refreshToken ? String(body.refreshToken) : session.refreshToken
        });
      }
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ─── Core fetch with auth + retry on 401 ───────────────────────────────────

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = getSession();
  if (!session?.token) throw new UnauthorizedError();

  const url = `${UPSTREAM}${path}`;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${session.token}`
  };

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (!newToken) {
      clearSession();
      throw new UnauthorizedError();
    }
    headers.Authorization = `Bearer ${newToken}`;
    try {
      res = await fetch(url, { ...init, headers });
    } catch {
      throw new NetworkError();
    }
    if (res.status === 401) {
      clearSession();
      throw new UnauthorizedError();
    }
  }

  return res;
}

async function getJson<T>(path: string, mapper: (data: unknown) => T, search?: Record<string, string | undefined>): Promise<T> {
  let fullPath = path;
  if (search) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const str = qs.toString();
    if (str) fullPath += `?${str}`;
  }
  // DEBUG: Log the full URL being fetched
  console.log('Fetching URL:', `${UPSTREAM}${fullPath}`);
  const res = await authFetch(fullPath);
  if (res.status === 204) return [] as unknown as T;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = (body as { error?: string; message?: string })?.error ?? (body as { message?: string })?.message ?? `Error inesperado (${res.status})`;
    throw new UpstreamApiError(res.status, msg);
  }
  return mapper(body);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function apiLogin(input: { empresa: string; usuario: string; password: string }): Promise<SessionInfo> {
  let res: Response;
  try {
    res = await fetch(`${UPSTREAM}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaCodigo: input.empresa,
        username: input.usuario,
        password: input.password
      })
    });
  } catch {
    throw new NetworkError();
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.status === 401) {
    throw new UpstreamApiError(401, (body as { detail?: string })?.detail ?? 'Credenciales incorrectas');
  }
  if (res.status === 403) {
    throw new UpstreamApiError(403, (body as { message?: string })?.message ?? 'Error de acceso. Por favor, contacte al equipo de soporte.');
  }
  if (!res.ok || !body) {
    throw new UpstreamApiError(res.status, 'Error de autenticación');
  }
  const b = body as Record<string, unknown>;
  const token = String(b.token ?? '');
  if (!token) throw new UpstreamApiError(res.status, 'Respuesta inválida del servidor');
  const session: StoredSession = {
    token,
    refreshToken: b.refreshToken ? String(b.refreshToken) : null,
    empresa: b.empresa ? String(b.empresa) : input.empresa,
    usuario: b.username ? String(b.username) : input.usuario
  };
  setSession(session);
  return { empresa: session.empresa, usuario: session.usuario };
}

export function apiLogout(): void {
  const session = getSession();
  if (session?.refreshToken && session.token) {
    // Best-effort revocation — fire and forget
    fetch(`${UPSTREAM}/api/auth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    }).catch(() => {});
  }
  clearSession();
}

export function apiMe(): SessionInfo {
  const session = getSession();
  if (!session) throw new UnauthorizedError();
  return { empresa: session.empresa, usuario: session.usuario };
}

export const apiSucursales = () => getJson<Sucursal[]>('/api/Empresas/sucursales', data => (Array.isArray(data) ? data.map(r => parseSucursal(r as Record<string, unknown>)) : []));

export const apiPantallaPrincipal = () =>
  getJson<RptPantallaPrincipal>('/api/Reportes/pantalla-principal', data => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new UpstreamApiError(204, 'Sin datos para pantalla principal');
    }
    return parsePantallaPrincipal(data[0] as Record<string, unknown>);
  });

export const apiVentas = () => getJson<RptVenta[]>('/api/Reportes/ventas-30', data => (Array.isArray(data) ? data.map(r => parseVenta(r as Record<string, unknown>)) : []));

export const apiDevoluciones = () => getJson<RptDevolucion[]>('/api/Reportes/devoluciones-30', data => (Array.isArray(data) ? data.map(r => parseDevolucion(r as Record<string, unknown>)) : []));

export const apiProductos = () =>
  getJson<RptProductoMasVendido[]>('/api/Reportes/productos-mas-vendidos', data => (Array.isArray(data) ? data.map(r => parseProducto(r as Record<string, unknown>)) : []));

export const apiCuadreCaja = (input: { sucursal: number; fDesde?: string; fHasta?: string }) =>
  getJson<RptCuadreCajaLinea[]>('/api/Reportes/analitica-lote-condensado', data => (Array.isArray(data) ? data.map(r => parseCuadreLinea(r as Record<string, unknown>)) : []), {
    sucursal: String(input.sucursal),
    fDesde: input.fDesde,
    fHasta: input.fHasta
  });

// ─── Cuentas por Cobrar (CxC) ────────────────────────────────────────────
// The page consumes 3 sub-endpoints. We fetch them in parallel through a
// single `useApi` cache key so the report revalidates atomically. Each call
// is bearer-auth'd via authFetch (token refresh + 401 retry). The parsers
// in `types.ts` are tolerant to PascalCase / camelCase / common aliases
// because the OpenAPI schema is intentionally loose (`array of object`).

const CXC_TOP_DEFAULT = 10;

const fetchCxcResumen = () =>
  getJson('/api/Reportes/cxc/resumen', data => {
    if (Array.isArray(data) && data.length > 0) return parseCxcResumen(data[0] as Record<string, unknown>);
    if (data && typeof data === 'object') return parseCxcResumen(data as Record<string, unknown>);
    return parseCxcResumen({});
  });

const fetchCxcAntiguedad = () =>
  getJson('/api/Reportes/cxc/antiguedad', data => {
    // API returns a single-element array with a wide row of bucket totals.
    const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | undefined);
    return parseCxcAntiguedad(row ?? {});
  });

const fetchCxcTopClientes = (top: number) =>
  getJson('/api/Reportes/cxc/top-clientes', data => (Array.isArray(data) ? data.map(r => parseCxcTopCliente(r as Record<string, unknown>)) : []), { top: String(top) });

export async function apiCuentasPorCobrar(options?: { top?: number }): Promise<RptCuentasPorCobrar> {
  const top = options?.top ?? CXC_TOP_DEFAULT;
  const [resumenRaw, antiguedad, topClientes] = await Promise.all([fetchCxcResumen(), fetchCxcAntiguedad(), fetchCxcTopClientes(top)]);
  // /cxc/resumen doesn't return saldoCorriente; derive it from antiguedad so
  // the hero "Corriente" pill and any progress bars stay consistent.
  const saldoCorriente = antiguedad.corriente;
  const saldoVencido = resumenRaw.saldoVencido > 0 ? resumenRaw.saldoVencido : Math.max(0, resumenRaw.saldoTotal - saldoCorriente);
  const porcentajeVencido = resumenRaw.porcentajeVencido > 0 ? resumenRaw.porcentajeVencido : resumenRaw.saldoTotal > 0 ? (saldoVencido / resumenRaw.saldoTotal) * 100 : 0;
  const resumen = { ...resumenRaw, saldoCorriente, saldoVencido, porcentajeVencido };
  return { resumen, antiguedad, topClientes };
}

export function apiCuentasPorCobrarDetalle(clienteCodigo: string): Promise<RptCxcDetalleFactura[]> {
  return getJson('/api/Reportes/cxc/detalle-cliente', (data: unknown) => (Array.isArray(data) ? data.map(r => parseCxcDetalleFactura(r as Record<string, unknown>)) : []), { clienteCodigo });
}

// Paginated version for detalle-cliente
export function apiCuentasPorCobrarDetallePaginado(clienteCodigo: string, pagina: number = 1, porPagina: number = 10): Promise<RptCxcDetalleFactura[]> {
  return getJson(
    '/api/Reportes/cxc/detalle-cliente-paginado',
    (data: unknown) => {
      const arr = typeof data === 'object' && data && 'data' in data && Array.isArray((data as any).data) ? (data as any).data : [];
      return arr.map((r: unknown) => parseCxcDetalleFactura(r as Record<string, unknown>));
    },
    { clienteCodigo, pagina: String(pagina), porPagina: String(porPagina) }
  );
}

// ─── Error classification ───────────────────────────────────────────────────

export type ErrorVariant = 'session' | 'network' | 'server' | 'empty';

export function classifyError(e: unknown): {
  variant: ErrorVariant;
  message: string;
} {
  if (e instanceof UnauthorizedError) return { variant: 'session', message: e.message };
  if (e instanceof NetworkError) return { variant: 'network', message: e.message };
  if (e instanceof UpstreamApiError) return { variant: 'server', message: e.message };
  return {
    variant: 'server',
    message: e instanceof Error ? e.message : 'Error desconocido'
  };
}
