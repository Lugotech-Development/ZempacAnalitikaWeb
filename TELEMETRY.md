# TELEMETRY.md — Zempac Analitika Telemetry & Analytics Spec

Canonical, language-neutral spec for the product-analytics/telemetry system shared by **both** apps:
the Flutter app (`../ReportesZempacApp`, canonical) and the Next.js web companion
(`../ZempacAnalitikaWeb`). Like `DESIGN.md`, this contract is **implemented twice, defined once** — the
Dart and TypeScript clients must produce byte-compatible events. Keep this file in lockstep across both
repos.

> **Audience:** app engineers (client instrumentation) **and** the backend team (ingest endpoint + DB).
> Sections marked **[BACKEND]** are the hand-off requirements.

## 1. Why this exists

Three consumers, one instrumentation layer:

1. **Custom self-hosted pipeline** — the deep, business-owned intel. Crown jewel = **per-tenant
   engagement** (health / churn) for this subscription product. PII/PCI-safe, cross-tenant aggregable.
2. **Google Analytics (GA4)** — parallel, zero-backend standard dashboards (funnels, retention, realtime,
   geography). A curated subset of events is forwarded here.
3. **Firebase Crashlytics** — crash/error reporting on **Flutter mobile only** (see §8).

All three are fed from **one facade** (`Analytics.track`) that fans out to sinks. Instrumentation is
written once.

## 2. Principles

- **Event-based.** Every action is an immutable event = a shared **envelope** + typed **properties**.
- **Never breaks the app.** Fire-and-forget, wrapped, **fails open/silent** (mirrors `VersionCheckService`).
- **Metadata, not sensitive data.** Log the *shape* of activity (report name, filter kind, row counts,
  latencies). **Never** money values, customer names, or raw search text. This is a hard rule for every
  sink (custom, GA4, Crashlytics).
- **Tenant-first.** Every event carries `empresa`.
- **Remote control.** Anonymous `device_id` pre-login; kill-switch + sampling delivered via config so
  telemetry can be tuned/disabled with no app release.

## 3. Identity & sessions

| Field | Source | Notes |
|---|---|---|
| `device_id` | UUID v4, persisted (`shared_preferences` / `localStorage`) | Exists **pre-login** → captures "opened app, never logged in" |
| `session_id` | UUID per app-session | Boundary below |
| `user_id` + `role` | **new** login-response fields (§7.3) | Until live: fallback composite `empresa\|username` |
| `empresa` | `AppSession.empresa` / `zempac.session.empresa` | Tenant key on every event |

**App session** = cold start (or resume after >30 min background) → until background-beyond-threshold /
close / logout. Yields session length, screens/session, depth, entry/exit screen.

## 4. Event envelope (schema v1)

```jsonc
{
  "event_id":      "uuid",            // client-generated → server dedupes on this
  "event_name":    "screen_view",     // snake_case, from §5 catalog
  "event_version": 1,                 // per-event-type schema version
  "occurred_at":   "2026-07-06T14:03:22.511Z", // client clock, ISO-8601 UTC
  "sequence":      421,               // monotonic per session → ordering under equal timestamps
  "session_id":    "uuid",
  "device_id":     "uuid",
  "context": {
    "user_id": 1234,                  // null pre-login
    "username": "jdoe",               // fallback identity
    "empresa": "FARMA01",             // tenant
    "role": "cajero",                 // null until backend adds it
    "app": "flutter | web",
    "app_version": "1.8.2",
    "platform": "android|ios|web|macos|windows|linux",
    "os_version": "…", "device_model": "…",
    "locale": "es", "screen_w": 1080, "screen_h": 2400,
    "network": "wifi|cellular|unknown",
    "is_first_session": false
  },
  "properties": { /* event-specific, see §5 */ }
}
```

Batch wrapper (what the client POSTs): `{ "batch_id": "uuid", "sent_at": "ISO-8601", "events": [ … ] }`,
**gzip-compressed**.

## 5. Event catalog

Naming: `snake_case`, `object_action` where natural. Properties are metadata only (§2).

### A. Lifecycle / session
| Event | Properties |
|---|---|
| `app_installed` | — (first-ever launch) |
| `session_start` | `entry_screen, cold_start, seconds_since_last_session` |
| `session_end` | `duration_ms, screen_count, event_count, exit_screen, end_reason` |
| `app_foreground` / `app_background` | `current_screen` |

### B. Auth / account
| Event | Properties |
|---|---|
| `login_attempt` | `empresa, remember_session` |
| `login_success` | `empresa, user_id, role, ms_to_authenticate` |
| `login_failure` | `empresa, error_code(401\|403\|network\|server), error_message` |
| `logout` | `reason(user\|session_expired\|access_blocked), session_duration_ms` |
| `session_expired` | `screen, endpoint` |
| `token_refresh` | `success, ms, triggered_by_endpoint` |
| **`access_blocked`** | `code(TRIAL_VENCIDO…), empresa_nombre, fecha_vencimiento, screen` |

`access_blocked` ties usage directly to subscription lifecycle — highest business value.

### C. Navigation / screen views — **time-on-page**
| Event | Properties |
|---|---|
| `screen_view` | `screen, previous_screen, entry_method(bottom_nav\|drawer\|push\|back\|deep_link), tab?` |
| `screen_leave` | `screen, dwell_ms, active_ms, interaction_count, scroll_depth_pct, reached_data` |
| `tab_switch` | `screen, from_tab, to_tab` |
| `drawer_opened` | — |

- `dwell_ms` = **foreground-only** time (backgrounded time excluded → "phone in pocket" ≠ engagement).
- `active_ms` = time within N s of a tap/scroll → engaged vs. idle-staring.
- `tab_switch` covers HomeShell bottom nav **and** Cuadre de Caja internal tabs (neither fires a route).

### D. Report data / interactions
| Event | Properties |
|---|---|
| `report_loaded` | `report, source(network\|cache), row_count, latency_ms, filters_hash, from_refresh` |
| `report_empty` | `report, filters` |
| `filter_applied` | `report, filter_type(sucursal\|date_range\|marca\|status\|sort), value_kind` |
| `date_range_changed` | `report, preset(hoy\|este_mes\|custom), span_days` |
| `sucursal_selected` | `report, sucursal_id, is_all` |
| `sort_changed` | `report, sort_key` |
| `detail_opened` | `detail_type(ventas_sucursal\|devoluciones_sucursal\|cxc_cliente\|lote), from_report` |
| `pagination_load_more` | `report, page` |
| `pull_to_refresh` | `report` |
| `retry_clicked` | `screen, after_error_code` |
| `export_generated` | `report, format(xlsx), row_count` — **web today** (`xlsx` dep) |
| `search_used` | `query_length, results_count` — **log length, not query text** |

### E. Performance / reliability
| Event | Properties |
|---|---|
| `api_request` | `endpoint(normalized, ids stripped), method, status, latency_ms, from_cache, payload_bytes, ok` — **sampled** |
| `api_error` | `endpoint, status, error_kind(http\|timeout\|network\|parse), latency_ms, message` |
| `connection_error` | `endpoint, screen` |
| `app_error` / `crash` | `error_type, message, stack_hash, screen, fatal` |

Normalize endpoints (strip ids): `…/analitica-lote-condensado/:lote`. `app_error` mirrors Crashlytics on
mobile (§8); it is the **primary** crash signal on web/desktop.

### F. App health / version
| Event | Properties |
|---|---|
| `version_check` | `installed_version, min_required, update_required, platform` |
| `force_update_shown` | `min_version` |
| `store_redirect_clicked` | — |

## 6. Client pipeline (both apps, mirrored)

1. **Facade (multi-sink fan-out)** — `Analytics.track(name, props)` enriches with envelope+context,
   assigns `event_id`+`sequence`, dispatches to `CustomTelemetrySink`, `GA4Sink`, `DebugSink`. Never throws.
2. **Durable queue** — Flutter: in-memory + `shared_preferences` overflow buffer (bounded, ~500),
   `sqflite` only if volume warrants. Web: **IndexedDB**.
3. **Batcher/flusher** — flush on: buffer ≥ ~20, every ~30–60 s, on `app_background`/`pagehide`, or on
   network regained. Exponential backoff, capped retries, drop-oldest past max size.
4. **Transport** — Flutter: dedicated `TelemetryService` on `http`, **not** via `_getWithRefresh` (so
   telemetry keeps flowing while the access-block latch is set, to *record* the block); sends bearer if
   present, tolerates anonymous. Web: `fetch({keepalive:true})` normally, **`navigator.sendBeacon`** on
   `pagehide`. Web calls the API host directly → **ingest must send CORS headers** (§7.1).
5. **Remote config** — from the extended config endpoint (§7.2). Fail-open if absent.

## 7. [BACKEND] Requirements

### 7.1 `POST /api/telemetry/events` — batch ingest
- Auth **optional** (accept anonymous `device_id`); **never 401-block ingest**; return **202** fast.
- Body: `{ batch_id, sent_at, events[] }`, **gzip** (`Content-Encoding: gzip`).
- **Idempotent**: dedupe on `event_id` (unique constraint / upsert-ignore) — clients retry on failure.
- **CORS**: allow the Firebase-Hosting web origin (`Access-Control-Allow-Origin`, plus preflight) — the
  static web app calls this endpoint directly from the browser.
- Response small: `202 { accepted: N }`.

### 7.2 Extend `GET /api/Configuracion/app`
Add a `telemetry` block (already fetched at startup by `VersionCheckService`):
```jsonc
"telemetry": { "enabled": true, "sample_rate": 1.0, "flush_interval_s": 45,
               "batch_size": 20, "disabled_events": [] }
```

### 7.3 Extend `POST /api/Auth/login` response
Add `userId` (stable int) and `role` (string) so events carry reliable identity (§3).

### 7.4 Data model (SQL Server / Azure)
- **`telemetry_event`** (raw, append-only, **partition by `occurred_at` monthly**): `event_id` (PK,
  unique), `event_name`, `event_version`, `occurred_at`, `received_at`, `sequence`, `session_id`,
  `device_id`, `user_id?`, `username`, **`empresa`**, `role`, app/version/platform/os/device/locale/
  network/screen dims, `properties` (JSON `nvarchar(max)`), `ingest_batch_id`.
  Indexes: `(empresa, occurred_at)`, `(event_name, occurred_at)`, `(session_id)`, `(user_id, occurred_at)`.
- **`telemetry_session`** (derived, 1 row/session) — built by rollup from `session_start/end`; enables
  session analytics without scanning raw.
- **Dimensions** (optional): `dim_screen`, `dim_user`, `dim_tenant` (join `empresa` → subscription/trial
  status → correlate usage with plan state).
- **Aggregate rollups** (materialized daily; dashboards read these):
  `agg_daily_tenant_engagement` (dau/sessions/avg_session_ms/screen_views/exports/errors/
  distinct_reports_used → **churn/health**), `agg_daily_screen` (views/avg_dwell_ms/avg_active_ms/
  unique_users), `agg_daily_report_usage` (loads/avg_latency_ms/error_rate/unique_users),
  `agg_daily_performance` (p50/p95/p99/error_rate/count by endpoint/platform).
- **Retention**: raw 60–90 days (drop old partitions); sessions + aggregates long-term.
- **Processing**: ingest writes raw fast; hourly/nightly job (SQL Agent / Azure Function timer / Data
  Factory) builds sessions + aggregates.
- **Volume anchor**: `events/day ≈ users × sessions/day × events/session` — size storage + partitioning.

## 8. Google Analytics (GA4) & Crashlytics

- **GA4** (both apps, via `GA4Sink`): web uses the already-installed Firebase SDK (`getAnalytics` +
  `logEvent`) or `@next/third-parties/google`; Flutter adds `firebase_core` + `firebase_analytics`.
  Forward the curated subset — `screen_view, login_success, report_loaded, export_generated,
  access_blocked`, key filters. Set `empresa`/`role` as user-properties. **No** high-volume `api_request`.
- **Crashlytics** (**Flutter mobile only** — no web/desktop SDK): add `firebase_crashlytics`; wire
  `FlutterError.onError` + `PlatformDispatcher.onError` inside `runZonedGuarded`. Set `setUserIdentifier`
  + custom keys `empresa/role/app_version/current_screen`; push breadcrumbs for high-signal events.
  Web/desktop crash capture = the custom `app_error` event (Sentry optional later).
- **Privacy** applies to every sink: no business values / PII in params, keys, or crash messages.

## 9. What the data answers

- **Engagement & churn:** per-empresa DAU/WAU/MAU, health score, days-since-last-login, feature breadth,
  trial→paid behavior, at-risk-tenant list.
- **Product/UX:** screen popularity, time-on-page heatmap, navigation flows, filter/sort usage, drilldown
  depth, empty-state/error friction, export adoption.
- **Reliability:** endpoint latency percentiles, error-rate trends, session-expiry rate, version
  fragmentation, crash-free session %, platform split.

## 10. Rollout phases

- **Phase 0** — this spec; hand backend §7.
- **Phase 1** — facade + queue + transport + config; session/auth/`access_blocked`, `screen_view`/
  `screen_leave` (incl. bottom-nav & cuadre tabs), `report_loaded`, `api_error`; debug sink (no backend
  needed to validate); GA4 + Crashlytics.
- **Phase 2** — rich interactions (filters/date/sucursal/sort, `detail_opened`, pagination, refresh, retry,
  `export_generated`, `search_used`); first dashboards.
- **Phase 3** — `api_request` sampling, richer crash/active-time/scroll-depth, remote sampling tuning,
  retention/cohort modeling.

---
Keep this file synchronized with `../ReportesZempacApp/TELEMETRY.md`. Update both when the schema changes.
