'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics/analytics';
import { AnalyticsEvents } from '@/lib/analytics/events';
import { GA4Sink } from '@/lib/analytics/ga4-sink';
import { screenNameForPath } from '@/lib/analytics/screen-map';
import { getSession } from '@/lib/api';

/**
 * App-wide analytics bootstrap + screen tracking. Mounted once in the root
 * layout so it covers every route (login + dashboard). Initializes the pipeline,
 * wires foreground/background + interaction + pagehide-flush listeners, and
 * emits screen_view/screen_leave as the pathname changes.
 */
export function AnalyticsTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    analytics.init(() => getSession()?.token ?? null, [new GA4Sink()]);
    const s = getSession();
    if (s) {
      analytics.identify({ userId: s.userId ?? null, username: s.usuario, empresa: s.empresa, role: s.role ?? null });
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') analytics.onBackground();
      else analytics.onForeground();
    };
    const onPageHide = () => analytics.flushBeacon();
    const onPointer = () => analytics.recordInteraction();
    const onError = (event: ErrorEvent) => {
      analytics.track(AnalyticsEvents.appError, {
        error_type: event.error instanceof Error ? event.error.name : 'Error',
        message: event.message,
        screen: analytics.currentScreen,
        fatal: true
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      analytics.track(AnalyticsEvents.appError, {
        error_type: 'UnhandledRejection',
        message: String(event.reason),
        screen: analytics.currentScreen,
        fatal: true
      });
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (pathname) analytics.enterScreen(screenNameForPath(pathname));
  }, [pathname]);

  return null;
}
