'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDate, fmtDayMonth, fmtInt, fmtMoney } from '@/lib/format';
import { apiDevoluciones } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { groupDevolucionesBySucursal, type DevolucionSucursalSummary, type RptDevolucion } from '@/lib/types';

const DevolucionesChart = dynamic(() => import('@/components/series-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-56" />
});

export default function DevolucionesSucursalDetail() {
  const params = useParams<{ sucursal: string }>();
  const sucursalId = Number(params?.sucursal);
  const { status, data, error, errorVariant, reload } = useApi('rpt:devoluciones', apiDevoluciones);

  return (
    <>
      <Link
        href="/dashboard/devoluciones"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
        <Icon name="arrow_back" size={16} />
        Devoluciones
      </Link>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && <Resolved devoluciones={data ?? []} sucursalId={sucursalId} />}
    </>
  );
}

function Resolved({ devoluciones, sucursalId }: { devoluciones: RptDevolucion[]; sucursalId: number }) {
  const summary = useMemo(() => groupDevolucionesBySucursal(devoluciones).find(s => s.sucursal === sucursalId), [devoluciones, sucursalId]);
  if (!summary) {
    return <EmptyState message="No se encontró información para esta sucursal en el periodo." />;
  }
  return <Content s={summary} />;
}

function Content({ s }: { s: DevolucionSucursalSummary }) {
  const [expanded, setExpanded] = useState(false);

  const { fechaMin, fechaMax } = useMemo(() => dateRange(s.dailyItems.map(i => i.fecha)), [s.dailyItems]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const v of s.dailyItems) {
      if (!v.fecha) continue;
      byDate.set(v.fecha, (byDate.get(v.fecha) ?? 0) + (v.totalDevuelto ?? 0));
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
        <SummaryTile label="Total Devuelto" value={fmtMoney(s.totalDevuelto)} icon="receipt_long" color="tertiary" />
      </div>
      <div className="mt-3">
        <SummaryTile label="Devoluciones" value={fmtInt(s.cantidadDevoluciones)} icon="keyboard_return" color="primary" />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Pendiente" value={fmtMoney(s.totalNC)} icon="sticky_note" color="secondary" />
        <SummaryTile label="Crédito" value={fmtMoney(s.totalCredito)} icon="credit_card" color="primary-container" />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryTile label="Subtotal" value={fmtMoney(s.subTotalDevuelto)} icon="summarize" color="outline" />
        <SummaryTile label="Descuento" value={fmtMoney(s.descuentoDevuelto)} icon="discount" color="tertiary" />
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 card p-6">
          <EyebrowLabel>Devoluciones Diarias</EyebrowLabel>
          <div className="mt-4">
            <DevolucionesChart data={chartData} tone="tertiary" tooltipLabel="Devuelto" gradientId="devDetailArea" />
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-full card flex items-center px-4 py-3.5 text-left">
          <EyebrowLabel>Detalle Diario</EyebrowLabel>
          <span className="ml-2 text-xs text-ink-variant">{sortedDaily.length} registros</span>
          <span className="ml-auto">
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-ink-variant" />
          </span>
        </button>
        {expanded && (
          <div className="mt-3 space-y-3">
            {sortedDaily.map((item, idx) => (
              <DailyDevolucionCard key={`${item.fecha}-${idx}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DailyDevolucionCard({ item }: { item: RptDevolucion }) {
  return (
    <div className="card-bordered p-5">
      <p className="text-[15px] font-extrabold text-ink">{fmtDate(item.fecha)}</p>
      <div className="mt-4 border-t border-surface-mid pt-4 space-y-2.5">
        <Row label="Total Devuelto" value={fmtMoney(item.totalDevuelto ?? 0)} />
        <Row label="Pendiente" value={fmtMoney(item.totalNC ?? 0)} />
        <Row label="Crédito" value={fmtMoney(item.totalCredito ?? 0)} />
        <Row label="Cantidad" value={fmtInt(item.cantidadDevoluciones ?? 0)} />
      </div>
      {item.motivo && (
        <div className="mt-4 border-t border-surface-mid pt-4">
          <span className="pill bg-tertiary/10 text-tertiary text-[11px]">{item.motivo}</span>
        </div>
      )}
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

type TileColor = 'primary' | 'primary-container' | 'secondary' | 'tertiary' | 'outline';
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
