'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { LockedFilter } from '@/components/common';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingBar, LoadingState } from '@/components/states';
import { fmtDecimal, fmtInt } from '@/lib/format';
import { apiProductosNegativos, apiSucursales } from '@/lib/api';
import { forcedNumber } from '@/lib/permissions';
import { useApi } from '@/lib/use-api';
import type { ProductosNegativosPage, Sucursal } from '@/lib/types';

// Fixed server page size — matches the porPagina the backend example uses.
const PER_PAGE = 20;

const EMPTY_PAGE: ProductosNegativosPage = { pagina: 1, porPagina: PER_PAGE, totalRegistros: 0, totalPaginas: 0, data: [] };

export default function ProductosNegativosPage() {
  const sucursalesQ = useApi('sucursales', apiSucursales);
  const [sucursalId, setSucursalId] = useState<number | null>(null); // required — auto-selected once sucursales load
  const [pagina, setPagina] = useState(1);
  const [sucursalOpen, setSucursalOpen] = useState(false);

  // If the profile fixes the sucursal (parametrosSP), lock the picker to it.
  const forcedSucursal = forcedNumber('analitica-productos-negativos', ['sucursal', 'sucursalId', 'idSucursal']);

  // Sucursal is mandatory (the SP rejects sucursal <= 0), so default to the
  // forced one, else the first one, as soon as the list arrives.
  useEffect(() => {
    if (sucursalId == null && sucursalesQ.data && sucursalesQ.data.length > 0) {
      setSucursalId(forcedSucursal ?? sucursalesQ.data[0].id);
    }
  }, [sucursalesQ.data, sucursalId, forcedSucursal]);

  const key = `rpt:productos-negativos:${sucursalId ?? 'none'}:${pagina}:${PER_PAGE}`;
  const q = useApi<ProductosNegativosPage>(key, () =>
    sucursalId == null ? Promise.resolve(EMPTY_PAGE) : apiProductosNegativos({ sucursal: sucursalId, pagina, porPagina: PER_PAGE })
  );

  const selectSucursal = (id: number) => {
    setSucursalId(id);
    setPagina(1); // a different sucursal is a different result set — back to page 1
    setSucursalOpen(false);
  };

  const sucursalActual: Sucursal | undefined = sucursalesQ.data?.find(s => s.id === sucursalId);
  const page = q.data;
  const totalPaginas = page?.totalPaginas ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Productos Negativos"
        subtitle="Productos con existencia negativa por sucursal"
        icon="warning"
        isRefreshing={q.isValidating && q.status === 'success'}
        onRefresh={q.reload}
      />

      {sucursalesQ.status === 'loading' && <LoadingState />}
      {sucursalesQ.status === 'error' && <ErrorState variant={sucursalesQ.errorVariant!} message={sucursalesQ.error!} onRetry={sucursalesQ.reload} />}

      {sucursalesQ.status === 'success' && (
        <>
          {/* Sucursal picker (required — no "Todas" option). Locked to the
              profile-assigned sucursal when forced by parametrosSP. */}
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            {forcedSucursal != null ? (
              <LockedFilter icon="store" value={sucursalActual?.nombre ?? '—'} />
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSucursalOpen(!sucursalOpen)}
                  onBlur={() => setTimeout(() => setSucursalOpen(false), 120)}
                  className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-lowest px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]"
                >
                  <Icon name="store" size={16} className="text-primary" />
                  <span className="flex-1 text-left truncate">{sucursalActual ? sucursalActual.nombre : 'Seleccionar sucursal'}</span>
                  <Icon name="expand_more" size={14} className="text-outline" />
                </button>
                {sucursalOpen && (
                  <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-72 overflow-y-auto zsb-scroll">
                    {(sucursalesQ.data ?? []).map(s => {
                      const active = s.id === sucursalId;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onMouseDown={() => selectSucursal(s.id)}
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
            )}

            {/* Total count for the selected sucursal */}
            {q.status === 'success' && (
              <div className="sm:ml-auto flex items-center gap-2 text-sm">
                <span className="text-ink-variant">Existencias negativas:</span>
                <span className="font-extrabold text-tertiary tabular-nums">{fmtInt(page?.totalRegistros ?? 0)}</span>
              </div>
            )}
          </div>

          <LoadingBar active={q.isValidating && q.status === 'success'} className="mb-4" />
          {q.status === 'loading' && <LoadingState />}
          {q.status === 'error' && <ErrorState variant={q.errorVariant!} message={q.error!} onRetry={q.reload} />}

          {q.status === 'success' &&
            (!page || page.data.length === 0 ? (
              <EmptyState message="Sin productos con existencia negativa en esta sucursal." />
            ) : (
              <div className="card overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[84px_1fr_72px_96px] gap-2 px-4 py-2 text-[11px] font-bold tracking-wide text-outline uppercase border-b border-surface-mid">
                  <span>Código</span>
                  <span>Producto</span>
                  <span className="text-center">Almacén</span>
                  <span className="text-right">Existencia</span>
                </div>

                {/* Rows */}
                {page.data.map((row, i) => (
                  <div key={i} className="grid grid-cols-[84px_1fr_72px_96px] gap-2 px-4 py-3 text-sm border-b border-surface-mid/50 last:border-0">
                    <span className="text-ink-variant tabular-nums self-center">{row.docNum ?? '—'}</span>
                    <span className="font-semibold text-ink truncate self-center" title={row.nombre ?? undefined}>
                      {row.nombre ?? '—'}
                    </span>
                    <span className="text-center text-ink-variant tabular-nums self-center">{row.almacen ?? '—'}</span>
                    <span className="text-right font-bold text-tertiary tabular-nums self-center">
                      {row.existencia != null ? fmtDecimal(row.existencia) : '—'}
                    </span>
                  </div>
                ))}

                {/* Pagination */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-low border-t border-surface-mid">
                    <button
                      type="button"
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina <= 1}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-primary bg-primary/[0.08] hover:bg-primary/[0.14] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Icon name="arrow_back" size={16} />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>
                    <span className="text-xs font-semibold text-ink-variant tabular-nums">
                      Página {pagina} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina(p => (totalPaginas ? Math.min(totalPaginas, p + 1) : p + 1))}
                      disabled={pagina >= totalPaginas}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-primary bg-primary/[0.08] hover:bg-primary/[0.14] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <Icon name="arrow_forward" size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </>
      )}
    </>
  );
}
