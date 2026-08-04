'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { onToast, type ToastPayload, type ToastVariant } from '@/lib/toast-events';

const AUTO_DISMISS_MS = 6000;

const VARIANT: Record<ToastVariant, { icon: IconName; accent: string; bar: string }> = {
  error: { icon: 'error', accent: 'text-danger', bar: 'bg-danger' },
  success: { icon: 'check_circle', accent: 'text-positive-fg', bar: 'bg-positive-fg' },
  info: { icon: 'insights', accent: 'text-primary', bar: 'bg-primary' }
};

/**
 * Global toast host. Mount once in the dashboard layout. Subscribes to the
 * toast event bus (see toast-events.ts) and renders a stack of auto-dismissing,
 * dismissible notifications — used e.g. when an Excel download fails.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    return onToast(t => {
      setToasts(ts => [...ts, t]);
      setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[9998] bottom-4 right-4 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="Notificaciones">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastPayload; onDismiss: () => void }) {
  const cfg = VARIANT[toast.variant];
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-stretch overflow-hidden rounded-xl border border-surface-mid bg-surface-lowest shadow-card animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className={`w-1 shrink-0 ${cfg.bar}`} aria-hidden="true" />
      <div className="flex flex-1 min-w-0 items-start gap-2.5 px-3.5 py-3">
        <Icon name={cfg.icon} size={18} className={`${cfg.accent} mt-0.5 shrink-0`} />
        <p className="flex-1 min-w-0 break-words text-sm font-medium text-ink">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          className="-mr-1 shrink-0 rounded-md p-1 text-outline hover:bg-surface-low hover:text-ink">
          <Icon name="close" size={15} />
        </button>
      </div>
    </div>
  );
}
