'use client';

import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/states';
import { Icon } from '@/components/icon';
import { fmtInt, fmtMoney } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { apiVencimientosMock, type RptVencimientosResumen, type RptVencimientoLote } from '@/lib/mock';

export default function VencimientosPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:vencimientos', apiVencimientosMock);

  return (
    <>
      <PageHeader
        eyebrow="Vencimientos"
        title="Productos Próximos a Vencer"
        subtitle="Lotes por ventana de vencimiento y valor en riesgo · Datos preliminares"
        icon="hourglass_top"
        isRefreshing={isValidating && status === 'success'}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && data && <Content d={data} />}
    </>
  );
}

function Content({ d }: { d: RptVencimientosResumen }) {
  const buckets: { key: string; label: string; lotes: number; valor: number; tone: 'tertiary' | 'warning' | 'primary' | 'neutral' }[] = [
    { key: 'venc', label: 'Vencidos', lotes: d.vencidos.lotes, valor: d.vencidos.valor, tone: 'tertiary' },
    { key: 'd30', label: '≤ 30 días', lotes: d.ventana30.lotes, valor: d.ventana30.valor, tone: 'warning' },
    { key: 'd60', label: '31 – 60 días', lotes: d.ventana60.lotes, valor: d.ventana60.valor, tone: 'primary' },
    { key: 'd90', label: '61 – 90 días', lotes: d.ventana90.lotes, valor: d.ventana90.valor, tone: 'primary' },
    { key: 'd+', label: '> 90 días', lotes: d.masDe90.lotes, valor: d.masDe90.valor, tone: 'neutral' }
  ];

  return (
    <>
      <div className="rounded-card bg-primary-gradient p-5 sm:p-7 text-white">
        <EyebrowLabel className="!text-white/80">Valor Total en Riesgo</EyebrowLabel>
        <p className="mt-2 text-3xl sm:text-[40px] font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.valorEnRiesgoTotal)}</p>
        <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
          {fmtInt(d.totalLotes)} lotes monitoreados · {fmtInt(d.vencidos.lotes + d.ventana30.lotes)} requieren acción inmediata
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {buckets.map(b => {
          const { key, ...rest } = b;
          return <BucketTile key={key} {...rest} />;
        })}
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <EyebrowLabel className="!text-tertiary">Lotes con menor tiempo restante</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">{d.lotes.length} lotes</span>
        </div>
        <div className="space-y-3">
          {d.lotes.slice(0, 14).map((l, i) => (
            <LoteCard key={`${l.producto}-${l.lote}-${i}`} l={l} />
          ))}
        </div>
      </div>

      <PreviewNotice />
    </>
  );
}

function BucketTile({ label, lotes, valor, tone }: { label: string; lotes: number; valor: number; tone: 'tertiary' | 'warning' | 'primary' | 'neutral' }) {
  const headerCls =
    tone === 'tertiary'
      ? 'bg-tertiary/10 text-tertiary'
      : tone === 'warning'
        ? 'bg-negative-bg text-negative-fg'
        : tone === 'primary'
          ? 'bg-primary/10 text-primary'
          : 'bg-surface-low text-ink-variant';
  return (
    <div className="card-bordered p-4">
      <span className={`pill ${headerCls}`}>{label}</span>
      <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{fmtInt(lotes)}</p>
      <p className="text-[11px] text-ink-variant">lotes</p>
      <p className="mt-2 text-sm font-bold tabular-nums">{fmtMoney(valor)}</p>
      <p className="text-[11px] text-ink-variant">en riesgo</p>
    </div>
  );
}

function LoteCard({ l }: { l: RptVencimientoLote }) {
  const expired = l.diasParaVencer < 0;
  const critical = !expired && l.diasParaVencer <= 30;
  const days = Math.abs(l.diasParaVencer);
  const badge = expired ? `Vencido hace ${days} d` : `${days} d restantes`;
  const badgeCls = expired ? 'bg-tertiary text-white' : critical ? 'bg-negative-bg text-negative-fg' : 'bg-primary/10 text-primary';
  return (
    <div className="rounded-2xl border border-surface-mid p-4">
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${expired ? 'bg-tertiary text-white' : 'bg-primary/10 text-primary'}`}>
          <Icon name="schedule" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink line-clamp-1">{l.productoNombre}</p>
          <p className="text-[11px] text-ink-variant">
            {l.categoria} · Lote {l.lote} · {l.almacenNombre}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold tabular-nums">{fmtMoney(l.valorEnRiesgo)}</p>
          <p className="text-[11px] text-ink-variant tabular-nums">{fmtInt(l.existencia)} uds</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`pill ${badgeCls}`}>{badge}</span>
        <span className="pill bg-surface-low text-ink-variant tabular-nums">Vence {new Date(l.fechaVencimiento).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
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
