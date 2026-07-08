import { uuidV4 } from './ids';
import {
  AnalyticsEvents,
  type AnalyticsContext,
  type AnalyticsEvent,
  type EventProperties
} from './events';
import { DebugSink, type AnalyticsSink } from './sink';
import { CustomTelemetrySink } from './telemetry-sink';
import { defaultTelemetryConfig, fetchTelemetryConfig, type TelemetryConfig } from './config';

const UPSTREAM = process.env.NEXT_PUBLIC_UPSTREAM_API_HOST ?? 'https://reporteszempacapi.azurewebsites.net';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const DEVICE_ID_KEY = 'analytics.device_id';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ENGAGEMENT_WINDOW_MS = 5000;

interface ScreenState {
  name: string;
  dwellClosedMs: number;
  fgSince: number | null;
  activeMs: number;
  activeUntil: number;
  interactionCount: number;
  reachedData: boolean;
}

/**
 * The single entry point for web telemetry — mirror of the Flutter `Analytics`
 * facade. Enriches every event with the shared envelope + context and fans it
 * out to each sink. Fail-open and non-throwing. See TELEMETRY.md.
 */
class Analytics {
  private initialized = false;
  private context: AnalyticsContext | null = null;
  private deviceId = '';
  private sinks: AnalyticsSink[] = [];
  private customSink: CustomTelemetrySink | null = null;
  private config: TelemetryConfig = defaultTelemetryConfig;
  private tokenProvider: () => string | null = () => null;

  private sessionId = '';
  private sequence = 0;
  private eventCount = 0;
  private screenCount = 0;
  private sessionStartedAt = 0;
  private backgroundedAt = 0;
  private entryScreen: string | null = null;
  private lastScreen: string | null = null;

  private screen: ScreenState | null = null;
  private lastScreenName: string | null = null;

  get currentScreen(): string | null {
    return this.screen?.name ?? null;
  }

  init(tokenProvider: () => string | null, extraSinks: AnalyticsSink[] = []): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.tokenProvider = tokenProvider;

    let isFirst = false;
    try {
      this.deviceId = localStorage.getItem(DEVICE_ID_KEY) ?? '';
      if (!this.deviceId) {
        this.deviceId = uuidV4();
        isFirst = true;
        localStorage.setItem(DEVICE_ID_KEY, this.deviceId);
      }
    } catch {
      this.deviceId = uuidV4();
    }

    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    this.context = {
      user_id: null,
      username: null,
      empresa: null,
      role: null,
      app: 'web',
      app_version: APP_VERSION,
      platform: 'web',
      os_version: null,
      device_model: null,
      locale: 'es',
      screen_w: window.screen?.width ?? null,
      screen_h: window.screen?.height ?? null,
      network: nav.connection?.effectiveType ?? 'unknown',
      is_first_session: isFirst
    };

    const custom = new CustomTelemetrySink(`${UPSTREAM}/api/telemetry/events`, () => this.tokenProvider());
    custom.init();
    this.customSink = custom;
    this.sinks = [new DebugSink(), custom, ...extraSinks];
    this.initialized = true;

    this.startSession(true);
    if (isFirst) this.track(AnalyticsEvents.appInstalled);

    void this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    const cfg = await fetchTelemetryConfig(UPSTREAM);
    this.config = cfg;
    this.customSink?.applyConfig(cfg);
  }

  // ── Identity ──────────────────────────────────────────────────────────────
  identify(id: { userId?: number | null; username?: string | null; empresa?: string | null; role?: string | null }): void {
    if (!this.context) return;
    if (id.userId != null) this.context.user_id = id.userId;
    if (id.username != null) this.context.username = id.username;
    if (id.empresa != null) this.context.empresa = id.empresa;
    if (id.role != null) this.context.role = id.role;
  }

  clearIdentity(): void {
    if (!this.context) return;
    this.context.user_id = null;
    this.context.username = null;
    this.context.empresa = null;
    this.context.role = null;
  }

  // ── Tracking ──────────────────────────────────────────────────────────────
  track(name: string, properties: EventProperties = {}): void {
    this.emit(name, properties, false);
  }

  trackSampled(name: string, properties: EventProperties = {}): void {
    this.emit(name, properties, true);
  }

  private emit(name: string, properties: EventProperties, sampleable: boolean): void {
    if (!this.initialized || !this.context) return;
    try {
      if (sampleable && this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) return;
      this.sequence++;
      this.eventCount++;
      if (name === AnalyticsEvents.screenView) {
        this.screenCount++;
        const s = properties.screen;
        if (typeof s === 'string') this.lastScreen = s;
      }
      const event: AnalyticsEvent = {
        event_id: uuidV4(),
        event_name: name,
        event_version: 1,
        occurred_at: new Date().toISOString(),
        sequence: this.sequence,
        session_id: this.sessionId,
        device_id: this.deviceId,
        context: { ...this.context },
        properties
      };
      for (const sink of this.sinks) {
        try {
          sink.handle(event);
        } catch {
          // one bad sink must not starve the others
        }
      }
    } catch {
      // analytics must never throw into the app
    }
  }

  async flush(): Promise<void> {
    for (const sink of this.sinks) {
      try {
        await sink.flush();
      } catch {
        // ignore
      }
    }
  }

  flushBeacon(): void {
    this.customSink?.flushBeacon();
  }

  tabSwitch(screen: string, fromTab: string, toTab: string): void {
    this.track(AnalyticsEvents.tabSwitch, { screen, from_tab: fromTab, to_tab: toTab });
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  private startSession(coldStart = false): void {
    this.sessionId = uuidV4();
    this.sequence = 0;
    this.screenCount = 0;
    this.eventCount = 0;
    this.sessionStartedAt = Date.now();
    this.track(AnalyticsEvents.sessionStart, { entry_screen: this.entryScreen, cold_start: coldStart });
  }

  private endSession(reason: string): void {
    if (!this.sessionStartedAt) return;
    this.track(AnalyticsEvents.sessionEnd, {
      duration_ms: Date.now() - this.sessionStartedAt,
      screen_count: this.screenCount,
      event_count: this.eventCount,
      exit_screen: this.lastScreen,
      end_reason: reason
    });
    this.sessionStartedAt = 0;
  }

  onBackground(): void {
    if (!this.initialized) return;
    this.backgroundedAt = Date.now();
    this.pauseScreen();
    this.track(AnalyticsEvents.appBackground, { current_screen: this.lastScreen });
    void this.flush();
  }

  onForeground(): void {
    if (!this.initialized) return;
    const bg = this.backgroundedAt;
    this.backgroundedAt = 0;
    if (bg && Date.now() - bg > SESSION_TIMEOUT_MS) {
      this.entryScreen = this.lastScreen;
      this.endSession('timeout');
      this.startSession();
    }
    this.resumeScreen();
    this.track(AnalyticsEvents.appForeground, { current_screen: this.lastScreen });
  }

  // ── Screen tracking (mirror of ScreenTracker) ───────────────────────────────
  enterScreen(name: string, entryMethod?: string, tab?: string): void {
    this.finalizeScreen();
    const prev = this.lastScreenName;
    this.screen = {
      name,
      dwellClosedMs: 0,
      fgSince: Date.now(),
      activeMs: 0,
      activeUntil: 0,
      interactionCount: 0,
      reachedData: false
    };
    this.lastScreenName = name;
    const props: EventProperties = { screen: name, previous_screen: prev, entry_method: entryMethod ?? null };
    if (tab != null) props.tab = tab;
    this.track(AnalyticsEvents.screenView, props);
  }

  leaveScreen(name: string): void {
    if (!this.screen || this.screen.name !== name) return;
    this.finalizeScreen();
  }

  private finalizeScreen(): void {
    const s = this.screen;
    if (!s) return;
    this.pauseScreen();
    const dwell = s.dwellClosedMs;
    const active = Math.min(s.activeMs, dwell);
    this.track(AnalyticsEvents.screenLeave, {
      screen: s.name,
      dwell_ms: dwell,
      active_ms: active,
      interaction_count: s.interactionCount,
      scroll_depth_pct: 0,
      reached_data: s.reachedData
    });
    this.screen = null;
  }

  private pauseScreen(): void {
    const s = this.screen;
    if (!s || s.fgSince == null) return;
    s.dwellClosedMs += Date.now() - s.fgSince;
    s.fgSince = null;
  }

  private resumeScreen(): void {
    const s = this.screen;
    if (s && s.fgSince == null) s.fgSince = Date.now();
  }

  recordInteraction(): void {
    const s = this.screen;
    if (!s) return;
    s.interactionCount++;
    const now = Date.now();
    const until = now + ENGAGEMENT_WINDOW_MS;
    if (s.activeUntil === 0 || now > s.activeUntil) {
      s.activeMs += ENGAGEMENT_WINDOW_MS;
    } else {
      const extra = until - s.activeUntil;
      if (extra > 0) s.activeMs += extra;
    }
    s.activeUntil = until;
  }

  markReachedData(): void {
    if (this.screen) this.screen.reachedData = true;
  }
}

export const analytics = new Analytics();
