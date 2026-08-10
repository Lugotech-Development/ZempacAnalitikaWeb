'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { EyebrowLabel, ExcelExportButton, LockedFilter } from '@/components/common';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtDate, fmtDecimal, fmtInt, fmtMoney } from '@/lib/format';
import { apiSobreStockProductos, apiSucursales } from '@/lib/api';
import { useExcelExport } from '@/lib/use-excel-export';
import { forcedNumber } from '@/lib/permissions';
import { useApi } from '@/lib/use-api';
import {
  DIAS_SIN_VENTA_ALERTA,
  ORDENES_SERVIDOR,
  ORDEN_SERVIDOR_DEF,
  type OrdenServidorId,
  coberturaLegible,
  ordenesPara,
  derivarFila,
  ordenar,
  resumir,
  type OrdenId,
  type Severidad,
  type SobreStockFila,
  type SobreStockResumen
} from '@/lib/sobre-stock';
import type { RptSobreStockProducto } from '@/lib/types';

// Ventana de historial que alimenta el PromedioDiario (`diasAnalisis`).
const VENTANAS = [30, 90, 180];
const VENTANA_DEF = 90;
// Días de inventario a partir de los cuales el SP marca SOBRE STOCK. El SP usa
// 45 si no se le manda nada; aquí el default es 30 (decisión de producto, más
// estricta que la del backend) y siempre se envía explícito.
const UMBRALES = [30, 45, 60, 90];
const UMBRAL_DEF = 30;
// Cuántos productos devuelve el SP (`topN`).
const TOPS = [10, 20, 50, 100];
const TOP_DEF = 20;

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

// Estados que sabemos colorear; cualquier otro se muestra verbatim en neutro.
const ESTADOS_CONOCIDOS = new Set(['NORMAL', 'SOBRE STOCK']);

export default function SobreStockPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null); // null = todas
  const [sucursalOpen, setSucursalOpen] = useState(false);
  const [dias, setDias] = useState(VENTANA_DEF);
  const [umbral, setUmbral] = useState(UMBRAL_DEF);
  const [top, setTop] = useState(TOP_DEF);
  const [ordenarPor, setOrdenarPor] = useState<OrdenServidorId>(ORDEN_SERVIDOR_DEF);
  // 'api' respeta el orden que mandó el SP (el criterio de "Priorizar"); si el
  // default fuera un criterio local, elegir "Más vendidos" no cambiaría nada visible.
  const [orden, setOrden] = useState<OrdenId>('api');
  const [soloSobreStock, setSoloSobreStock] = useState(false);
  const xls = useExcelExport();

  // If the profile fixes the sucursal (parametrosSP), it wins over the picker —
  // derived rather than pushed into state so there's no effect to keep in sync.
  const forcedSucursal = forcedNumber('sobre-stock-productos', ['sucursalId', 'sucursal', 'idSucursal']);
  const efectivaSucursal = forcedSucursal ?? sucursalId;

  // Cada filtro entra en la key: cambiar cualquiera fuerza LoadingState, nunca
  // LoadingBar (que queda para revalidación en foco/visibilidad de la misma key).
  const key = `rpt:sobre-stock:${efectivaSucursal ?? 'todas'}:${dias}:${umbral}:${top}:${ordenarPor}`;
  const q = useApi<RptSobreStockProducto[]>(key, () =>
    apiSobreStockProductos({
      diasAnalisis: dias,
      topN: top,
      umbralDiasSobreStock: umbral,
      ordenarPor,
      sucursalId: efectivaSucursal ?? undefined
    })
  );

  const filas = useMemo(() => {
    const hoy = new Date();
    return (q.data ?? []).map(r => derivarFila(r, umbral, hoy));
  }, [q.data, umbral]);

  const resumen = useMemo(() => resumir(filas), [filas]);

  const visibles = useMemo(() => {
    const base = soloSobreStock ? filas.filter(f => f.sobreStock) : filas;
    return ordenar(base, orden);
  }, [filas, soloSobreStock, orden]);

  // Las barras de cada fila son participación en el capital, así que se escalan
  // contra el mayor de la lista visible.
  const maxCapital = useMemo(() => Math.max(0, ...visibles.map(f => f.capitalInmovilizado)), [visibles]);

  // La pill 'api' se rotula con el criterio del servidor que está en efecto, así
  // no hay que recordar que "Orden del reporte" espeja el filtro Priorizar.
  const ordenes = useMemo(() => ordenesPara(ordenarPor), [ordenarPor]);

  const sucursalActual = sucursalesQ.data?.find(s => s.id === efectivaSucursal);

  const handleExport = () =>
    void xls.run('sobre-stock-productos', {
      diasAnalisis: dias,
      top,
      umbralDiasSobreStock: umbral,
      ordenarPor,
      sucursalId: efectivaSucursal ?? undefined
    });

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Stock de Productos"
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

        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-4 sm:gap-6">
          <NumPills label="Ventas de los últimos" values={VENTANAS} value={dias} onChange={setDias} format={v => `${v} días`} />
          <NumPills label="Sobre stock: más de" values={UMBRALES} value={umbral} onChange={setUmbral} format={v => `${v} días`} />
          <NumPills label="Mostrar" values={TOPS} value={top} onChange={setTop} format={v => `Top ${v}`} />
          {/* `ordenarPor` del SP: junto con topN decide QUÉ productos vuelven,
              por eso vive con los filtros y no con las pills de orden de la lista. */}
          <NumPills
            label="Priorizar"
            values={ORDENES_SERVIDOR.map(o => o.id)}
            value={ordenarPor}
            onChange={v => setOrdenarPor(v as OrdenServidorId)}
            format={v => ORDENES_SERVIDOR.find(o => o.id === v)?.label ?? String(v)}
          />
        </div>
      </div>

      <LoadingBar active={q.isValidating && q.status === 'success'} className="mb-4" />
      {q.status === 'loading' && <LoadingState />}
      {q.status === 'error' && <ErrorState variant={q.errorVariant!} message={q.error!} onRetry={q.reload} />}
      {q.status === 'success' &&
        (filas.length === 0 ? (
          <EmptyState message="Sin productos con ventas en la ventana seleccionada." />
        ) : (
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
              <Tile label="Unidades excedentes" value={fmtDecimal(resumen.unidadesExcedentes)} tone="primary-container" />
              <Tile label={`Sin venta +${DIAS_SIN_VENTA_ALERTA} d`} value={fmtInt(resumen.sinVentaReciente)} tone="primary" />
            </div>

            <p className="mt-3 text-[11px] text-outline">
              El <span className="font-bold">capital inmovilizado</span> son las unidades que sobran —las que exceden {fmtInt(umbral)} días de
              cobertura según su venta diaria— multiplicadas por su costo. El <span className="font-bold">excedente</span> es ese mismo sobrante
              expresado en unidades.
            </p>

            {/* Sin sobre stock el resumen queda en $0.00 y se lee como si el reporte
                fallara; decir que es un buen resultado —y dónde sí buscar— lo evita. */}
            {resumen.sobreStock === 0 && (
              <div className="mt-3 card p-4 flex items-start gap-3">
                <Icon name="check_circle" size={18} className="text-positive-fg shrink-0 mt-0.5" />
                <p className="text-[12px] text-ink-variant">
                  Ninguno de estos {fmtInt(resumen.total)} productos supera los {fmtInt(umbral)} días de inventario, así que no hay capital
                  inmovilizado que reportar.
                  {ordenarPor === 2 && (
                    <>
                      {' '}Para ver dónde sí hay exceso, cambia <span className="font-bold">Priorizar</span> a{' '}
                      <span className="font-bold">Mayor sobre stock</span>.
                    </>
                  )}
                </p>
              </div>
            )}

            <BarraSeveridad resumen={resumen} />

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-ink-variant tabular-nums">
                {fmtInt(resumen.total)} productos · {fmtInt(resumen.sobreStock)} sobre stock
              </p>
              <div className="sm:ml-auto flex items-center gap-2 overflow-x-auto -mx-1 px-1">
                <span className="shrink-0 text-[11px] font-bold text-outline">Ordenar:</span>
                {ordenes.map(o => (
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
                  <FilaCard key={`${f.row.docNum ?? 'r'}-${i}`} f={f} rank={i + 1} maxCapital={maxCapital} dias={dias} umbral={umbral} />
                ))}
              </div>
            )}
          </>
        ))}
    </>
  );
}

function FilaCard({
  f,
  rank,
  maxCapital,
  dias,
  umbral
}: {
  f: SobreStockFila;
  rank: number;
  maxCapital: number;
  dias: number;
  umbral: number;
}) {
  const unidad = f.row.unidadVenta?.trim() || 'uds';
  const tono = TONO[f.severidad];
  const cobertura = coberturaLegible(f.row.diasDeInventario);
  // Participación en el capital: anclar la barra al umbral no servía —con
  // productos a 1,300× el umbral toda barra salía llena. Contra el mayor de la
  // lista, el ancho vuelve a distinguir una fila de otra.
  const share = maxCapital > 0 ? f.capitalInmovilizado / maxCapital : 0;
  const estadoRaw = (f.row.estado ?? '').trim();
  const estadoConocido = ESTADOS_CONOCIDOS.has(estadoRaw.toUpperCase());
  const sinCosto = f.row.costo == null || f.row.costo === 0;
  const conCapital = f.capitalInmovilizado > 0;

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
          <p className="text-base font-extrabold tracking-tight tabular-nums">
            {fmtDecimal(cobertura.valor)} {cobertura.unidad}
          </p>
          <p className="text-[11px] text-outline">de inventario</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-ink-variant tabular-nums">
        Última venta {fmtDate(f.row.ultimaVenta)}
        {f.diasSinVenta != null && ` · hace ${fmtInt(f.diasSinVenta)} d`}
      </p>

      {/* Participación de esta fila en el capital inmovilizado de la lista. Con
          "Priorizar: Más vendidos" la mayoría de las filas no tiene exceso, y una
          barra vacía con $0.00 se lee como un error: se dice con palabras. */}
      {conCapital ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-pill bg-surface-mid overflow-hidden">
            <div className={`h-full ${tono.barra}`} style={{ width: `${share * 100}%` }} />
          </div>
          <p className="shrink-0 text-right tabular-nums">
            <span className="text-[13px] font-extrabold text-tertiary">{fmtMoney(f.capitalInmovilizado)}</span>
            <span className="ml-1.5 text-[10px] font-bold text-outline">{fmtInt(share * 100)}%</span>
          </p>
        </div>
      ) : f.excedente > 0 ? (
        <p className="mt-3 text-[11px] font-bold text-ink-variant tabular-nums">
          Excedente de {fmtDecimal(f.excedente)} {unidad} · sin costo registrado, no se puede valorizar
        </p>
      ) : (
        <p className="mt-3 text-[11px] font-bold text-positive-fg tabular-nums">
          Sin exceso · su inventario cubre menos de {fmtInt(umbral)} días
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-pill ${
            estadoConocido ? tono.pill : 'bg-ink-variant/10 text-ink-variant'
          }`}>
          {estadoRaw || SEVERIDAD_LABEL[f.severidad]}
        </span>
        {f.excedente > 0 && <Chip text={`Excedente ${fmtDecimal(f.excedente)} ${unidad}`} />}
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
  // Sólo los tramos con capital: mostrar "Moderado $0.00 (0)" era puro ruido
  // cuando todo el capital cae en un solo tramo.
  const segmentos = resumen.porSeveridad.filter(s => s.capital > 0);
  if (total <= 0 || segmentos.length === 0) return null;
  return (
    <div className="mt-4 card p-6">
      <EyebrowLabel>Capital inmovilizado por severidad</EyebrowLabel>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-pill bg-surface-mid">
        {segmentos.map(s => (
          <div
            key={s.severidad}
            className={TONO[s.severidad].barra}
            style={{ width: `${(s.capital / total) * 100}%` }}
            aria-label={`${SEVERIDAD_LABEL[s.severidad]}: ${fmtMoney(s.capital)}`}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {segmentos.map(s => (
          <div key={s.severidad} className="flex items-center gap-2 min-w-0">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${TONO[s.severidad].barra}`} />
            <p className="text-[12px] text-ink-variant truncate">{SEVERIDAD_LABEL[s.severidad]}</p>
            <p className="text-[12px] font-extrabold tabular-nums text-ink">{fmtMoney(s.capital)}</p>
            <p className="text-[11px] text-outline tabular-nums">({fmtInt(s.productos)} productos)</p>
          </div>
        ))}
      </div>
    </div>
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
