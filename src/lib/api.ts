// Client-side API layer. Calls the upstream Reportes Zempac API directly.
// Auth tokens are stored in localStorage. On 401 we attempt a silent refresh;
// if that fails we emit a session-expired event and throw UnauthorizedError.
import { emitSessionExpired } from './session-events';
import { detectAccessBlock, emitAccessBlocked, type AccessBlock } from './access-block-events';
import { analytics } from './analytics/analytics';
import { AnalyticsEvents } from './analytics/events';

import type { Marca, RptCuadreCajaLinea, RptCuentasPorCobrar, RptCxcDetalleFactura, RptDevolucion, RptLote, RptLoteCondensadoLinea, RptPantallaPrincipal, RptProductoMasVendido, RptProductoPorLote, RptVenta, RptVentaFacturador, RptVentaProductoMarca, SessionInfo, Sucursal } from './types';
import {
  parseCuadreLinea,
  parseCxcAntiguedad,
  parseCxcDetalleFactura,
  parseCxcResumen,
  parseCxcTopCliente,
  parseDevolucion,
  parseLote,
  parseLoteCondensadoLinea,
  parseProductoPorLote,
  parsePantallaPrincipal,
  parseProducto,
  parseSucursal,
  parseVenta,
  parseVentaFacturador,
  parseMarca,
  parseVentaProductoMarca
} from './types';

const UPSTREAM = process.env.NEXT_PUBLIC_UPSTREAM_API_HOST ?? 'https://reporteszempacapi.azurewebsites.net';

const STORAGE_KEY = 'zempac.session';

// ─── Session helpers ────────────────────────────────────────────────────────

type StoredSession = {
  token: string;
  refreshToken: string | null;
  empresa: string;
  usuario: string;
  userId?: number | null;
  role?: string | null;
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
  accessBlocked = null; // a fresh sign-in starts unblocked
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  accessBlocked = null; // don't carry a block into the login screen
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

/**
 * Thrown when the backend middleware refuses a request with a block envelope
 * (e.g. expired trial). It carries the parsed block; the global modal — fired
 * via emitAccessBlocked — is what the user actually sees, so callers should
 * treat this like UnauthorizedError and simply stop, not render an inline error.
 */
export class AccessBlockedError extends Error {
  constructor(public block: AccessBlock) {
    super(block.message);
    this.name = 'AccessBlockedError';
  }
}

// ─── Analytics helpers ──────────────────────────────────────────────────────

function normalizeEndpoint(path: string): string {
  const noQuery = path.split('?')[0];
  return noQuery.replace(/\/\d+/g, '/:id');
}

function trackApiError(path: string, e: unknown, latencyMs: number): void {
  // 401 (session flow) and access blocks are tracked separately — don't double-signal.
  if (e instanceof UnauthorizedError || e instanceof AccessBlockedError) return;
  let status = 0;
  let kind = 'network';
  if (e instanceof UpstreamApiError) {
    status = e.status;
    kind = 'http';
  }
  analytics.track(AnalyticsEvents.apiError, {
    endpoint: normalizeEndpoint(path),
    status,
    error_kind: kind,
    latency_ms: latencyMs,
    message: e instanceof Error ? e.message : String(e)
  });
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ─── Token refresh ──────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session?.refreshToken) return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const started = performance.now();
    try {
      const res = await fetch(`${UPSTREAM}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) {
        analytics.track(AnalyticsEvents.tokenRefresh, { success: false, ms: Math.round(performance.now() - started) });
        return null;
      }
      const body = (await res.json()) as Record<string, unknown>;
      const newToken = body.token ? String(body.token) : null;
      if (newToken) {
        setSession({
          ...session,
          token: newToken,
          refreshToken: body.refreshToken ? String(body.refreshToken) : session.refreshToken
        });
      }
      analytics.track(AnalyticsEvents.tokenRefresh, { success: newToken != null, ms: Math.round(performance.now() - started) });
      return newToken;
    } catch {
      analytics.track(AnalyticsEvents.tokenRefresh, { success: false, ms: Math.round(performance.now() - started) });
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ─── Access-block guard ─────────────────────────────────────────────────────
// Once the middleware blocks the account, every subsequent call short-circuits
// here: we never hit the network again (nothing will succeed until the block is
// resolved), and we re-broadcast so a freshly-mounted modal still shows. Reset
// on setSession / clearSession above. Detection itself lives in getJson, the
// single point every data endpoint parses its body through.
let accessBlocked: AccessBlock | null = null;

// Latch a freshly-detected block and hand it to the global modal, then throw so
// the calling report stops. Idempotent — safe to call again while already blocked.
function raiseAccessBlock(block: AccessBlock): never {
  const isNew = accessBlocked === null;
  accessBlocked = block;
  if (isNew) {
    analytics.track(AnalyticsEvents.accessBlocked, {
      code: block.code,
      empresa_nombre: block.empresaNombre,
      fecha_vencimiento: block.fechaVencimiento,
      screen: analytics.currentScreen
    });
  }
  emitAccessBlocked(block);
  throw new AccessBlockedError(block);
}

// ─── Core fetch with auth + retry on 401 ───────────────────────────────────

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  if (accessBlocked) raiseAccessBlock(accessBlocked); // already blocked → don't touch the network

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
      analytics.track(AnalyticsEvents.sessionExpired, { screen: analytics.currentScreen, endpoint: normalizeEndpoint(path) });
      emitSessionExpired();
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
      analytics.track(AnalyticsEvents.sessionExpired, { screen: analytics.currentScreen, endpoint: normalizeEndpoint(path) });
      emitSessionExpired();
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
  const started = performance.now();
  try {
    const res = await authFetch(fullPath);
    const latency = Math.round(performance.now() - started);
    if (res.status === 204) {
      analytics.trackSampled(AnalyticsEvents.apiRequest, {
        endpoint: normalizeEndpoint(path),
        method: 'GET',
        status: 204,
        latency_ms: latency,
        from_cache: false,
        payload_bytes: 0,
        ok: true
      });
      return [] as unknown as T;
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    // Middleware block envelope ({ success:false, code, message }) can arrive on
    // any status — check before the generic error path so it becomes a global
    // AccessBlockedError (→ modal) rather than an inline "server error".
    const block = detectAccessBlock(res.status, body);
    if (block) raiseAccessBlock(block);
    if (!res.ok) {
      const msg = (body as { error?: string; message?: string })?.error ?? (body as { message?: string })?.message ?? `Error inesperado (${res.status})`;
      throw new UpstreamApiError(res.status, msg);
    }
    const result = mapper(body);
    analytics.trackSampled(AnalyticsEvents.apiRequest, {
      endpoint: normalizeEndpoint(path),
      method: 'GET',
      status: res.status,
      latency_ms: latency,
      from_cache: false,
      payload_bytes: Number(res.headers.get('content-length')) || null,
      ok: true
    });
    return result;
  } catch (e) {
    trackApiError(path, e, Math.round(performance.now() - started));
    throw e;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function apiLogin(input: { empresa: string; usuario: string; password: string }): Promise<SessionInfo> {
  analytics.track(AnalyticsEvents.loginAttempt, { empresa: input.empresa, remember_session: true });
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(`${UPSTREAM}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaCodigo: input.empresa,
        username: input.usuario,
        password: input.password,
        clientType: 0
      })
    });
  } catch {
    analytics.track(AnalyticsEvents.loginFailure, { empresa: input.empresa, error_code: 'network', error_message: 'No se pudo conectar con el servidor' });
    throw new NetworkError();
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.status === 401) {
    const msg = (body as { detail?: string })?.detail ?? 'Credenciales incorrectas';
    analytics.track(AnalyticsEvents.loginFailure, { empresa: input.empresa, error_code: 401, error_message: msg });
    throw new UpstreamApiError(401, msg);
  }
  if (res.status === 403) {
    const msg = (body as { message?: string })?.message ?? 'Error de acceso. Por favor, contacte al equipo de soporte.';
    analytics.track(AnalyticsEvents.loginFailure, { empresa: input.empresa, error_code: 403, error_message: msg });
    throw new UpstreamApiError(403, msg);
  }
  if (!res.ok || !body) {
    analytics.track(AnalyticsEvents.loginFailure, { empresa: input.empresa, error_code: res.status, error_message: 'Error de autenticación' });
    throw new UpstreamApiError(res.status, 'Error de autenticación');
  }
  const b = body as Record<string, unknown>;
  const token = String(b.token ?? '');
  if (!token) throw new UpstreamApiError(res.status, 'Respuesta inválida del servidor');
  const userId = asNumberOrNull(b.userId ?? b.UserId ?? b.id);
  const role = b.role != null ? String(b.role) : b.Role != null ? String(b.Role) : null;
  const session: StoredSession = {
    token,
    refreshToken: b.refreshToken ? String(b.refreshToken) : null,
    empresa: b.empresa ? String(b.empresa) : input.empresa,
    usuario: b.username ? String(b.username) : input.usuario,
    userId,
    role
  };
  setSession(session);
  analytics.identify({ userId, username: session.usuario, empresa: session.empresa, role });
  analytics.track(AnalyticsEvents.loginSuccess, {
    empresa: session.empresa,
    user_id: userId,
    role,
    ms_to_authenticate: Math.round(performance.now() - started)
  });
  return { empresa: session.empresa, usuario: session.usuario };
}

export function apiLogout(): void {
  const session = getSession();
  analytics.track(AnalyticsEvents.logout, { reason: 'user' });
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
  analytics.clearIdentity();
}

export function apiMe(): SessionInfo {
  const session = getSession();
  if (!session) throw new UnauthorizedError();
  return { empresa: session.empresa, usuario: session.usuario };
}

export const apiSucursales = () => getJson<Sucursal[]>('/api/Empresas/sucursales', data => (Array.isArray(data) ? data.map(r => parseSucursal(r as Record<string, unknown>)) : []));

export const apiPantallaPrincipal = () =>
  getJson<RptPantallaPrincipal>('/api/Reportes/pantalla-principal-v2', data => {
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

// ─── Cuadre de Caja · Por Lotes ──────────────────────────────────────────
// These two endpoints come straight from a stored procedure with no DTO, so
// we don't yet know the column names. For now we return the raw rows and log
// a live response to the console so the shapes can be mapped properly later.

export const apiAnaliticaLotes = (input: { sucursal: number; status: number; fDesde?: string; fHasta?: string }) =>
  getJson<RptLote[]>('/api/Reportes/analitica-lotes', data => (Array.isArray(data) ? data.map(r => parseLote(r as Record<string, unknown>)) : []), {
    sucursal: String(input.sucursal),
    status: String(input.status),
    fDesde: input.fDesde,
    fHasta: input.fHasta
  });

export const apiAnaliticaLoteCondensado = (lote: number) =>
  getJson<RptLoteCondensadoLinea[]>(`/api/Reportes/analitica-lote-condensado/${lote}`, data =>
    Array.isArray(data) ? data.map(r => parseLoteCondensadoLinea(r as Record<string, unknown>)) : []
  );

// Product detail of a lote (Código / Nombre / Vendido). `orderBy` selects the
// SP's ordering: 1 = código asc, 2 = nombre asc, 3 = vendido desc.
export const apiAnaliticaProductosPorLote = (lote: number, orderBy: number) =>
  getJson<RptProductoPorLote[]>(
    `/api/reportes/analitica-productos-por-lote/${lote}`,
    data => (Array.isArray(data) ? data.map(r => parseProductoPorLote(r as Record<string, unknown>)) : []),
    { orderBy: String(orderBy) }
  );

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

// ─── Catálogo de Marcas ─────────────────────────────────────────────────────

export function apiMarcas(nombre?: string): Promise<Marca[]> {
  const q: Record<string, string | undefined> = { nombre };
  return getJson<Marca[]>(
    '/api/reportes/marcas',
    (data) => (Array.isArray(data) ? data.map(r => parseMarca(r as Record<string, unknown>)) : []),
    q
  );
}

// ─── Ventas por Marca ────────────────────────────────────────────────────────

export function apiVentasProductoMarca(input: { desde: string; hasta: string; marcaId?: number }): Promise<RptVentaProductoMarca[]> {
  const q: Record<string, string> = { desde: input.desde, hasta: input.hasta };
  if (input.marcaId != null) q['marcaId'] = String(input.marcaId);
  return getJson<RptVentaProductoMarca[]>(
    '/api/Reportes/ventas-producto-marca',
    (data) => (Array.isArray(data) ? data.map(r => parseVentaProductoMarca(r as Record<string, unknown>)) : []),
    q
  );
}

// ─── Ventas por Facturador ───────────────────────────────────────────────────

export function apiVentasFacturadorSucursal(input: { desde: string; hasta: string; sucursalId?: number }): Promise<RptVentaFacturador[]> {
  const q: Record<string, string> = { desde: input.desde, hasta: input.hasta };
  if (input.sucursalId != null) q['sucursalId'] = String(input.sucursalId);
  return getJson<RptVentaFacturador[]>(
    '/api/Reportes/ventas-facturador-sucursal',
    (data) => (Array.isArray(data) ? data.map(r => parseVentaFacturador(r as Record<string, unknown>)) : []),
    q
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
