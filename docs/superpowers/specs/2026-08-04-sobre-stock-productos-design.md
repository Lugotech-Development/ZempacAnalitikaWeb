# Reporte "Sobre Stock" — diseño

Fecha: 2026-08-04 · Alcance: **solo web** (`ZempacAnalitikaWeb`). La paridad con el
app Flutter (`../ReportesZempacApp`) queda como follow-up explícito, no se hace aquí.

> **Revisión 2026-08-05 tras verificación en staging.** Los datos reales invalidaron
> tres decisiones de §5: los productos que devuelve el SP están a ~1,300× el umbral,
> no a 1–5×. Cambios aplicados, detallados en §9:
> barra de fila = participación en el capital (no anclada al umbral) ·
> `DiasDeInventario` en años pasados los 2 años · sin chip `× el umbral` ·
> etiquetas de filtro en español llano · tramos de severidad vacíos ocultos.

## 1. Qué resuelve

Identifica los productos que tienen más días de inventario disponibles según su
rotación real, para detectar capital inmovilizado en existencias que no se mueven.
El SP devuelve los `topN` productos con mayor cobertura **de entre los que
registraron al menos una venta** en la ventana analizada, ordenados desc por días
de inventario, y etiqueta cada uno como `SOBRE STOCK` o `NORMAL` según el umbral.

## 2. Endpoint y contrato

```
GET /api/reportes/sobre-stock-productos
      ?diasAnalisis=60&topN=50&umbralDiasSobreStock=45&sucursalId=1
```

Todos los parámetros son opcionales; el SP tiene defaults propios.

Respuesta: array plano. Fila de ejemplo:

```json
{
  "DocNum": 4738,
  "Producto": "ANI COMINO /100 SOBRES",
  "UnidadVenta": "SOBR",
  "Costo": 3.0000,
  "UltimaVenta": "2026-07-10T21:08:26.09",
  "VendidoEnPeriodo": 3.0000,
  "PromedioDiario": 0.050000,
  "ExistenciaActual": 82.0000,
  "DiasDeInventario": 1640.000000,
  "Estado": "SOBRE STOCK"
}
```

`Estado` toma hoy dos valores: `SOBRE STOCK` y `NORMAL`. Cualquier valor nuevo
debe renderizarse verbatim en un chip neutro sin romper la vista.

Excel (ya existe en el backend, ojo con el nombre del parámetro `top`, no `topN`):

```
GET /api/excelexport/sobre-stock-productos
      ?diasAnalisis=60&top=50&umbralDiasSobreStock=45&sucursalId=2
```

## 3. Piezas nuevas en el repo

| Pieza | Ubicación | Detalle |
| --- | --- | --- |
| Tipo + parser | `src/lib/types.ts` | `RptSobreStockProducto` / `parseSobreStock`, todos los campos nullable, tolerante PascalCase + camelCase |
| Fetcher | `src/lib/api.ts` | `apiSobreStockProductos({ diasAnalisis, topN, umbralDiasSobreStock, sucursalId? })` |
| Excel key | `src/lib/api.ts` | `'sobre-stock-productos'` en `ExcelReportKey`; `ExcelExportParams` gana `diasAnalisis?` y `umbralDiasSobreStock?` (`top` y `sucursalId` ya existen) |
| Página | `src/app/dashboard/sobre-stock/page.tsx` | `'use client'` |
| Permiso | `src/lib/reports.ts` | `{ href: '/dashboard/sobre-stock', reportKeys: ['sobre-stock-productos'] }` |
| Nav | `src/app/dashboard/_shell.tsx` | entrada al final de `NAV`, icono `inventory_2` (ya registrado) |
| Búsqueda | `src/components/global-search.tsx` | entrada estática del reporte |

**Cache key:** `rpt:sobre-stock:{sucursal|todas}:{diasAnalisis}:{umbral}:{topN}` — lleva
todo el contexto de filtros, así que cambiar cualquier pill fuerza `LoadingState`
(nunca `LoadingBar`, que queda sólo para revalidación en foco/visibilidad).

### Tipo

```ts
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
  estado: string | null;
};
```

### Sucursal forzada por perfil

`forcedParamNumber('sobre-stock-productos', ['sucursalId', 'sucursal', 'idSucursal'])`
dentro del fetcher, y `forcedNumber(...)` en la página para mostrar `LockedFilter`
en vez del dropdown, igual que Productos Negativos y Ventas por Marca.

## 4. Métricas derivadas (cliente, sin llamadas extra)

Con `U` = `umbralDiasSobreStock` seleccionado:

| Métrica | Fórmula | Para qué |
| --- | --- | --- |
| `excedente` | `max(0, existenciaActual − promedioDiario × U)` | unidades por encima de lo que la ventana del umbral necesita |
| `capitalInmovilizado` | `excedente × (costo ?? 0)` | **el número accionable**: dinero detenido |
| `valorExistencia` | `existenciaActual × (costo ?? 0)` | contexto para el capital inmovilizado |
| `ratioUmbral` | `diasDeInventario / U` | "36.4× el umbral" |
| `diasSinVenta` | días entre `ultimaVenta` y hoy, ambos truncados a medianoche local | un producto con 1,640 días de cobertura que no vende hace 25 d es peor que uno que vendió hoy |

`ultimaVenta` llega sin sufijo de zona horaria (`"2026-07-10T21:08:26.09"`), así que
`new Date(...)` la interpreta como hora local. Truncar ambas fechas a medianoche
antes de restar evita el off-by-one de comparar contra una hora del día. Si
`ultimaVenta` es null, `diasSinVenta` es `null` y la fila no cuenta en el tile
correspondiente.

**Severidad** (sólo subdivide las filas sobre stock):

| Tier | Condición | Token |
| --- | --- | --- |
| Normal | `estado === 'NORMAL'` | `positive-fg` |
| Moderado | `ratioUmbral ≤ 2` | `primary` |
| Alto | `ratioUmbral ≤ 5` | `primary-container` |
| Crítico | `ratioUmbral > 5` | `tertiary` |

`estado === 'NORMAL'` manda sobre el ratio. Un `estado` desconocido (ni `NORMAL`
ni `SOBRE STOCK`) se trata como sobre stock para la severidad pero su chip muestra
el string del servidor en tono neutro.

**Costo ausente:** si `costo` es `null` o `0`, la fila aporta `$0` a todos los
totales y su chip de dinero dice `Costo no disponible` en tono `ink-variant`.
No se inventan valores ni se excluye la fila de la lista.

## 5. Layout

Todo con tokens y clases existentes (`.card`, `.card-bordered`, `.pill`, `.eyebrow`).
Sin hex nuevos, sin librerías nuevas, sin gráfico.

### 5.1 Header

`<PageHeader eyebrow="Reporte" title="Sobre Stock" subtitle="Productos con exceso de inventario según su rotación" icon="inventory_2" isRefreshing={…} onRefresh={…} />`

### 5.2 Barra de filtros — un `.card`, dos filas

```
┌──────────────────────────────────────────────────────────────┐
│ [🏪 Todas las sucursales ▾]                    [⬇ Excel]     │
│                                                              │
│ VENTANA          UMBRAL                  MOSTRAR             │
│ (30)(90)(180)    (30)(45)(60)(90)        (10)(20)(50)(100)   │
│      ▲def             ▲def                    ▲def           │
└──────────────────────────────────────────────────────────────┘
```

- **Ventana** (`diasAnalisis`): `30 · 90 · 180`, default **90**.
- **Umbral** (`umbralDiasSobreStock`): `30 · 45 · 60 · 90`, default **45**.
- **Mostrar** (`topN`): `10 · 20 · 50 · 100`, default **20**.
- Cada grupo lleva su `.eyebrow` encima para que se lea qué controla.
- **Sucursal**: dropdown con opción **"Todas las sucursales"**, que es el estado
  inicial y **omite `sucursalId` de la query** (el parámetro es opcional, a
  diferencia de Productos Negativos, donde es obligatorio). `LockedFilter` cuando
  el perfil la fija, y en ese caso no hay opción "Todas".
- **Excel**: `ExcelExportButton` + `useExcelExport`, pasa los cuatro filtros
  actuales (`top` en vez de `topN`).

Los grupos de pills usan `overflow-x-auto` para no romper en pantallas angostas.

### 5.3 Resumen — 4 tiles + barra de severidad

Reusa el patrón `AgingTile` + barra segmentada de Cuentas por Cobrar.

```
┌─ Capital inmovil. ──┬─ Sobre stock ─┬─ Unid. excedentes ─┬─ Sin venta +30 d ─┐
│     $12,480.75      │      17       │      1,284.50      │         6         │
│ de $18,930.00 en ex.│  de 20 prod.  │                    │                   │
│      tertiary       │   tertiary    │  primary-container │      primary      │
└─────────────────────┴───────────────┴────────────────────┴───────────────────┘
 ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 ■ Moderado $1,240.50 (4)  ■ Alto $3,890.25 (6)  ■ Crítico $7,350.00 (7)
```

Definiciones de cada tile:

- **Capital inmovilizado** = `Σ capitalInmovilizado`; subtexto = `Σ valorExistencia`.
- **Sobre stock** = conteo de filas con `estado !== 'NORMAL'`; subtexto = total de filas.
- **Unidades excedentes** = `Σ excedente`, con `fmtDecimal`.
- **Sin venta +30 d** = conteo de filas con `diasSinVenta > 30`. Filas con
  `ultimaVenta` null **no** cuentan (no hay evidencia de cuándo vendieron).

La barra segmenta el **capital inmovilizado** por severidad, no el conteo: un solo
producto crítico con $50k debe dominar visualmente. Las filas `NORMAL` tienen
excedente 0 por definición, así que no aparecen en la barra. Si el capital total
es 0 (todo normal, o sin costos), la barra no se dibuja.

**Los tiles y la barra siempre reflejan la respuesta completa del SP**, sin importar
el toggle "Solo sobre stock" (§5.5), que filtra únicamente la lista.

### 5.4 Lista — tarjeta rankeada por producto

Mismo patrón que `src/app/dashboard/productos/page.tsx`.

```
┌────────────────────────────────────────────────────────────────┐
│ #1  ANI COMINO /100 SOBRES                    1,640.0 días     │
│     Código 4738 · SOBR                  $239.25 inmovilizado   │
│     Última venta 10 jul 2026 · hace 25 d                       │
│     ████████████████████████████████████████████████████       │
│              ┆ umbral 45 d                                     │
│     [SOBRE STOCK] [36.4× el umbral] [Excedente 79.75 SOBR]     │
│     [Existencia 82.00 SOBR · $246.00] [3.00 en 90 d · 0.05/día]│
└────────────────────────────────────────────────────────────────┘
```

- **Número grande**: días de inventario (el sujeto del reporte y el orden por
  defecto). Debajo, en `tertiary`, el capital inmovilizado.
- **Barra**: ancho = `min(1, diasDeInventario / (5 × U))`, color por severidad.
  Escalarla al máximo de la lista no sirve — con un outlier de 1,640 días todo lo
  demás queda plano. Anclada al umbral, la marca punteada cae siempre al 20% y
  "barra llena = ≥5× el umbral = crítico".
- **Marca de umbral**: línea vertical de 1px en `outline` al 20% del ancho, con
  label `umbral {U} d`. Es lo que hace legible el "qué tan pasado de la raya está".
- **Chips**: estado · múltiplo del umbral · excedente · existencia con su valor ·
  ventas del período con promedio diario. `flex-wrap`, patrón `Chip` de la página
  de Productos.
- **Unidad**: `unidadVenta` como sufijo en toda cantidad; fallback `uds` si es null.

### 5.5 Controles sobre la lista

Fila entre el resumen y la lista:

- Izquierda: `20 productos · 17 sobre stock`.
- Derecha: pills de orden **Días de inventario** (def) · **Capital inmovilizado** ·
  **Excedente** · **Última venta** (más antigua primero), y toggle
  **Solo sobre stock** (apagado por defecto — ver las filas `NORMAL` muestra dónde
  cae el corte del umbral).

El orden es **client-side** sobre ≤100 filas, sin refetch — mismo criterio que las
pills de orden de "Productos por lotes". Los tres primeros criterios ordenan desc;
"Última venta" ordena asc (la más vieja arriba). En cualquier criterio, los valores
`null` van **al final**, y el rank `#n` se recalcula sobre la lista ya ordenada y
filtrada, de modo que siempre empieza en `#1`.

### 5.6 Estados

`LoadingState` / `ErrorState` / `EmptyState` estándar. `LoadingBar` sólo para
revalidación en la misma key. Vacío: *"Sin productos con ventas en la ventana
seleccionada."* Sin aviso de "Vista previa" — el endpoint es real.

## 6. Fuera de alcance (decisiones explícitas)

- **Sin gráfico.** `series-chart` es de series temporales y estos datos no lo son;
  AGENTS.md prohíbe agregar otra librería de charts. Las barras por fila y la
  segmentada cubren la carga visual.
- **Sin paginación.** Máximo 100 filas por el selector de `topN`.
- **Sin búsqueda por nombre** dentro del reporte.
- **Sin drilldown** por producto — el SP no expone historial por producto.
- **Sin espejo en Flutter** en esta iteración (ver §7).

## 7. Follow-ups

1. **Paridad Flutter** — replicar la pantalla en `../ReportesZempacApp` y actualizar
   ambos `AGENTS.md` en lockstep, como manda la convención del repo.
2. **`Estado` adicionales** — si el backend agrega tiers propios (p. ej. `CRÍTICO`),
   revisar si conviene usarlos en vez de la severidad derivada del ratio.

## 9. Revisión post-staging (2026-08-05)

La verificación funcional con datos reales de staging mostró que el diseño de §5
asumía un rango de cobertura que no existe. Un producto típico del top-20 vende
`1 unidad en 90 días` y tiene `655` en existencia: **58,950 días de inventario, o
1,310× el umbral**. Consecuencias y correcciones:

| Problema observado | Corrección |
| --- | --- |
| La barra anclada a `5 × umbral` salía **100% llena en todas las filas**, y la marca del umbral quedaba en un 20% que nada alcanzaba (además de invisible: marca oscura sobre relleno oscuro) | Barra = **participación de la fila en el capital inmovilizado** de la lista, escalada contra el mayor. Acotada 0–100% y siempre discrimina. Marca del umbral eliminada. |
| `58,950.59 días` no se lee como "161 años" | `coberturaLegible()` cambia a **años** pasados los 730 días |
| Chip `1,310.01× el umbral` no es accionable a esa magnitud | Chip eliminado |
| Leyenda con `Moderado $0.00 (0)` · `Alto $0.00 (0)` — todo el capital cae en un solo tramo | Se ocultan los tramos sin capital |
| "Ventana" y "Umbral" son los nombres de los parámetros del endpoint, no lenguaje de usuario | **"Ventas de los últimos"** y **"Sobre stock desde"** |
| Las métricas no se entendían sin explicación | Línea de ayuda bajo los tiles definiendo capital inmovilizado y excedente |

**Sin cambio (decisiones conscientes):** los tramos de severidad siguen en 2× / 5×
aunque hoy todo cae en "Crítico" — la barra segmentada se conserva; el toggle
"Solo sobre stock" se conserva aunque el SP rara vez devuelva filas `NORMAL` en
el top-N, porque con `Top 100` y umbrales altos sí aparecen.

## 8. Verificación

- `npm run build` pasa con TypeScript strict: sin `any`, sin `@ts-ignore`, y la
  ruta `/dashboard/sobre-stock` aparece en el listado de rutas del build.
- Sin `console.log` de depuración.
- Toda cadena visible en español; `tabular-nums` en cada número, dinero, porcentaje
  y fecha.
- Formato exclusivamente vía `src/lib/format.ts` (`fmtMoney`, `fmtInt`,
  `fmtDecimal`, `fmtPercent`, `fmtDate`) — nunca `toLocaleString` / `toFixed` en JSX.
- Verificación funcional contra **staging**, no producción.
