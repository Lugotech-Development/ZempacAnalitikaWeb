'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { SessionDetailRow } from '@/components/session-conflict-modal';
import { onSessionExpired, type SessionEndReason } from '@/lib/session-events';
import { fmtDateTime } from '@/lib/format';

/**
 * Global session-expired overlay.
 * Mount once in the dashboard layout. It subscribes to the session-expired
 * event (fired from api.ts the instant a 401 cannot be recovered) and shows
 * immediately — no router navigation needed to appear.
 *
 * Two shapes, decided by whether the backend named a cause:
 *
 * - **Plain expiry** (no reason, or a code we don't know): the token aged out.
 * - **Revoked by a login elsewhere**: an involuntary sign-out the user did not
 *   perform here, so it names the device that caused it and adds the security
 *   prompt — this is how someone learns their account was accessed from a device
 *   they don't recognize.
 *
 * **Neither shape closes itself.** Both mean "you have been signed out", and a
 * message that vanishes on a timer is a message the user may never have read —
 * they could be away from the keyboard for the whole countdown. Leaving requires
 * pressing "Iniciar sesión".
 *
 * Adding a new code is one PRESENTATION entry; anything unrecognized keeps the
 * plain-expiry copy, so an unfamiliar code can never produce a wrong claim.
 */

type Presentation = {
  title: string;
  body: string;
  icon: IconName;
  /** An eviction the user did not perform here — earns the device details and
   *  the "¿No fuiste tú?" prompt. Both shapes stay put either way. */
  urgent: boolean;
};

const PRESENTATION: Record<string, Presentation> = {
  SESSION_REVOKED_BY_NEW_LOGIN: {
    title: 'Cerramos tu sesión aquí',
    body: 'Se inició sesión con tu cuenta en otro dispositivo. Por seguridad solo puede haber una sesión activa a la vez.',
    icon: 'devices',
    urgent: true
  }
};

const PLAIN: Presentation = {
  title: 'Sesión Expirada',
  body: 'Tu sesión ha finalizado. Por favor inicia sesión nuevamente para continuar.',
  icon: 'lock_clock',
  urgent: false
};

export function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<SessionEndReason | null>(null);

  useEffect(() => {
    return onSessionExpired(r => {
      setReason(r);
      setVisible(true);
    });
  }, []);

  const shown = (reason && PRESENTATION[reason.code]) ?? PLAIN;

  // Deliberately no countdown: leaving is the user's action, not a timer's.

  if (!visible) return null;

  const hasDetails = Boolean(reason?.deviceName || reason?.ipAddress || reason?.at);

  return (
    // Full-screen backdrop — pointer-events blocks all interaction beneath
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm animate-[fadeIn_.15s_ease-out] p-4">
      <div className="w-full max-w-sm rounded-card bg-surface-lowest shadow-card p-8 flex flex-col items-center text-center animate-[fadeIn_.2s_ease-out]">
        <div className="h-16 w-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
          <Icon name={shown.icon} size={32} className="text-tertiary" />
        </div>

        <h2 id="session-expired-title" className="text-xl font-extrabold text-ink mb-2">
          {shown.title}
        </h2>
        <p className="text-sm text-ink-variant">{shown.body}</p>

        {hasDetails && (
          <div className="mt-5 w-full rounded-xl bg-surface-low px-4 divide-y divide-outline-variant/40">
            {reason?.deviceName && <SessionDetailRow icon="devices" label="Dispositivo" value={reason.deviceName} />}
            {reason?.ipAddress && <SessionDetailRow icon="public" label="Dirección IP" value={reason.ipAddress} numeric />}
            {reason?.at && <SessionDetailRow icon="schedule" label="Fecha" value={fmtDateTime(reason.at)} numeric />}
          </div>
        )}

        {/* The whole point of naming the device: if the user doesn't recognize
            it, this is how they learn their credentials are compromised. */}
        {shown.urgent && (
          <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-danger-container/60 px-3.5 py-3 text-left text-sm text-danger">
            <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
            <span>
              ¿No fuiste tú? Cambia tu contraseña y avisa a tu administrador.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => window.location.replace('/login')}
          className="mt-6 w-full rounded-pill bg-primary-gradient text-white px-6 py-3 text-sm font-bold shadow-cta hover:brightness-110 transition flex items-center justify-center gap-2">
          <Icon name="arrow_forward" size={16} />
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
