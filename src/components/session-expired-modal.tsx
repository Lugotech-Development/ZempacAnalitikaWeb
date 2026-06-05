'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { onSessionExpired } from '@/lib/session-events';

/**
 * Global session-expired overlay modal.
 * Mount once in the dashboard layout. It subscribes to the session-expired
 * event (fired from api.ts the instant a 401 cannot be recovered) and shows
 * immediately — no router navigation needed to appear.
 *
 * Clicking "Iniciar sesión" (or the 3-second auto-redirect) uses
 * window.location.replace which is a hard navigation: instant, reliable,
 * and clears all React state.
 */
export function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    return onSessionExpired(() => {
      setVisible(true);
      setCountdown(5);
    });
  }, []);

  // Countdown → auto-redirect
  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) {
      window.location.replace('/login');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, countdown]);

  if (!visible) return null;

  return (
    // Full-screen backdrop — pointer-events blocks all interaction beneath
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-surface-lowest shadow-card p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
          <Icon name="lock_clock" size={32} className="text-tertiary" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-extrabold text-ink mb-2">Sesión Expirada</h2>
        <p className="text-sm text-ink-soft mb-6">
          Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente para continuar.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={() => window.location.replace('/login')}
          className="w-full rounded-pill bg-primary-gradient text-white px-6 py-3 text-sm font-bold shadow-cta hover:brightness-110 transition flex items-center justify-center gap-2"
        >
          <Icon name="arrow_forward" size={16} />
          Iniciar sesión
        </button>

        {/* Countdown hint */}
        <p className="mt-4 text-xs text-outline">
          Redirigiendo en {countdown}s…
        </p>
      </div>
    </div>
  );
}
