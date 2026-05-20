# AGENTS.md — Zempac Analitika Web

Context file for AI coding agents working on this repo. Read this first.

## What this project is

Web companion (Next.js) for the **Reportes Zempac** Flutter app located at `../ReportesZempacApp`. It mirrors the same product (sales/returns/products reports for retail) using the **Lumina Vision Light** design system. Everything user-facing must be in **Spanish** (Honduras/Centroamérica locale).

The sibling Flutter project is the source of truth for:

- Visual design tokens → `../ReportesZempacApp/DESIGN.md`
- Data models → `../ReportesZempacApp/lib/models/*.dart`
- Mock data shape → `../ReportesZempacApp/lib/services/mock_data_service.dart`
- Real API contracts → `../ReportesZempacApp/lib/services/api_service.dart`
- Screen layouts to mirror → `../ReportesZempacApp/lib/screens/**`

When adding a new report or feature, **always check the Flutter screen first** to keep parity.

## Stack

- **Next.js 16** App Router + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 3** with custom Zempac tokens in `tailwind.config.ts`
- **Recharts** for charts
- **lucide-react** for icons
- **Manrope** via `next/font/google`
- No backend yet — all data comes from `src/lib/mock-data.ts`
- Mock auth stored in `localStorage` / `sessionStorage` under key `zempac.session`

Do **not** add: Redux, Zustand, React Query, MUI, shadcn, styled-components, or any other styling/state library without being asked. Keep deps minimal.

## File layout

```
src/
├── app/
│   ├── layout.tsx              # Root layout, loads Manrope, sets es lang
│   ├── globals.css             # Tailwind + component classes (.card, .cta, .input, .pill, .eyebrow)
│   ├── page.tsx                # Marketing landing
│   ├── login/page.tsx          # 2-step login (empresa → credenciales)
│   └── dashboard/
│       ├── layout.tsx          # Sidebar + topbar shell (client component)
│       ├── page.tsx            # /dashboard → Pantalla Principal
│       ├── ventas/page.tsx
│       ├── devoluciones/page.tsx
│       ├── productos/page.tsx
│       └── cuadre-caja/page.tsx
├── components/
│   ├── common.tsx              # ZempacLogo, EyebrowLabel, TrendBadge
│   └── page-header.tsx         # PageHeader (eyebrow + title + icon)
└── lib/
    ├── mock-data.ts            # All report data + TS types (mirrors Dart models)
    └── format.ts               # money(), integer(), percent(), formatDateLong()
```

Path alias: `@/*` → `src/*`.

## Design system rules

All tokens live in `tailwind.config.ts` and are surfaced as Tailwind classes. **Never hardcode hex values** in components — use the tokens.

| Token class                           | Hex                      | Use for                                       |
| ------------------------------------- | ------------------------ | --------------------------------------------- |
| `bg-primary` / `text-primary`         | `#0040DF`                | CTAs, active nav, links, badges               |
| `bg-primary-container`                | `#2D5BFF`                | Gradient stop                                 |
| `bg-primary-gradient`                 | linear `2D5BFF → 0040DF` | Hero ventas card, avatars, icon tiles         |
| `bg-cta-gradient`                     | linear `0040DF → 2D5BFF` | Buttons (`.cta` class)                        |
| `bg-surface`                          | `#F8F9FA`                | Page background                               |
| `bg-surface-lowest`                   | `#FFFFFF`                | Cards                                         |
| `bg-surface-low`                      | `#F3F4F5`                | Topbar, secondary tiles, table headers        |
| `bg-surface-mid`                      | `#EDEEEF`                | Borders, progress track                       |
| `text-ink`                            | `#191C1D`                | Primary text                                  |
| `text-ink-variant`                    | `#434656`                | Secondary text                                |
| `text-outline`                        | `#747688`                | Eyebrows, captions                            |
| `text-tertiary` / `bg-tertiary`       | `#993100`                | **Devoluciones** + logout (negative semantic) |
| `bg-positive-bg` / `text-positive-fg` | green                    | Positive trend badge                          |
| `bg-negative-bg` / `text-negative-fg` | red                      | Negative trend badge                          |
| `bg-danger` / `bg-danger-container`   | red                      | Error banners                                 |

Reusable component classes (in `globals.css`):

- `.card` — white, `rounded-card` (20px), `shadow-card`
- `.card-bordered` — `.card` + 1px `surface-mid` border
- `.cta` — pill gradient button, white text, shadow-cta
- `.input` / `.input-icon` — text inputs (use with absolute-positioned `lucide` icon)
- `.pill` — rounded-full small chip
- `.eyebrow` — 11px bold uppercase tracking-eyebrow text-outline

Standard component patterns (do not invent variants):

- **Page header** → `<PageHeader eyebrow=… title=… subtitle=… icon={…}/>`
- **Eyebrow label** → `<EyebrowLabel>…</EyebrowLabel>`
- **Trend %** → `<TrendBadge value={pct} />`; pass `invertColor` for metrics where growth is bad (devoluciones, costos)
- **Brand mark** → `<ZempacLogo size={36} withWordmark />`

Typography: only Manrope. Headings use `font-extrabold tracking-tight`. Metric values use `font-extrabold tracking-tight` at 24–40px (`text-2xl` / `text-4xl`).

Radii: cards = `rounded-card` (20px), pills/buttons = `rounded-pill`, inputs = `rounded-xl` (12px), rank badges = `rounded-[10px]`.

## Conventions

- **Language**: Every visible string is Spanish. Comments in code can be English.
- **Server vs client components**: Default to **server components**. Add `"use client"` only when you need hooks, browser APIs, or Recharts.
  - `dashboard/layout.tsx`, `login/page.tsx`, `ventas/page.tsx` are client.
  - All others are server.
- **Formatting**: Always use helpers from `src/lib/format.ts` — never call `toLocaleString` / `toFixed` directly in JSX. `money()` already applies `es-HN` locale; prefix with literal `$` (e.g. `` `$${money(x)}` ``).
- **Icons**: `lucide-react`, size 14–20, `strokeWidth` left default.
- **Charts**: Recharts. Use the `barFill` linear gradient pattern from `dashboard/ventas/page.tsx` (`#2D5BFF → #0040DF`). Grid `#EDEEEF`, axis text `#747688`, tooltip with `rounded: 12, border: 1px solid #EDEEEF`.
- **Tables**: header row uses `bg-surface-low` + `.eyebrow`-style th text; body rows separated by `divide-surface-mid`, hover `bg-surface-low/60`.
- **No `any`**, no `as any`, no `// @ts-ignore`. The repo passes `npm run build` with TypeScript strict — keep it that way.
- **No CSS files outside `globals.css`**. Use Tailwind classes.
- **Routing**: keep the dashboard URLs in sync with the `NAV` array in `dashboard/layout.tsx`. Add new reports there + create a folder under `src/app/dashboard/<slug>/page.tsx`.

## Auth / session

- There is **no real backend yet.** `login/page.tsx` simulates auth with a 700 ms timeout and writes `{ empresa, usuario }` to storage under key `zempac.session`. `dashboard/layout.tsx` reads it on mount.
- When wiring the real API, replace the body of `submitLogin` in `src/app/login/page.tsx` and add a service module under `src/lib/api/`. Use the Dart `ApiService` as the contract reference.

## Adding a new report (checklist)

1. Read the equivalent Dart screen in `../ReportesZempacApp/lib/screens/<name>/`.
2. Add the model + mock array to `src/lib/mock-data.ts` (mirror Dart fields, camelCase, numeric types).
3. Create `src/app/dashboard/<slug>/page.tsx`. Start with `<PageHeader />` then summary tiles → main visual → table/cards.
4. Register the route in the `NAV` array of `src/app/dashboard/layout.tsx` with a `lucide-react` icon.
5. Use only tokens + reusable classes — no new hex values, no new fonts.
6. Run `npm run build` and ensure zero TS errors before finishing.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run build    # production build + TS typecheck (use this to validate)
npm run start    # serve production build
npm run lint     # next lint
```

Always run `npm run build` after non-trivial changes — it's the canonical "does it work" check for this repo.

## What NOT to do

- Don't introduce a CSS-in-JS library or shadcn/ui.
- Don't add a UI kit (MUI, Chakra, Mantine, Radix wholesale).
- Don't add a state manager — local `useState` is sufficient for current scope.
- Don't translate the UI to English.
- Don't change the design tokens to match some other product; they come from the Flutter app's `DESIGN.md` and must stay synchronized.
- Don't downgrade Next.js — the previously pinned 15.1.4 had a CVE (CVE-2025-66478); stay on the latest 16.x.
- Don't create markdown docs unless explicitly asked.
