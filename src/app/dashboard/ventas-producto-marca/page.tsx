'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { fmtMoney, toIsoEndOfDay, toIsoStartOfDay } from '@/lib/format';
import { apiMarcas, apiVentasProductoMarca, classifyError, type ErrorVariant } from '@/lib/api';
import type { Marca, RptVentaProductoMarca } from '@/lib/types';
import * as XLSX from 'xlsx';

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

export default function VentasProductoMarcaPage() {
  const [preset, setPreset] = useState<PresetId>('mes');
  const range = useMemo(() => computeRange(preset), [preset]);

  // ── Marca autocomplete ────────────────────────────────────────────────────
  const [marcaId, setMarcaId] = useState<number | null>(null);
  const [marcaName, setMarcaName] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<Marca[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [sugFetching, setSugFetching] = useState(false);
  const [ready, setReady] = useState(false); // false until user picks a marca or Todas
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Report state (manual — no auto-fetch) ─────────────────────────────────
  const [reportData, setReportData] = useState<RptVentaProductoMarca[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRefreshing, setReportRefreshing] = useState(false);
  const [reportError, setReportError] = useState<{ message: string; variant: ErrorVariant } | null>(null);

  const fetchSuggestions = useCallback(async (nombre: string) => {
    setSugFetching(true);
    try {
      const results = await apiMarcas(nombre || undefined);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setSugFetching(false);
    }
  }, []);

  // Debounce: re-fetch 300 ms after the user stops typing
  useEffect(() => {
    if (!sugOpen || marcaId != null) return;
    const t = setTimeout(() => fetchSuggestions(inputVal), 300);
    return () => clearTimeout(t);
  }, [inputVal, sugOpen, marcaId, fetchSuggestions]);

  const handleFocus = () => {
    setSugOpen(true);
    fetchSuggestions(inputVal); // immediate fetch on focus
  };

  const handleSelect = (m: Marca) => {
    setMarcaId(m.id);
    setMarcaName(m.nombre);
    setInputVal('');
    setSugOpen(false);
    setSuggestions([]);
    setReady(true);
  };

  const handleClear = () => {
    setMarcaId(null);
    setMarcaName(null);
    setInputVal('');
    setSuggestions([]);
    setSugOpen(false);
    setReady(false);
    setReportData(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectAll = () => {
    setMarcaId(null);
    setMarcaName(null);
    setInputVal('');
    setSugOpen(false);
    setSuggestions([]);
    setReady(true);
  };
  // ──────────────────────────────────────────────────────────────────────────

  const loadReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setReportRefreshing(true);
    else { setReportLoading(true); setReportData(null); }
    setReportError(null);
    try {
      const data = await apiVentasProductoMarca({ desde: range.desde, hasta: range.hasta, marcaId: marcaId ?? undefined });
      setReportData(data);
    } catch (e) {
      setReportError(classifyError(e));
    } finally {
      setReportLoading(false);
      setReportRefreshing(false);
    }
  }, [range.desde, range.hasta, marcaId]);

  useEffect(() => {
    if (!ready) return;
    loadReport();
  }, [ready, loadReport]);

  const grouped = useMemo(() => {
    if (!reportData) return new Map<string, RptVentaProductoMarca[]>();
    const map = new Map<string, RptVentaProductoMarca[]>();
    for (const row of reportData) {
      const k = row.marca ?? 'Sin Marca';
      const arr = map.get(k) ?? [];
      arr.push(row);
      map.set(k, arr);
    }
    return map;
  }, [reportData]);

  const grandTotal = useMemo(
    () => (reportData ?? []).reduce((s, r) => s + (r.totalVenta ?? 0), 0),
    [reportData]
  );

  const handleExportExcel = useCallback(() => {
    if (!reportData || reportData.length === 0) return;
    const rows = reportData.map(r => ({
      Marca: r.marca ?? '',
      Sucursal: r.sucursal ?? '',
      Producto: r.producto ?? '',
      Cantidad: r.cantidad ?? 0,
      Total: r.totalVenta ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas por Marca');
    XLSX.writeFile(wb, 'ventas-por-marca.xlsx');
  }, [reportData]);

  return (
    <>
      <PageHeader
        eyebrow="Reporte"
        title="Ventas por Marca"
        subtitle="Productos vendidos agrupados por marca en el período"
        icon="sell"
        isRefreshing={reportRefreshing}
        onRefresh={() => loadReport(true)}
      />

      {/* Filters */}
      <div className="card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 mb-4">

        {/* Marca autocomplete */}
        <div className="relative min-w-[240px]">
          {ready && marcaId != null ? (
            /* Specific marca chip */
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-bold text-ink">
              <Icon name="sell" size={16} className="text-primary shrink-0" />
              <span className="flex-1 truncate">{marcaName}</span>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpiar selección"
                className="text-outline hover:text-ink transition-colors"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : ready && marcaId == null ? (
            /* Todas las marcas chip */
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-bold text-ink">
              <Icon name="sell" size={16} className="text-primary shrink-0" />
              <span className="flex-1 truncate">Todas las marcas</span>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpiar selección"
                className="text-outline hover:text-ink transition-colors"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            /* Not ready — input + Todas button */
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  {sugFetching
                    ? <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    : <Icon name="search" size={16} className="text-outline" />
                  }
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  placeholder="Buscar marca…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-surface-mid bg-surface-lowest pl-9 pr-4 py-2.5 text-sm font-medium text-ink placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
                  onChange={e => setInputVal(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={() => setTimeout(() => setSugOpen(false), 150)}
                />
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl border border-surface-mid hover:border-primary/40 hover:bg-primary/5 text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
              >
                <Icon name="sell" size={14} className="text-primary shrink-0" />
                <span>Todas las marcas</span>
              </button>
            </div>
          )}

          {/* Suggestions dropdown */}
          {sugOpen && marcaId == null && (
            <ul className="absolute left-0 right-0 mt-2 card-bordered p-1 z-20 max-h-64 overflow-y-auto zsb-scroll">
              {!sugFetching && suggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-outline text-center">Sin resultados</li>
              )}
              {suggestions.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(m)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-left text-ink hover:bg-surface-low"
                  >
                    <Icon name="sell" size={14} className="text-primary shrink-0" />
                    <span className="flex-1 truncate">{m.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preset pills + export */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 flex-1">
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

        {/* Export */}
        {ready && reportData && reportData.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-outline">Exportar:</span>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Icon name="download" size={14} />
              <span>Excel</span>
            </button>
          </div>
        )}
      </div>

      {!ready && <EmptyState message="Selecciona una marca específica o «Todas las marcas» para ver el reporte." />}
      {ready && reportLoading && <LoadingState />}
      {ready && reportError && (
        <ErrorState variant={reportError.variant} message={reportError.message} onRetry={() => loadReport()} />
      )}
      {ready && !reportLoading && !reportError && (
        <>
          {(!reportData || reportData.length === 0) ? (
            <EmptyState message="Sin datos para el período seleccionado." />
          ) : (
            <>
              {/* Grand total */}
              <div className="card p-4 mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-soft">Total del período</span>
                <span className="text-base font-extrabold text-primary">
                  {fmtMoney(grandTotal)}
                </span>
              </div>

              {/* Per-brand sections */}
              {[...grouped.entries()].map(([marca, rows]) => {
                const marcaTotal = rows.reduce((s, r) => s + (r.totalVenta ?? 0), 0);
                return (
                  <div key={marca} className="card mb-4 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-surface-mid">
                      <Icon name="sell" size={14} className="text-primary shrink-0" />
                      <span className="flex-1 text-sm font-bold text-ink truncate">{marca}</span>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">
                        {fmtMoney(marcaTotal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr_72px_96px] gap-2 px-4 py-2 text-[11px] font-bold tracking-wide text-outline uppercase border-b border-surface-mid">
                      <span>Sucursal</span>
                      <span>Producto</span>
                      <span className="text-right">Cant.</span>
                      <span className="text-right">Total</span>
                    </div>

                    {rows.map((row, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[100px_1fr_72px_96px] gap-2 px-4 py-2.5 text-sm border-b border-surface-mid/50 last:border-0"
                      >
                        <span className="text-[11px] text-ink-soft self-center">
                          {row.sucursal ?? '—'}
                        </span>
                        <div className="self-center">
                          <p className="font-medium text-ink">{row.producto ?? '—'}</p>
                          {row.codigoProducto && (
                            <p className="text-[11px] text-outline">{row.codigoProducto}</p>
                          )}
                        </div>
                        <span className="text-right text-ink-soft self-center">
                          {row.cantidad != null ? row.cantidad.toLocaleString('es-HN', { maximumFractionDigits: 2 }) : '—'}
                        </span>
                        <span className="text-right font-semibold text-ink self-center">
                          {row.totalVenta != null ? fmtMoney(row.totalVenta) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </>
  );
}
