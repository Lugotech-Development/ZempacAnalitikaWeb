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

export type Cobertura = { valor: number; unidad: 'días' | 'años' };

/**
 * Days of inventory become unreadable fast — a product selling 0.01/día with 655
 * units on hand shows 58,950 días, which nobody parses as "161 años". Anything
 * past two years is expressed in years instead.
 */
export function coberturaLegible(dias: number | null): Cobertura {
  const d = dias ?? 0;
  return d >= 730 ? { valor: d / 365, unidad: 'años' } : { valor: d, unidad: 'días' };
}

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

/**
 * The SP's own `ordenarPor`. This is NOT a display sort — combined with `topN`
 * it decides WHICH products come back, so "top 20 por más vendidos" is a
 * different set than "top 20 por mayor sobre stock", not the same set reordered.
 */
export type OrdenServidorId = 1 | 2;

export const ORDENES_SERVIDOR: { id: OrdenServidorId; label: string }[] = [
  { id: 1, label: 'Mayor sobre stock' },
  { id: 2, label: 'Más vendidos' }
];

/** El reporte es de sobre stock: el top arranca por el exceso, no por la venta. */
export const ORDEN_SERVIDOR_DEF: OrdenServidorId = 1;

export type OrdenId = 'api' | 'dias' | 'capital' | 'excedente' | 'ultimaVenta';

export const ORDENES: { id: OrdenId; label: string }[] = [
  { id: 'api', label: 'Orden del reporte' },
  { id: 'dias', label: 'Días de inventario' },
  { id: 'capital', label: 'Capital inmovilizado' },
  { id: 'excedente', label: 'Excedente' },
  { id: 'ultimaVenta', label: 'Última venta' }
];

/**
 * [ORDENES] with the `'api'` entry relabelled to the server criterion actually
 * in effect. "Orden del reporte" forced the user to remember that it mirrors the
 * Priorizar filter; showing "Más vendidos" / "Mayor sobre stock" says it outright.
 */
export function ordenesPara(ordenarPor: OrdenServidorId): { id: OrdenId; label: string }[] {
  const servidor = ORDENES_SERVIDOR.find(o => o.id === ordenarPor);
  return ORDENES.map(o => (o.id === 'api' && servidor ? { ...o, label: servidor.label } : o));
}

/**
 * Sorts a copy. 'api' keeps the order the SP sent (driven by `ordenarPor`) —
 * without it, any client sort would silently override the server criterion the
 * user just picked. The value criteria are descending (biggest problem first);
 * "ultimaVenta" puts the oldest sale first. Null values always sink to the
 * bottom, whatever the criterion.
 */
export function ordenar(filas: SobreStockFila[], orden: OrdenId): SobreStockFila[] {
  const copia = [...filas];
  if (orden === 'api') return copia;
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
