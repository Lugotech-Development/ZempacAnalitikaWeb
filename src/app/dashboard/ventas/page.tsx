'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDate, fmtDayMonth, fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiVentas } from '@/lib/api';
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
  const totals = useMemo(() => {
    const totalVendido = ventas.reduce((s, v) => s + (v.totalVendido ?? 0), 0);
    const totalFacturas = ventas.reduce((s, v) => s + (v.cantidadFacturas ?? 0), 0);
    const ticketPromedio = totalFacturas > 0 ? totalVendido / totalFacturas : 0;
    return { totalVendido, totalFacturas, ticketPromedio };
  }, [ventas]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const v of ventas) {
      if (!v.fecha) continue;
      byDate.set(v.fecha, (byDate.get(v.fecha) ?? 0) + (v.totalVendido ?? 0));
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha: fmtDayMonth(fecha), total }));
  }, [ventas]);

  const summaries = useMemo(() => groupVentasBySucursal(ventas), [ventas]);

  return (
    <>
      <SummaryTile label="Total Vendido" value={fmtMoney(totals.totalVendido)} icon="show_chart" color="positive" />
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

      <div className="mt-6 flex items-end justify-between">
        <EyebrowLabel>Por Sucursal</EyebrowLabel>
        <span className="text-xs text-ink-variant">
          {summaries.length} sucursal{summaries.length === 1 ? '' : 'es'}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {summaries.map(s => (
          <SucursalCard key={s.sucursal} s={s} />
        ))}
      </div>
    </>
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

  return (
    <>
      <h1 className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-ink">{s.almacenNombre || `Sucursal ${s.sucursal}`}</h1>
      <p className="mt-1 text-sm text-ink-variant">Sucursal {s.sucursal}</p>
      <span className="mt-2 inline-block pill bg-primary/[0.08] text-primary text-[12px]">{rangeStr}</span>

      <div className="mt-6">
        <SummaryTile label="Total Vendido" value={fmtMoney(s.totalVendido)} icon="trending_up" color="positive" />
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
        <button type="button" onClick={() => setExpanded(v => !v)} className="w-full card flex items-center px-4 py-3.5 text-left">
          <EyebrowLabel>Detalle Diario</EyebrowLabel>
          <span className="ml-2 text-xs text-ink-variant">{sortedDaily.length} registros</span>
          <span className="ml-auto">
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-ink-variant" />
          </span>
        </button>
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
function SummaryTile({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: TileColor }) {
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
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function dateRange(fechas: Array<string | null>): { fechaMin: string | null; fechaMax: string | null } {
  const sorted = fechas.filter((f): f is string => !!f).sort();
  if (sorted.length === 0) return { fechaMin: null, fechaMax: null };
  return { fechaMin: sorted[0], fechaMax: sorted[sorted.length - 1] };
}
