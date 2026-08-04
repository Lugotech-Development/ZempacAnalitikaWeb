'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icon';
import { apiLogoutConfirmed } from '@/lib/api';
import { invalidateAll } from '@/lib/cache';

type LogoutState = 'idle' | 'pending' | 'error';

/**
 * Drives the voluntary "Cerrar sesión" flow.
 *
 * Unlike an involuntary logout, it refuses to sign the user out locally until
 * the backend confirms the session was revoked (see `apiLogoutConfirmed`).
 * Because the backend allows a single active session per platform, clearing the
 * session locally while the server still holds one would lock the account with
 * no way to retry. A blocking spinner shows while the revoke is in flight; on
 * success it navigates to `/login`; on failure it shows a retry/cancel overlay
 * and the user stays logged in so they can try again later.
 *
 * Returns the `logout` handler to wire to every "Cerrar sesión" button and the
 * `overlay` node to render once inside the shell.
 */
export function useLogout(): { logout: () => void; overlay: React.ReactNode } {
  const router = useRouter();
  const [state, setState] = useState<LogoutState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(async () => {
    setState('pending');
    setMessage(null);
    const result = await apiLogoutConfirmed();
    if (result.ok) {
      invalidateAll();
      router.replace('/login');
      return; // keep the spinner until navigation unmounts the dashboard
    }
    setMessage(result.message);
    setState('error');
  }, [router]);

  const logout = useCallback(() => void run(), [run]);

  const overlay =
    state === 'idle' ? null : (
      <LogoutOverlay
        state={state}
        message={message}
        onRetry={() => void run()}
        onCancel={() => setState('idle')}
      />
    );

  return { logout, overlay };
}

function LogoutOverlay({
  state,
  message,
  onRetry,
  onCancel
}: {
  state: 'pending' | 'error';
  message: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    // Full-screen backdrop — not dismissible on click; the choice is explicit.
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-lowest shadow-card p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {state === 'pending' ? (
          <>
            <Icon name="progress_activity" size={40} className="text-primary animate-spin mb-5" />
            <h2 className="text-lg font-extrabold text-ink">Cerrando sesión…</h2>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
              <Icon name="cloud_off" size={32} className="text-tertiary" />
            </div>
            <h2 className="text-xl font-extrabold text-ink mb-2">No se pudo cerrar sesión</h2>
            <p className="text-sm text-ink-soft">
              {message ?? 'Ocurrió un error al cerrar la sesión. Inténtalo de nuevo.'}
            </p>
            <p className="mt-3 text-xs text-outline">
              Si cancelas, tu sesión seguirá abierta y podrás cerrarla más tarde.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 w-full rounded-pill bg-primary-gradient text-white px-6 py-3 text-sm font-bold shadow-cta hover:brightness-110 transition flex items-center justify-center gap-2">
              <Icon name="refresh" size={16} />
              Reintentar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 w-full rounded-pill px-6 py-3 text-sm font-bold text-ink-soft hover:bg-surface-low transition">
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
