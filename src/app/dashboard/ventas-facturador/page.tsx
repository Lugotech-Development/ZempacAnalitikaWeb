'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/icon';

const FacturadorChart = dynamic(() => import('@/components/facturador-chart'), { ssr: false });
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { fmtMoney, toIsoEndOfDay, toIsoStartOfDay } from '@/lib/format';
import { apiSucursales, apiVentasFacturadorSucursal } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { RptVentaFacturador, Sucursal } from '@/lib/types';

type PresetId = 'mes' | '7d' | '30d' | 'ayer';
const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'mes', label: 'Este mes' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'ayer', label: 'Ayer' },
];

function computeRange(preset: PresetId): { desde: string; hasta: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (preset) {
    case 'mes':
      start.setDate(1);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      break;
    case 'ayer':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
  }
  return { desde: toIsoStartOfDay(start), hasta: toIsoEndOfDay(end) };
}

export default function VentasFacturadorPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null); // null = todas
  const [preset, setPreset] = useState<PresetId>('mes');
  const [sucursalOpen, setSucursalOpen] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);

  // Auto-select "Todas" on mount (sucursalId stays null)
  useEffect(() => {
    setChartExpanded(false);
  }, [sucursalId]);

  const range = useMemo(() => computeRange(preset), [preset]);

  const key = `ventas-facturador:${sucursalId ?? 'all'}:${range.desde}:${range.hasta}`;
  const q = useApi<RptVentaFacturador[]>(key, () =>
    apiVentasFacturadorSucursal({
      desde: range.desde,
      hasta: range.hasta,
      sucursalId: sucursalId ?? undefined,
    })
  );

  const grandTotal = useMemo(
    () => (q.data ?? []).reduce((s, r) => s + (r.totalVenta ?? 0), 0),
    [q.data]
  );

  const chartData = useMemo(() => {
    if (!q.data) return [];
    const sorted = [...q.data].sort((a, b) => (b.totalVenta ?? 0) - (a.totalVenta ?? 0));
    const slice = (sucursalId != null && chartExpanded) ? sorted : sorted.slice(0, 10);
    return slice.map(r => ({ name: r.facturador ?? '—', total: r.totalVenta ?? 0 }));
  }, [q.data, sucursalId, chartExpanded]);

  const chartHasMore = useMemo(() => {
    if (!q.data || sucursalId == null) return false;
    return q.data.length > 10;
  }, [q.data, sucursalId]);

  const sucursalActual: Sucursal | undefined = useMemo(
    () => sucursalesQ.data?.find(s => s.id === sucursalId),
    [sucursalesQ.data, sucursalId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Ventas por Facturador"
        subtitle="Ventas agrupadas por colaborador facturador"
        icon="badge"
        isRefreshing={q.isValidating && q.status === 'success'}
        onRefresh={q.reload}
      />

      {sucursalesQ.status === 'loading' && <LoadingState />}
      {sucursalesQ.status === 'error' && (
        <ErrorState variant={sucursalesQ.errorVariant} message={sucursalesQ.error} onRetry={sucursalesQ.reload} />
      )}

      {sucursalesQ.status === 'success' && (
        <>
          {/* Filters */}
          <div className="card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
            {/* Sucursal picker (includes "Todas") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSucursalOpen(!sucursalOpen)}
                onBlur={() => setTimeout(() => setSucursalOpen(false), 120)}
                className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-lowest px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]"
              >
                <Icon name="store" size={16} className="text-primary" />
                <span className="flex-1 text-left truncate">
                  {sucursalActual ? sucursalActual.nombre : 'Todas las sucursales'}
                </span>
                <Icon name="expand_more" size={14} className="text-outline" />
              </button>
              {sucursalOpen && (
                <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-72 overflow-y-auto zsb-scroll">
                  {/* "Todas" option */}
                  <li>
                    <button
                      type="button"
                      onMouseDown={() => { setSucursalId(null); setSucursalOpen(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${sucursalId == null ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'}`}
                    >
                      <Icon name="store" size={14} />
                      <span className="flex-1">Todas las sucursales</span>
                      {sucursalId == null && <Icon name="check" size={14} />}
                    </button>
                  </li>
                  {(sucursalesQ.data ?? []).map(s => {
                    const active = s.id === sucursalId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => { setSucursalId(s.id); setSucursalOpen(false); }}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${active ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'}`}
                        >
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

            {/* Preset pills */}
            <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    preset === p.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-low text-ink-soft hover:bg-surface-mid'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {q.status === 'loading' && <LoadingState />}
          {q.status === 'error' && <ErrorState variant={q.errorVariant!} message={q.error!} onRetry={q.reload} />}

          {q.status === 'success' && (
            <>
              {(!q.data || q.data.length === 0) ? (
                <EmptyState message="Sin datos para el período seleccionado." />
              ) : (
                <>
                {/* Ranking chart */}
                <div className="card p-4 sm:p-5 mb-4">
                  <p className="eyebrow text-primary mb-4">Ranking</p>
                  <FacturadorChart data={chartData} />
                  {chartHasMore && (
                    <button
                      type="button"
                      onClick={() => setChartExpanded(!chartExpanded)}
                      className="mt-3 flex items-center gap-1 mx-auto text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Icon name={chartExpanded ? 'expand_less' : 'expand_more'} size={16} />
                      <span>{chartExpanded ? 'Ver solo Top 10' : `Ver todos (${q.data!.length})`}</span>
                    </button>
                  )}
                </div>

                <div className="card overflow-hidden">
                  {/* Grand total */}
                  <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-surface-mid">
                    <span className="text-sm font-semibold text-ink-soft">Total del período</span>
                    <span className="text-base font-extrabold text-primary">{fmtMoney(grandTotal)}</span>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_72px_108px_56px] gap-2 px-4 py-2 text-[11px] font-bold tracking-wide text-outline uppercase border-b border-surface-mid">
                    <span>Facturador</span>
                    <span className="text-right">Facturas</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">%</span>
                  </div>

                  {/* Rows */}
                  {q.data.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_72px_108px_56px] gap-2 px-4 py-3 text-sm border-b border-surface-mid/50 last:border-0"
                    >
                      <div>
                        <p className="font-semibold text-ink">{row.facturador ?? '—'}</p>
                        {row.sucursal && (
                          <p className="text-[11px] text-outline">{row.sucursal}</p>
                        )}
                      </div>
                      <span className="text-right text-ink-soft self-center">
                        {row.cantidadFacturas ?? '—'}
                      </span>
                      <span className="text-right font-bold text-ink self-center">
                        {row.totalVenta != null ? fmtMoney(row.totalVenta) : '—'}
                      </span>
                      <span className={`text-right font-semibold self-center text-xs ${
                        i < 3 ? 'text-primary' : i >= q.data!.length - 3 ? 'text-tertiary' : 'text-primary/55'
                      }`}>
                        {grandTotal > 0 && row.totalVenta != null
                          ? `${((row.totalVenta / grandTotal) * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
