// Global singleton event bus for session expiration.
// Fired synchronously from api.ts the instant a 401 cannot be recovered.
// Any component can subscribe to react immediately — no router navigation lag.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to session-expired events. Returns an unsubscribe function. */
export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Broadcast a session-expired event to all active listeners. */
export function emitSessionExpired(): void {
  for (const fn of listeners) fn();
}
