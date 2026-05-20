'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDayMonth, fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiVentas } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { groupVentasBySucursal, type RptVenta, type VentaSucursalSummary } from '@/lib/types';
import type { IconName } from '@/components/icon';

const VentasChart = dynamic(() => import('@/components/series-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-56" />
});

export default function VentasPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:ventas', apiVentas);

  return (
    <>
      <PageHeader eyebrow="Ventas" title="Últimos 30 Días" subtitle="Resumen, ventas diarias y desglose por sucursal" icon="show_chart" isRefreshing={isValidating && status === 'success'} />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && (data && data.length > 0 ? <Content ventas={data} /> : <EmptyState message="No hay ventas para mostrar en el periodo." />)}
    </>
  );
}

function Content({ ventas }: { ventas: RptVenta[] }) {
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

function SucursalCard({ s }: { s: VentaSucursalSummary }) {
  return (
    <Link
      href={`/dashboard/ventas/${s.sucursal}`}
      className="block card-bordered p-5 sm:p-6 transition hover:border-primary/30 hover:shadow-cta/10">
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
        <Row label="Facturas" value={fmtInt(s.cantidadFacturas)} />
      </div>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-outline">{label}</span>
      <span className="text-[15px] font-extrabold text-ink">{value}</span>
    </div>
  );
}

function SummaryTile({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: 'primary' | 'primary-container' | 'secondary' | 'tertiary' | 'positive' }) {
  const tone =
    color === 'tertiary'
      ? 'bg-tertiary/10 text-tertiary'
      : color === 'secondary'
        ? 'bg-secondary/10 text-secondary'
        : color === 'primary-container'
          ? 'bg-primary-container/10 text-primary-container'
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
