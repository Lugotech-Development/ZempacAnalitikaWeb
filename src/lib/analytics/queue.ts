import type { AnalyticsEvent } from './events';

/**
 * Bounded, durable FIFO buffer of events, mirrored to localStorage so a reload
 * doesn't lose queued events (the web analogue of the Flutter shared_preferences
 * buffer). When full, the oldest events are dropped.
 */
export class EventQueue {
  private buffer: AnalyticsEvent[] = [];
  private dirty = false;

  constructor(
    private readonly maxSize = 500,
    private readonly storageKey = 'analytics.event_queue'
  ) {}

  get length(): number {
    return this.buffer.length;
  }

  get isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  restore(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.buffer = parsed.filter((e): e is AnalyticsEvent => !!e && typeof e === 'object');
        this.trim();
      }
    } catch {
      // corrupt buffer must not break startup
    }
  }

  add(event: AnalyticsEvent): void {
    this.buffer.push(event);
    this.trim();
    this.dirty = true;
  }

  /** Peek (without removing) up to n oldest events; a failed send leaves them queued. */
  peek(n: number): AnalyticsEvent[] {
    return this.buffer.slice(0, n);
  }

  removeSent(count: number): void {
    if (count <= 0) return;
    this.buffer.splice(0, Math.min(count, this.buffer.length));
    this.dirty = true;
  }

  private trim(): void {
    if (this.buffer.length > this.maxSize) {
      this.buffer.splice(0, this.buffer.length - this.maxSize);
    }
  }

  persist(): void {
    if (!this.dirty || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.buffer));
      this.dirty = false;
    } catch {
      // quota / disabled storage — fail-open
    }
  }
}
