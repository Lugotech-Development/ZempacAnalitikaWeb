// Remote telemetry config (kill-switch + sampling), from GET /api/Configuracion/app.
// Fail-open defaults keep telemetry running until the backend ships the block.
export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  flushIntervalS: number;
  batchSize: number;
  disabledEvents: Set<string>;
}

export const defaultTelemetryConfig: TelemetryConfig = {
  enabled: true,
  sampleRate: 1,
  flushIntervalS: 45,
  batchSize: 20,
  disabledEvents: new Set()
};

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseTelemetryConfig(json: Record<string, unknown>): TelemetryConfig {
  const rate = asNumber(json.sample_rate, 1);
  const disabled = Array.isArray(json.disabled_events) ? json.disabled_events.map(String) : [];
  return {
    enabled: typeof json.enabled === 'boolean' ? json.enabled : true,
    sampleRate: Math.min(1, Math.max(0, rate)),
    flushIntervalS: asNumber(json.flush_interval_s, 45),
    batchSize: asNumber(json.batch_size, 20),
    disabledEvents: new Set(disabled)
  };
}

export async function fetchTelemetryConfig(upstream: string): Promise<TelemetryConfig> {
  try {
    const res = await fetch(`${upstream}/api/Configuracion/app`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return defaultTelemetryConfig;
    const decoded: unknown = await res.json();
    const map = Array.isArray(decoded) ? decoded[0] : decoded;
    if (!map || typeof map !== 'object') return defaultTelemetryConfig;
    const record = map as Record<string, unknown>;
    const tel = record.telemetry ?? record.Telemetry;
    if (tel && typeof tel === 'object') return parseTelemetryConfig(tel as Record<string, unknown>);
    return defaultTelemetryConfig;
  } catch {
    return defaultTelemetryConfig;
  }
}
