'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel, LockedFilter } from '@/components/common';
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtInt, fmtMoney, toIsoEndOfDay, toIsoStartOfDay } from '@/lib/format';
import { apiAnaliticaLoteCondensado, apiAnaliticaLotes, apiAnaliticaProductosPorLote, apiCuadreCaja, apiSucursales } from '@/lib/api';
import { forcedNumber } from '@/lib/permissions';
import { useApi } from '@/lib/use-api';
import { cuadreCleanDesc, cuadreIsDivider, cuadreIsSectionHeader, cuadreIsSpacer, cuadreIsSubItem, LOTE_ESTATUS, PRODUCTO_LOTE_ORDER, type ProductoLoteOrder, type RptCuadreCajaLinea, type RptLote, type RptLoteCondensadoLinea, type RptProductoPorLote, type Sucursal } from '@/lib/types';

type PresetId = 'hoy' | 'ayer' | '7d' | '30d' | 'mes';
const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'mes', label: 'Este mes' }
];

function computeRange(preset: PresetId): { fDesde: string; fHasta: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (preset) {
    case 'hoy':
      break;
    case 'ayer':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case 'mes':
      start.setDate(1);
      break;
  }
  return { fDesde: toIsoStartOfDay(start), fHasta: toIsoEndOfDay(end) };
}

type TabId = 'general' | 'lotes' | 'productos';
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'general', label: 'General', icon: 'point_of_sale' },
  { id: 'lotes', label: 'Por lotes', icon: 'inventory_2' },
  { id: 'productos', label: 'Productos por lotes', icon: 'shopping_bag' }
];

export default function CuadreCajaPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [preset, setPreset] = useState<PresetId>('hoy');
  const [sucursalOpen, setSucursalOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('general');

  // If the profile fixes the sucursal (parametrosSP), lock the picker to it.
  const forcedSucursal = forcedNumber('analitica-lote-condensado', ['sucursal', 'sucursalId', 'idSucursal']);

  // Pick the forced sucursal, else the first, when the list arrives.
  useEffect(() => {
    if (sucursalId == null && sucursalesQ.status === 'success' && sucursalesQ.data && sucursalesQ.data.length > 0) {
      setSucursalId(forcedSucursal ?? sucursalesQ.data[0].id);
    }
  }, [sucursalesQ.status, sucursalesQ.data, sucursalId, forcedSucursal]);

  const range = useMemo(() => computeRange(preset), [preset]);

  const sucursalActual = sucursalesQ.data?.find(s => s.id === sucursalId);

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Cuadre de Caja"
        subtitle="Conciliación diaria por almacén"
        icon="point_of_sale"
      />

      {sucursalesQ.status === 'loading' && <LoadingState />}
      {sucursalesQ.status === 'error' && <ErrorState variant={sucursalesQ.errorVariant} message={sucursalesQ.error} onRetry={sucursalesQ.reload} />}

      {sucursalesQ.status === 'success' && (
        <>
          {(!sucursalesQ.data || sucursalesQ.data.length === 0) && <EmptyState message="No hay sucursales disponibles para tu cuenta." />}

          {sucursalesQ.data && sucursalesQ.data.length > 0 && (
            <>
              <Filters
                sucursales={sucursalesQ.data}
                sucursalActual={sucursalActual}
                sucursalOpen={sucursalOpen}
                setSucursalOpen={setSucursalOpen}
                onSelectSucursal={id => {
                  setSucursalId(id);
                  setSucursalOpen(false);
                }}
                sucursalLocked={forcedSucursal != null}
                preset={preset}
                setPreset={setPreset}
              />

              <div className="mt-4 flex items-center gap-2">
                {TABS.map(t => {
                  const active = t.id === tab;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${active ? 'bg-primary text-white shadow-cta' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'}`}>
                      <Icon name={t.icon} size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {tab === 'general' ? (
                  <GeneralTab sucursalId={sucursalId} range={range} sucursalNombre={sucursalActual?.nombre ?? ''} />
                ) : tab === 'lotes' ? (
                  <LotesTab sucursalId={sucursalId} range={range} sucursalNombre={sucursalActual?.nombre ?? ''} />
                ) : (
                  <ProductosTab sucursalId={sucursalId} range={range} sucursalNombre={sucursalActual?.nombre ?? ''} />
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function GeneralTab({ sucursalId, range, sucursalNombre }: { sucursalId: number | null; range: { fDesde: string; fHasta: string }; sucursalNombre: string }) {
  const cuadreQ = useCuadre(sucursalId, range);
  return (
    <>
      <LoadingBar active={cuadreQ.isValidating && cuadreQ.status === 'success'} className="mb-3" />
      {cuadreQ.status === 'loading' && <LoadingState />}
      {cuadreQ.status === 'error' && (cuadreQ.errorVariant === 'session' ? null : <ErrorState variant={cuadreQ.errorVariant!} message={cuadreQ.error!} onRetry={cuadreQ.reload} />)}
      {cuadreQ.status === 'success' &&
        (cuadreQ.data && cuadreQ.data.length > 0 ? (
          <Receipt lineas={cuadreQ.data} sucursalNombre={sucursalNombre} />
        ) : (
          <EmptyState message="Sin movimientos para el rango seleccionado." />
        ))}
    </>
  );
}

// Local fetcher so the cache key picks up sucursalId + range changes. Reuses
// the shared SWR-style useApi so navigating away and back is instant and
// the data revalidates on focus.
function useCuadre(sucursalId: number | null, range: { fDesde: string; fHasta: string }) {
  const key = sucursalId == null ? 'cuadre:idle' : `cuadre:${sucursalId}:${range.fDesde}:${range.fHasta}`;
  const noopRef = useRef<RptCuadreCajaLinea[]>([]);
  const q = useApi<RptCuadreCajaLinea[]>(key, async () => {
    if (sucursalId == null) return noopRef.current;
    return apiCuadreCaja({ sucursal: sucursalId, fDesde: range.fDesde, fHasta: range.fHasta });
  });
  return q;
}

// ─── Por lotes ──────────────────────────────────────────────────────────────
// Master/detail: a list of cash-drawer lotes for the sucursal + range, and the
// condensed cuadre receipt for the selected lote. The condensed rows share the
// general cuadre's line shape, so the <Line> component is reused verbatim.

// The filter context (sucursal + range) is part of every cache key here, the
// same way the other date-filtered reports key on their full filter set. That
// guarantees switching sucursal or date preset refetches both the lotes list
// and the selected lote's condensed report instead of serving a stale cache.
function filterContextKey(sucursalId: number | null, range: { fDesde: string; fHasta: string }): string {
  return `${sucursalId ?? 'none'}:${range.fDesde}:${range.fHasta}`;
}

// Open drawers (ABIERTO) only exist right now, so they're only relevant when
// the selected range reaches today.
function rangeIncludesToday(range: { fHasta: string }): boolean {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hasta = new Date(range.fHasta);
  return !Number.isNaN(hasta.getTime()) && hasta.getTime() >= start.getTime();
}

function useLotes(ctx: string, sucursalId: number | null, range: { fDesde: string; fHasta: string }) {
  const key = sucursalId == null ? 'lotes:idle' : `lotes:${ctx}`;
  const noopRef = useRef<RptLote[]>([]);
  return useApi<RptLote[]>(key, async () => {
    if (sucursalId == null) return noopRef.current;
    const base = { sucursal: sucursalId, fDesde: range.fDesde, fHasta: range.fHasta };
    // The stored procedure returns a single status per call (no "all" mode).
    // For a range that reaches today we fetch abiertos + cerrados in parallel
    // and list abiertos first (live, still to be reconciled). For a fully-past
    // range there can be no abiertos, so one cerrados call is enough — and not
    // requesting abiertos is what keeps today's open drawers out of past dates.
    if (rangeIncludesToday(range)) {
      const [abiertos, cerrados] = await Promise.all([
        apiAnaliticaLotes({ ...base, status: LOTE_ESTATUS.ABIERTO }),
        apiAnaliticaLotes({ ...base, status: LOTE_ESTATUS.CERRADO })
      ]);
      return [...abiertos, ...cerrados];
    }
    return apiAnaliticaLotes({ ...base, status: LOTE_ESTATUS.CERRADO });
  });
}

function useLoteCondensado(ctx: string, lote: number | null) {
  const key = lote == null ? 'lote-condensado:idle' : `lote-condensado:${ctx}:${lote}`;
  const noopRef = useRef<RptLoteCondensadoLinea[]>([]);
  return useApi<RptLoteCondensadoLinea[]>(key, async () => {
    if (lote == null) return noopRef.current;
    return apiAnaliticaLoteCondensado(lote);
  });
}

// One fetch per lote. The SP requires an `orderBy`, but it returns the full
// product set and ignores the param (every orderBy comes back in the same
// order), so we fetch once and sort client-side in LoteProductosDetail. Keeping
// orderBy out of the key makes the sort pills instant — no refetch per toggle.
function useProductosPorLote(ctx: string, lote: number | null) {
  const key = lote == null ? 'productos-lote:idle' : `productos-lote:${ctx}:${lote}`;
  const noopRef = useRef<RptProductoPorLote[]>([]);
  return useApi<RptProductoPorLote[]>(key, async () => {
    if (lote == null) return noopRef.current;
    return apiAnaliticaProductosPorLote(lote, PRODUCTO_LOTE_ORDER.CODIGO);
  });
}

// Shared master/detail scaffold for the lote-scoped tabs (Por lotes, Productos):
// a lote picker list on the left and a per-lote detail on the right. Only the
// detail differs per tab, so it's injected via renderDetail; the fetch,
// selection and loading cues stay identical to keep the tabs in lockstep.
function LoteMasterDetail({
  sucursalId,
  range,
  sucursalNombre,
  renderDetail
}: {
  sucursalId: number | null;
  range: { fDesde: string; fHasta: string };
  sucursalNombre: string;
  renderDetail: (selectedLote: number, ctx: string) => ReactNode;
}) {
  const ctx = filterContextKey(sucursalId, range);
  const lotesQ = useLotes(ctx, sucursalId, range);
  const [selectedLote, setSelectedLote] = useState<number | null>(null);

  const lotes = lotesQ.status === 'success' ? lotesQ.data : null;

  // Clear the selection whenever the sucursal/date filter changes so the detail
  // never lingers on a lote from the previous context; the effect below then
  // re-selects from the freshly-fetched list.
  useEffect(() => {
    setSelectedLote(null);
  }, [ctx]);

  // Auto-select the first lote so its detail loads without an extra click.
  // Keep the current selection if it's still in the refreshed list.
  useEffect(() => {
    if (!lotes || lotes.length === 0) {
      setSelectedLote(null);
      return;
    }
    setSelectedLote(prev => (prev != null && lotes.some(l => l.nir === prev) ? prev : lotes[0].nir));
  }, [lotes]);

  // The list keeps showing the previous context's rows while revalidating, so
  // fall back to the loading skeleton until the new list resolves.
  const listLoading = lotesQ.status === 'loading' || (lotesQ.isValidating && selectedLote == null);
  // Once we're past the skeleton (rows on screen) a background refresh shows the
  // thin loading line instead, the same cue the General tab uses.
  const listRefreshing = lotesQ.isValidating && !listLoading;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="card overflow-hidden self-start">
        <div className="px-5 py-4 border-b border-surface-mid">
          <EyebrowLabel>Lotes</EyebrowLabel>
          <p className="mt-0.5 text-xs text-ink-variant">{sucursalNombre}</p>
        </div>
        <LoadingBar active={listRefreshing} className="rounded-none" />
        <div className="p-2 max-h-[32rem] overflow-y-auto zsb-scroll">
          {lotesQ.status === 'error' ? (
            lotesQ.errorVariant === 'session' ? null : <ErrorState variant={lotesQ.errorVariant!} message={lotesQ.error!} onRetry={lotesQ.reload} />
          ) : listLoading ? (
            <div className="p-3">
              <LoadingState />
            </div>
          ) : lotes && lotes.length > 0 ? (
            <ul className="space-y-1">
              {lotes.map(lote => (
                <li key={lote.nir}>
                  <LoteRow lote={lote} active={lote.nir === selectedLote} onSelect={() => setSelectedLote(lote.nir)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Sin lotes para el rango seleccionado." />
          )}
        </div>
      </div>

      <div>
        {listLoading && selectedLote == null ? (
          <LoadingState />
        ) : selectedLote == null ? (
          <EmptyState message="Selecciona un lote para ver el detalle." />
        ) : (
          renderDetail(selectedLote, ctx)
        )}
      </div>
    </div>
  );
}

function LotesTab(props: { sucursalId: number | null; range: { fDesde: string; fHasta: string }; sucursalNombre: string }) {
  return <LoteMasterDetail {...props} renderDetail={(lote, ctx) => <LoteCondensadoDetail lote={lote} ctx={ctx} sucursalNombre={props.sucursalNombre} />} />;
}

function ProductosTab(props: { sucursalId: number | null; range: { fDesde: string; fHasta: string }; sucursalNombre: string }) {
  return <LoteMasterDetail {...props} renderDetail={(lote, ctx) => <LoteProductosDetail lote={lote} ctx={ctx} sucursalNombre={props.sucursalNombre} />} />;
}

function LoteCondensadoDetail({ lote, ctx, sucursalNombre }: { lote: number; ctx: string; sucursalNombre: string }) {
  const condensadoQ = useLoteCondensado(ctx, lote);
  const refreshing = condensadoQ.isValidating && condensadoQ.status === 'success';
  return (
    <>
      <LoadingBar active={refreshing} className="mb-3" />
      {condensadoQ.status === 'loading' && <LoadingState />}
      {condensadoQ.status === 'error' &&
        (condensadoQ.errorVariant === 'session' ? null : <ErrorState variant={condensadoQ.errorVariant!} message={condensadoQ.error!} onRetry={condensadoQ.reload} />)}
      {condensadoQ.status === 'success' &&
        (condensadoQ.data && condensadoQ.data.length > 0 ? (
          <LoteReceipt lineas={condensadoQ.data} sucursalNombre={sucursalNombre} />
        ) : (
          <EmptyState message="Sin detalle para el lote seleccionado." />
        ))}
    </>
  );
}

// Ordering options exposed by the SP's `orderBy` param. Directions are fixed
// (código/nombre ascendente, vendido descendente).
const PRODUCTO_ORDER_OPTIONS: { id: ProductoLoteOrder; label: string }[] = [
  { id: PRODUCTO_LOTE_ORDER.CODIGO, label: 'Código' },
  { id: PRODUCTO_LOTE_ORDER.NOMBRE, label: 'Nombre' },
  { id: PRODUCTO_LOTE_ORDER.VENDIDO, label: 'Más vendidos' }
];

function LoteProductosDetail({ lote, ctx, sucursalNombre }: { lote: number; ctx: string; sucursalNombre: string }) {
  const [orderBy, setOrderBy] = useState<ProductoLoteOrder>(PRODUCTO_LOTE_ORDER.CODIGO);
  const productosQ = useProductosPorLote(ctx, lote);
  const refreshing = productosQ.isValidating && productosQ.status === 'success';
  const productos = productosQ.status === 'success' ? productosQ.data : null;
  const totalUnidades = useMemo(() => (productos ?? []).reduce((s, p) => s + (p.vendido ?? 0), 0), [productos]);

  // Sort client-side (copy first — never mutate the cached array). Directions
  // match the SP's contract: código/nombre ascendente, vendido descendente.
  const sorted = useMemo(() => {
    const copy = [...(productos ?? [])];
    switch (orderBy) {
      case PRODUCTO_LOTE_ORDER.NOMBRE:
        copy.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'));
        break;
      case PRODUCTO_LOTE_ORDER.VENDIDO:
        copy.sort((a, b) => (b.vendido ?? 0) - (a.vendido ?? 0));
        break;
      default:
        copy.sort((a, b) => (a.codigo ?? 0) - (b.codigo ?? 0));
    }
    return copy;
  }, [productos, orderBy]);

  return (
    <>
      <LoadingBar active={refreshing} className="mb-3" />
      {productosQ.status === 'loading' && <LoadingState />}
      {productosQ.status === 'error' &&
        (productosQ.errorVariant === 'session' ? null : <ErrorState variant={productosQ.errorVariant!} message={productosQ.error!} onRetry={productosQ.reload} />)}
      {productosQ.status === 'success' &&
        (productos && productos.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-mid flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="pill bg-primary/10 text-primary">
                    <Icon name="shopping_bag" size={11} className="mr-1" />
                    Productos
                  </span>
                  <span className="text-xs font-bold text-ink-variant">{sucursalNombre}</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-variant tabular-nums">
                  {fmtInt(productos.length)} producto{productos.length === 1 ? '' : 's'} · {fmtInt(totalUnidades)} unidades vendidas
                </p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
                {PRODUCTO_ORDER_OPTIONS.map(o => {
                  const active = o.id === orderBy;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrderBy(o.id)}
                      className={`shrink-0 pill text-xs ${active ? 'bg-primary text-white' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'}`}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto zsb-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low text-left">
                    <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Código</th>
                    <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Producto</th>
                    <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-mid">
                  {sorted.map((p, i) => (
                    <tr key={`${p.codigo}-${i}`} className="hover:bg-surface-low/60">
                      <td className="px-6 py-2.5 font-bold text-ink tabular-nums">{p.codigo ?? '—'}</td>
                      <td className="px-6 py-2.5 text-ink-variant">{p.nombre ?? '—'}</td>
                      <td className="px-6 py-2.5 text-right font-bold text-ink tabular-nums">{fmtInt(p.vendido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message="Sin productos para el lote seleccionado." />
        ))}
    </>
  );
}

function LoteStatusPill({ estatusNombre, estatus }: { estatusNombre: string | null; estatus: number | null }) {
  const abierto = estatus === 0 || (estatusNombre ?? '').toUpperCase() === 'ABIERTO';
  const label = estatusNombre ?? (abierto ? 'ABIERTO' : 'CERRADO');
  return <span className={`pill ${abierto ? 'bg-primary/10 text-primary' : 'bg-positive-bg text-positive-fg'}`}>{label}</span>;
}

function LoteRow({ lote, active, onSelect }: { lote: RptLote; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl px-3 py-3 transition ${active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-surface-low'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="receipt_long" size={15} className={active ? 'text-primary' : 'text-outline'} />
          <span className={`text-sm font-bold truncate ${active ? 'text-primary' : 'text-ink'}`}>#{lote.docNum ?? lote.nir}</span>
        </div>
        <LoteStatusPill estatusNombre={lote.estatusNombre} estatus={lote.estatus} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-variant truncate">{lote.usuarioNombre ?? '—'}</span>
        <span className="text-outline tabular-nums shrink-0">{fmtFechaHora(lote.fecha)}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-outline">
        <Icon name="monetization_on" size={12} />
        <span>Caja inicial</span>
        <span className="font-semibold text-ink-variant tabular-nums">{fmtMoney(lote.cajaInicial)}</span>
      </div>
    </button>
  );
}

function LoteReceipt({ lineas, sucursalNombre }: { lineas: RptLoteCondensadoLinea[]; sucursalNombre: string }) {
  const meta = lineas[0];

  const totalVenta = useMemo(() => {
    const l = lineas.find(x => (x.descripcion ?? '').trim().toUpperCase() === 'TOTAL DE VENTA');
    return l?.valor ?? null;
  }, [lineas]);

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-5 border-b border-surface-mid flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill bg-primary/10 text-primary">
              <Icon name="receipt_long" size={11} className="mr-1" />
              Lote #{meta.loteDocNum ?? meta.loteNir}
            </span>
            <LoteStatusPill estatusNombre={meta.loteEstatusNombre} estatus={meta.loteEstatus} />
            <span className="text-xs font-bold text-ink-variant">{sucursalNombre}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-variant">
            {meta.loteUsuarioNombre && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="person" size={13} className="text-outline" />
                {meta.loteUsuarioNombre}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="schedule" size={13} className="text-outline" />
              {fmtFechaHora(meta.loteFecha)}
            </span>
            {meta.ncf && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="label" size={13} className="text-outline" />
                NCF {meta.ncf}
              </span>
            )}
          </div>
        </div>
        {totalVenta != null && (
          <div className="text-right">
            <EyebrowLabel>Total Venta</EyebrowLabel>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-positive-fg tabular-nums">{fmtMoney(totalVenta)}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 sm:px-8">
        {lineas.map((l, i) => (
          <Line key={i} linea={loteLineaToCuadre(l)} />
        ))}

        <div className="mt-8 mb-2 flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center">
            <Icon name="receipt_long" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ink">Documento generado automáticamente</p>
            <p className="text-[11px] text-ink-variant">
              Zempac Analitika · {sucursalNombre} · {fmtFechaHora(meta.loteFecha)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// The condensed lote rows carry the same receipt-line fields as the general
// cuadre, so we map them onto RptCuadreCajaLinea to reuse <Line>.
function loteLineaToCuadre(l: RptLoteCondensadoLinea): RptCuadreCajaLinea {
  return {
    nir: l.nir,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    signo: l.signo,
    valor: l.valor,
    formato: l.formato,
    grupo: l.grupo,
    cajaInicial: l.cajaInicial,
    fechaImpresion: l.loteFecha
  };
}

// Date + time, es-HN, used for lote rows and the lote receipt header.
function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-HN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function Filters({
  sucursales,
  sucursalActual,
  sucursalOpen,
  setSucursalOpen,
  onSelectSucursal,
  sucursalLocked,
  preset,
  setPreset
}: {
  sucursales: Sucursal[];
  sucursalActual: Sucursal | undefined;
  sucursalOpen: boolean;
  setSucursalOpen: (v: boolean) => void;
  onSelectSucursal: (id: number) => void;
  sucursalLocked: boolean;
  preset: PresetId;
  setPreset: (p: PresetId) => void;
}) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
      {sucursalLocked ? (
        <LockedFilter icon="store" value={sucursalActual?.nombre ?? '—'} />
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setSucursalOpen(!sucursalOpen)}
            onBlur={() => setTimeout(() => setSucursalOpen(false), 120)}
            className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-lowest px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]">
            <Icon name="store" size={16} className="text-primary" />
            <span className="flex-1 text-left truncate">{sucursalActual?.nombre ?? 'Selecciona sucursal'}</span>
            <Icon name="expand_more" size={14} className="text-outline" />
          </button>
          {sucursalOpen && (
            <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-72 overflow-y-auto zsb-scroll">
              {sucursales.map(s => {
                const active = s.id === sucursalActual?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={() => onSelectSucursal(s.id)}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${active ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'}`}>
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

      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 lg:mx-0 lg:px-0">
        <Icon name="calendar_today" size={16} className="text-outline shrink-0 hidden sm:block" />
        {PRESETS.map(p => {
          const active = p.id === preset;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`shrink-0 pill text-xs ${active ? 'bg-primary text-white' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'}`}>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Receipt({ lineas, sucursalNombre }: { lineas: RptCuadreCajaLinea[]; sucursalNombre: string }) {
  const totalVenta = useMemo(() => {
    const l = lineas.find(x => (x.descripcion ?? '').trim().toUpperCase() === 'TOTAL DE VENTA');
    return l?.valor ?? null;
  }, [lineas]);

  const fechaImpresion = useMemo(() => {
    const iso = lineas.find(l => l.fechaImpresion)?.fechaImpresion;
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('es-HN', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(d);
  }, [lineas]);

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-5 border-b border-surface-mid flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill bg-primary/10 text-primary">
              <Icon name="point_of_sale" size={11} className="mr-1" />
              Cuadre de Caja
            </span>
            <span className="text-xs font-bold text-ink-variant">{sucursalNombre}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-variant">Impreso: {fechaImpresion}</p>
        </div>
        {totalVenta != null && (
          <div className="text-right">
            <EyebrowLabel>Total Venta</EyebrowLabel>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-positive-fg tabular-nums">{fmtMoney(totalVenta)}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 sm:px-8">
        {lineas.map((l, i) => (
          <Line key={i} linea={l} />
        ))}

        <div className="mt-8 mb-2 flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center">
            <Icon name="point_of_sale" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ink">Documento generado automáticamente</p>
            <p className="text-[11px] text-ink-variant">
              Zempac Analitika · {sucursalNombre} · {fechaImpresion}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ linea }: { linea: RptCuadreCajaLinea }) {
  if (cuadreIsDivider(linea)) {
    return <div className="my-2 border-t border-dashed border-surface-mid" />;
  }
  if (cuadreIsSpacer(linea)) {
    return <div className="h-3" />;
  }
  if (cuadreIsSectionHeader(linea)) {
    return <h3 className="mt-4 mb-2 text-[12px] font-extrabold uppercase tracking-eyebrow text-primary">{cuadreCleanDesc(linea)}</h3>;
  }

  const desc = cuadreCleanDesc(linea);
  const isSubItem = cuadreIsSubItem(linea);
  const upper = desc.toUpperCase();
  const isTotal = upper.includes('TOTAL') || upper.includes('DIFERENCIA') || upper === 'EFECTIVO EN CAJA';
  const isNegative = linea.signo === -1 && linea.valor != null && linea.valor !== 0;

  const value = linea.valor != null ? `${isNegative ? '-' : ''}${fmtMoney(Math.abs(linea.valor))}` : '';

  return (
    <div className={`flex items-baseline gap-3 py-1 ${isSubItem ? 'pl-5' : ''}`}>
      <span className={`flex-1 truncate ${isTotal ? 'text-sm font-extrabold text-ink uppercase tracking-wide' : 'text-sm font-semibold text-ink-variant'}`}>{desc}</span>
      {linea.cantidad != null && <span className="w-12 text-right text-[11px] font-semibold text-outline tabular-nums">{Math.trunc(linea.cantidad)}</span>}
      <span className={`w-28 text-right tabular-nums ${isTotal ? 'text-base font-extrabold text-ink' : isNegative ? 'text-sm font-bold text-tertiary' : 'text-sm font-bold text-ink'}`}>{value}</span>
    </div>
  );
}
