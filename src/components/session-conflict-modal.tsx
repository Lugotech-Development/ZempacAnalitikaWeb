'use client';

import { useEffect, useRef } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { fmtDateTime } from '@/lib/format';
import type { SesionActiva } from '@/lib/types';

/**
 * The "another device is already signed in" dialog, shown when login returns a
 * 409 ([SessionConflictError]). The credentials were already accepted at this
 * point — what is missing is a decision, so this asks for one instead of
 * dead-ending in the login form's error banner.
 *
 * Two rules the backend contract is explicit about (§6 of the frontend guide):
 * the other session is NEVER closed without an explicit action, and this dialog
 * must not be able to confirm itself.
 *
 * Both are satisfied without hiding the action the user actually came for. The
 * eviction is a filled danger button in the primary slot — the standard shape
 * for a destructive confirmation — while "Cancelar" is the quiet one but still
 * takes initial focus, so Enter (which the user just pressed to submit the login
 * form, and may repeat) cancels rather than destroys. Same arrangement as a
 * macOS destructive alert: red button, Cancel is the default. Nothing here is a
 * submit button inside a form, so Enter never reaches the eviction.
 *
 * No password is asked for again: the 409 only happens AFTER the backend
 * validated it, seconds earlier. Re-typing the same secret would prove nothing
 * that was not just proven.
 */
export function SessionConflictModal({
  sesion,
  message,
  pending,
  error,
  onConfirm,
  onCancel
}: {
  sesion: SesionActiva | null;
  message: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe action, not the destructive one.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Lock background scroll while the dialog owns the screen. The scrollbar's
  // width is handed back as padding so removing it doesn't jump the layout
  // sideways on platforms with classic (non-overlay) scrollbars.
  useEffect(() => {
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, []);

  // Escape cancels — but never while the eviction is in flight, since the
  // backend is already acting on it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, onCancel]);

  const deviceName = sesion?.deviceName?.trim() || null;
  const userAgent = sesion?.userAgent?.trim() || null;
  const hasDetails = Boolean(deviceName || sesion?.ipAddress || sesion?.createdAt);

  return (
    // Full-screen backdrop — not dismissible on click; the choice is explicit.
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-conflict-title"
      aria-describedby="session-conflict-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm animate-[fadeIn_.15s_ease-out] p-4">
      <div className="w-full max-w-md rounded-card bg-surface-lowest shadow-card p-8 flex flex-col items-center text-center animate-[fadeIn_.2s_ease-out]">
        <div className="h-16 w-16 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-5">
          <Icon name="devices" size={32} className="text-tertiary" />
        </div>

        {sesion?.username && <p className="eyebrow text-outline mb-2">{sesion.username}</p>}

        <h2 id="session-conflict-title" className="text-xl font-extrabold text-ink mb-2">
          Ya tienes una sesión activa
        </h2>

        <p id="session-conflict-desc" className="text-sm text-ink-variant">
          {hasDetails
            ? 'Tu cuenta está abierta en otro dispositivo. Solo puede haber una sesión a la vez, así que para continuar aquí esa sesión debe cerrarse.'
            : message}
        </p>

        {hasDetails && (
          <div className="mt-5 w-full rounded-xl bg-surface-low px-4 divide-y divide-outline-variant/40">
            <SessionDetailRow icon="devices" label="Dispositivo" value={deviceName ?? 'Otro dispositivo'} />
            {sesion?.ipAddress && <SessionDetailRow icon="public" label="Dirección IP" value={sesion.ipAddress} numeric />}
            {sesion?.createdAt && <SessionDetailRow icon="schedule" label="Inicio de sesión" value={fmtDateTime(sesion.createdAt)} numeric />}
          </div>
        )}

        {/* Sessions created before clients sent deviceName have only a raw UA —
            better than nothing for recognizing your own machine. */}
        {hasDetails && !deviceName && userAgent && (
          <p className="mt-2 w-full truncate text-[11px] text-outline" title={userAgent}>
            {userAgent}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-variant">
          Si continúas, el otro dispositivo se cerrará y deberá iniciar sesión de nuevo.
        </p>

        {error && (
          <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-danger-container/60 px-3.5 py-3 text-left text-sm text-danger">
            <Icon name="error" size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="mt-6 w-full rounded-pill bg-danger text-white px-6 py-3 text-sm font-bold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {pending ? (
            <>
              <Icon name="progress_activity" size={16} className="animate-spin" />
              Cerrando sesión…
            </>
          ) : (
            <>
              <Icon name="logout" size={16} />
              Cerrar sesión y continuar
            </>
          )}
        </button>

        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="mt-2 w-full rounded-pill px-6 py-3 text-sm font-bold text-ink-variant hover:bg-surface-low transition disabled:opacity-50 disabled:cursor-not-allowed">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Shared with SessionExpiredModal — the same device/IP/date rows in both. */
export function SessionDetailRow({ icon, label, value, numeric = false }: { icon: IconName; label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-variant shrink-0">
        <Icon name={icon} size={15} className="text-outline" />
        {label}
      </span>
      <span className={`text-xs font-bold text-ink truncate ${numeric ? 'tabular-nums' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}
