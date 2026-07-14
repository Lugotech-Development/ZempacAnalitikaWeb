'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { apiChangePassword, classifyError } from '@/lib/api';
import { PASSWORD_RULES, isPasswordValid } from '@/lib/password-policy';

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmMatches = confirm.length > 0 && confirm === next;
  const canSubmit = current.length > 0 && isPasswordValid(next) && confirmMatches && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiChangePassword({ currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(classifyError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Cambiar contraseña" subtitle="Ingresa tu contraseña actual y elige una nueva." icon="lock" />

      {done ? (
        <div className="card max-w-md p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-positive-bg text-positive-fg flex items-center justify-center">
            <Icon name="check" size={26} />
          </div>
          <h3 className="text-lg font-bold text-ink">Contraseña actualizada</h3>
          <p className="text-sm text-ink-variant">Tu contraseña se cambió correctamente.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card max-w-md p-6 sm:p-8">
          <PasswordField label="Contraseña actual" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} autoComplete="current-password" />

          <div className="mt-5">
            <PasswordField label="Nueva contraseña" value={next} onChange={setNext} show={showNext} onToggle={() => setShowNext(v => !v)} autoComplete="new-password" />
            <ul className="mt-3 space-y-1.5">
              {PASSWORD_RULES.map(rule => {
                const ok = rule.test(next);
                return (
                  <li key={rule.label} className={`flex items-center gap-2 text-xs font-medium ${ok ? 'text-ink' : 'text-ink-variant'}`}>
                    <Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} size={15} className={ok ? 'text-positive-fg' : 'text-outline'} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5">
            <PasswordField label="Confirmar contraseña" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} autoComplete="new-password" />
            {confirm.length > 0 && !confirmMatches && <p className="mt-2 text-xs font-semibold text-danger">Las contraseñas no coinciden</p>}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-container/60 px-3.5 py-3 text-sm text-danger">
              <Icon name="error" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={!canSubmit} className="cta w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? (
              <>
                <Icon name="progress_activity" size={16} className="animate-spin" />
                Actualizando…
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </button>
        </form>
      )}
    </>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-ink-variant">{label}</span>
      <div className="mt-2 relative">
        <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className="input input-icon pr-12"
          autoComplete={autoComplete}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-outline hover:text-ink" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Icon name={show ? 'visibility_off' : 'visibility'} size={16} />
        </button>
      </div>
    </label>
  );
}
