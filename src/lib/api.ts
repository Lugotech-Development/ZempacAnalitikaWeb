// Client-side wrappers for our Next.js API routes. Everything in here is safe
// to call from `"use client"` components and from server components alike
// (relative URLs work in both contexts when paired with `fetch`).
//
// Error model:
//   • `UnauthorizedError` (401) → middleware will already have nuked the
//     cookies, the caller should redirect to /login.
//   • `UpstreamError`     (4xx/5xx from our route) → show error card.
//   • `NetworkError`      (fetch rejected, e.g. offline) → "API no disponible".
//
// All non-2xx responses end up as a thrown error so the components can use a
// simple try/catch with `loading | data | error` state.

import type { RptCuadreCajaLinea, RptDevolucion, RptPantallaPrincipal, RptProductoMasVendido, RptVenta, SessionInfo, Sucursal } from './types';

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

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      credentials: 'same-origin',
      ...init
    });
  } catch {
    throw new NetworkError();
  }
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (res.status === 204) {
    return [] as unknown as T;
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error ?? `Error inesperado (${res.status})`;
    throw new UpstreamApiError(res.status, msg);
  }
  return body as T;
}

export const apiLogin = (input: { empresa: string; usuario: string; password: string; keepSession?: boolean }) =>
  call<SessionInfo>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

export const apiLogout = () => call<{ ok: true }>('/api/auth/logout', { method: 'POST' });

export const apiMe = () => call<SessionInfo>('/api/me');

export const apiSucursales = () => call<Sucursal[]>('/api/empresas/sucursales');

export const apiPantallaPrincipal = () => call<RptPantallaPrincipal>('/api/reportes/pantalla-principal');

export const apiVentas = () => call<RptVenta[]>('/api/reportes/ventas');

export const apiDevoluciones = () => call<RptDevolucion[]>('/api/reportes/devoluciones');

export const apiProductos = () => call<RptProductoMasVendido[]>('/api/reportes/productos');

export const apiCuadreCaja = (input: { sucursal: number; fDesde?: string; fHasta?: string }) => {
  const qs = new URLSearchParams({ sucursal: String(input.sucursal) });
  if (input.fDesde) qs.set('fDesde', input.fDesde);
  if (input.fHasta) qs.set('fHasta', input.fHasta);
  return call<RptCuadreCajaLinea[]>(`/api/reportes/cuadre-caja?${qs}`);
};

// Helper for components: classify any thrown error into a UI variant.
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
