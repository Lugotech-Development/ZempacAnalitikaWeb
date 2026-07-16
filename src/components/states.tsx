'use client';

import { Icon, type IconName } from './icon';
import type { ErrorVariant } from '@/lib/api';

export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-surface-mid animate-shimmer ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
    />
  );
}

/**
 * Thin indeterminate progress line — the lightweight "data is refreshing" cue
 * for when stale content stays on screen while a new fetch runs (e.g. switching
 * sucursal / date / lote on a report that already has cached rows). Reserves its
 * 3px height even when idle so toggling `active` never shifts the layout.
 */
export function LoadingBar({ active, className = '' }: { active: boolean; className?: string }) {
  return (
    <div
      className={`relative h-[3px] w-full overflow-hidden rounded-pill transition-opacity duration-200 ${active ? 'bg-primary/10 opacity-100' : 'opacity-0'} ${className}`}
      role="progressbar"
      aria-busy={active}
      aria-hidden={!active}>
      {active && <div className="absolute inset-y-0 left-0 w-2/5 rounded-pill bg-primary-gradient animate-loading-sweep" />}
    </div>
  );
}

export function LoadingState({ label = 'Cargando datos…' }: { label?: string }) {
  return (
    <div className="grid gap-5">
      <SkeletonBox className="h-28" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <SkeletonBox className="h-36" />
        <SkeletonBox className="h-36" />
        <SkeletonBox className="h-36" />
        <SkeletonBox className="h-36" />
      </div>
      <SkeletonBox className="h-72" />
      <p className="sr-only">{label}</p>
    </div>
  );
}

const VARIANT_ICON: Record<ErrorVariant, IconName> = {
  network: 'cloud_off',
  session: 'logout',
  server: 'error',
  empty: 'inbox',
  forbidden: 'lock'
};

const VARIANT_TITLE: Record<ErrorVariant, string> = {
  network: 'Error al cargar datos',
  session: 'Sesión expirada',
  server: 'Algo salió mal',
  empty: 'Sin datos para mostrar',
  forbidden: 'Acceso no autorizado'
};

export function ErrorState({ variant, message, onRetry }: { variant: ErrorVariant; message?: string; onRetry?: () => void }) {
  return (
    <div className="card-bordered p-10 flex flex-col items-center text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
        <Icon name={VARIANT_ICON[variant]} size={26} />
      </div>
      <h3 className="text-lg font-bold">{VARIANT_TITLE[variant]}</h3>
      {message && <p className="text-sm text-ink-variant max-w-md">{message}</p>}
      {onRetry && variant !== 'session' && variant !== 'forbidden' && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-pill bg-primary-gradient text-white px-5 py-2.5 text-sm font-bold shadow-cta hover:brightness-110 transition">
          <Icon name="refresh" size={16} />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  return <ErrorState variant="empty" message={message ?? 'No hay registros disponibles por ahora.'} />;
}

/**
 * Shown when the user's profile can't see a report — by the dashboard route
 * guard (deep links / direct navigation) and when the backend answers a report
 * request with 403.
 */
export function NoAccessState({
  message = 'Tu perfil no tiene permiso para ver este reporte. Contacta a tu administrador si crees que es un error.'
}: {
  message?: string;
}) {
  return (
    <div className="card-bordered p-10 flex flex-col items-center text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
        <Icon name="lock" size={26} />
      </div>
      <h3 className="text-lg font-bold">Acceso no autorizado</h3>
      <p className="text-sm text-ink-variant max-w-md">{message}</p>
    </div>
  );
}
