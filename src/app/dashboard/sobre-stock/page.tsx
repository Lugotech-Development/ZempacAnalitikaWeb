'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { EyebrowLabel, ExcelExportButton, LockedFilter } from '@/components/common';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtInt } from '@/lib/format';
import { apiSobreStockProductos, apiSucursales } from '@/lib/api';
import { useExcelExport } from '@/lib/use-excel-export';
import { forcedNumber } from '@/lib/permissions';
import { useApi } from '@/lib/use-api';
import { derivarFila } from '@/lib/sobre-stock';
import type { RptSobreStockProducto } from '@/lib/types';

// Ventana de historial que alimenta el PromedioDiario (`diasAnalisis`).
const VENTANAS = [30, 90, 180];
const VENTANA_DEF = 90;
// Días de inventario a partir de los cuales el SP marca SOBRE STOCK.
const UMBRALES = [30, 45, 60, 90];
const UMBRAL_DEF = 45;
// Cuántos productos devuelve el SP (`topN`).
const TOPS = [10, 20, 50, 100];
const TOP_DEF = 20;

export default function SobreStockPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null); // null = todas
  const [sucursalOpen, setSucursalOpen] = useState(false);
  const [dias, setDias] = useState(VENTANA_DEF);
  const [umbral, setUmbral] = useState(UMBRAL_DEF);
  const [top, setTop] = useState(TOP_DEF);
  const xls = useExcelExport();

  // If the profile fixes the sucursal (parametrosSP), it wins over the picker —
  // derived rather than pushed into state so there's no effect to keep in sync.
  const forcedSucursal = forcedNumber('sobre-stock-productos', ['sucursalId', 'sucursal', 'idSucursal']);
  const efectivaSucursal = forcedSucursal ?? sucursalId;

  // Cada filtro entra en la key: cambiar cualquiera fuerza LoadingState, nunca
  // LoadingBar (que queda para revalidación en foco/visibilidad de la misma key).
  const key = `rpt:sobre-stock:${efectivaSucursal ?? 'todas'}:${dias}:${umbral}:${top}`;
  const q = useApi<RptSobreStockProducto[]>(key, () =>
    apiSobreStockProductos({
      diasAnalisis: dias,
      topN: top,
      umbralDiasSobreStock: umbral,
      sucursalId: efectivaSucursal ?? undefined
    })
  );

  const filas = useMemo(() => {
    const hoy = new Date();
    return (q.data ?? []).map(r => derivarFila(r, umbral, hoy));
  }, [q.data, umbral]);

  const sucursalActual = sucursalesQ.data?.find(s => s.id === efectivaSucursal);

  const handleExport = () =>
    void xls.run('sobre-stock-productos', {
      diasAnalisis: dias,
      top,
      umbralDiasSobreStock: umbral,
      sucursalId: efectivaSucursal ?? undefined
    });

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Sobre Stock"
        subtitle="Productos con exceso de inventario según su rotación"
        icon="inventory_2"
        isRefreshing={q.isValidating && q.status === 'success'}
        onRefresh={q.reload}
      />

      {/* Filtros */}
      <div className="card p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {forcedSucursal != null ? (
            <LockedFilter icon="store" value={sucursalActual?.nombre ?? '—'} />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSucursalOpen(!sucursalOpen)}
                onBlur={() => setTimeout(() => setSucursalOpen(false), 120)}
                className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-lowest px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]">
                <Icon name="store" size={16} className="text-primary" />
                <span className="flex-1 text-left truncate">{sucursalActual ? sucursalActual.nombre : 'Todas las sucursales'}</span>
                <Icon name="expand_more" size={14} className="text-outline" />
              </button>
              {sucursalOpen && (
                <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-72 overflow-y-auto zsb-scroll">
                  <li>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setSucursalId(null);
                        setSucursalOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${
                        sucursalId == null ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'
                      }`}>
                      <Icon name="store" size={14} />
                      <span className="flex-1 truncate">Todas las sucursales</span>
                      {sucursalId == null && <Icon name="check" size={14} />}
                    </button>
                  </li>
                  {(sucursalesQ.data ?? []).map(s => {
                    const active = s.id === sucursalId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            setSucursalId(s.id);
                            setSucursalOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left ${
                            active ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-surface-low'
                          }`}>
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

          {q.status === 'success' && filas.length > 0 && (
            <div className="sm:ml-auto">
              <ExcelExportButton onClick={handleExport} busy={xls.busy} label="" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <NumPills label="Ventana" values={VENTANAS} value={dias} onChange={setDias} format={v => `${v} d`} />
          <NumPills label="Umbral" values={UMBRALES} value={umbral} onChange={setUmbral} format={v => `${v} d`} />
          <NumPills label="Mostrar" values={TOPS} value={top} onChange={setTop} format={v => `Top ${v}`} />
        </div>
      </div>

      <LoadingBar active={q.isValidating && q.status === 'success'} className="mb-4" />
      {q.status === 'loading' && <LoadingState />}
      {q.status === 'error' && <ErrorState variant={q.errorVariant!} message={q.error!} onRetry={q.reload} />}
      {q.status === 'success' &&
        (filas.length === 0 ? (
          <EmptyState message="Sin productos con ventas en la ventana seleccionada." />
        ) : (
          <p className="text-sm text-ink-variant tabular-nums">{fmtInt(filas.length)} productos</p>
        ))}
    </>
  );
}

function NumPills({
  label,
  values,
  value,
  onChange,
  format
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="min-w-0">
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="mt-1.5 flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        {values.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              v === value ? 'bg-primary text-white' : 'bg-surface-low text-ink-variant hover:bg-surface-mid'
            }`}>
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
