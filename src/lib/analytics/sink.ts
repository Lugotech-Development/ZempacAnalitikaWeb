import type { AnalyticsEvent } from './events';

/**
 * A destination for events. The analytics facade enriches each event once and
 * fans it out to every sink (custom pipeline, debug, and — once wired — GA4).
 * Implementations must never throw.
 */
export interface AnalyticsSink {
  handle(event: AnalyticsEvent): void;
  flush(): Promise<void>;
}

/** Logs every event to the console in dev — makes the system verifiable with no backend. */
export class DebugSink implements AnalyticsSink {
  handle(event: AnalyticsEvent): void {
    if (process.env.NODE_ENV === 'production') return;
    // eslint-disable-next-line no-console
    console.debug(`📊 #${event.sequence} ${event.event_name}`, event.properties);
  }

  async flush(): Promise<void> {}
}
