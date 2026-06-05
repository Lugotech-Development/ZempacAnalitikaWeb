'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { fmtMoney, toIsoEndOfDay, toIsoStartOfDay } from '@/lib/format';
import { apiCuadreCaja, apiSucursales } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cuadreCleanDesc, cuadreIsDivider, cuadreIsSectionHeader, cuadreIsSpacer, cuadreIsSubItem, type RptCuadreCajaLinea, type Sucursal } from '@/lib/types';

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

export default function CuadreCajaPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [preset, setPreset] = useState<PresetId>('hoy');
  const [sucursalOpen, setSucursalOpen] = useState(false);

  // Pick the first sucursal when the list arrives.
  useEffect(() => {
    if (sucursalId == null && sucursalesQ.status === 'success' && sucursalesQ.data && sucursalesQ.data.length > 0) {
      setSucursalId(sucursalesQ.data[0].id);
    }
  }, [sucursalesQ.status, sucursalesQ.data, sucursalId]);

  const range = useMemo(() => computeRange(preset), [preset]);

  const cuadreQ = useCuadre(sucursalId, range);

  const sucursalActual = sucursalesQ.data?.find(s => s.id === sucursalId);

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Cuadre de Caja"
        subtitle="Conciliación diaria por almacén"
        icon="point_of_sale"
        isRefreshing={cuadreQ.isValidating && cuadreQ.status === 'success'}
        onRefresh={cuadreQ.reload}
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
                preset={preset}
                setPreset={setPreset}
              />

              <div className="mt-4">
                {cuadreQ.status === 'loading' && <LoadingState />}
                {cuadreQ.status === 'error' &&
                  (cuadreQ.errorVariant === 'session'
                    ? null
                    : <ErrorState variant={cuadreQ.errorVariant!} message={cuadreQ.error!} onRetry={cuadreQ.reload} />)}
                {cuadreQ.status === 'success' &&
                  (cuadreQ.data && cuadreQ.data.length > 0 ? (
                    <Receipt lineas={cuadreQ.data} sucursalNombre={sucursalActual?.nombre ?? ''} />
                  ) : (
                    <EmptyState message="Sin movimientos para el rango seleccionado." />
                  ))}
              </div>
            </>
          )}
        </>
      )}
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

function Filters({
  sucursales,
  sucursalActual,
  sucursalOpen,
  setSucursalOpen,
  onSelectSucursal,
  preset,
  setPreset
}: {
  sucursales: Sucursal[];
  sucursalActual: Sucursal | undefined;
  sucursalOpen: boolean;
  setSucursalOpen: (v: boolean) => void;
  onSelectSucursal: (id: number) => void;
  preset: PresetId;
  setPreset: (p: PresetId) => void;
}) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
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
