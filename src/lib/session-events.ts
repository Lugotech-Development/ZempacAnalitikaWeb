// Global singleton event bus for session expiration.
// Fired synchronously from api.ts the instant a 401 cannot be recovered.
// Any component can subscribe to react immediately — no router navigation lag.

/**
 * Why the session ended, when the backend says so.
 *
 * A 401 on refresh is ambiguous on its own: a token that simply aged out and a
 * session revoked because someone logged in elsewhere look identical. That
 * difference matters — an eviction the user does not recognize is how they find
 * out their credentials are compromised — so the modal only claims a cause when
 * the backend names one. No `code`, no claim.
 *
 * Deliberately code-agnostic, like `detectAccessBlock`: any unknown code falls
 * back to the generic expiry copy, so this needs no change when a new one appears.
 */
export type SessionEndReason = {
  code: string;
  deviceName: string | null;
  ipAddress: string | null;
  at: string | null;
};

type Listener = (reason: SessionEndReason | null) => void;

const listeners = new Set<Listener>();

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Same UTC pinning as parseSesionActiva: the API sends these zoneless even though
// they are UTC, and `new Date` would read them as local — see src/lib/types.ts.
const utc = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s) ? s : `${s}Z`;
};

/**
 * Reads a session-end reason out of a failed `/api/auth/refresh` body. Returns
 * null for today's bodies (`{ message }` only), which is what keeps the generic
 * modal showing until the backend starts sending a `code`.
 */
export function parseSessionEndReason(body: unknown): SessionEndReason | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const code = str(b.code ?? b.Code);
  if (!code) return null;
  return {
    code,
    deviceName: str(b.deviceName ?? b.DeviceName),
    ipAddress: str(b.ipAddress ?? b.IpAddress),
    at: utc(b.at ?? b.At ?? b.revokedAt ?? b.createdAt)
  };
}

/** Subscribe to session-expired events. Returns an unsubscribe function. */
export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Broadcast a session-expired event to all active listeners. */
export function emitSessionExpired(reason: SessionEndReason | null = null): void {
  for (const fn of listeners) fn(reason);
}
