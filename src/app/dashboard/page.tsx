'use client';

import { PageHeader } from '@/components/page-header';
import { EyebrowLabel, TrendBadge } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/states';
import { fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { apiPantallaPrincipal } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { RptPantallaPrincipal } from '@/lib/types';

export default function PrincipalPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:principal', apiPantallaPrincipal);

  return (
    <>
      <PageHeader eyebrow="Resumen Ejecutivo" title="Pantalla Principal" subtitle="Mes actual vs mes anterior" icon="grid_view" isRefreshing={isValidating && status === 'success'} />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && data && <Content d={data} />}
    </>
  );
}

function pctChange(actual: number | null, anterior: number | null): number {
  if (!actual || !anterior) return 0;
  return ((actual - anterior) / anterior) * 100;
}

function Content({ d }: { d: RptPantallaPrincipal }) {
  const clientesChange = pctChange(d.clientesMesActual, d.clientesMesAnterior);
  const unidadesChange = pctChange(d.unidadesMesActual, d.unidadesMesAnterior);
  const productosChange = pctChange(d.productosDistintosMesActual, d.productosDistintosMesAnterior);
  const costoChange = pctChange(d.costoEstimadoMesActual, d.costoEstimadoMesAnterior);
  const devolucionRate = Math.min(d.porcDevolucionSobreVentaMesActual ?? 0, 100);

  return (
    <>
      <div className="rounded-card bg-primary-gradient p-5 sm:p-7 text-white">
        <EyebrowLabel className="!text-white/80">Ventas Mes Actual</EyebrowLabel>
        <p className="mt-2 text-3xl sm:text-[40px] font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.totalVendidoMesActual)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TrendBadge value={d.porcCrecimientoVentas ?? 0} />
          <span className="text-xs text-white/75">vs mes anterior ({fmtMoney(d.totalVendidoMesAnterior)})</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
          Diferencia: {(d.diferenciaVentas ?? 0) >= 0 ? '+' : ''}
          {fmtMoney(d.diferenciaVentas)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile label="Facturas" value={fmtInt(d.facturasMesActual)} change={d.porcCrecimientoFacturas ?? 0} subtext={`Mes anterior: ${fmtInt(d.facturasMesAnterior)}`} />
        <MetricTile label="Ticket Promedio" value={fmtMoney(d.ticketPromedioMesActual)} change={d.porcCrecimientoTicket ?? 0} subtext={`Anterior: ${fmtMoney(d.ticketPromedioMesAnterior)}`} />
        <MetricTile label="Clientes" value={fmtInt(d.clientesMesActual)} change={clientesChange} subtext={`Mes anterior: ${fmtInt(d.clientesMesAnterior)}`} />
        <MetricTile label="Unidades" value={fmtInt(d.unidadesMesActual)} change={unidadesChange} subtext={`Mes anterior: ${fmtInt(d.unidadesMesAnterior)}`} />
      </div>

      <div className="mt-4 card p-6">
        <EyebrowLabel>Productos Distintos</EyebrowLabel>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-3xl font-extrabold tracking-tight tabular-nums">{fmtInt(d.productosDistintosMesActual)}</p>
          <TrendBadge value={productosChange} />
        </div>
        <p className="mt-1 text-xs text-ink-variant tabular-nums">Mes anterior: {fmtInt(d.productosDistintosMesAnterior)}</p>
      </div>

      <div className="mt-4 card p-6">
        <EyebrowLabel>Margen Estimado</EyebrowLabel>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.margenEstimadoMesActual)}</p>
            <p className="mt-1 text-xs text-ink-variant tabular-nums">{fmtPercent(d.porcMargenEstimadoMesActual)} del total</p>
          </div>
          <span className="pill bg-surface-low text-ink-variant tabular-nums">Mes anterior: {fmtPercent(d.porcMargenEstimadoMesAnterior)}</span>
        </div>
        <div className="mt-4 h-1.5 rounded-pill bg-surface-mid overflow-hidden">
          <div className="h-full bg-cta-gradient" style={{ width: `${d.porcMargenEstimadoMesActual ?? 0}%` }} />
        </div>
      </div>

      <div className="mt-4 card p-6">
        <EyebrowLabel>Costo Estimado</EyebrowLabel>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.costoEstimadoMesActual)}</p>
            <div className="mt-1.5">
              <TrendBadge value={costoChange} invertColor />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink-variant">Mes anterior</p>
            <p className="text-base font-bold tabular-nums">{fmtMoney(d.costoEstimadoMesAnterior)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 card-bordered p-6">
        <EyebrowLabel className="!text-tertiary">Devoluciones</EyebrowLabel>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.totalDevueltoMesActual)}</p>
            <p className="mt-1 text-xs text-ink-variant tabular-nums">
              {fmtInt(d.devolucionesMesActual)} devoluciones · {fmtPercent(d.porcDevolucionSobreVentaMesActual)} sobre ventas
            </p>
          </div>
          <TrendBadge value={(d.porcDevolucionSobreVentaMesActual ?? 0) - (d.porcDevolucionSobreVentaMesAnterior ?? 0)} invertColor />
        </div>
        <div className="mt-4 h-1.5 rounded-pill bg-surface-mid overflow-hidden">
          <div className="h-full bg-tertiary-container" style={{ width: `${devolucionRate}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-ink-variant tabular-nums">
          Mes anterior: {fmtMoney(d.totalDevueltoMesAnterior)} · {fmtPercent(d.porcDevolucionSobreVentaMesAnterior)}
        </p>
      </div>

      <div className="mt-4 card p-6">
        <EyebrowLabel>Descuentos Aplicados</EyebrowLabel>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.descuentoMesActual)}</p>
            <p className="mt-1 text-xs text-ink-variant tabular-nums">{fmtPercent(d.porcDescuentoMesActual)} del total vendido</p>
          </div>
          <span className="pill bg-surface-low text-ink-variant tabular-nums">Mes anterior: {fmtMoney(d.descuentoMesAnterior)}</span>
        </div>
      </div>
    </>
  );
}

function MetricTile({ label, value, change, subtext }: { label: string; value: string; change: number; subtext: string }) {
  return (
    <div className="card p-5">
      <EyebrowLabel>{label}</EyebrowLabel>
      <p className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums break-words">{value}</p>
      <div className="mt-2">
        <TrendBadge value={change} />
      </div>
      <p className="mt-2 text-[11px] text-ink-variant whitespace-pre-line tabular-nums">{subtext}</p>
    </div>
  );
}
