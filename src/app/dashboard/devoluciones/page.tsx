'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, SkeletonBox } from '@/components/states';
import { fmtDayMonth, fmtInt, fmtMoney } from '@/lib/format';
import { apiDevoluciones } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { groupDevolucionesBySucursal, type DevolucionSucursalSummary, type RptDevolucion } from '@/lib/types';

const DevolucionesChart = dynamic(() => import('@/components/series-chart'), {
  ssr: false,
  loading: () => <SkeletonBox className="h-56" />
});

export default function DevolucionesPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:devoluciones', apiDevoluciones);

  return (
    <>
      <PageHeader eyebrow="Devoluciones" title="Últimos 30 Días" subtitle="Resumen, devoluciones diarias y desglose por sucursal" icon="keyboard_return" isRefreshing={isValidating && status === 'success'} />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && (data && data.length > 0 ? <Content devoluciones={data} /> : <EmptyState message="No hay devoluciones para mostrar en el periodo." />)}
    </>
  );
}

function Content({ devoluciones }: { devoluciones: RptDevolucion[] }) {
  const totals = useMemo(() => {
    const totalDevuelto = devoluciones.reduce((s, d) => s + (d.totalDevuelto ?? 0), 0);
    const totalCantidad = devoluciones.reduce((s, d) => s + (d.cantidadDevoluciones ?? 0), 0);
    return { totalDevuelto, totalCantidad };
  }, [devoluciones]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const d of devoluciones) {
      if (!d.fecha) continue;
      byDate.set(d.fecha, (byDate.get(d.fecha) ?? 0) + (d.totalDevuelto ?? 0));
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha: fmtDayMonth(fecha), total }));
  }, [devoluciones]);

  const summaries = useMemo(() => groupDevolucionesBySucursal(devoluciones), [devoluciones]);

  return (
    <>
      <SummaryTile label="Total Devuelto" value={fmtMoney(totals.totalDevuelto)} icon="receipt_long" color="tertiary" />
      <div className="mt-3">
        <SummaryTile label="Devoluciones" value={fmtInt(totals.totalCantidad)} icon="keyboard_return" color="primary" />
      </div>

      {chartData.length > 0 && (
        <div className="mt-6 card p-6">
          <EyebrowLabel>Devoluciones Diarias</EyebrowLabel>
          <div className="mt-4">
            <DevolucionesChart data={chartData} tone="tertiary" tooltipLabel="Devuelto" gradientId="devArea" />
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

function SucursalCard({ s }: { s: DevolucionSucursalSummary }) {
  return (
    <Link
      href={`/dashboard/devoluciones/${s.sucursal}`}
      className="block card-bordered p-5 sm:p-6 transition hover:border-tertiary/30 hover:shadow-cta/10">
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
      {s.motivos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.motivos.slice(0, 4).map(m => (
            <span key={m} className="pill text-[10px] bg-tertiary/10 text-tertiary">
              {m}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 border-t border-surface-mid pt-4 space-y-2.5">
        <Row label="Total Devuelto" value={fmtMoney(s.totalDevuelto)} />
        <Row label="Pendiente" value={fmtMoney(s.totalNC)} />
        <Row label="Crédito" value={fmtMoney(s.totalCredito)} />
        <Row label="Cantidad" value={fmtInt(s.cantidadDevoluciones)} />
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

function SummaryTile({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: 'primary' | 'tertiary' }) {
  const tone = color === 'tertiary' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary';
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
