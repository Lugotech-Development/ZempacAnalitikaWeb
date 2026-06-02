'use client';

// Horizontal bar chart showing distribution (part-to-whole) by category.
// Used in the Ventas page to show "Porcentaje Relativo" per sucursal.
// Dynamic-imported with `next/dynamic({ ssr: false })` like SeriesChart.
// Includes: Top-3 / Bottom-3 color highlights, average & Pareto 80/20 reference lines,
// and a summary row with the 80/20 split.

import { useMemo } from 'react';
import { fmtMoney, fmtPercent } from '@/lib/format';

const TOKEN = {
  primary: '#0040DF',
  primaryFaded: 'rgba(0, 64, 223, 0.35)',
  tertiary: '#993100',
  tertiaryFaded: 'rgba(153, 49, 0, 0.7)',
  positive: '#137333',
  surfaceMid: '#EDEEEF',
  outline: '#747688',
  ink: '#191C1D'
};

export type DistributionPoint = { name: string; value: number; amount?: number };

type BarTier = 'top' | 'mid' | 'bottom';

function computeTiers(data: DistributionPoint[], paretoCut: number): BarTier[] {
  return data.map((_, i) => {
    if (i < 3) return 'top';
    if (i >= paretoCut) return 'bottom';
    return 'mid';
  });
}

function computeParetoCut(data: DistributionPoint[]): number {
  // Find how many items accumulate ≥80% of value
  let cumulative = 0;
  for (let i = 0; i < data.length; i++) {
    cumulative += data[i].value;
    if (cumulative >= 80) return i + 1;
  }
  return data.length;
}

export default function DistributionChart({ data, totalAmount, maxVisible, children }: { data: DistributionPoint[]; totalAmount?: number; maxVisible?: number; children?: React.ReactNode }) {
  // All computations use the FULL dataset
  const paretoCut = useMemo(() => computeParetoCut(data), [data]);
  const tiers = useMemo(() => computeTiers(data, paretoCut), [data, paretoCut]);
  const average = useMemo(() => (data.length > 0 ? 100 / data.length : 0), [data]);
  const paretoPercent = useMemo(() => data.slice(0, paretoCut).reduce((s, d) => s + d.value, 0), [data, paretoCut]);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  // Only render up to maxVisible items (but compute from all)
  const visibleData = maxVisible != null ? data.slice(0, maxVisible) : data;

  // Find where average line should go (first item below average)
  const avgLineAfter = useMemo(() => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].value < average) return i;
    }
    return data.length;
  }, [data, average]);

  return (
    <div>
      {totalAmount != null && totalAmount > 0 && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/[0.06] px-3 py-1.5">
          <span className="text-[11px] font-bold tracking-wide uppercase text-primary">Total: {fmtMoney(totalAmount)} = 100%</span>
        </div>
      )}

      <div className="space-y-0">
        {visibleData.map((item, idx) => {
          const tier = tiers[idx];
          const barWidth = (item.value / maxValue) * 100;
          const barColor = tier === 'top' ? TOKEN.primary : tier === 'bottom' ? TOKEN.tertiaryFaded : TOKEN.primaryFaded;
          const nameColor = tier === 'top' ? TOKEN.primary : tier === 'bottom' ? TOKEN.tertiary : TOKEN.ink;
          const showRank = tier === 'top';

          return (
            <div key={item.name}>
              {/* Average line */}
              {idx === avgLineAfter && (
                <div className="relative my-2 ml-[152px] mr-[52px] border-t-2 border-dashed border-primary">
                  <span className="absolute right-0 -top-[10px] text-[9px] font-bold text-primary bg-surface-lowest px-1.5">Promedio: {fmtPercent(average)}</span>
                </div>
              )}
              {/* Pareto 80/20 line */}
              {idx === paretoCut && idx !== avgLineAfter && (
                <div className="relative my-2 ml-[152px] mr-[52px]" style={{ borderTop: `2px dashed ${TOKEN.positive}` }}>
                  <span className="absolute right-0 -top-[10px] text-[9px] font-bold bg-surface-lowest px-1.5" style={{ color: TOKEN.positive }}>
                    80/20: {paretoCut} suc. = {fmtPercent(paretoPercent)}
                  </span>
                </div>
              )}
              {/* Pareto line at same position as average — render below average */}
              {idx === paretoCut && idx === avgLineAfter && (
                <div className="relative my-2 ml-[152px] mr-[52px]" style={{ borderTop: `2px dashed ${TOKEN.positive}` }}>
                  <span className="absolute right-0 -top-[10px] text-[9px] font-bold bg-surface-lowest px-1.5" style={{ color: TOKEN.positive }}>
                    80/20: {paretoCut} suc. = {fmtPercent(paretoPercent)}
                  </span>
                </div>
              )}

              {/* Bar row */}
              <div className="flex items-center gap-3 py-[7px]">
                {/* Label */}
                <div className="w-[140px] flex-shrink-0 text-right flex items-center justify-end gap-1.5">
                  <div className="text-right">
                    <p className="text-xs font-semibold leading-tight" style={{ color: nameColor }}>
                      {item.name}
                    </p>
                    {item.amount != null && <p className="text-[10px] text-outline mt-0.5 tabular-nums">{fmtMoney(item.amount)}</p>}
                  </div>
                  {showRank && (
                    <span className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-[6px] text-[9px] font-extrabold flex-shrink-0 ${rankBadgeClass(idx, tier)}`}>{idx + 1}</span>
                  )}
                </div>

                {/* Bar + value */}
                <div className="flex-1 relative pr-[52px]">
                  <div className="h-6 rounded-r-[6px]" style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums text-ink w-[44px]">{fmtPercent(item.value)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {children}

      {/* 80/20 Summary chips */}
      {data.length > 3 && (
        <div className="mt-5 pt-4 border-t border-surface-mid flex gap-3">
          <div className="flex-1 rounded-xl bg-primary/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-outline">Generan ≈80% de ventas</p>
            <p className="text-lg font-extrabold text-primary tabular-nums mt-0.5">{paretoCut} sucursales</p>
            <p className="text-[11px] text-ink-variant">{fmtPercent(paretoPercent)} del total acumulado</p>
          </div>
          <div className="flex-1 rounded-xl bg-[#FBE9E7] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-outline">Generan ≈20% restante</p>
            <p className="text-lg font-extrabold text-tertiary tabular-nums mt-0.5">{data.length - paretoCut} sucursales</p>
            <p className="text-[11px] text-ink-variant">{fmtPercent(100 - paretoPercent)} del total acumulado</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 rounded-xl bg-surface-low p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-primary" />
          <span className="text-[11px] text-ink-variant">
            <span className="font-semibold text-primary">Promedio</span> — Reparto equitativo si todas las sucursales vendieran igual
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed" style={{ borderColor: TOKEN.positive }} />
          <span className="text-[11px] text-ink-variant">
            <span className="font-semibold" style={{ color: TOKEN.positive }}>
              Corte 80/20
            </span>{' '}
            — Principio de Pareto: cuántas sucursales concentran el 80% de ventas
          </span>
        </div>
      </div>
    </div>
  );
}

function rankBadgeClass(idx: number, tier: BarTier): string {
  if (tier === 'top') {
    if (idx === 0) return 'bg-[#FFF3E0] text-[#E65100]';
    if (idx === 1) return 'bg-surface-low text-ink-variant';
    return 'bg-[#FBE9E7] text-[#BF360C]';
  }
  return 'bg-[#FFEBEE] text-[#C62828]';
}
