# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)** first — it is the authoritative context file for this repo
(stack, file layout, auth/API, data layer, design tokens, conventions, "what NOT to do").
**[DESIGN.md](DESIGN.md)** is the visual language reference (Lumina Vision Light).

## Before changing anything

1. **Match what already exists.** Open the page/component nearest to what you're building
   and copy its structure, class usage, icon choices, and Spanish copy. Do not invent new
   layout patterns or token usage — reuse `PageHeader`, `EyebrowLabel`, `LoadingState` /
   `ErrorState` / `EmptyState`, `.card`, `.pill`, etc.
2. **Reuse over rebuild.** If a new view shares a data shape with an existing one, reuse the
   existing render component (e.g. the Cuadre "Por lotes" detail reuses the general cuadre's
   `Line` row by mapping its rows to `RptCuadreCajaLinea`).
3. New report data flow: type + `parse*` in `src/lib/types.ts` → fetcher in `src/lib/api.ts`
   → page via `useApi('rpt:<slug>', …)`. All fields nullable; never call `toLocaleString` /
   `toFixed` in JSX — use `src/lib/format.ts`. Icons only via `@/components/icon` (register
   new glyphs in `src/components/icon.tsx` first).

## Hard rules (see AGENTS.md "What NOT to do" for the full list)

- Static export (`output: 'export'`): no `route.ts` / `middleware.ts` / `proxy.ts`.
- No new hex values, fonts, chart libs, state managers, or UI kits.
- Every visible string is Spanish. `tabular-nums` on all money/percent/count/date displays.
- `npm run build` must pass with TypeScript strict (no `any`, no `@ts-ignore`).
- Remove debug `console.log`s before finishing.

## Commits

- When providing a commit message, never append the `Co-Authored-By: Claude …` trailer
  or any "Generated with Claude" line — just the subject and body.
