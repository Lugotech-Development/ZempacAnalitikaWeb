'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel, ExcelExportButton } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDate, fmtDayMonth, fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiVentas } from '@/lib/api';
import { useExcelExport } from '@/lib/use-excel-export';
import { useApi } from '@/lib/use-api';
import { groupVentasBySucursal, type RptVenta, type VentaSucursalSummary } from '@/lib/types';
import type { IconName } from '@/components/icon';

const VentasChart = dynamic(() => import('@/components/series-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-56" />
});

const DistributionChart = dynamic(() => import('@/components/distribution-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-40" />
});

export default function VentasPage() {
  const searchParams = useSearchParams();
  const sucursalParam = searchParams.get('sucursal');
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:ventas', apiVentas);

  if (sucursalParam) {
    return (
      <>
        <Link href="/dashboard/ventas" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
          <Icon name="arrow_back" size={16} />
          Ventas
        </Link>
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
        {status === 'success' && <DetailView ventas={data ?? []} sucursalId={Number(sucursalParam)} />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Ventas"
        title="Últimos 30 Días"
        subtitle="Resumen, ventas diarias y desglose por sucursal"
        icon="show_chart"
        isRefreshing={isValidating && status === 'success'}
        onRefresh={reload}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && (data && data.length > 0 ? <ListView ventas={data} /> : <EmptyState message="No hay ventas para mostrar en el periodo." />)}
    </>
  );
}

// ─── List View ──────────────────────────────────────────────────────────────

function ListView({ ventas }: { ventas: RptVenta[] }) {
  // One entry per calendar day, company-wide. Feeds both the chart and the
  // per-day figures on the Total Vendido card.
  const daily = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const v of ventas) {
      if (!v.fecha) continue;
      byDate.set(v.fecha, (byDate.get(v.fecha) ?? 0) + (v.totalVendido ?? 0));
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [ventas]);

  const chartData = useMemo(() => daily.map(([fecha, total]) => ({ fecha: fmtDayMonth(fecha), total })), [daily]);

  const summaries = useMemo(() => groupVentasBySucursal(ventas), [ventas]);

  const totals = useMemo(() => {
    const totalVendido = ventas.reduce((s, v) => s + (v.totalVendido ?? 0), 0);
    const totalFacturas = ventas.reduce((s, v) => s + (v.cantidadFacturas ?? 0), 0);
    const ticketPromedio = totalFacturas > 0 ? totalVendido / totalFacturas : 0;
    const totalDescuento = ventas.reduce((s, v) => s + (v.montoDescuento ?? 0), 0);
    const promedioDiario = daily.length > 0 ? totalVendido / daily.length : 0;
    const mejorDia = daily.reduce<[string, number] | null>((best, cur) => (best == null || cur[1] > best[1] ? cur : best), null);
    const rango = daily.length > 0 ? `${fmtDayMonth(daily[0][0])} – ${fmtDate(daily[daily.length - 1][0])} · ${daily.length} días` : null;
    return { totalVendido, totalFacturas, ticketPromedio, totalDescuento, promedioDiario, mejorDia, rango };
  }, [ventas, daily]);

  // Per-sucursal snapshots, so the company total is the sum of the branch figures
  // the cards below show — the two can never disagree.
  const inventario = useMemo(() => {
    const monto = summaries.reduce((s, x) => s + (x.montoInventario ?? 0), 0);
    const costo = summaries.reduce((s, x) => s + (x.montoCostoInventario ?? 0), 0);
    const has = summaries.some(x => x.montoInventario != null || x.montoCostoInventario != null);
    return { monto, costo, has };
  }, [summaries]);

  const xls = useExcelExport();

  return (
    <>
      <div className={inventario.has ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : undefined}>
        <SummaryTile label="Total Vendido" value={fmtMoney(totals.totalVendido)} icon="show_chart" color="positive" caption={totals.rango}>
          <Row label="Promedio diario" value={fmtMoney(totals.promedioDiario)} />
          {totals.mejorDia && <Row label={`Mejor día (${fmtDayMonth(totals.mejorDia[0])})`} value={fmtMoney(totals.mejorDia[1])} />}
          <Row label="Descuentos" value={fmtMoney(totals.totalDescuento)} />
        </SummaryTile>
        {inventario.has && <InventarioTile monto={inventario.monto} costo={inventario.costo} caption="Monto en todas las sucursales" />}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Facturas" value={fmtInt(totals.totalFacturas)} icon="receipt_long" color="primary-container" />
        <SummaryTile label="Ticket Promedio" value={fmtMoney(totals.ticketPromedio)} icon="sell" color="secondary" />
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 card p-6">
          <EyebrowLabel>Ventas Diarias</EyebrowLabel>
          <div className="mt-4">
            <VentasChart data={chartData} tone="primary" gradientId="ventasArea" />
          </div>
        </div>
      )}

      {summaries.length > 0 && <DistributionSection summaries={summaries} />}

      <div className="mt-6 flex items-center justify-between gap-3">
        <EyebrowLabel>Por Sucursal</EyebrowLabel>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-variant">
            {summaries.length} sucursal{summaries.length === 1 ? '' : 'es'}
          </span>
          {summaries.length > 0 && <ExcelExportButton onClick={() => void xls.run('ventas-30')} busy={xls.busy} label="" />}
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {summaries.map(s => (
          <SucursalCard key={s.sucursal} s={s} />
        ))}
      </div>
    </>
  );
}

/** Inventory snapshot — company-wide in the list, per-branch in the detail view.
 *  Shares SummaryTile so it pairs with "Total Vendido" on the same row. */
function InventarioTile({ monto, costo, caption }: { monto: number; costo: number; caption: string }) {
  const margen = monto - costo;
  const porcMargen = monto > 0 ? (margen / monto) * 100 : 0;
  return (
    <SummaryTile label="Inventario Actual" value={fmtMoney(monto)} icon="inventory_2" color="primary" caption={caption}>
      <Row label="Costo inventario" value={fmtMoney(costo)} />
      {monto > 0 && (
        <>
          <Row label="Margen potencial" value={fmtPercent(porcMargen)} />
          <div className="h-1.5 rounded-pill bg-surface-mid overflow-hidden">
            <div className="h-full bg-cta-gradient" style={{ width: `${Math.max(0, Math.min(porcMargen, 100))}%` }} />
          </div>
          <p className="text-[11px] text-ink-variant tabular-nums break-words">{fmtMoney(margen)} — monto menos costo</p>
        </>
      )}
    </SummaryTile>
  );
}

const DISTRIBUTION_LIMIT = 10;

function DistributionSection({ summaries }: { summaries: VentaSucursalSummary[] }) {
  const [showAll, setShowAll] = useState(false);
  const totalAmount = useMemo(() => summaries.reduce((s, v) => s + v.totalVendido, 0), [summaries]);
  const allData = useMemo(() => summaries.map(s => ({ name: s.almacenNombre || `Sucursal ${s.sucursal}`, value: s.porcentajeRelativo, amount: s.totalVendido })), [summaries]);
  const hasMore = allData.length > DISTRIBUTION_LIMIT;

  return (
    <div className="mt-6 card p-6">
      <EyebrowLabel>Distribución de Ventas</EyebrowLabel>
      <p className="mt-1 text-xs text-ink-variant">Participación de cada sucursal en el total de ventas</p>
      <div className="mt-4">
        <DistributionChart data={allData} totalAmount={totalAmount} maxVisible={showAll ? undefined : DISTRIBUTION_LIMIT}>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition py-2">
              <Icon name={showAll ? 'expand_less' : 'expand_more'} size={18} />
              {showAll ? 'Ver menos' : `Ver todas (${allData.length})`}
            </button>
          )}
        </DistributionChart>
      </div>
    </div>
  );
}

function SucursalCard({ s }: { s: VentaSucursalSummary }) {
  return (
    <Link href={`/dashboard/ventas?sucursal=${s.sucursal}`} className="block card-bordered p-5 sm:p-6 transition hover:border-primary/30 hover:shadow-cta/10">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-ink truncate">{s.almacenNombre || `Sucursal ${s.sucursal}`}</p>
          <p className="text-xs text-ink-variant mt-0.5">
            Sucursal {s.sucursal} · {s.dailyItems.length} día
            {s.dailyItems.length === 1 ? '' : 's'}
          </p>
        </div>
        <Icon name="arrow_forward" size={18} className="text-outline mt-1" />
      </div>
      <div className="mt-4 border-t border-surface-mid pt-4 space-y-2.5">
        <Row label="Total Vendido" value={fmtMoney(s.totalVendido)} />
        <Row label="Ticket Promedio" value={fmtMoney(s.ticketPromedio)} />
        <Row label="Total Costo" value={fmtMoney(s.totalCosto)} />
        <Row label="Margen Estimado" value={fmtPercent(s.porcMargenEstimado)} />
        <Row label="Porcentaje Relativo" value={fmtPercent(s.porcentajeRelativo)} />
        <Row label="Facturas" value={fmtInt(s.cantidadFacturas)} />
        {s.montoInventario != null && <Row label="Monto Inventario" value={fmtMoney(s.montoInventario)} />}
        {s.montoCostoInventario != null && <Row label="Costo Inventario" value={fmtMoney(s.montoCostoInventario)} />}
      </div>
    </Link>
  );
}

// ─── Detail View ────────────────────────────────────────────────────────────

function DetailView({ ventas, sucursalId }: { ventas: RptVenta[]; sucursalId: number }) {
  const summary = useMemo(() => groupVentasBySucursal(ventas).find(s => s.sucursal === sucursalId), [ventas, sucursalId]);
  if (!summary) {
    return <EmptyState message="No se encontró información para esta sucursal en el periodo." />;
  }
  return <DetailContent s={summary} />;
}

function DetailContent({ s }: { s: VentaSucursalSummary }) {
  const [expanded, setExpanded] = useState(false);

  const { fechaMin, fechaMax } = useMemo(() => dateRange(s.dailyItems.map(i => i.fecha)), [s.dailyItems]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const v of s.dailyItems) {
      if (!v.fecha) continue;
      byDate.set(v.fecha, (byDate.get(v.fecha) ?? 0) + (v.totalVendido ?? 0));
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha: fmtDayMonth(fecha), total }));
  }, [s.dailyItems]);

  const sortedDaily = useMemo(() => [...s.dailyItems].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')), [s.dailyItems]);

  const rangeStr = `${fmtDayMonth(fechaMin)} – ${fmtDate(fechaMax)}`;
  const hasInventario = s.montoInventario != null || s.montoCostoInventario != null;

  const perDia = useMemo(() => {
    const promedio = s.dailyItems.length > 0 ? s.totalVendido / s.dailyItems.length : 0;
    const mejor = s.dailyItems.reduce<RptVenta | null>((best, cur) => (best == null || (cur.totalVendido ?? 0) > (best.totalVendido ?? 0) ? cur : best), null);
    return { promedio, mejor };
  }, [s.dailyItems, s.totalVendido]);

  const xls = useExcelExport();
  const handleExport = () => {
    void xls.run('ventas-30', { sucursalId: s.sucursal });
  };

  return (
    <>
      <h1 className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-ink">{s.almacenNombre || `Sucursal ${s.sucursal}`}</h1>
      <p className="mt-1 text-sm text-ink-variant">Sucursal {s.sucursal}</p>
      <span className="mt-2 inline-block pill bg-primary/[0.08] text-primary text-[12px]">{rangeStr}</span>

      <div className={`mt-6${hasInventario ? ' grid grid-cols-1 lg:grid-cols-2 gap-3' : ''}`}>
        <SummaryTile label="Total Vendido" value={fmtMoney(s.totalVendido)} icon="trending_up" color="positive" caption={hasInventario ? `${s.dailyItems.length} día${s.dailyItems.length === 1 ? '' : 's'} con ventas` : null}>
          {hasInventario ? (
            <>
              <Row label="Promedio diario" value={fmtMoney(perDia.promedio)} />
              {perDia.mejor && <Row label={`Mejor día (${fmtDayMonth(perDia.mejor.fecha)})`} value={fmtMoney(perDia.mejor.totalVendido ?? 0)} />}
            </>
          ) : null}
        </SummaryTile>
        {hasInventario && <InventarioTile monto={s.montoInventario ?? 0} costo={s.montoCostoInventario ?? 0} caption={`Monto en ${s.almacenNombre || `sucursal ${s.sucursal}`}`} />}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Facturas" value={fmtInt(s.cantidadFacturas)} icon="receipt_long" color="primary-container" />
        <SummaryTile label="Ticket Promedio" value={fmtMoney(s.ticketPromedio)} icon="sell" color="secondary" />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Subtotal" value={fmtMoney(s.subTotal)} icon="summarize" color="outline" />
        <SummaryTile label="Descuento" value={fmtMoney(s.montoDescuento)} icon="discount" color="tertiary" />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Impuesto" value={fmtMoney(s.montoImpuesto)} icon="account_balance" color="secondary" />
        <SummaryTile label="Total Costo" value={fmtMoney(s.totalCosto)} icon="monetization_on" color="tertiary" />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Margen Estimado" value={fmtPercent(s.porcMargenEstimado)} icon="percent" color="primary" />
        <SummaryTile label="Porcentaje Relativo" value={fmtPercent(s.porcentajeRelativo)} icon="pie_chart" color="secondary" />
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 card p-6">
          <EyebrowLabel>Ventas Diarias</EyebrowLabel>
          <div className="mt-4">
            <VentasChart data={chartData} tone="primary" gradientId="ventasDetailArea" />
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setExpanded(v => !v)} className="flex-1 card flex items-center px-4 py-3.5 text-left">
            <EyebrowLabel>Detalle Diario</EyebrowLabel>
            <span className="ml-2 text-xs text-ink-variant">{sortedDaily.length} registros</span>
            <span className="ml-auto">
              <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-ink-variant" />
            </span>
          </button>
          {sortedDaily.length > 0 && <ExcelExportButton onClick={handleExport} busy={xls.busy} label="" />}
        </div>
        {expanded && (
          <div className="mt-3 space-y-3">
            {sortedDaily.map((item, idx) => (
              <DailyVentaCard key={`${item.fecha}-${idx}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DailyVentaCard({ item }: { item: RptVenta }) {
  return (
    <div className="card-bordered p-5">
      <p className="text-[15px] font-extrabold text-ink">{fmtDate(item.fecha)}</p>
      <div className="mt-4 border-t border-surface-mid pt-4 space-y-2.5">
        <Row label="Total Vendido" value={fmtMoney(item.totalVendido ?? 0)} />
        <Row label="Ticket Promedio" value={fmtMoney(item.ticketPromedio ?? 0)} />
        <Row label="Total Costo" value={fmtMoney(item.totalCosto ?? 0)} />
        <Row label="Margen Estimado" value={fmtPercent(item.porcMargenEstimado ?? 0)} />
        <Row label="Porcentaje Relativo" value={fmtPercent(item.porcentajeRelativo ?? 0)} />
        <Row label="Facturas" value={fmtInt(item.cantidadFacturas ?? 0)} />
      </div>
    </div>
  );
}

// ─── Shared UI ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-outline">{label}</span>
      <span className="text-[15px] font-extrabold text-ink">{value}</span>
    </div>
  );
}

type TileColor = 'primary' | 'primary-container' | 'secondary' | 'tertiary' | 'outline' | 'positive';
/** `caption` and `children` are optional: without them this is the plain metric
 *  tile, with them it grows a supporting block of `Row`s under a divider. */
function SummaryTile({
  label,
  value,
  icon,
  color,
  caption,
  children
}: {
  label: string;
  value: string;
  icon: IconName;
  color: TileColor;
  caption?: string | null;
  children?: ReactNode;
}) {
  const tone =
    color === 'tertiary'
      ? 'bg-tertiary/10 text-tertiary'
      : color === 'secondary'
        ? 'bg-secondary/10 text-secondary'
        : color === 'primary-container'
          ? 'bg-primary-container/10 text-primary-container'
          : color === 'outline'
            ? 'bg-outline/10 text-ink-variant'
            : color === 'positive'
              ? 'bg-positive-bg text-positive-fg'
              : 'bg-primary/10 text-primary';
  return (
    <div className="card p-5">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon name={icon} size={18} />
      </div>
      <EyebrowLabel className="mt-3">{label}</EyebrowLabel>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums break-words">{value}</p>
      {caption && <p className="mt-0.5 text-[11px] text-ink-variant tabular-nums">{caption}</p>}
      {children && <div className="mt-4 border-t border-surface-mid pt-4 space-y-2.5">{children}</div>}
    </div>
  );
}

function dateRange(fechas: Array<string | null>): { fechaMin: string | null; fechaMax: string | null } {
  const sorted = fechas.filter((f): f is string => !!f).sort();
  if (sorted.length === 0) return { fechaMin: null, fechaMax: null };
  return { fechaMin: sorted[0], fechaMax: sorted[sorted.length - 1] };
}
