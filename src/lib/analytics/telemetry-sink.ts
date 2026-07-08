import { EventQueue } from './queue';
import { defaultTelemetryConfig, type TelemetryConfig } from './config';
import { uuidV4 } from './ids';
import type { AnalyticsEvent } from './events';
import type { AnalyticsSink } from './sink';

/**
 * Custom self-hosted pipeline sink (TELEMETRY.md §6-7). Batches events and POSTs
 * to /api/telemetry/events with fetch({keepalive}); uses navigator.sendBeacon on
 * pagehide for the final flush. Fully fail-open — with no backend yet, events
 * stay queued (bounded) and retry with exponential backoff.
 *
 * The ingest endpoint must be CORS-enabled: this static site calls it directly.
 */
export class CustomTelemetrySink implements AnalyticsSink {
  private readonly queue = new EventQueue();
  private config: TelemetryConfig = defaultTelemetryConfig;
  private sending = false;
  private consecutiveFailures = 0;
  private nextAllowedSend = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly tokenProvider: () => string | null
  ) {}

  init(): void {
    this.queue.restore();
    this.scheduleTimer();
  }

  applyConfig(config: TelemetryConfig): void {
    this.config = config;
    this.scheduleTimer();
  }

  private scheduleTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this.config.enabled) return;
    const seconds = Math.min(600, Math.max(10, this.config.flushIntervalS));
    this.timer = setInterval(() => void this.flush(), seconds * 1000);
  }

  handle(event: AnalyticsEvent): void {
    if (!this.config.enabled) return;
    if (this.config.disabledEvents.has(event.event_name)) return;
    this.queue.add(event);
    if (this.queue.length >= this.config.batchSize) void this.flush();
  }

  async flush(): Promise<void> {
    this.queue.persist(); // durability first
    if (this.sending || !this.config.enabled || this.queue.isEmpty) return;
    if (Date.now() < this.nextAllowedSend) return;
    this.sending = true;
    try {
      const batch = this.queue.peek(this.config.batchSize);
      if (batch.length === 0) return;
      const token = this.tokenProvider();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.envelope(batch)),
        keepalive: true,
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        this.queue.removeSent(batch.length);
        this.queue.persist();
        this.consecutiveFailures = 0;
        this.nextAllowedSend = 0;
      } else {
        this.backoff();
      }
    } catch {
      this.backoff();
    } finally {
      this.sending = false;
    }
  }

  /** Final flush on pagehide via sendBeacon (anonymous — beacons can't set headers). */
  flushBeacon(): void {
    if (!this.config.enabled || this.queue.isEmpty) return;
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      void this.flush();
      return;
    }
    const batch = this.queue.peek(this.config.batchSize);
    if (batch.length === 0) return;
    const blob = new Blob([JSON.stringify(this.envelope(batch))], { type: 'application/json' });
    if (navigator.sendBeacon(this.endpoint, blob)) {
      this.queue.removeSent(batch.length);
      this.queue.persist();
    }
  }

  private envelope(events: AnalyticsEvent[]): Record<string, unknown> {
    return { batch_id: uuidV4(), sent_at: new Date().toISOString(), events };
  }

  private backoff(): void {
    this.consecutiveFailures++;
    const shift = Math.min(9, Math.max(1, this.consecutiveFailures));
    const seconds = Math.min(300, Math.max(2, 1 << shift));
    this.nextAllowedSend = Date.now() + seconds * 1000;
  }
}
