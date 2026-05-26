'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/states';
import { Icon } from '@/components/icon';
import { fmtDate, fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { apiCuentasPorCobrar } from '@/lib/api';
import { apiCuentasPorCobrarDetallePaginado } from '@/lib/api';
import type { RptCuentasPorCobrar, RptCxcTopCliente, RptCxcDetalleFactura } from '@/lib/types';

export default function CuentasPorCobrarPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:cuentas-por-cobrar', apiCuentasPorCobrar);

  return (
    <>
      <PageHeader eyebrow="Cuentas por Cobrar" title="Créditos a Clientes" subtitle="Saldos pendientes y antigüedad" icon="request_quote" isRefreshing={isValidating && status === 'success'} />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && data && <Content d={data} />}
    </>
  );
}

type AgingTone = 'positive' | 'primary' | 'primary-container' | 'tertiary';

function Content({ d }: { d: RptCuentasPorCobrar }) {
  const { resumen, antiguedad, topClientes } = d;
  const bucketSum = antiguedad.corriente + antiguedad.de31a60 + antiguedad.de61a90 + antiguedad.mayor90;
  const segTotal = Math.max(1, resumen.saldoTotal || bucketSum);

  // Expansion state for cliente cards
  const [expanded, setExpanded] = React.useState<string | null>(null);
  // Details state: { [clienteCodigo]: { loading, error, data, pagina, hasMore } }
  const [details, setDetails] = React.useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        data: RptCxcDetalleFactura[];
        pagina: number;
        hasMore: boolean;
      }
    >
  >({});

  // The upstream API exposes 4 buckets — there is no 1–30 day range.
  const segs: { label: string; value: number; cls: string }[] = [
    { label: 'Corriente', value: antiguedad.corriente, cls: 'bg-positive-fg' },
    { label: '31 – 60 días', value: antiguedad.de31a60, cls: 'bg-primary' },
    { label: '61 – 90 días', value: antiguedad.de61a90, cls: 'bg-primary-container' },
    { label: '> 90 días', value: antiguedad.mayor90, cls: 'bg-tertiary' }
  ];

  const maxSaldo = Math.max(1, ...topClientes.map(c => c.saldoTotal));

  // Handler to expand/collapse and fetch detail if needed
  const handleExpand = async (clienteCodigo: string) => {
    if (expanded === clienteCodigo) {
      setExpanded(null);
      return;
    }
    setExpanded(clienteCodigo);
    // Only fetch if not already loaded or loading
    if (!details[clienteCodigo] || details[clienteCodigo].error) {
      setDetails(prev => ({
        ...prev,
        [clienteCodigo]: { loading: true, error: null, data: [], pagina: 1, hasMore: true }
      }));
      try {
        console.log('Detalle paginado API payload:', { clienteCodigo, pagina: 1, porPagina: 10 }); // DEBUG
        const data: RptCxcDetalleFactura[] = await apiCuentasPorCobrarDetallePaginado(clienteCodigo, 1, 10);
        console.log('Detalle paginado API result:', data); // DEBUG
        setDetails(prev => ({
          ...prev,
          [clienteCodigo]: {
            loading: false,
            error: null,
            data: Array.isArray(data) ? data : [],
            pagina: 1,
            hasMore: Array.isArray(data) && data.length === 10
          }
        }));
      } catch (err: any) {
        setDetails(prev => ({
          ...prev,
          [clienteCodigo]: { loading: false, error: err?.message || 'Error al cargar detalle', data: [], pagina: 1, hasMore: false }
        }));
      }
    }
  };

  // Handler to load more facturas for a cliente
  const handleLoadMore = async (clienteCodigo: string) => {
    const current = details[clienteCodigo];
    if (!current || current.loading || !current.hasMore) return;
    setDetails(prev => ({
      ...prev,
      [clienteCodigo]: { ...current, loading: true }
    }));
    try {
      const nextPage = current.pagina + 1;
      const data: RptCxcDetalleFactura[] = await apiCuentasPorCobrarDetallePaginado(clienteCodigo, nextPage, 10);
      setDetails(prev => ({
        ...prev,
        [clienteCodigo]: {
          ...current,
          loading: false,
          data: [...current.data, ...(Array.isArray(data) ? data : [])],
          pagina: nextPage,
          hasMore: Array.isArray(data) && data.length === 10
        }
      }));
    } catch (err: any) {
      setDetails(prev => ({
        ...prev,
        [clienteCodigo]: { ...current, loading: false, error: err?.message || 'Error al cargar más facturas' }
      }));
    }
  };

  return (
    <>
      <div className="rounded-card bg-primary-gradient p-5 sm:p-7 text-white">
        <EyebrowLabel className="!text-white/80">Saldo Total por Cobrar</EyebrowLabel>
        <p className="mt-2 text-3xl sm:text-[40px] font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(resumen.saldoTotal)}</p>
        <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
          {fmtInt(resumen.clientesConSaldo)} clientes · {fmtInt(resumen.facturasPendientes)} facturas pendientes
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="pill bg-white/15 text-white tabular-nums">Vencido: {fmtPercent(resumen.porcentajeVencido)} del total</span>
          {resumen.saldoCorriente > 0 && <span className="pill bg-white/15 text-white tabular-nums">Corriente: {fmtMoney(resumen.saldoCorriente)}</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AgingTile label="Corriente" subtext="Al día" value={antiguedad.corriente} tone="positive" />
        <AgingTile label="31 – 60" subtext="Atención" value={antiguedad.de31a60} tone="primary" />
        <AgingTile label="61 – 90" subtext="Vencido" value={antiguedad.de61a90} tone="primary-container" />
        <AgingTile label="> 90 días" subtext="Crítico" value={antiguedad.mayor90} tone="tertiary" />
      </div>

      <div className="mt-4 card p-6">
        <EyebrowLabel>Distribución por Antigüedad</EyebrowLabel>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-pill bg-surface-mid">
          {segs.map((s, i) => (
            <div key={i} className={s.cls} style={{ width: `${(s.value / segTotal) * 100}%` }} aria-label={`${s.label}: ${fmtMoney(s.value)}`} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.cls}`} />
              <p className="text-[12px] text-ink-variant truncate">{s.label}</p>
              <p className="text-[12px] font-extrabold tabular-nums text-ink">{fmtPercent((s.value / Math.max(1, bucketSum)) * 100)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 card-bordered p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <EyebrowLabel>Clientes con Mayor Saldo</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">{topClientes.length} clientes</span>
        </div>
        {topClientes.length === 0 ? (
          <p className="text-sm text-ink-variant">No hay clientes con saldo pendiente.</p>
        ) : (
          <div className="space-y-3">
            {topClientes.map((c, i) => (
              <ClienteCard
                key={c.clienteCodigo || `r${i}`}
                c={c}
                rank={i + 1}
                maxSaldo={maxSaldo}
                expanded={expanded === c.clienteCodigo}
                onExpand={() => handleExpand(c.clienteCodigo)}
                detail={details[c.clienteCodigo]}
                onLoadMore={handleLoadMore}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AgingTile({ label, subtext, value, tone }: { label: string; subtext: string; value: number; tone: AgingTone }) {
  const cls =
    tone === 'positive'
      ? 'bg-positive-bg text-positive-fg'
      : tone === 'tertiary'
        ? 'bg-tertiary/10 text-tertiary'
        : tone === 'primary-container'
          ? 'bg-primary-container/10 text-primary-container'
          : 'bg-primary/10 text-primary';
  return (
    <div className="card p-5">
      <span className={`pill ${cls}`}>{label}</span>
      <p className="mt-3 text-xl font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(value)}</p>
      <p className="mt-1 text-[11px] text-ink-variant">{subtext}</p>
    </div>
  );
}

type ClienteCardProps = {
  c: RptCxcTopCliente;
  rank: number;
  maxSaldo: number;
  expanded: boolean;
  onExpand: () => void;
  detail?: {
    loading: boolean;
    error: string | null;
    data: RptCxcDetalleFactura[];
    pagina: number;
    hasMore: boolean;
  };
  onLoadMore?: (clienteCodigo: string) => void;
};

function ClienteCard({ c, rank, maxSaldo, expanded, onExpand, detail, onLoadMore }: ClienteCardProps) {
  const ratio = c.saldoTotal / maxSaldo;
  const critico = c.diasMaxAtraso > 90 || /(>?90|mayor)/i.test(c.categoria ?? '');
  return (
    <div className={`rounded-2xl border p-4 ${critico ? 'border-tertiary/30 bg-tertiary/[0.03]' : 'border-surface-mid'}`}>
      <button
        className="flex items-start gap-3 w-full text-left focus:outline-none"
        onClick={onExpand}
        aria-expanded={expanded}
        aria-controls={`detalle-${c.clienteCodigo}`}
        tabIndex={0}
        style={{ cursor: 'pointer' }}>
        <div
          className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[13px] font-extrabold shrink-0 ${rank <= 3 ? 'bg-primary-container/15 text-primary' : 'bg-surface-low text-ink-variant'}`}>
          #{rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink line-clamp-1">{c.clienteNombre || c.clienteCodigo || '—'}</p>
          <p className="text-[11px] text-ink-variant tabular-nums">
            {c.clienteCodigo || '—'}
            {c.totalFacturas > 0 && ` · ${fmtInt(c.totalFacturas)} facturas`}
            {c.ultimaFacturaFecha && ` · última ${fmtDate(c.ultimaFacturaFecha)}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold tabular-nums">{fmtMoney(c.saldoTotal)}</p>
          {c.diasMaxAtraso > 0 && (
            <span className={`pill mt-1 inline-flex items-center gap-1 tabular-nums ${critico ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-low text-ink-variant'}`}>
              <Icon name="schedule" size={10} />
              {fmtInt(c.diasMaxAtraso)} d
            </span>
          )}
        </div>
        <div className="ml-2 mt-1">
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
        </div>
      </button>
      <div className="mt-3 h-1 rounded-pill bg-surface-mid overflow-hidden">
        <div className={`h-full ${critico ? 'bg-tertiary' : 'bg-cta-gradient'}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.corriente > 0 && <span className="pill bg-positive-bg text-positive-fg tabular-nums">Corriente {fmtMoney(c.corriente)}</span>}
        {c.vencido > 0 && <span className="pill bg-tertiary/10 text-tertiary tabular-nums">Vencido {fmtMoney(c.vencido)}</span>}
        {c.categoria && <span className="pill bg-surface-low text-ink-variant">{c.categoria}</span>}
      </div>
      {expanded && (
        <div id={`detalle-${c.clienteCodigo}`} className="mt-4">
          {detail?.loading && <LoadingState />}
          {detail?.error && <ErrorState variant="server" message={detail.error} onRetry={onExpand} />}
          {detail?.data && detail.data.length === 0 && <p className="text-sm text-ink-variant">Sin facturas pendientes.</p>}
          {detail?.data && detail.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-surface-mid rounded-xl">
                <thead>
                  <tr className="bg-surface-low text-left">
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Factura</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Fecha</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Saldo</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Días atraso</th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-mid">
                  {detail.data.map((f, i) => (
                    <tr key={f.facturaNumero + i} className="hover:bg-surface-low/60">
                      <td className="px-3 py-2 font-bold text-ink break-all">{f.facturaNumero}</td>
                      <td className="px-3 py-2 text-ink-variant tabular-nums">{fmtDate(f.fecha || f.facturaFecha)}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{fmtMoney(f.balance)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(f.diasAtraso)}</td>
                      <td className="px-3 py-2 text-ink-variant">{f.categoria || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.hasMore && (
                <div className="flex justify-center mt-4">
                  <button className="cta px-6 py-2 text-sm font-bold" onClick={() => onLoadMore && onLoadMore(c.clienteCodigo)} disabled={detail.loading}>
                    {detail.loading ? 'Cargando...' : 'Ver más'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function handleExpand(clienteCodigo: string) {
  // This function should be called when the user expands a client
  // You can add logic here to handle the expansion
}
