// Tiny in-memory SWR-style cache for client-side API calls.
//
// Goals:
//   • Returning to a page that was already loaded shows data INSTANTLY from
//     cache, while a background fetch revalidates.
//   • Concurrent calls with the same key are deduped (single inflight promise).
//   • Subscribers are notified when the cache for their key is updated.
//   • A separate global revalidation channel fires on focus / visibility /
//     online so all active hooks re-run their fetchers.
//
// Lives only on the client. Survives client-side navigation. Cleared on full
// reload (which is when the user expects "really fresh" data anyway).

export type CacheEntry<T = unknown> = {
  data: T;
  updatedAt: number;
};

type Subscriber = () => void;

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const subs = new Map<string, Set<Subscriber>>();
const revalidateSubs = new Set<Subscriber>();

export function getCached<T>(key: string): CacheEntry<T> | undefined {
  return store.get(key) as CacheEntry<T> | undefined;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, updatedAt: Date.now() });
  const set = subs.get(key);
  if (!set) return;
  for (const cb of set) cb();
}

export function invalidate(key: string): void {
  store.delete(key);
  inflight.delete(key);
}

export function invalidateAll(): void {
  store.clear();
  inflight.clear();
}

export function subscribe(key: string, cb: Subscriber): () => void {
  let set = subs.get(key);
  if (!set) {
    set = new Set();
    subs.set(key, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
    if (set && set.size === 0) subs.delete(key);
  };
}

/**
 * Fetch with single-flight dedup. If a fetch for this key is already in
 * progress, returns the same promise.
 */
export async function fetchAndCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = (async () => {
    try {
      const data = await fetcher();
      setCached(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

// ─── Global revalidation channel ────────────────────────────────────────────

export function subscribeRevalidate(cb: Subscriber): () => void {
  revalidateSubs.add(cb);
  return () => {
    revalidateSubs.delete(cb);
  };
}

export function triggerRevalidate(): void {
  for (const cb of revalidateSubs) cb();
}

let globalHooksInstalled = false;

export function installGlobalRevalidationHooks(): void {
  if (typeof window === 'undefined' || globalHooksInstalled) return;
  globalHooksInstalled = true;
  const trigger = () => {
    if (document.visibilityState === 'visible') triggerRevalidate();
  };
  window.addEventListener('focus', trigger);
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', trigger);
}
