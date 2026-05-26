'use client';

import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/states';
import { Icon } from '@/components/icon';
import { fmtInt, fmtMoney, fmtPercent } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { apiInventarioMock, type RptInventarioResumen } from '@/lib/mock';

export default function InventarioPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:inventario', apiInventarioMock);

  return (
    <>
      <PageHeader
        eyebrow="Inventario"
        title="Stock por Sucursal"
        subtitle="Existencias, valor estimado y niveles mínimos · Datos preliminares"
        icon="inventory_2"
        isRefreshing={isValidating && status === 'success'}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && data && <Content d={data} />}
    </>
  );
}

function Content({ d }: { d: RptInventarioResumen }) {
  const valorMaxSucursal = Math.max(1, ...d.porSucursal.map(s => s.valorEstimado));

  return (
    <>
      <div className="rounded-card bg-primary-gradient p-5 sm:p-7 text-white">
        <EyebrowLabel className="!text-white/80">Valor Estimado de Inventario</EyebrowLabel>
        <p className="mt-2 text-3xl sm:text-[40px] font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.valorEstimadoTotal)}</p>
        <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
          {fmtInt(d.totalUnidades)} unidades · {fmtInt(d.totalSku)} SKU activos
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="pill bg-white/15 text-white tabular-nums">Rotación mes: {fmtPercent(d.porcentajeRotacionMes)}</span>
          <span className="pill bg-white/15 text-white tabular-nums">{fmtInt(d.productosBajoMinimo)} bajo mínimo</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3">
        <AlertTile icon="warning" tone="tertiary" label="Productos Agotados" value={fmtInt(d.productosAgotados)} subtext="Existencia en cero" />
        <AlertTile icon="trending_down" tone="tertiary" label="Bajo Mínimo" value={fmtInt(d.productosBajoMinimo)} subtext="Requieren reposición" />
        <AlertTile icon="trending_up" tone="primary" label="Sobre Máximo" value={fmtInt(d.productosSobreMaximo)} subtext="Posible sobre-stock" />
        <AlertTile icon="inventory_2" tone="primary" label="SKU Activos" value={fmtInt(d.totalSku)} subtext="Productos distintos" />
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <EyebrowLabel>Inventario por Sucursal</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">{d.porSucursal.length} sucursales</span>
        </div>
        <div className="space-y-3">
          {d.porSucursal.map(s => {
            const ratio = s.valorEstimado / valorMaxSucursal;
            return (
              <div key={s.sucursal} className="rounded-2xl bg-surface-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink truncate">{s.almacenNombre}</p>
                    <p className="text-[11px] text-ink-variant tabular-nums">
                      {fmtInt(s.totalUnidades)} uds · {fmtInt(s.totalSku)} SKU
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold tracking-tight tabular-nums">{fmtMoney(s.valorEstimado)}</p>
                    {s.bajoMinimo > 0 && <span className="pill bg-tertiary/10 text-tertiary tabular-nums mt-1">{fmtInt(s.bajoMinimo)} bajo mín.</span>}
                  </div>
                </div>
                <div className="mt-3 h-1 rounded-pill bg-surface-mid overflow-hidden">
                  <div className="h-full bg-cta-gradient" style={{ width: `${ratio * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 card-bordered p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <EyebrowLabel className="!text-tertiary">Alerta · Reposición urgente</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">{d.topBajoMinimo.length} productos</span>
        </div>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low text-left">
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Producto</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline">Sucursal</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Existencia</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Mínimo</th>
                <th className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-outline text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-mid">
              {d.topBajoMinimo.map((it, i) => (
                <tr key={`${it.producto}-${it.sucursal}-${i}`} className="hover:bg-surface-low/60">
                  <td className="px-6 py-3">
                    <p className="text-sm font-bold text-ink line-clamp-1">{it.productoNombre}</p>
                    <p className="text-[11px] text-ink-variant">{it.categoria}</p>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-ink-variant">{it.almacenNombre}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-extrabold tabular-nums ${it.existencia === 0 ? 'text-tertiary' : 'text-ink'}`}>{fmtInt(it.existencia)}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-variant tabular-nums">{fmtInt(it.minimo)}</td>
                  <td className="px-6 py-3 text-right font-bold tabular-nums">{fmtMoney(it.valorEstimado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PreviewNotice />
    </>
  );
}

function AlertTile({
  icon,
  tone,
  label,
  value,
  subtext
}: {
  icon: 'warning' | 'trending_down' | 'trending_up' | 'inventory_2';
  tone: 'primary' | 'tertiary';
  label: string;
  value: string;
  subtext: string;
}) {
  const toneClasses = tone === 'tertiary' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary';
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <EyebrowLabel>{label}</EyebrowLabel>
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${toneClasses}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-ink-variant">{subtext}</p>
    </div>
  );
}

function PreviewNotice() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-[12px] text-ink-variant flex items-start gap-3">
      <Icon name="auto_awesome" size={16} className="text-primary mt-0.5 shrink-0" />
      <p>
        <span className="font-bold text-primary">Vista previa.</span> Este reporte usa datos de demostración. Cuando el endpoint esté disponible reemplazaremos la fuente sin cambiar la interfaz.
      </p>
    </div>
  );
}
