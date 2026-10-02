import Link from 'next/link';
import { Icon } from '@/components/icon';

// Replaces Next's default 404, which prerenders inline `style` attributes that
// the CSP (`style-src 'self'`) blocks — and isn't in Spanish.
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card-bordered p-10 flex flex-col items-center text-center gap-3 max-w-md w-full">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon name="search" size={26} />
        </div>
        <h1 className="text-lg font-bold">Página no encontrada</h1>
        <p className="text-sm text-ink-variant">La página que buscas no existe o fue movida.</p>
        <Link href="/" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <Icon name="arrow_back" size={16} />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
