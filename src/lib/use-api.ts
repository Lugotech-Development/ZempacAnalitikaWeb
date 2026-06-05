'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UnauthorizedError, classifyError, type ErrorVariant } from './api';
import { fetchAndCache, getCached, subscribe } from './cache';

type State<T> =
  | { status: 'loading'; data: null; error: null; errorVariant: null }
  | { status: 'success'; data: T; error: null; errorVariant: null }
  | {
      status: 'error';
      data: null;
      error: string;
      errorVariant: ErrorVariant;
    };

/**
 * Stale-while-revalidate hook. If we already have data for `key` in the
 * client-side cache we return it INSTANTLY (status: 'success') and silently
 * revalidate in the background. On the first ever fetch — or if the cache
 * was cleared — we show 'loading' until the fetch completes.
 *
 * Always revalidates on mount, on window focus, on tab visibility, and on
 * network online events, so navigating back to a page or reloading shows
 * the freshest data without a perceptible delay.
 *
 * On 401 we redirect to /login. On other errors with cached data we keep
 * showing the cached data — losing the network for a moment shouldn't blank
 * the page.
 */
export function useApi<T>(key: string, fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>(() => {
    const cached = getCached<T>(key);
    return cached
      ? {
          status: 'success' as const,
          data: cached.data,
          error: null,
          errorVariant: null
        }
      : { status: 'loading' as const, data: null, error: null, errorVariant: null };
  });
  const [isValidating, setIsValidating] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setIsValidating(true);
    try {
      const data = await fetchAndCache(key, () => fetcherRef.current());
      setState({
        status: 'success',
        data,
        error: null,
        errorVariant: null
      });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        // emitSessionExpired() was already called in api.ts — modal fires immediately.
        // Just stop loading; the modal handles navigation.
        setIsValidating(false);
        return;
      }
      const { variant, message } = classifyError(e);
      const stillCached = getCached<T>(key);
      if (stillCached) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[useApi] revalidation failed for "${key}":`, message);
        }
      } else {
        setState({
          status: 'error',
          data: null,
          error: message,
          errorVariant: variant
        });
      }
    } finally {
      setIsValidating(false);
    }
  }, [key]);

  // Subscribe to direct cache mutations (e.g. another hook with the same key
  // finished a fetch, or someone called setCached).
  useEffect(() => {
    return subscribe(key, () => {
      const c = getCached<T>(key);
      if (c) {
        setState({
          status: 'success',
          data: c.data,
          error: null,
          errorVariant: null
        });
      }
    });
  }, [key]);

  // Always revalidate on mount.
  useEffect(() => {
    load();
  }, [load]);

  return { ...state, isValidating, reload: load };
}
