'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDate, fmtDayMonth, fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiVentas } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { groupVentasBySucursal, type RptVenta, type VentaSucursalSummary } from '@/lib/types';

const VentasChart = dynamic(() => import('@/components/series-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-56" />
});

export default function VentasSucursalDetail() {
  const params = useParams<{ sucursal: string }>();
  const sucursalId = Number(params?.sucursal);
  const { status, data, error, errorVariant, reload } = useApi('rpt:ventas', apiVentas);

  return (
    <>
      <Link href="/dashboard/ventas" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
        <Icon name="arrow_back" size={16} />
        Ventas
      </Link>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && <Resolved ventas={data ?? []} sucursalId={sucursalId} />}
    </>
  );
}

function Resolved({ ventas, sucursalId }: { ventas: RptVenta[]; sucursalId: number }) {
  const summary = useMemo(() => groupVentasBySucursal(ventas).find(s => s.sucursal === sucursalId), [ventas, sucursalId]);
  if (!summary) {
    return <EmptyState message="No se encontró información para esta sucursal en el periodo." />;
  }
  return <Content s={summary} />;
}

function Content({ s }: { s: VentaSucursalSummary }) {
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
