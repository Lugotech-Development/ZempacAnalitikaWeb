# AGENTS.md — Zempac Analitika Web

Context file for AI coding agents working on this repo. Read this first.

> **Sibling project:** the Flutter mobile app lives at `../ReportesZempacApp` and is the canonical UX reference. Its own [`AGENTS.md`](../ReportesZempacApp/AGENTS.md) covers the mobile side. **Both projects share one design language, one API, one data model.** When in doubt, check the Flutter screen for the report you're building.

## What this project is

Web companion (Next.js, static export → Firebase Hosting) for the **Reportes Zempac** Flutter app. It mirrors the same product (sales / returns / products / cuadre de caja reports for retail businesses in Honduras / Centroamérica) using the **Lumina Vision Light** design system. Everything user-facing is in **Spanish**.

The sibling Flutter project is the source of truth for:

| Concern             | Flutter file (in `../ReportesZempacApp`)                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Visual design       | [`DESIGN.md`](../ReportesZempacApp/DESIGN.md) — a local copy lives at [`DESIGN.md`](DESIGN.md) for quick reference |
| Data models         | `lib/models/*.dart`                                                                                                |
| Real API contracts  | `lib/services/api_service.dart`                                                                                    |
| Session / refresh   | `lib/services/app_session.dart`                                                                                    |
| Screen layouts      | `lib/screens/**`                                                                                                   |
| Color tokens        | `lib/core/theme/app_colors.dart`                                                                                   |
| Mock fixture shapes | `lib/services/mock_data_service.dart`                                                                              |

When adding a new report or feature, **always read the Flutter screen first** so the two stay in parity. UI strings, metric grouping, sort order, icon choices, and color semantics should match. When in doubt, **update both `AGENTS.md` files in lockstep** so future agents inherit the same context.

## Stack

- **Next.js 16** App Router + **Turbopack** + **React 19** + **TypeScript 5** (strict)
- **Output mode**: `output: 'export'` — fully static site deployed to **Firebase Hosting** (`firebase.json`, `apphosting.yaml`, `.firebaserc`). Build artifacts land in `out/`.
- **Tailwind CSS 3.4** with custom Zempac tokens in `tailwind.config.ts`
- **Recharts 2.15** for charts (always dynamic-imported, see `src/components/series-chart.tsx`)
- **Material Symbols (outlined, weight 400)** via `@material-symbols/svg-400` + **@svgr/webpack** → React components, all registered in [`src/components/icon.tsx`](src/components/icon.tsx). Use the registry; do **not** import `lucide-react` (legacy).
- **Manrope** via `next/font/google`
- **Firebase JS SDK** is installed (`firebase` 12.x) but currently only used for hosting — no auth/firestore wired.

Do **not** add: Redux, Zustand, React Query, SWR, MUI, shadcn, styled-components, framer-motion, or any other styling/state library without being asked. Keep deps minimal.

## File layout

```
src/
├── app/
│   ├── layout.tsx              # Root layout, loads Manrope, sets es lang
│   ├── globals.css             # Tailwind + component classes (.card, .cta, .input, .pill, .eyebrow, @keyframes fadeIn)
│   ├── page.tsx                # Marketing landing
│   ├── login/page.tsx          # 2-step login (empresa → credenciales)
│   └── dashboard/
│       ├── layout.tsx          # Client guard: reads localStorage, redirects to /login
│       ├── _shell.tsx          # Sidebar + topbar + GlobalSearch (client)
│       ├── page.tsx            # /dashboard → Pantalla Principal
│       ├── ventas/page.tsx
│       ├── ventas/[sucursal]/page.tsx
│       ├── devoluciones/page.tsx
│       ├── devoluciones/[sucursal]/page.tsx
│       ├── productos/page.tsx
│       ├── inventario/page.tsx          # Preview (mock data)
│       ├── vencimientos/page.tsx        # Preview (mock data)
│       ├── transferencias/page.tsx      # Preview (mock data)
│       ├── cuentas-por-cobrar/page.tsx  # Real endpoints (/api/Reportes/cxc/*)
│       └── cuadre-caja/page.tsx
├── components/
│   ├── icon.tsx                # Material Symbols registry → <Icon name="…" size={…} />
│   ├── common.tsx              # ZempacLogo, EyebrowLabel, TrendBadge
│   ├── page-header.tsx         # <PageHeader eyebrow title subtitle icon isValidating />
│   ├── states.tsx              # LoadingState, ErrorState, EmptyState, SkeletonBox (shimmer), LoadingBar (thin refresh line)
│   ├── global-search.tsx       # Cmd-K style search across reports (deferred index)
│   └── series-chart.tsx        # Generic Area chart — always loaded via next/dynamic({ ssr: false })
├── lib/
│   ├── api.ts                  # Real upstream calls + token refresh mutex + UnauthorizedError
│   ├── cache.ts                # SWR cache: Map<key, entry> + per-key subscribers + focus/visibility/online revalidation
│   ├── use-api.ts              # useApi(key, fetcher) — stale-while-revalidate hook
│   ├── mock.ts                 # Placeholder fetchers + types for preview reports (no real endpoint yet)
│   ├── types.ts                # TS types mirroring lib/models/*.dart + parse* helpers + group* aggregators
│   ├── format.ts               # fmtMoney, fmtInt, fmtPercent, fmtDate, fmtDayMonth (es-HN locale)
│   └── firebase.ts             # (lazy-init, currently unused)
└── svg.d.ts                    # Ambient module decl for *.svg imports
```

Path alias: `@/*` → `src/*`.

## Auth & API

- **Upstream API**: `https://reporteszempacapi.azurewebsites.net` (same host the Flutter app uses — see `lib/core/config/app_config.dart` there).
- **Session storage**: client-side **`localStorage`** key `zempac.session` holds `{ token, refreshToken, empresa, usuario }`.
- **Token refresh**: `tryRefresh()` in [`src/lib/api.ts`](src/lib/api.ts) is mutex-guarded by a module-level `refreshPromise` so concurrent 401s only fire one `/api/auth/refresh` call.
- **401 handling**: `authFetch()` retries the original request once with the refreshed token; if refresh fails it clears the session and throws `UnauthorizedError`. `useApi` listens for this and routes through `useRouter().replace('/login')`.
- **Access-block handling**: the upstream runs a middleware that can refuse any authenticated call with a JSON envelope `{ success:false, code, message, … }` (e.g. `TRIAL_VENCIDO`). `getJson` detects it via `detectAccessBlock` (in [`src/lib/access-block-events.ts`](src/lib/access-block-events.ts)) on **any** status, latches a module flag so further calls short-circuit without hitting the network, and broadcasts through `emitAccessBlocked`. The global `AccessBlockedModal` (mounted in `dashboard/layout.tsx`, alongside `SessionExpiredModal`) shows a hard, non-dismissible overlay. It is **code-agnostic**: the backend `message` is shown verbatim and only the title/icon are per-`code` (unknown codes get a default), so new block types need no code change beyond an optional `PRESENTATION` entry. Callers treat `AccessBlockedError` like `UnauthorizedError` (stop, no inline error). The latch resets in `setSession` / `clearSession`. Mirrored in the Flutter app (`../ReportesZempacApp`: `lib/models/access_block.dart` + `lib/services/access_blocked_handler.dart`, detection in `api_service.dart`).
- **Static export caveat**: because `output: 'export'`, we have **no `/api/*` route handlers, no middleware, no `proxy.ts`**. All API calls happen from the browser directly to the upstream host. CORS must be allowed upstream. Do **not** add `route.ts` files or middleware — they won't build under `output: 'export'`.

## Data layer (SWR-style cache)

Every report screen consumes data through `useApi(key, fetcher)` from [`src/lib/use-api.ts`](src/lib/use-api.ts):

- **Cache** ([`src/lib/cache.ts`](src/lib/cache.ts)): module-scoped `Map<string, CacheEntry>` plus an in-flight `Map<string, Promise>` for single-flight dedupe, plus per-key `Map<string, Set<Subscriber>>`, plus a global `revalidateSubs` Set.
- **Revalidation triggers** (installed once on first `useApi` mount): window `focus`, document `visibilitychange` → visible, `online`. These call `subscribeRevalidate` listeners which each refetch their key.
- **Stale-while-revalidate**: if a cache entry exists for `key`, `useApi` returns it with `status: 'success'` instantly and triggers a background refetch. Errors during background refetch **do not** wipe cached data — they're logged to the console in dev only.
- **Invalidation**: `invalidateAll()` is called from `apiLogout()` so the next session starts clean.
- **Cache keys** are short, human-readable: `'rpt:principal'`, `'rpt:ventas'`, `'rpt:devoluciones'`, `'rpt:productos'`, `'rpt:cuadre-caja'`, `'empresas:sucursales'`.

Always pass a stable string key to `useApi`. Do not generate keys with `Math.random()` or `Date.now()`.

## Design system rules

All tokens live in `tailwind.config.ts`. **Never hardcode hex values** in components — use the tokens. The exception is `src/components/series-chart.tsx`, where Recharts SVG primitives can't read Tailwind classes; the file has a top-level `TOKEN` constant that mirrors the design tokens.

| Token class                           | Hex                         | Use for                                       |
| ------------------------------------- | --------------------------- | --------------------------------------------- |
| `bg-primary` / `text-primary`         | `#0040DF`                   | CTAs, active nav, links, badges, ventas chart |
| `bg-primary-container`                | `#2D5BFF`                   | Gradient stop                                 |
| `bg-primary-gradient`                 | linear `2D5BFF → 0040DF`    | Hero ventas card, avatars, icon tiles         |
| `bg-cta-gradient`                     | linear `0040DF → 2D5BFF`    | Buttons (`.cta` class)                        |
| `bg-surface`                          | `#F8F9FA`                   | Page background                               |
| `bg-surface-lowest`                   | `#FFFFFF`                   | Cards                                         |
| `bg-surface-low`                      | `#F3F4F5`                   | Topbar, secondary tiles, table headers        |
| `bg-surface-mid`                      | `#EDEEEF`                   | Borders, progress track                       |
| `text-ink`                            | `#191C1D`                   | Primary text                                  |
| `text-ink-variant`                    | `#434656`                   | Secondary text                                |
| `text-outline`                        | `#747688`                   | Eyebrows, captions, axis text                 |
| `text-tertiary` / `bg-tertiary`       | `#993100`                   | **Devoluciones** + logout (negative semantic) |
| `bg-positive-bg` / `text-positive-fg` | green (`#E6F4EA`/`#137333`) | Positive trend, Total Vendido, Total Venta    |
| `bg-negative-bg` / `text-negative-fg` | red                         | Negative trend badge                          |
| `bg-danger` / `bg-danger-container`   | red                         | Error banners                                 |

Reusable component classes (in `globals.css`):

- `.card` — white, `rounded-card` (20px), `shadow-card`
- `.card-bordered` — `.card` + 1px `surface-mid` border
- `.cta` — pill gradient button, white text, `shadow-cta`
- `.input` / `.input-icon` — text inputs (use with absolute-positioned icon)
- `.pill` — rounded-full small chip
- `.eyebrow` — 11px bold uppercase tracking-eyebrow text-outline
- `.zsb-scroll` — sidebar custom scrollbar
- `@keyframes fadeIn` — used by login step transitions via `animate-[fadeIn_.35s_ease-out]`
- `keyframes.shimmer` + `animation.shimmer` (in `tailwind.config.ts`) — used by `SkeletonBox`

Standard component patterns (do **not** invent variants):

- **Page header** → `<PageHeader eyebrow="REPORTE" title="…" subtitle="…" icon="show_chart" isValidating={…}/>`
- **Eyebrow label** → `<EyebrowLabel>…</EyebrowLabel>` (renders a `<span>`)
- **Trend %** → `<TrendBadge value={pct} />`; pass `invertColor` when growth is bad (devoluciones, costos)
- **Brand mark** → `<ZempacLogo size={36} withWordmark />`
- **Loading / error / empty** → `<LoadingState />`, `<ErrorState variant={…} message={…} onRetry={…} />`, `<EmptyState message=…/>`
- **Skeleton** → `<SkeletonBox className="h-56" />` (animated shimmer)
- **Refresh line** → `<LoadingBar active={q.isValidating && q.status === 'success'} />` — the thin indeterminate progress line for a **same-key background refresh** (focus / visibility / online revalidation), where the data is unchanged and blanking it with a skeleton would be wrong. It is gated on `status === 'success'`, so it never fires during a switch: `useApi` resets to `loading` whenever its `key` changes (switching sucursal / date / lote), so a switch always shows the `LoadingState` skeleton — never the previous selection's rows. Skeleton and bar therefore never compete for the same moment.
- **Chart** → import via `next/dynamic` only:
  ```tsx
  const Chart = dynamic(() => import('@/components/series-chart'), {
    ssr: false,
    loading: () => <SkeletonBox className="h-56" />
  });
  // <Chart data={…} tone="primary" | "tertiary" tooltipLabel="Total" gradientId="uniqueId" />
  ```
  Each usage **must** pass a unique `gradientId` so SVG `<defs>` don't collide.

Typography: only **Manrope**. Headings use `font-extrabold tracking-tight`. Metric values use `font-extrabold tracking-tight` at 24–40px. Add `tabular-nums` to all numeric / currency displays so digits align, and `break-words` to large currency strings that can overflow on narrow screens.

Radii: cards `rounded-card` (20px), pills/buttons `rounded-pill`, inputs `rounded-xl` (12px), rank badges `rounded-[10px]`.

## Conventions

- **Language**: every visible string is Spanish. Comments can be English.
- **Server vs client**: under `output: 'export'`, anything that uses hooks / `useApi` must be a client component. Dashboard pages all start with `'use client'`. The marketing landing (`src/app/page.tsx`) and root layout are server.
- **Formatting**: always use helpers from `src/lib/format.ts` — never call `toLocaleString` / `toFixed` directly in JSX. `fmtMoney` already prefixes `$` and uses `es-HN`.
- **Icons**: import from `@/components/icon` only. Add new glyphs to the registry there; pick the name from Flutter's `Icons.<name>_outlined` identifier (strip the `_outlined` suffix).
- **Charts**: only `series-chart.tsx`. Need a different chart type? Generalize the existing component or add a sibling, but always dynamic-import and pass tokens via the `TOKEN` constant.
- **Tables**: header row uses `bg-surface-low` + `.eyebrow`-style th text; body rows separated by `divide-surface-mid`, hover `bg-surface-low/60`.
- **No `any`**, no `as any`, no `// @ts-ignore`. `npm run build` must pass with TypeScript strict.
- **No CSS files outside `globals.css`**. Use Tailwind classes.
- **Routing**: keep the dashboard URLs in sync with the `NAV` array in `src/app/dashboard/_shell.tsx`. Adding a new report → add a folder under `src/app/dashboard/<slug>/page.tsx` **and** an entry in `NAV`.
- **`tabular-nums`** belongs on every paragraph showing money, percentages, counts, or dates — it prevents jitter on revalidation.

## Adding a new report (checklist)

1. **Read the Flutter screen** in `../ReportesZempacApp/lib/screens/<name>/` and its model in `../ReportesZempacApp/lib/models/<name>.dart`.
2. Add the TypeScript type (and a `parse*` helper) to [`src/lib/types.ts`](src/lib/types.ts). All fields nullable, exactly mirroring the Dart model.
3. Add the upstream call to [`src/lib/api.ts`](src/lib/api.ts) — copy the URL from the Flutter `ApiService` method, parse with the helper from step 2.
4. Create `src/app/dashboard/<slug>/page.tsx` with `'use client'`. Use `useApi('rpt:<slug>', api<Name>)`. Compose with `PageHeader` → summary tiles → optional chart → list/table. Wrap loading/error in `<LoadingState />` / `<ErrorState …/>`.
5. Add the entry to the `NAV` array in [`src/app/dashboard/_shell.tsx`](src/app/dashboard/_shell.tsx) with a Material Symbols icon (register it in [`src/components/icon.tsx`](src/components/icon.tsx) first if it's new).
6. Use only tokens + reusable classes — no new hex values, no new fonts.
7. **Also update the Flutter app** at [`../ReportesZempacApp`](../ReportesZempacApp) so the mobile companion shows the same report — see that project's `AGENTS.md` for its own checklist.
8. Run `npm run build` and verify zero TS errors and that the new route appears in the route list.

## Commands

```bash
npm run dev      # http://localhost:3000 (Turbopack)
npm run build    # production build + TS typecheck → out/ (static export)
npm run start    # serve `next start` (does NOT serve out/ — use a static server for that)
npm run lint     # next lint
```

Run `npm run build` after non-trivial changes — that's the canonical "does it work" check.

Deploy is handled by Firebase (`firebase deploy --only hosting` from a configured environment). The build output is `out/`.

## Preview reports (placeholder data)

Three reports currently render against placeholder fetchers in [`src/lib/mock.ts`](src/lib/mock.ts) because the upstream endpoints don't exist yet. They are wired into the SWR cache (`useApi`) and follow the same visual patterns as the real ones, so swapping the data source later is a one-file change. Each page displays a dashed "Vista previa" notice at the bottom.

> **Cuentas por Cobrar is now live** — it consumes the real `/api/Reportes/cxc/{resumen,antiguedad,top-clientes,detalle-cliente}` endpoints via `apiCuentasPorCobrar` in [`src/lib/api.ts`](src/lib/api.ts). A single `useApi('rpt:cuentas-por-cobrar', …)` call fans out the 3 list endpoints in parallel with `Promise.all`. Parsers in [`src/lib/types.ts`](src/lib/types.ts) are intentionally tolerant of PascalCase / camelCase / snake_case keys because the OpenAPI spec returns only `array of object` (no concrete schema). The detail endpoint (`apiCuentasPorCobrarDetalle(clienteCodigo)`) is exported for a future drilldown but not yet rendered.

> **Ventas por Marca is now live** (2026-06-03) — `src/app/dashboard/ventas-producto-marca/page.tsx`. Groups products by brand. No sucursal filter. Date preset pills (default: Este mes). Endpoint: `/api/Reportes/ventas-producto-marca`. Types: `RptVentaProductoMarca` / `parseVentaProductoMarca` in `src/lib/types.ts`. API: `apiVentasProductoMarca` in `src/lib/api.ts`. NAV icon: `sell`.

> **Ventas por Facturador is now live** (2026-06-03) — `src/app/dashboard/ventas-facturador/page.tsx`. Shows sales per billing employee with a sucursal dropdown ("Todas las sucursales" = no filter) and date preset pills (default: Este mes). Endpoint: `/api/Reportes/ventas-facturador-sucursal`. Types: `RptVentaFacturador` / `parseVentaFacturador` in `src/lib/types.ts`. API: `apiVentasFacturadorSucursal` in `src/lib/api.ts`. NAV icon: `badge` (added to `src/components/icon.tsx`).

> **Cuadre de Caja — pestaña "Por lotes"** (2026-06-23) — `src/app/dashboard/cuadre-caja/page.tsx` now has two tabs: **General** (the existing daily cuadre) and **Por lotes** (master/detail: lote list + the selected lote's condensed receipt, which reuses the `Line` component via `loteLineaToCuadre`). Endpoints: `GET /api/Reportes/analitica-lotes?sucursal&status&fDesde&fHasta` (lote id = `NIR`; **`status` is REQUIRED** — `0`=Abierto, `1`=Cerrado, the legacy SP returns one status per call, no "all" mode) and `GET /api/Reportes/analitica-lote-condensado/{lote}`. Types `RptLote` / `RptLoteCondensadoLinea` + `LOTE_ESTATUS` and parsers in `src/lib/types.ts`; `apiAnaliticaLotes` / `apiAnaliticaLoteCondensado` in `src/lib/api.ts`. No status dropdown — the date drives it: range reaching **today** → fetch abiertos + cerrados in parallel (abiertos first); **fully-past** range → cerrados only. All cache keys carry the full filter context. Mirrored in Flutter (`lib/screens/cuadre_caja/cuadre_caja_screen.dart`, `lib/models/rpt_lote.dart`).

| Slug             | Route                       | Cache key            | Fetcher                 | Why pharmacies need it                                                                      |
| ---------------- | --------------------------- | -------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `inventario`     | `/dashboard/inventario`     | `rpt:inventario`     | `apiInventarioMock`     | Stock por sucursal, valor estimado, productos bajo mínimo / agotados / sobre máximo         |
| `vencimientos`   | `/dashboard/vencimientos`   | `rpt:vencimientos`   | `apiVencimientosMock`   | Lotes vencidos y ventanas de 30/60/90+ días con valor en riesgo (crítico para medicamentos) |
| `transferencias` | `/dashboard/transferencias` | `rpt:transferencias` | `apiTransferenciasMock` | Movimientos entre sucursales, rutas principales, estado del documento                       |

When a real endpoint becomes available:

1. Move the type out of `src/lib/mock.ts` into `src/lib/types.ts` (with a `parse*` helper).
2. Add the real call to `src/lib/api.ts` keeping the same exported function name (e.g. `apiInventario`).
3. Update the page's `useApi(...)` import and remove the now-unused mock export.
4. Drop the `PreviewNotice` block at the bottom of the page.
5. Mirror the change in the Flutter project (see [`../ReportesZempacApp/AGENTS.md`](../ReportesZempacApp/AGENTS.md)).

## What NOT to do

- Don't add `route.ts`, `middleware.ts`, or `proxy.ts` — `output: 'export'` won't build them.
- Don't introduce a CSS-in-JS library, shadcn/ui, MUI, Chakra, Mantine, or wholesale Radix.
- Don't add a state manager — `useState` + the `useApi` cache cover the current scope.
- Don't add a different chart library — generalize `series-chart.tsx` instead.
- Don't import Recharts directly in a page — always `next/dynamic` so the bundle stays lean.
- Don't translate the UI to English.
- Don't change design tokens to fit a one-off screen; update `DESIGN.md` and **both apps in lockstep** if a token genuinely needs to change.
- Don't downgrade Next.js — 15.1.4 had CVE-2025-66478; stay on the latest 16.x.
- Don't store auth state anywhere other than `localStorage` via the helpers in `src/lib/api.ts`.
- Don't create markdown docs unless explicitly asked.
