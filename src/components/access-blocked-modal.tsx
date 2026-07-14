'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { apiLogout } from '@/lib/api';
import { onAccessBlocked, type AccessBlock } from '@/lib/access-block-events';
import { fmtDate } from '@/lib/format';

/**
 * Global access-blocked overlay. Mount once in the dashboard layout. It listens
 * for the access-block event (fired from api.ts the instant the backend
 * middleware refuses a request) and takes over the screen, preventing any
 * further use until the user signs out.
 *
 * It is deliberately generic: the backend `message` is shown verbatim and the
 * only per-`code` customization is the title + icon below. An unknown code
 * still renders premium-ly via DEFAULT_PRESENTATION, so new block types need no
 * changes here.
 */

type Presentation = { title: string; icon: IconName };

// Per-code look. Add an entry when a new block deserves its own title/icon;
// anything not listed falls back to DEFAULT_PRESENTATION.
const PRESENTATION: Record<string, Presentation> = {
  TRIAL_VENCIDO: { title: 'Periodo de prueba finalizado', icon: 'hourglass_top' },
  // Single-session enforcement: the backend blocks this browser when a newer
  // login of the same environment (web, clientType 0) takes over the account.
  // Confirm the exact code with the backend team (plan coordination point #3);
  // the modal already works for any code.
  SESION_DUPLICADA: { title: 'Sesión iniciada en otro dispositivo', icon: 'smartphone' }
};

const DEFAULT_PRESENTATION: Presentation = { title: 'Acceso restringido', icon: 'lock' };

export function AccessBlockedModal() {
  const [block, setBlock] = useState<AccessBlock | null>(null);

  useEffect(() => {
    return onAccessBlocked(b => setBlock(b));
  }, []);

  if (!block) return null;

  const { title, icon } = PRESENTATION[block.code] ?? DEFAULT_PRESENTATION;

  const handleSignOut = () => {
    apiLogout();
    window.location.replace('/login');
  };

  return (
    // Full-screen backdrop — no dismiss on click; the block is intentionally sticky.
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="access-block-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-[fadeIn_.15s_ease-out] p-4">
      <div className="w-full max-w-md rounded-card bg-surface-lowest shadow-card p-8 flex flex-col items-center text-center animate-[fadeIn_.2s_ease-out]">
        <div className="h-16 w-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
          <Icon name={icon} size={32} className="text-tertiary" />
        </div>

        {block.empresaNombre && (
          <p className="eyebrow text-outline mb-2">{block.empresaNombre}</p>
        )}

        <h2 id="access-block-title" className="text-xl font-extrabold text-ink mb-2">
          {title}
        </h2>
        <p className="text-sm text-ink-variant">{block.message}</p>

        {block.fechaVencimiento && (
          <div className="mt-5 w-full rounded-xl bg-surface-low px-4 py-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-variant">
              <Icon name="schedule" size={15} className="text-outline" />
              Vencimiento
            </span>
            <span className="text-xs font-bold text-ink tabular-nums">{fmtDate(block.fechaVencimiento)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 w-full rounded-pill bg-primary-gradient text-white px-6 py-3 text-sm font-bold shadow-cta hover:brightness-110 transition flex items-center justify-center gap-2">
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>

        <p className="mt-4 text-[11px] text-outline tracking-wide">
          Referencia: <span className="font-semibold">{block.code}</span>
        </p>
      </div>
    </div>
  );
}
