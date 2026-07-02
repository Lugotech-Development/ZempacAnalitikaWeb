// Global singleton event bus for "access blocked" responses.
//
// The backend runs a middleware on every authenticated endpoint that can, in
// various situations, refuse the request with a JSON envelope instead of data:
//
//   { "success": false, "code": "TRIAL_VENCIDO", "message": "…", …extras }
//
// `code` is a machine-readable reason (TRIAL_VENCIDO today, others later) and
// `message` is the human copy to show. This module detects that envelope and
// broadcasts it so a single global modal can present ANY such block — the app
// never has to know the specific codes ahead of time.

/**
 * A normalized access-block. `code` + `message` are always present; everything
 * else the middleware sends is kept in `raw` so future block types can surface
 * extra context without a code change here.
 */
export type AccessBlock = {
  /** Machine-readable reason, e.g. 'TRIAL_VENCIDO'. Drives presentation + support. */
  code: string;
  /** Human-readable message from the backend — shown verbatim to the user. */
  message: string;
  /** HTTP status that carried the block (402, 403, …). */
  status: number;
  /** Common optional fields the middleware may include. */
  empresaNombre?: string | null;
  fechaVencimiento?: string | null;
  /** Full untouched body, for any block-specific fields we don't model yet. */
  raw: Record<string, unknown>;
};

type Listener = (block: AccessBlock) => void;

const listeners = new Set<Listener>();

/** Subscribe to access-blocked events. Returns an unsubscribe function. */
export function onAccessBlocked(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Broadcast an access-block to all active listeners (the global modal). */
export function emitAccessBlocked(block: AccessBlock): void {
  for (const fn of listeners) fn(block);
}

/**
 * Recognize the middleware's block envelope in a response body. Kept generic on
 * purpose: any `{ success: false, code: <non-empty string> }` object counts as a
 * block, regardless of the specific code or HTTP status, so new block types work
 * with zero changes here. Returns the normalized block, or null if `body` isn't
 * a block envelope (a normal data payload or an ordinary error).
 */
export function detectAccessBlock(status: number, body: unknown): AccessBlock | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (b.success !== false) return null;
  if (typeof b.code !== 'string' || b.code.length === 0) return null;
  return {
    code: b.code,
    message: typeof b.message === 'string' && b.message.length > 0 ? b.message : 'Tu acceso está restringido en este momento.',
    status,
    empresaNombre: typeof b.empresaNombre === 'string' ? b.empresaNombre : null,
    fechaVencimiento: typeof b.fechaVencimiento === 'string' ? b.fechaVencimiento : null,
    raw: b
  };
}
