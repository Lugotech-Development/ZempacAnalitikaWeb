'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
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

export default function DevolucionesPage() {
  const searchParams = useSearchParams();
  const sucursalParam = searchParams.get('sucursal');
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:devoluciones', apiDevoluciones);

  if (sucursalParam) {
    return (
      <>
        <Link href="/dashboard/devoluciones" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4">
          <Icon name="arrow_back" size={16} />
          Devoluciones
        </Link>
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
        {status === 'success' && <DetailView devoluciones={data ?? []} sucursalId={Number(sucursalParam)} />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Devoluciones"
        title="Últimos 30 Días"
        subtitle="Resumen, devoluciones diarias y desglose por sucursal"
        icon="keyboard_return"
        isRefreshing={isValidating && status === 'success'}
        onRefresh={reload}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && (data && data.length > 0 ? <ListView devoluciones={data} /> : <EmptyState message="No hay devoluciones para mostrar en el periodo." />)}
    </>
  );
}

// ─── List View ──────────────────────────────────────────────────────────────

function ListView({ devoluciones }: { devoluciones: RptDevolucion[] }) {
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
    <Link href={`/dashboard/devoluciones?sucursal=${s.sucursal}`} className="block card-bordered p-5 sm:p-6 transition hover:border-tertiary/30 hover:shadow-cta/10">
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

// ─── Detail View ────────────────────────────────────────────────────────────

function DetailView({ devoluciones, sucursalId }: { devoluciones: RptDevolucion[]; sucursalId: number }) {
  const summary = useMemo(() => groupDevolucionesBySucursal(devoluciones).find(s => s.sucursal === sucursalId), [devoluciones, sucursalId]);
  if (!summary) {
    return <EmptyState message="No se encontró información para esta sucursal en el periodo." />;
  }
  return <DetailContent s={summary} />;
}

function DetailContent({ s }: { s: DevolucionSucursalSummary }) {
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

// ─── Shared UI ──────────────────────────────────────────────────────────────

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
