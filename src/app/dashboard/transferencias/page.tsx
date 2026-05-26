'use client';

import { PageHeader } from '@/components/page-header';
import { EyebrowLabel } from '@/components/common';
import { ErrorState, LoadingState } from '@/components/states';
import { Icon } from '@/components/icon';
import { fmtDate, fmtInt, fmtMoney } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { apiTransferenciasMock, type RptTransferencia, type RptTransferenciasResumen } from '@/lib/mock';

export default function TransferenciasPage() {
  const { status, data, error, errorVariant, reload, isValidating } = useApi('rpt:transferencias', apiTransferenciasMock);

  return (
    <>
      <PageHeader
        eyebrow="Transferencias"
        title="Movimientos entre Sucursales"
        subtitle="Documentos, rutas y unidades transferidas · Datos preliminares"
        icon="swap_horiz"
        isRefreshing={isValidating && status === 'success'}
      />

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState variant={errorVariant} message={error} onRetry={reload} />}
      {status === 'success' && data && <Content d={data} />}
    </>
  );
}

function Content({ d }: { d: RptTransferenciasResumen }) {
  const maxRuta = Math.max(1, ...d.topRutas.map(r => r.monto));
  return (
    <>
      <div className="rounded-card bg-primary-gradient p-5 sm:p-7 text-white">
        <EyebrowLabel className="!text-white/80">Costo Total Transferido</EyebrowLabel>
        <p className="mt-2 text-3xl sm:text-[40px] font-extrabold tracking-tight tabular-nums break-words">{fmtMoney(d.montoCostoTotal)}</p>
        <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
          {fmtInt(d.totalTransferencias)} documentos · {fmtInt(d.unidadesTransferidas)} unidades
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
        <StatusTile label="Recibidas" value={d.recibidas} tone="primary" icon="check" />
        <StatusTile label="En Tránsito" value={d.enTransito} tone="primary-container" icon="local_shipping" />
        <StatusTile label="Pendientes" value={d.pendientes} tone="tertiary" icon="schedule" />
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <EyebrowLabel>Rutas Principales</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">Top {d.topRutas.length}</span>
        </div>
        <div className="space-y-3">
          {d.topRutas.map((r, i) => {
            const ratio = r.monto / maxRuta;
            return (
              <div key={i} className="rounded-2xl bg-surface-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink min-w-0">
                    <span className="truncate">{r.origenNombre}</span>
                    <Icon name="arrow_forward" size={14} className="text-outline shrink-0" />
                    <span className="truncate">{r.destinoNombre}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold tabular-nums">{fmtMoney(r.monto)}</p>
                    <p className="text-[11px] text-ink-variant tabular-nums">
                      {fmtInt(r.transferencias)} envíos · {fmtInt(r.unidades)} uds
                    </p>
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
          <EyebrowLabel>Movimientos Recientes</EyebrowLabel>
          <span className="text-[11px] text-ink-variant">{d.movimientos.length} documentos</span>
        </div>
        <div className="space-y-3">
          {d.movimientos.slice(0, 18).map(m => (
            <MovimientoCard key={m.documento} m={m} />
          ))}
        </div>
      </div>

      <PreviewNotice />
    </>
  );
}

function StatusTile({ label, value, tone, icon }: { label: string; value: number; tone: 'primary' | 'primary-container' | 'tertiary'; icon: 'check' | 'local_shipping' | 'schedule' }) {
  const cls = tone === 'tertiary' ? 'bg-tertiary/10 text-tertiary' : tone === 'primary-container' ? 'bg-primary-container/10 text-primary-container' : 'bg-primary/10 text-primary';
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <EyebrowLabel>{label}</EyebrowLabel>
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${cls}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{fmtInt(value)}</p>
      <p className="mt-1 text-[11px] text-ink-variant">documentos</p>
    </div>
  );
}

function MovimientoCard({ m }: { m: RptTransferencia }) {
  const estadoCls = m.estado === 'Recibida' ? 'bg-positive-bg text-positive-fg' : m.estado === 'En tránsito' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary';
  return (
    <div className="rounded-2xl border border-surface-mid p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-eyebrow text-outline">{m.documento}</p>
          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-ink">
            <span className="truncate">{m.origenNombre}</span>
            <Icon name="arrow_forward" size={14} className="text-outline shrink-0" />
            <span className="truncate">{m.destinoNombre}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-variant tabular-nums">
            {fmtDate(m.fecha)} · {fmtInt(m.productosDistintos)} productos · {fmtInt(m.unidades)} uds
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`pill ${estadoCls}`}>{m.estado}</span>
          <p className="mt-2 text-sm font-extrabold tabular-nums">{fmtMoney(m.montoCosto)}</p>
        </div>
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
