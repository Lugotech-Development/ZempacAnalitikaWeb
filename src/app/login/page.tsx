'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Icon } from '@/components/icon';
import { ZempacLogo, LugotechCredit } from '@/components/common';
import { apiLogin, classifyError } from '@/lib/api';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState<'empresa' | 'credenciales'>('empresa');
  const [empresa, setEmpresa] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [keepSession, setKeepSession] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa.trim()) {
      setError('Ingresa el nombre de la empresa');
      return;
    }
    setError(null);
    setStep('credenciales');
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError('Completa todos los campos');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiLogin({
        empresa: empresa.trim(),
        usuario: usuario.trim(),
        password
      });
      const dest = search.get('from') ?? '/dashboard';
      router.replace(dest);
    } catch (e) {
      const { variant, message } = classifyError(e);
      setError(variant === 'network' ? 'No se pudo conectar con el servidor. Verifica tu conexión.' : message || 'No se pudo iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface relative overflow-hidden">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary-container/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 px-6 py-5">
        <Link href="/" className="inline-block">
          <ZempacLogo />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          {step === 'empresa' ? (
            <form onSubmit={submitEmpresa} className="card p-8 sm:p-10 animate-[fadeIn_.35s_ease-out]">
              <ZempacLogo />
              <h1 className="mt-10 text-[26px] font-bold tracking-tight text-ink">Bienvenido</h1>
              <p className="mt-1.5 text-sm text-ink-variant">Ingresa el nombre de tu empresa para continuar.</p>

              <label className="mt-8 block">
                <span className="eyebrow text-ink-variant">Empresa</span>
                <div className="mt-2 relative">
                  <Icon name="apartment" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant" />
                  <input autoFocus type="text" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nombre de la empresa" className="input input-icon" />
                </div>
              </label>

              {error && <ErrorBanner message={error} />}

              <button type="submit" className="cta w-full mt-6">
                Continuar
                <Icon name="arrow_forward" size={16} />
              </button>

              <p className="mt-6 text-center text-xs text-ink-variant">
                ¿No tienes acceso?{' '}
                <a href="mailto:soporte@zempac.com" className="font-semibold text-primary hover:underline">
                  Contacta a tu administrador
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={submitLogin} className="card p-8 sm:p-10 animate-[fadeIn_.35s_ease-out]">
              <ZempacLogo />

              <button
                type="button"
                onClick={() => {
                  setStep('empresa');
                  setError(null);
                  setUsuario('');
                  setPassword('');
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-pill border border-primary/15 bg-primary/[0.06] px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition max-w-full">
                <Icon name="apartment" size={14} />
                <span className="truncate">{empresa.trim()}</span>
                <Icon name="edit" size={12} className="opacity-50" />
              </button>

              <h1 className="mt-6 text-[26px] font-bold tracking-tight text-ink">Iniciar sesión</h1>
              <p className="mt-1.5 text-sm text-ink-variant">Usa tus credenciales para acceder al panel.</p>

              <label className="mt-8 block">
                <span className="eyebrow text-ink-variant">Usuario</span>
                <div className="mt-2 relative">
                  <Icon name="person" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant" />
                  <input autoFocus type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Tu usuario" className="input input-icon" autoComplete="username" />
                </div>
              </label>

              <label className="mt-5 block">
                <span className="eyebrow text-ink-variant">Contraseña</span>
                <div className="mt-2 relative">
                  <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline-variant" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input input-icon pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-outline hover:text-ink"
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <Icon name={showPwd ? 'visibility_off' : 'visibility'} size={16} />
                  </button>
                </div>
              </label>

              <label className="mt-4 flex items-center gap-2.5 text-sm text-ink-variant cursor-pointer select-none">
                <input type="checkbox" checked={keepSession} onChange={e => setKeepSession(e.target.checked)} className="h-4 w-4 rounded border-surface-high text-primary focus:ring-primary/30" />
                Mantener sesión iniciada
              </label>

              {error && <ErrorBanner message={error} />}

              <button type="submit" disabled={loading} className="cta w-full mt-6">
                {loading ? (
                  <>
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                    Iniciando…
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <Icon name="arrow_forward" size={16} />
                  </>
                )}
              </button>

              <p className="mt-6 text-center text-xs text-ink-variant">
                ¿Olvidaste tu contraseña?{' '}
                <a href="mailto:soporte@zempac.com" className="font-semibold text-primary hover:underline">
                  Contacta a tu administrador
                </a>
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-6 flex justify-center">
        <LugotechCredit />
      </footer>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-container/60 px-3.5 py-3 text-sm text-danger">
      <Icon name="error" size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
