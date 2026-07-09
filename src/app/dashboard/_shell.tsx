'use client';

const APP_VERSION = '1.9.0';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { ZempacLogo } from '@/components/common';
import { GlobalSearch } from '@/components/global-search';
import { apiLogout } from '@/lib/api';
import { invalidateAll } from '@/lib/cache';
import type { SessionInfo } from '@/lib/types';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Principal', icon: 'grid_view' },
  { href: '/dashboard/ventas', label: 'Ventas', icon: 'show_chart' },
  {
    href: '/dashboard/devoluciones',
    label: 'Devoluciones',
    icon: 'keyboard_return'
  },
  { href: '/dashboard/productos', label: 'Productos', icon: 'shopping_bag' },
  // { href: '/dashboard/inventario', label: 'Inventario', icon: 'inventory_2' },
  // { href: '/dashboard/vencimientos', label: 'Vencimientos', icon: 'hourglass_top' },
  // { href: '/dashboard/transferencias', label: 'Transferencias', icon: 'swap_horiz' },
  { href: '/dashboard/cuentas-por-cobrar', label: 'Cuentas por Cobrar', icon: 'request_quote' },
  {
    href: '/dashboard/cuadre-caja',
    label: 'Cuadre de Caja',
    icon: 'point_of_sale'
  },
  { href: '/dashboard/ventas-producto-marca', label: 'Ventas por Marca', icon: 'sell' },
  { href: '/dashboard/ventas-facturador', label: 'Ventas por Facturador', icon: 'badge' },
  { href: '/dashboard/productos-negativos', label: 'Productos Negativos', icon: 'warning' }
];

export default function DashboardShell({ children, session }: { children: React.ReactNode; session: SessionInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    apiLogout();
    invalidateAll();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar pathname={pathname} session={session} onLogout={logout} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-lowest shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-mid">
              <ZempacLogo size={28} />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-surface-low" aria-label="Cerrar menú">
                <Icon name="close" size={18} />
              </button>
            </div>
            <NavList pathname={pathname} onClick={() => setMobileOpen(false)} />
            <p className="mx-6 mt-4 text-xs font-medium text-outline">v{APP_VERSION}</p>
            <button onClick={logout} className="mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-tertiary hover:bg-tertiary/5">
              <Icon name="logout" size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        <Topbar onMenu={() => setMobileOpen(true)} session={session} onLogout={logout} />
        <main className="mx-auto max-w-6xl px-5 sm:px-8 py-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ pathname, session, onLogout }: { pathname: string; session: SessionInfo; onLogout: () => void }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col bg-surface-lowest border-r border-surface-mid">
      <div className="px-6 py-6 border-b border-surface-mid">
        <ZempacLogo />
      </div>
      <div className="px-4 pt-4">
        <p className="eyebrow px-2">Empresa</p>
        <p className="mt-1 px-2 text-sm font-bold text-ink truncate">{session.empresa || '—'}</p>
      </div>
      <nav className="mt-6 flex-1 overflow-y-auto zsb-scroll">
        <NavList pathname={pathname} />
      </nav>
      <p className="px-5 pb-3 text-xs font-medium text-outline">v{APP_VERSION}</p>
      <div className="p-3 border-t border-surface-mid">
        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-tertiary hover:bg-tertiary/5">
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function NavList({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <ul className="px-3 space-y-1">
      {NAV.map(({ href, label, icon }) => {
        const active = href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/');
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onClick}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-primary text-white shadow-cta' : 'text-ink-variant hover:bg-surface-low hover:text-ink'
              }`}>
              <Icon name={icon} size={18} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Topbar({ onMenu, session, onLogout }: { onMenu: () => void; session: SessionInfo; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (session.usuario || 'U').slice(0, 1).toUpperCase();
  return (
    <header className="sticky top-0 z-20 bg-surface-low/80 backdrop-blur border-b border-surface-mid">
      <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-3">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-lg hover:bg-surface-mid" aria-label="Abrir menú">
          <Icon name="menu" size={18} />
        </button>

        <div className="hidden md:block w-full max-w-md">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button onClick={onMenu} className="md:hidden p-2 rounded-lg hover:bg-surface-mid" aria-label="Buscar">
            <Icon name="search" size={18} />
          </button>

          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-pill hover:bg-surface-mid" aria-label="Menú de usuario" aria-expanded={menuOpen}>
              <span className="h-8 w-8 rounded-full bg-primary-gradient text-white flex items-center justify-center text-sm font-bold">{initials}</span>
              <span className="hidden sm:inline text-sm font-semibold text-ink">{session.usuario || 'Usuario'}</span>
              <Icon name="expand_more" size={14} className="text-ink-variant" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 card-bordered p-2 z-10" onMouseLeave={() => setMenuOpen(false)}>
                <div className="px-3 py-2 text-xs text-ink-variant">
                  Conectado como
                  <p className="text-sm font-bold text-ink truncate">{session.usuario || '—'}</p>
                  <p className="text-[11px] text-outline truncate">{session.empresa || ''}</p>
                </div>
                <button onClick={onLogout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-tertiary hover:bg-tertiary/5">
                  <Icon name="logout" size={14} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
