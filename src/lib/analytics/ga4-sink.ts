import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties, type Analytics as FbAnalytics } from 'firebase/analytics';
import { firebaseApp } from '../firebase';
import { AnalyticsEvents, type AnalyticsEvent } from './events';
import type { AnalyticsSink } from './sink';

// Curated high-signal subset forwarded to GA4 (skip high-volume api_request —
// that stays in the custom performance pipeline). See TELEMETRY.md §8.
const GA4_FORWARD = new Set<string>([
  AnalyticsEvents.sessionStart,
  AnalyticsEvents.screenView,
  AnalyticsEvents.loginSuccess,
  AnalyticsEvents.loginFailure,
  AnalyticsEvents.logout,
  AnalyticsEvents.reportLoaded,
  AnalyticsEvents.detailOpened,
  AnalyticsEvents.filterApplied,
  AnalyticsEvents.dateRangeChanged,
  AnalyticsEvents.sucursalSelected,
  AnalyticsEvents.exportGenerated,
  AnalyticsEvents.accessBlocked,
  AnalyticsEvents.appError
]);

/**
 * Forwards a curated subset of events to Google Analytics 4 (Firebase). Runs
 * only in the browser and only when GA is supported; every call is guarded so a
 * GA failure never affects the app or the sibling sinks.
 */
export class GA4Sink implements AnalyticsSink {
  private ga: FbAnalytics | null = null;
  private ready = false;
  private lastUserKey = '';

  constructor() {
    void this.tryInit();
  }

  private async tryInit(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      if (await isSupported()) {
        this.ga = getAnalytics(firebaseApp());
        this.ready = true;
      }
    } catch {
      // GA blocked / unsupported — stay disabled
    }
  }

  handle(event: AnalyticsEvent): void {
    if (!this.ready || !this.ga) return;
    if (!GA4_FORWARD.has(event.event_name)) return;
    try {
      this.syncIdentity(event);
      if (event.event_name === AnalyticsEvents.screenView) {
        // Use the string-typed field (not the 'screen_view' literal) so TS picks
        // the generic overload; at runtime GA still records the reserved event.
        logEvent(this.ga, event.event_name, {
          firebase_screen: String(event.properties.screen ?? ''),
          firebase_screen_class: String(event.properties.screen ?? ''),
          ...sanitize(event.properties)
        });
      } else {
        logEvent(this.ga, event.event_name, sanitize(event.properties));
      }
    } catch {
      // never throw
    }
  }

  private syncIdentity(event: AnalyticsEvent): void {
    if (!this.ga) return;
    const key = `${event.context.user_id ?? ''}|${event.context.empresa ?? ''}|${event.context.role ?? ''}`;
    if (key === this.lastUserKey) return;
    this.lastUserKey = key;
    if (event.context.user_id != null) setUserId(this.ga, String(event.context.user_id));
    setUserProperties(this.ga, {
      empresa: event.context.empresa ?? '',
      role: event.context.role ?? '',
      app_version: event.context.app_version
    });
  }

  async flush(): Promise<void> {}
}

// GA4 params must be primitives; drop null/nested values.
function sanitize(props: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}
