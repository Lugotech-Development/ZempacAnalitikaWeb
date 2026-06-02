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
  empty: 'inbox'
};

const VARIANT_TITLE: Record<ErrorVariant, string> = {
  network: 'Error al cargar datos',
  session: 'Sesión expirada',
  server: 'Algo salió mal',
  empty: 'Sin datos para mostrar'
};

export function ErrorState({ variant, message, onRetry }: { variant: ErrorVariant; message?: string; onRetry?: () => void }) {
  return (
    <div className="card-bordered p-10 flex flex-col items-center text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
        <Icon name={VARIANT_ICON[variant]} size={26} />
      </div>
      <h3 className="text-lg font-bold">{VARIANT_TITLE[variant]}</h3>
      {message && <p className="text-sm text-ink-variant max-w-md">{message}</p>}
      {onRetry && variant !== 'session' && (
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
