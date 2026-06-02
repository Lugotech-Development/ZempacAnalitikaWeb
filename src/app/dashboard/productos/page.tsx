'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiProductos } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { RptProductoMasVendido } from '@/lib/types';

export default function ProductosPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProductosInner />
    </Suspense>
  );
}

function ProductosInner() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:productos', apiProductos);
  const sku = useSearchParams().get('sku') ?? undefined;

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Más Vendidos"
        subtitle="Ranking del periodo con margen, facturas y costo"
        icon="shopping_bag"
        isRefreshing={isValidating && status === 'success'}
        onRefresh={reload}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && (data && data.length > 0 ? <Content productos={data} highlightSku={sku} /> : <EmptyState message="No hay productos para mostrar en el periodo." />)}
    </>
  );
}

function porcMargen(p: RptProductoMasVendido): number {
  const total = p.totalVendido ?? 0;
  const margen = p.margenEstimado ?? 0;
  return total > 0 ? (margen / total) * 100 : 0;
}

function Content({ productos, highlightSku }: { productos: RptProductoMasVendido[]; highlightSku?: string }) {
  const maxVendido = useMemo(() => Math.max(1, ...productos.map(p => p.totalVendido ?? 0)), [productos]);
  const grandTotal = useMemo(() => productos.reduce((s, p) => s + (p.totalVendido ?? 0), 0), [productos]);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightSku && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSku, productos]);

  return (
    <>
      <p className="text-sm text-ink-variant">
        {fmtInt(productos.length)} producto{productos.length === 1 ? '' : 's'}
      </p>

      <div className="mt-4 space-y-3">
        {productos.map((p, i) => {
          const rank = i + 1;
          const ratio = (p.totalVendido ?? 0) / maxVendido;
          const pctOfTotal = grandTotal > 0 ? ((p.totalVendido ?? 0) / grandTotal) * 100 : 0;
          const margen = porcMargen(p);
          const isTop3 = rank <= 3;
          const margenIsHealthy = margen >= 25;
          const isHighlighted = highlightSku != null && p.producto === highlightSku;

          return (
            <div
              key={`${p.producto}-${i}`}
              ref={isHighlighted ? highlightRef : undefined}
              className={`card-bordered p-5 transition ${isHighlighted ? 'ring-2 ring-primary border-primary/40 shadow-cta' : ''}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[13px] font-extrabold shrink-0 ${
                    isTop3 ? 'bg-primary-container/15 text-primary' : 'bg-surface-low text-ink-variant'
                  }`}>
                  #{rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-ink line-clamp-2">{p.productoNombre ?? '—'}</p>
                  <p className="text-[11px] text-ink-variant mt-0.5">SKU: {p.producto ?? '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-extrabold tracking-tight">{fmtMoney(p.totalVendido)}</p>
                  <p className="text-[11px] text-ink-variant">{fmtInt(p.cantidadVendida)} uds</p>
                </div>
              </div>

              <div className="mt-3 h-1 rounded-pill bg-surface-mid overflow-hidden">
                <div className={`h-full ${isTop3 ? 'bg-cta-gradient' : 'bg-outline'}`} style={{ width: `${ratio * 100}%` }} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Chip text={`${fmtPercent(pctOfTotal)} del total`} tone="primary-container" />
                <Chip text={`Margen ${fmtPercent(margen)}`} tone={margenIsHealthy ? 'primary' : 'tertiary'} />
                <Chip text={`${fmtInt(p.cantidadFacturas)} facturas`} tone="outline" />
                <Chip text={`Costo: ${fmtMoney(p.costoEstimado)}`} tone="ink-variant" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Chip({ text, tone }: { text: string; tone: 'primary' | 'primary-container' | 'tertiary' | 'outline' | 'ink-variant' }) {
  const classes =
    tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : tone === 'primary-container'
        ? 'bg-primary-container/10 text-primary-container'
        : tone === 'tertiary'
          ? 'bg-tertiary/10 text-tertiary'
          : tone === 'outline'
            ? 'bg-outline/10 text-outline'
            : 'bg-ink-variant/10 text-ink-variant';
  return <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-pill ${classes}`}>{text}</span>;
}
