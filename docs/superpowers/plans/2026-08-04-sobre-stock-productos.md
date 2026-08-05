# Sobre Stock Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/sobre-stock` report listing the products with the most days of inventory relative to their real rotation, surfacing the capital immobilised in excess stock.

**Architecture:** Follows the repo's standard report pipeline — type + parser in `src/lib/types.ts`, fetcher in `src/lib/api.ts`, page via `useApi('rpt:sobre-stock:…', …)`. The one new unit is `src/lib/sobre-stock.ts`, a React-free module holding every derived number (excess units, immobilised capital, severity tier, ordering, summary aggregates) so the page stays presentational and the arithmetic can be reviewed on its own.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, TypeScript 5 strict, Tailwind 3.4 with Zempac tokens. No new dependencies.

**Design spec:** [`docs/superpowers/specs/2026-08-04-sobre-stock-productos-design.md`](../specs/2026-08-04-sobre-stock-productos-design.md)

## Global Constraints

- **Static export.** No `route.ts`, no `middleware.ts`, no `proxy.ts` — `output: 'export'` will not build them.
- **No new dependencies.** No chart library, no state manager, no UI kit, no test runner.
- **No new hex values or fonts.** Only `tailwind.config.ts` tokens and the `globals.css` classes (`.card`, `.card-bordered`, `.pill`, `.eyebrow`, `.cta`, `.input`, `.zsb-scroll`).
- **`text-ink-soft` is NOT a token.** It appears in `ventas-producto-marca/page.tsx` but resolves to nothing. Use `text-ink-variant`.
- **Every visible string is Spanish.** Comments may be English.
- **`tabular-nums` on every** money, percent, count and date display.
- **Formatting only via `src/lib/format.ts`** (`fmtMoney`, `fmtInt`, `fmtDecimal`, `fmtPercent`, `fmtDate`). Never `toLocaleString` / `toFixed` in JSX.
- **Icons only via `@/components/icon`.** `inventory_2` is already registered — no registry change needed.
- **TypeScript strict.** No `any`, no `as any`, no `@ts-ignore`. `npm run build` must pass.
- **No debug `console.log`** left behind.
- **Permission key:** `sobre-stock-productos`.
- **Defaults:** ventana (`diasAnalisis`) **90**, umbral (`umbralDiasSobreStock`) **45**, top (`topN`) **20**.

## Verification model (read before Task 1)

**This repo has no test runner.** `package.json` exposes only `dev`, `build`, `start`, `lint`. Adding Vitest/Jest would violate the "no new dependencies" constraint above, so this plan does **not** follow a red-green TDD cycle. Substitute per task:

| Gate | Command | Expected |
| --- | --- | --- |
| Typecheck (fast loop) | `npx tsc --noEmit` | no output |
| Lint | `npm run lint` | no errors |
| Build (task-completion gate) | `npm run build` | succeeds; from Task 3 on, `/dashboard/sobre-stock` appears in the route list |

Task 7 adds the behavioural verification: a manual staging pass against **hand-computed expected values** derived from the sample row, listed there in full.

> If you want real unit tests for `src/lib/sobre-stock.ts` — the one module with
> non-trivial arithmetic — that needs a decision to add a dev dependency. Out of
> scope here; raise it before starting if you want it in.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `src/lib/types.ts` | Modify (append) | `RptSobreStockProducto` type + `parseSobreStock` parser |
| `src/lib/api.ts` | Modify | `apiSobreStockProductos` fetcher; extend `ExcelReportKey` + `ExcelExportParams` + `apiExcelExport` query building |
| `src/lib/sobre-stock.ts` | **Create** | All pure derivations: per-row metrics, severity, summary aggregates, sorting. No React, no fetching. |
| `src/app/dashboard/sobre-stock/page.tsx` | **Create** | The page: filters, summary, list. Local presentational sub-components, matching the single-file pattern of the other report pages. |
| `src/lib/reports.ts` | Modify | `REPORT_ROUTES` entry for the permission gate |
| `src/app/dashboard/_shell.tsx` | Modify | `NAV` entry |
| `src/components/global-search.tsx` | Modify | Cmd-K `REPORTS` entry |
| `AGENTS.md` | Modify | "is now live" note, per the repo's documented convention |

---

### Task 1: Tipo, parser y fetcher

**Files:**
- Modify: `src/lib/types.ts` (append at end of file)
- Modify: `src/lib/api.ts` (`ExcelReportKey` ~L521, `ExcelExportParams` ~L531, `apiExcelExport` ~L557, and a new fetcher after `apiProductosNegativos` ~L807)

**Interfaces:**
- Consumes: existing `num`, `str`, `J` helpers in `types.ts`; `getJson`, `forcedParamNumber` in `api.ts`.
- Produces: `RptSobreStockProducto` (type), `parseSobreStock(j: J) => RptSobreStockProducto`, `apiSobreStockProductos(input: { diasAnalisis: number; topN: number; umbralDiasSobreStock: number; sucursalId?: number }) => Promise<RptSobreStockProducto[]>`, and the `'sobre-stock-productos'` member of `ExcelReportKey`.

- [ ] **Step 1: Append the type and parser to `src/lib/types.ts`**

Add at the very end of the file:

```ts
// ─── Sobre Stock de Productos ────────────────────────────────────────────────

export type RptSobreStockProducto = {
  docNum: number | null;
  producto: string | null;
  unidadVenta: string | null;
  costo: number | null;
  ultimaVenta: string | null;
  vendidoEnPeriodo: number | null;
  promedioDiario: number | null;
  existenciaActual: number | null;
  diasDeInventario: number | null;
  /** 'SOBRE STOCK' | 'NORMAL' today; render unknown values verbatim. */
  estado: string | null;
};

export const parseSobreStock = (j: J): RptSobreStockProducto => ({
  docNum: num(j.DocNum ?? j.docNum),
  producto: str(j.Producto ?? j.producto),
  unidadVenta: str(j.UnidadVenta ?? j.unidadVenta),
  costo: num(j.Costo ?? j.costo),
  ultimaVenta: str(j.UltimaVenta ?? j.ultimaVenta),
  vendidoEnPeriodo: num(j.VendidoEnPeriodo ?? j.vendidoEnPeriodo),
  promedioDiario: num(j.PromedioDiario ?? j.promedioDiario),
  existenciaActual: num(j.ExistenciaActual ?? j.existenciaActual),
  diasDeInventario: num(j.DiasDeInventario ?? j.diasDeInventario),
  estado: str(j.Estado ?? j.estado)
});
```

- [ ] **Step 2: Extend the Excel export plumbing in `src/lib/api.ts`**

Add the key to the `ExcelReportKey` union (after `'productos-negativos'`):

```ts
  | 'productos-negativos'
  | 'sobre-stock-productos'
  | 'cuadre-productos';
```

Add the two new fields to `ExcelExportParams`:

```ts
export interface ExcelExportParams {
  desde?: string;
  hasta?: string;
  marcaId?: number;
  sucursalId?: number;
  top?: number;
  lote?: number;
  diasAnalisis?: number;
  umbralDiasSobreStock?: number;
}
```

In `apiExcelExport`, add the two params to the query builder, right after the `lote` line:

```ts
  if (params?.lote != null) qs.set('lote', String(params.lote));
  if (params?.diasAnalisis != null) qs.set('diasAnalisis', String(params.diasAnalisis));
  if (params?.umbralDiasSobreStock != null) qs.set('umbralDiasSobreStock', String(params.umbralDiasSobreStock));
```

> The export endpoint takes **`top`**, not `topN`: `GET /api/excelexport/sobre-stock-productos?diasAnalisis=60&top=50&umbralDiasSobreStock=45&sucursalId=2`. `top` already exists in `ExcelExportParams`; do not add a `topN`.

- [ ] **Step 3: Add the fetcher to `src/lib/api.ts`**

Add `RptSobreStockProducto` and `parseSobreStock` to the existing `from './types'` import block, then add this immediately after `apiProductosNegativos`:

```ts
// ─── Sobre Stock de Productos ─────────────────────────────────────────────
// Top-N products with the most days of inventory, among those that sold at
// least once in the analysis window. Every param is optional upstream (the SP
// has its own defaults); `sucursalId` is omitted entirely for "Todas las
// sucursales" — getJson drops undefined values from the query string.

export const apiSobreStockProductos = (input: {
  diasAnalisis: number;
  topN: number;
  umbralDiasSobreStock: number;
  sucursalId?: number;
}) => {
  const forced = forcedParamNumber('sobre-stock-productos', ['sucursalId', 'sucursal', 'idSucursal']);
  const sucursalId = forced ?? input.sucursalId;
  return getJson<RptSobreStockProducto[]>(
    '/api/reportes/sobre-stock-productos',
    data => (Array.isArray(data) ? data.map(r => parseSobreStock(r as Record<string, unknown>)) : []),
    {
      diasAnalisis: String(input.diasAnalisis),
      topN: String(input.topN),
      umbralDiasSobreStock: String(input.umbralDiasSobreStock),
      sucursalId: sucursalId != null ? String(sucursalId) : undefined
    }
  );
};
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no output from `tsc`, no errors from lint.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts
git commit -m "feat(sobre-stock): add type, parser and fetcher for sobre-stock report"
```

---

### Task 2: Lógica derivada pura

**Files:**
- Create: `src/lib/sobre-stock.ts`

**Interfaces:**
- Consumes: `RptSobreStockProducto` from Task 1.
- Produces: `Severidad`, `SobreStockFila`, `SobreStockResumen`, `OrdenId`, `ORDENES`, `DIAS_SIN_VENTA_ALERTA`, `diasDesde(iso, hoy)`, `esSobreStock(estado)`, `severidadDe(sobreStock, ratioUmbral)`, `derivarFila(row, umbral, hoy)`, `resumir(filas)`, `ordenar(filas, orden)`.

- [ ] **Step 1: Create `src/lib/sobre-stock.ts`**

```ts
// Pure derivations for the Sobre Stock report. Kept out of the page so the
// arithmetic — excess units, immobilised capital, severity, ordering — can be
// read and reviewed on its own. No React, no fetching, no formatting.

import type { RptSobreStockProducto } from './types';

export type Severidad = 'normal' | 'moderado' | 'alto' | 'critico';

export type SobreStockFila = {
  row: RptSobreStockProducto;
  /** Units above what the umbral window needs. 0 when at or below the line. */
  excedente: number;
  /** `excedente × costo`. 0 when the SP omits the cost. */
  capitalInmovilizado: number;
  /** `existenciaActual × costo`. 0 when the SP omits the cost. */
  valorExistencia: number;
  /** `diasDeInventario / umbral` — e.g. 36.4 renders as "36.4× el umbral". */
  ratioUmbral: number;
  /** Whole days since the last sale; null when `ultimaVenta` is absent. */
  diasSinVenta: number | null;
  sobreStock: boolean;
  severidad: Severidad;
};

const MS_POR_DIA = 86_400_000;

/** Products with no sale in this many days are counted as parados in the summary. */
export const DIAS_SIN_VENTA_ALERTA = 30;

/** Full width of a row's bar = this many times the umbral, so the umbral marker
 *  always sits at 1/ESCALA_BARRA of the width. */
export const ESCALA_BARRA = 5;

/**
 * Whole days between [iso] and [hoy], both truncated to local midnight.
 * `UltimaVenta` arrives with no timezone suffix ("2026-07-10T21:08:26.09"), so
 * `new Date` reads it as local time; truncating both sides stops the time of day
 * from producing an off-by-one. Null when [iso] is missing or unparseable.
 */
export function diasDesde(iso: string | null | undefined, hoy: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return Math.max(0, Math.round((hasta - desde) / MS_POR_DIA));
}

/**
 * `Estado` is authoritative for the normal / over-stock split. Anything that
 * isn't exactly NORMAL counts as over-stock, so a new backend label can never
 * silently drop a product out of the report.
 */
export function esSobreStock(estado: string | null): boolean {
  return (estado ?? '').trim().toUpperCase() !== 'NORMAL';
}

export function severidadDe(sobreStock: boolean, ratioUmbral: number): Severidad {
  if (!sobreStock) return 'normal';
  if (ratioUmbral > 5) return 'critico';
  if (ratioUmbral > 2) return 'alto';
  return 'moderado';
}

export function derivarFila(row: RptSobreStockProducto, umbral: number, hoy: Date): SobreStockFila {
  const existencia = row.existenciaActual ?? 0;
  const promedio = row.promedioDiario ?? 0;
  const costo = row.costo ?? 0;
  const dias = row.diasDeInventario ?? 0;
  const excedente = Math.max(0, existencia - promedio * umbral);
  const sobreStock = esSobreStock(row.estado);
  const ratioUmbral = umbral > 0 ? dias / umbral : 0;
  return {
    row,
    excedente,
    capitalInmovilizado: excedente * costo,
    valorExistencia: existencia * costo,
    ratioUmbral,
    diasSinVenta: diasDesde(row.ultimaVenta, hoy),
    sobreStock,
    severidad: severidadDe(sobreStock, ratioUmbral)
  };
}

export type SegmentoSeveridad = {
  severidad: Exclude<Severidad, 'normal'>;
  capital: number;
  productos: number;
};

export type SobreStockResumen = {
  capitalInmovilizado: number;
  valorExistencia: number;
  sobreStock: number;
  total: number;
  unidadesExcedentes: number;
  sinVentaReciente: number;
  porSeveridad: SegmentoSeveridad[];
};

/** Aggregates over the FULL response — never over the filtered list, so the
 *  tiles don't move when the user toggles "Solo sobre stock". */
export function resumir(filas: SobreStockFila[]): SobreStockResumen {
  const porSeveridad: SegmentoSeveridad[] = (['moderado', 'alto', 'critico'] as const).map(severidad => {
    const grupo = filas.filter(f => f.severidad === severidad);
    return {
      severidad,
      capital: grupo.reduce((s, f) => s + f.capitalInmovilizado, 0),
      productos: grupo.length
    };
  });
  return {
    capitalInmovilizado: filas.reduce((s, f) => s + f.capitalInmovilizado, 0),
    valorExistencia: filas.reduce((s, f) => s + f.valorExistencia, 0),
    sobreStock: filas.filter(f => f.sobreStock).length,
    total: filas.length,
    unidadesExcedentes: filas.reduce((s, f) => s + f.excedente, 0),
    sinVentaReciente: filas.filter(f => f.diasSinVenta != null && f.diasSinVenta > DIAS_SIN_VENTA_ALERTA).length,
    porSeveridad
  };
}

export type OrdenId = 'dias' | 'capital' | 'excedente' | 'ultimaVenta';

export const ORDENES: { id: OrdenId; label: string }[] = [
  { id: 'dias', label: 'Días de inventario' },
  { id: 'capital', label: 'Capital inmovilizado' },
  { id: 'excedente', label: 'Excedente' },
  { id: 'ultimaVenta', label: 'Última venta' }
];

/**
 * Sorts a copy. The first three criteria are descending (biggest problem
 * first); "ultimaVenta" puts the oldest sale first. Null values always sink to
 * the bottom, whatever the criterion.
 */
export function ordenar(filas: SobreStockFila[], orden: OrdenId): SobreStockFila[] {
  const copia = [...filas];
  if (orden === 'ultimaVenta') {
    return copia.sort((a, b) => {
      if (a.diasSinVenta == null) return b.diasSinVenta == null ? 0 : 1;
      if (b.diasSinVenta == null) return -1;
      return b.diasSinVenta - a.diasSinVenta;
    });
  }
  const valor = (f: SobreStockFila): number | null =>
    orden === 'dias' ? f.row.diasDeInventario : orden === 'capital' ? f.capitalInmovilizado : f.excedente;
  return copia.sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (va == null) return vb == null ? 0 : 1;
    if (vb == null) return -1;
    return vb - va;
  });
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no output from `tsc`, no errors from lint.

- [ ] **Step 3: Sanity-check the arithmetic by hand against the sample row**

With the sample row (`existenciaActual: 82`, `promedioDiario: 0.05`, `costo: 3`, `diasDeInventario: 1640`, `estado: 'SOBRE STOCK'`) and `umbral = 45`, `derivarFila` must produce:

| Field | Expected |
| --- | --- |
| `excedente` | `82 − 0.05 × 45 = 79.75` |
| `capitalInmovilizado` | `79.75 × 3 = 239.25` |
| `valorExistencia` | `82 × 3 = 246` |
| `ratioUmbral` | `1640 / 45 = 36.444…` |
| `sobreStock` | `true` |
| `severidad` | `'critico'` (36.44 > 5) |

Read the implementation against this table. These same numbers are re-verified in the browser in Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sobre-stock.ts
git commit -m "feat(sobre-stock): add pure derivation module for metrics, severity and ordering"
```

---

### Task 3: Página — header, filtros y estados

**Files:**
- Create: `src/app/dashboard/sobre-stock/page.tsx`

**Interfaces:**
- Consumes: `apiSobreStockProductos` (Task 1), `useApi`, `apiSucursales`, `forcedNumber`, `useExcelExport`, `PageHeader`, `LoadingState` / `ErrorState` / `EmptyState` / `LoadingBar`, `ExcelExportButton`, `LockedFilter`, `EyebrowLabel`.
- Produces: the default-exported `SobreStockPage` component and the module-level constants `VENTANAS`, `UMBRALES`, `TOPS`, plus the local `NumPills` component that Tasks 4 and 5 build on.

This task delivers a working page that fetches and reports its state; the summary and list are stubbed with a row count and filled in by Tasks 4 and 5.

- [ ] **Step 1: Create `src/app/dashboard/sobre-stock/page.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { EyebrowLabel, ExcelExportButton, LockedFilter } from '@/components/common';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtInt } from '@/lib/format';
import { apiSobreStockProductos, apiSucursales } from '@/lib/api';
import { useExcelExport } from '@/lib/use-excel-export';
import { forcedNumber } from '@/lib/permissions';
import { useApi } from '@/lib/use-api';
import { derivarFila } from '@/lib/sobre-stock';
import type { RptSobreStockProducto } from '@/lib/types';

// Ventana de historial que alimenta el PromedioDiario (`diasAnalisis`).
const VENTANAS = [30, 90, 180];
const VENTANA_DEF = 90;
// Días de inventario a partir de los cuales el SP marca SOBRE STOCK.
const UMBRALES = [30, 45, 60, 90];
const UMBRAL_DEF = 45;
// Cuántos productos devuelve el SP (`topN`).
const TOPS = [10, 20, 50, 100];
const TOP_DEF = 20;

export default function SobreStockPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null); // null = todas
  const [sucursalOpen, setSucursalOpen] = useState(false);
  const [dias, setDias] = useState(VENTANA_DEF);
  const [umbral, setUmbral] = useState(UMBRAL_DEF);
  const [top, setTop] = useState(TOP_DEF);
  const xls = useExcelExport();

  // If the profile fixes the sucursal (parametrosSP), lock the picker to it.
  const forcedSucursal = forcedNumber('sobre-stock-productos', ['sucursalId', 'sucursal', 'idSucursal']);
  const efectivaSucursal = forcedSucursal ?? sucursalId;

  // Cada filtro entra en la key: cambiar cualquiera fuerza LoadingState, nunca
  // LoadingBar (que queda para revalidación en foco/visibilidad de la misma key).
  const key = `rpt:sobre-stock:${efectivaSucursal ?? 'todas'}:${dias}:${umbral}:${top}`;
  const q = useApi<RptSobreStockProducto[]>(key, () =>
    apiSobreStockProductos({
      diasAnalisis: dias,
      topN: top,
      umbralDiasSobreStock: umbral,
      sucursalId: efectivaSucursal ?? undefined
    })
  );

  const filas = useMemo(() => {
    const hoy = new Date();
    return (q.data ?? []).map(r => derivarFila(r, umbral, hoy));
  }, [q.data, umbral]);

  const sucursalActual = sucursalesQ.data?.find(s => s.id === efectivaSucursal);

  const handleExport = () =>
    void xls.run('sobre-stock-productos', {
      diasAnalisis: dias,
      top,
      umbralDiasSobreStock: umbral,
      sucursalId: efectivaSucursal ?? undefined
    });

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Sobre Stock"
        subtitle="Productos con exceso de inventario según su rotación"
        icon="inventory_2"
        isRefreshing={q.isValidating && q.status === 'success'}
        onRefresh={q.reload}
      />

      {/* Filtros */}
      <div className="card p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {forcedSucursal != null ? (
            <LockedFilter icon="store" value={sucursalActual?.nombre ?? '—'} />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSucursalOpen(!sucursalOpen)}
                onBlur={() => setTimeout(() => setSucursalOpen(false), 120)}
                className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-lowest px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]">
                <Icon name="store" size={16} className="text-primary" />
                <span className="flex-1 text-left truncate">{sucursalActual ? sucursalActual.nombre : 'Todas las sucursales'}</span>
                <Icon name="expand_more" size={14} className="text-outline" />
              </button>
              {sucursalOpen && (
                <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-72 overflow-y-auto zsb-scroll">
                  <li>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setSucursalId(null);
                        setSucursalOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${
                        sucursalId == null ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'
                      }`}>
                      <Icon name="store" size={14} />
                      <span className="flex-1 truncate">Todas las sucursales</span>
                      {sucursalId == null && <Icon name="check" size={14} />}
                    </button>
                  </li>
                  {(sucursalesQ.data ?? []).map(s => {
                    const active = s.id === sucursalId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            setSucursalId(s.id);
                            setSucursalOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${
                            active ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'
                          }`}>
                          <Icon name="store" size={14} />
                          <span className="flex-1 truncate">{s.nombre}</span>
                          {active && <Icon name="check" size={14} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {q.status === 'success' && filas.length > 0 && (
            <div className="sm:ml-auto">
              <ExcelExportButton onClick={handleExport} busy={xls.busy} label="" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <NumPills label="Ventana" values={VENTANAS} value={dias} onChange={setDias} format={v => `${v} d`} />
          <NumPills label="Umbral" values={UMBRALES} value={umbral} onChange={setUmbral} format={v => `${v} d`} />
          <NumPills label="Mostrar" values={TOPS} value={top} onChange={setTop} format={v => `Top ${v}`} />
        </div>
      </div>

      <LoadingBar active={q.isValidating && q.status === 'success'} className="mb-4" />
      {q.status === 'loading' && <LoadingState />}
      {q.status === 'error' && <ErrorState variant={q.errorVariant!} message={q.error!} onRetry={q.reload} />}
      {q.status === 'success' &&
        (filas.length === 0 ? (
          <EmptyState message="Sin productos con ventas en la ventana seleccionada." />
        ) : (
          <p className="text-sm text-ink-variant tabular-nums">{fmtInt(filas.length)} productos</p>
        ))}
    </>
  );
}

function NumPills({
  label,
  values,
  value,
  onChange,
  format
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="min-w-0">
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="mt-1.5 flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        {values.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              v === value ? 'bg-primary text-white' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'
            }`}>
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck, lint and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build succeeds and the route list includes `/dashboard/sobre-stock`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/sobre-stock/page.tsx
git commit -m "feat(sobre-stock): add report page with filters and load states"
```

---

### Task 4: Resumen — tiles y barra de severidad

**Files:**
- Modify: `src/app/dashboard/sobre-stock/page.tsx`

**Interfaces:**
- Consumes: `resumir`, `SobreStockResumen`, `Severidad`, `DIAS_SIN_VENTA_ALERTA` (Task 2); `fmtMoney`, `fmtDecimal`, `fmtInt`.
- Produces: the module-level `TONO` and `SEVERIDAD_LABEL` maps, and the local `Tile` / `BarraSeveridad` components. **Task 5 reuses `TONO` and `SEVERIDAD_LABEL`** — define them exactly as written here.

- [ ] **Step 1: Extend the imports**

Replace the `format`, `sobre-stock` and `states` import lines with:

```tsx
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtDecimal, fmtInt, fmtMoney } from '@/lib/format';
import {
  DIAS_SIN_VENTA_ALERTA,
  derivarFila,
  resumir,
  type Severidad,
  type SobreStockResumen
} from '@/lib/sobre-stock';
```

- [ ] **Step 2: Add the shared tone maps at module level**

Place these just below the `TOP_DEF` constant:

```tsx
// Shared by the summary tiles, the severity bar and the row cards.
const TONO: Record<Severidad, { pill: string; barra: string }> = {
  normal: { pill: 'bg-positive-bg text-positive-fg', barra: 'bg-positive-fg' },
  moderado: { pill: 'bg-primary/10 text-primary', barra: 'bg-primary' },
  alto: { pill: 'bg-primary-container/10 text-primary-container', barra: 'bg-primary-container' },
  critico: { pill: 'bg-tertiary/10 text-tertiary', barra: 'bg-tertiary' }
};

const SEVERIDAD_LABEL: Record<Severidad, string> = {
  normal: 'Normal',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico'
};
```

- [ ] **Step 3: Compute the summary in the component**

Add directly below the `filas` memo:

```tsx
  const resumen = useMemo(() => resumir(filas), [filas]);
```

- [ ] **Step 4: Render the tiles and the bar**

Replace the success branch's placeholder paragraph (`<p …>{fmtInt(filas.length)} productos</p>`) with:

```tsx
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile
                label="Capital inmovilizado"
                value={fmtMoney(resumen.capitalInmovilizado)}
                subtext={`de ${fmtMoney(resumen.valorExistencia)} en existencia`}
                tone="tertiary"
              />
              <Tile
                label="Sobre stock"
                value={fmtInt(resumen.sobreStock)}
                subtext={`de ${fmtInt(resumen.total)} productos`}
                tone="tertiary"
              />
              <Tile
                label="Unidades excedentes"
                value={fmtDecimal(resumen.unidadesExcedentes)}
                tone="primary-container"
              />
              <Tile
                label={`Sin venta +${DIAS_SIN_VENTA_ALERTA} d`}
                value={fmtInt(resumen.sinVentaReciente)}
                tone="primary"
              />
            </div>

            <BarraSeveridad resumen={resumen} />
          </>
```

- [ ] **Step 5: Add the two components at the bottom of the file**

```tsx
function Tile({
  label,
  value,
  subtext,
  tone
}: {
  label: string;
  value: string;
  subtext?: string;
  tone: 'positive' | 'primary' | 'primary-container' | 'tertiary';
}) {
  const cls =
    tone === 'positive'
      ? 'bg-positive-bg text-positive-fg'
      : tone === 'tertiary'
        ? 'bg-tertiary/10 text-tertiary'
        : tone === 'primary-container'
          ? 'bg-primary-container/10 text-primary-container'
          : 'bg-primary/10 text-primary';
  return (
    <div className="card p-5">
      <span className={`pill ${cls}`}>{label}</span>
      <p className="mt-3 text-xl font-extrabold tracking-tight tabular-nums break-words">{value}</p>
      {subtext && <p className="mt-1 text-[11px] text-ink-variant tabular-nums">{subtext}</p>}
    </div>
  );
}

/** Capital inmovilizado segmentado por severidad — pesado por dinero, no por
 *  conteo, para que un solo producto crítico caro domine la lectura. Las filas
 *  NORMAL tienen excedente 0 por definición, así que no aparecen. */
function BarraSeveridad({ resumen }: { resumen: SobreStockResumen }) {
  const total = resumen.capitalInmovilizado;
  if (total <= 0) return null;
  return (
    <div className="mt-4 card p-6">
      <EyebrowLabel>Capital inmovilizado por severidad</EyebrowLabel>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-pill bg-surface-mid">
        {resumen.porSeveridad.map(s => (
          <div
            key={s.severidad}
            className={TONO[s.severidad].barra}
            style={{ width: `${(s.capital / total) * 100}%` }}
            aria-label={`${SEVERIDAD_LABEL[s.severidad]}: ${fmtMoney(s.capital)}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
        {resumen.porSeveridad.map(s => (
          <div key={s.severidad} className="flex items-center gap-2 min-w-0">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${TONO[s.severidad].barra}`} />
            <p className="text-[12px] text-ink-variant truncate">{SEVERIDAD_LABEL[s.severidad]}</p>
            <p className="text-[12px] font-extrabold tabular-nums text-ink">{fmtMoney(s.capital)}</p>
            <p className="text-[11px] text-outline tabular-nums">({fmtInt(s.productos)})</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck, lint and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/sobre-stock/page.tsx
git commit -m "feat(sobre-stock): add summary tiles and severity distribution bar"
```

---

### Task 5: Lista — controles de orden y tarjetas

**Files:**
- Modify: `src/app/dashboard/sobre-stock/page.tsx`

**Interfaces:**
- Consumes: `ORDENES`, `ordenar`, `ESCALA_BARRA`, `OrdenId`, `SobreStockFila` (Task 2); `TONO`, `SEVERIDAD_LABEL` (Task 4); `fmtDate`, `fmtDecimal`, `fmtInt`, `fmtMoney`.
- Produces: the finished page. Nothing downstream consumes it.

- [ ] **Step 1: Extend the imports**

```tsx
import { fmtDate, fmtDecimal, fmtInt, fmtMoney } from '@/lib/format';
import {
  DIAS_SIN_VENTA_ALERTA,
  ESCALA_BARRA,
  ORDENES,
  derivarFila,
  ordenar,
  resumir,
  type OrdenId,
  type Severidad,
  type SobreStockFila,
  type SobreStockResumen
} from '@/lib/sobre-stock';
```

- [ ] **Step 2: Add the marker constant and the known-estado set at module level**

Below `SEVERIDAD_LABEL`:

```tsx
// La barra de cada fila llega llena a ESCALA_BARRA× el umbral, así que la marca
// del umbral cae siempre en este porcentaje del ancho.
const MARCA_UMBRAL_PCT = 100 / ESCALA_BARRA;

// Estados que sabemos colorear; cualquier otro se muestra verbatim en neutro.
const ESTADOS_CONOCIDOS = new Set(['NORMAL', 'SOBRE STOCK']);
```

- [ ] **Step 3: Add the list state and derived list to the component**

Add alongside the other `useState` calls:

```tsx
  const [orden, setOrden] = useState<OrdenId>('dias');
  const [soloSobreStock, setSoloSobreStock] = useState(false);
```

And below the `resumen` memo:

```tsx
  const visibles = useMemo(() => {
    const base = soloSobreStock ? filas.filter(f => f.sobreStock) : filas;
    return ordenar(base, orden);
  }, [filas, soloSobreStock, orden]);
```

- [ ] **Step 4: Render the controls and the list**

Append inside the success fragment, directly after `<BarraSeveridad resumen={resumen} />`:

```tsx
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-ink-variant tabular-nums">
                {fmtInt(resumen.total)} productos · {fmtInt(resumen.sobreStock)} sobre stock
              </p>
              <div className="sm:ml-auto flex items-center gap-2 overflow-x-auto -mx-1 px-1">
                {ORDENES.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOrden(o.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                      orden === o.id ? 'bg-primary text-white' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'
                    }`}>
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSoloSobreStock(v => !v)}
                  aria-pressed={soloSobreStock}
                  className={`whitespace-nowrap flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    soloSobreStock ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'
                  }`}>
                  <Icon name={soloSobreStock ? 'check_circle' : 'radio_button_unchecked'} size={14} />
                  Solo sobre stock
                </button>
              </div>
            </div>

            {visibles.length === 0 ? (
              <div className="mt-4">
                <EmptyState message="Ningún producto supera el umbral seleccionado." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {visibles.map((f, i) => (
                  <FilaCard key={`${f.row.docNum ?? 'r'}-${i}`} f={f} rank={i + 1} umbral={umbral} dias={dias} />
                ))}
              </div>
            )}
```

- [ ] **Step 5: Add the row card and chip components at the bottom of the file**

```tsx
function FilaCard({ f, rank, umbral, dias }: { f: SobreStockFila; rank: number; umbral: number; dias: number }) {
  const unidad = f.row.unidadVenta?.trim() || 'uds';
  const tono = TONO[f.severidad];
  // Anclar la barra al umbral y no al máximo de la lista: con un outlier de
  // 1,640 días, escalar al máximo dejaría todo lo demás plano.
  const ancho = Math.min(1, (f.row.diasDeInventario ?? 0) / (ESCALA_BARRA * umbral));
  const estadoRaw = (f.row.estado ?? '').trim();
  const estadoConocido = ESTADOS_CONOCIDOS.has(estadoRaw.toUpperCase());
  const sinCosto = f.row.costo == null || f.row.costo === 0;

  return (
    <div className="card-bordered p-5">
      <div className="flex items-start gap-3">
        <div
          className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[13px] font-extrabold shrink-0 tabular-nums ${
            rank <= 3 ? 'bg-primary-container/15 text-primary' : 'bg-surface-low text-ink-variant'
          }`}>
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink line-clamp-2">{f.row.producto ?? '—'}</p>
          <p className="text-[11px] text-ink-variant mt-0.5 tabular-nums">
            Código {f.row.docNum ?? '—'} · {unidad}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-extrabold tracking-tight tabular-nums">{fmtDecimal(f.row.diasDeInventario)} días</p>
          {!sinCosto && (
            <p className="text-[11px] font-bold text-tertiary tabular-nums">{fmtMoney(f.capitalInmovilizado)} inmovilizado</p>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-ink-variant tabular-nums">
        Última venta {fmtDate(f.row.ultimaVenta)}
        {f.diasSinVenta != null && ` · hace ${fmtInt(f.diasSinVenta)} d`}
      </p>

      <div className="relative mt-3">
        <div className="h-1.5 rounded-pill bg-surface-mid overflow-hidden">
          <div className={`h-full ${tono.barra}`} style={{ width: `${ancho * 100}%` }} />
        </div>
        <span
          className="absolute top-0 h-1.5 w-px bg-ink/40"
          style={{ left: `${MARCA_UMBRAL_PCT}%` }}
          aria-hidden
        />
      </div>
      <div className="relative h-4 mt-0.5">
        <span
          className="absolute text-[10px] text-outline tabular-nums -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${MARCA_UMBRAL_PCT}%` }}>
          umbral {fmtInt(umbral)} d
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-pill ${
            estadoConocido ? tono.pill : 'bg-ink-variant/10 text-ink-variant'
          }`}>
          {estadoRaw || SEVERIDAD_LABEL[f.severidad]}
        </span>
        <Chip text={`${fmtDecimal(f.ratioUmbral)}× el umbral`} />
        <Chip text={`Excedente ${fmtDecimal(f.excedente)} ${unidad}`} />
        {sinCosto ? (
          <Chip text="Costo no disponible" />
        ) : (
          <Chip text={`Existencia ${fmtDecimal(f.row.existenciaActual)} ${unidad} · ${fmtMoney(f.valorExistencia)}`} />
        )}
        <Chip text={`${fmtDecimal(f.row.vendidoEnPeriodo)} en ${fmtInt(dias)} d · ${fmtDecimal(f.row.promedioDiario)}/día`} />
      </div>
    </div>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-pill bg-ink-variant/10 text-ink-variant tabular-nums">
      {text}
    </span>
  );
}
```

- [ ] **Step 6: Remove the now-unused `Severidad` import if lint flags it**

`Severidad` is still used by the `TONO` / `SEVERIDAD_LABEL` type annotations, so it should stay. If `npm run lint` reports any genuinely unused import after this task, delete that import — do not add an eslint-disable.

- [ ] **Step 7: Typecheck, lint and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/sobre-stock/page.tsx
git commit -m "feat(sobre-stock): add sortable product list with umbral-anchored bars"
```

---

### Task 6: Navegación, permisos y búsqueda

**Files:**
- Modify: `src/lib/reports.ts:22`
- Modify: `src/app/dashboard/_shell.tsx:36`
- Modify: `src/components/global-search.tsx` (the `REPORTS` array, after the Productos Negativos entry)
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the route `/dashboard/sobre-stock` from Task 3.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Gate the route in `src/lib/reports.ts`**

Add as the last entry of `REPORT_ROUTES`:

```ts
  { href: '/dashboard/productos-negativos', reportKeys: ['analitica-productos-negativos'] },
  { href: '/dashboard/sobre-stock', reportKeys: ['sobre-stock-productos'] }
];
```

- [ ] **Step 2: Add the nav entry in `src/app/dashboard/_shell.tsx`**

Add as the last entry of `NAV`:

```ts
  { href: '/dashboard/productos-negativos', label: 'Productos Negativos', icon: 'warning' },
  { href: '/dashboard/sobre-stock', label: 'Sobre Stock', icon: 'inventory_2' }
];
```

- [ ] **Step 3: Add the Cmd-K entry in `src/components/global-search.tsx`**

Add after the Productos Negativos object in the `REPORTS` array:

```ts
  {
    type: 'Reporte',
    title: 'Sobre Stock',
    subtitle: 'Exceso de inventario según rotación',
    href: '/dashboard/sobre-stock',
    icon: 'inventory_2'
  },
```

- [ ] **Step 4: Record the report in `AGENTS.md`**

Add after the "Productos Negativos is now live" paragraph, following the same format:

```markdown
> **Sobre Stock is now live** (2026-08-04) — `src/app/dashboard/sobre-stock/page.tsx`. Top-N products with the most days of inventory among those that sold in the analysis window. Endpoint: `GET /api/reportes/sobre-stock-productos?diasAnalisis&topN&umbralDiasSobreStock&sucursalId` — **every param is optional** (the SP has its own defaults) and `sucursalId` is omitted for "Todas las sucursales". Three pill groups drive it: ventana `30/90/180` (default 90), umbral `30/45/60/90` (default 45), top `10/20/50/100` (default 20); all four filters are in the cache key `rpt:sobre-stock:<sucursal>:<dias>:<umbral>:<top>`. `Estado` is `SOBRE STOCK` or `NORMAL`; unknown values render verbatim in a neutral chip and count as over-stock. All derived arithmetic (excedente, capital inmovilizado, severidad, orden) lives in [`src/lib/sobre-stock.ts`](src/lib/sobre-stock.ts), deliberately React-free. Row bars are anchored to `5 ×` the umbral, not to the list maximum, so a 1,640-day outlier doesn't flatten everything else. Types `RptSobreStockProducto` / `parseSobreStock` in `src/lib/types.ts`; `apiSobreStockProductos` in `src/lib/api.ts`; Excel via `ExcelReportKey 'sobre-stock-productos'` (**note the export takes `top`, not `topN`**). NAV icon: `inventory_2`. **Not yet mirrored in Flutter** — see `docs/superpowers/specs/2026-08-04-sobre-stock-productos-design.md` §7.
```

- [ ] **Step 5: Typecheck, lint and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, `/dashboard/sobre-stock` in the route list.

- [ ] **Step 6: Commit**

```bash
git add src/lib/reports.ts src/app/dashboard/_shell.tsx src/components/global-search.tsx AGENTS.md
git commit -m "feat(sobre-stock): wire nav, permission gate and global search"
```

---

### Task 7: Verificación funcional contra staging

**Files:** none modified unless a defect is found.

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: a verified report.

> **Staging only, never production.** If the single-session account needs
> re-enabling to sign in, stop and ask before touching it.

- [ ] **Step 1: Run the dev server and sign in against staging**

Run: `npm run dev`, open `http://localhost:3000`, sign in, navigate to **Sobre Stock** in the sidebar.

- [ ] **Step 2: Verify the default load**

Expected, with no filter touched:
- Ventana pill **90 d**, umbral pill **45 d**, top pill **Top 20** are the active (blue) ones.
- Sucursal reads **Todas las sucursales**.
- The network request is `/api/reportes/sobre-stock-productos?diasAnalisis=90&topN=20&umbralDiasSobreStock=45` with **no `sucursalId` param**.

- [ ] **Step 3: Verify the arithmetic on a row, by hand**

Pick any row and confirm against the browser's raw JSON response. For a row shaped like the sample (`ExistenciaActual: 82`, `PromedioDiario: 0.05`, `Costo: 3`, `DiasDeInventario: 1640`) at umbral 45, the card must read:

| Card element | Expected |
| --- | --- |
| Número grande | `1,640.00 días` |
| Bajo el número | `$239.25 inmovilizado` |
| Chip múltiplo | `36.44× el umbral` |
| Chip excedente | `Excedente 79.75 SOBR` |
| Chip existencia | `Existencia 82.00 SOBR · $246.00` |
| Barra | llena (1640 ≥ 5 × 45 = 225), en `tertiary` (crítico) |

- [ ] **Step 4: Verify each interaction**

- Change **umbral** → refetch, `LoadingState` skeleton (not `LoadingBar`), excedente and capital figures change.
- Change **ventana** and **top** → refetch; the row count follows `top`.
- Pick a **sucursal** → refetch with `sucursalId` in the query.
- Each **sort pill** reorders without a network request, and `#1` stays at the top.
- **Solo sobre stock** hides `NORMAL` rows and **leaves the tiles and the severity bar unchanged**.
- **Excel** downloads a `.xlsx` whose request carries `top` (not `topN`) plus `diasAnalisis`, `umbralDiasSobreStock` and the current `sucursalId`.
- Switch browser tabs and back → thin `LoadingBar` appears, rows do not blank out.

- [ ] **Step 5: Verify responsive and empty behaviour**

- At 375px width the three pill groups scroll horizontally and the page body does **not** scroll horizontally.
- Set umbral to 90 with a sucursal that has little stock; if nothing exceeds it, the list shows *"Ningún producto supera el umbral seleccionado."* while the tiles still render.

- [ ] **Step 6: Final gate**

Run: `npm run build`
Expected: succeeds, zero TS errors, `/dashboard/sobre-stock` in the route list.

Then confirm no debug logging was left behind:

Run: `git diff main --stat && grep -rn "console\.log" src/lib/sobre-stock.ts src/app/dashboard/sobre-stock/`
Expected: no `console.log` matches.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(sobre-stock): address issues found in staging verification"
```

(Skip if verification found nothing.)

---

## Self-Review

**Spec coverage** — every spec section maps to a task:

| Spec § | Task |
| --- | --- |
| §2 endpoint + Excel contract | 1 |
| §3 tipo, parser, fetcher, cache key, sucursal forzada | 1, 3 |
| §4 métricas derivadas, severidad, costo ausente | 2, 5 |
| §5.1 header | 3 |
| §5.2 barra de filtros | 3 |
| §5.3 tiles + barra de severidad | 4 |
| §5.4 tarjetas | 5 |
| §5.5 controles de orden + toggle | 5 |
| §5.6 estados loading/error/empty | 3, 5 |
| §3 nav / permisos / búsqueda | 6 |
| §8 verificación | 7 |

**Known deviation from the spec:** §5.4 shows `Última venta` on its own line *above* the bar, which is what Task 5 implements; the spec's ASCII mock puts it in the same block. Same information, same order — no action needed.

**Type consistency** — `SobreStockFila`, `SobreStockResumen`, `SegmentoSeveridad`, `Severidad`, `OrdenId` are defined once in Task 2 and referenced by those exact names in Tasks 4 and 5. `TONO` / `SEVERIDAD_LABEL` are defined in Task 4 Step 2 and consumed in Task 5 Step 5. `ESCALA_BARRA` is exported from `sobre-stock.ts` (Task 2) and used to derive `MARCA_UMBRAL_PCT` in Task 5 Step 2. The Excel key `'sobre-stock-productos'` is added in Task 1 Step 2 and called in Task 3.
