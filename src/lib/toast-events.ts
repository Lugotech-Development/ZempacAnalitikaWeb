// Global singleton event bus for transient toast notifications. Mirrors
// session-events.ts. Fired from anywhere (e.g. a failed Excel download); the
// <ToastHost/> mounted in the dashboard layout renders them.

export type ToastVariant = 'error' | 'success' | 'info';

export interface ToastPayload {
  id: number;
  variant: ToastVariant;
  message: string;
}

type Listener = (t: ToastPayload) => void;

const listeners = new Set<Listener>();
let counter = 0;

/** Subscribe to toast events. Returns an unsubscribe function. */
export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Broadcast a toast to all active listeners. */
export function emitToast(variant: ToastVariant, message: string): void {
  const payload: ToastPayload = { id: ++counter, variant, message };
  for (const fn of listeners) fn(payload);
}
