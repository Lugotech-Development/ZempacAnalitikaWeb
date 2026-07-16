'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { apiProductos, apiSucursales } from '@/lib/api';
import { fetchAndCache, getCached } from '@/lib/cache';
import { canViewReportKeys } from '@/lib/permissions';
import { reportKeysForPath } from '@/lib/reports';
import type { RptProductoMasVendido, Sucursal } from '@/lib/types';

type Hit = {
  type: 'Reporte' | 'Producto' | 'Sucursal';
  title: string;
  subtitle?: string;
  href: string;
  icon: IconName;
};

const REPORTS: Hit[] = [
  {
    type: 'Reporte',
    title: 'Pantalla Principal',
    subtitle: 'Resumen ejecutivo del mes',
    href: '/dashboard',
    icon: 'grid_view'
  },
  {
    type: 'Reporte',
    title: 'Ventas',
    subtitle: 'Detalle diario por sucursal',
    href: '/dashboard/ventas',
    icon: 'show_chart'
  },
  {
    type: 'Reporte',
    title: 'Devoluciones',
    subtitle: 'Motivos y notas de crédito',
    href: '/dashboard/devoluciones',
    icon: 'keyboard_return'
  },
  {
    type: 'Reporte',
    title: 'Productos más vendidos',
    subtitle: 'Ranking del periodo',
    href: '/dashboard/productos',
    icon: 'shopping_bag'
  },
  // {
  //   type: 'Reporte',
  //   title: 'Inventario',
  //   subtitle: 'Stock y valor por sucursal',
  //   href: '/dashboard/inventario',
  //   icon: 'inventory_2'
  // },
  // {
  //   type: 'Reporte',
  //   title: 'Vencimientos',
  //   subtitle: 'Lotes próximos a vencer',
  //   href: '/dashboard/vencimientos',
  //   icon: 'hourglass_top'
  // },
  // {
  //   type: 'Reporte',
  //   title: 'Transferencias',
  //   subtitle: 'Movimientos entre sucursales',
  //   href: '/dashboard/transferencias',
  //   icon: 'swap_horiz'
  // },
  {
    type: 'Reporte',
    title: 'Cuentas por Cobrar',
    subtitle: 'Créditos a clientes y antigüedad',
    href: '/dashboard/cuentas-por-cobrar',
    icon: 'request_quote'
  },
  {
    type: 'Reporte',
    title: 'Cuadre de Caja',
    subtitle: 'Conciliación diaria',
    href: '/dashboard/cuadre-caja',
    icon: 'point_of_sale'
  },
  {
    type: 'Reporte',
    title: 'Productos Negativos',
    subtitle: 'Existencias negativas por sucursal',
    href: '/dashboard/productos-negativos',
    icon: 'warning'
  }
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [sucursales, setSucursales] = useState<Sucursal[]>(() => getCached<Sucursal[]>('sucursales')?.data ?? []);
  const [productos, setProductos] = useState<RptProductoMasVendido[]>(() => getCached<RptProductoMasVendido[]>('rpt:productos')?.data ?? []);
  const indexLoaded = useRef(sucursales.length > 0 || productos.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Defer index fetch until the user actually opens the search. Reuses the
  // same SWR cache the report pages use, so if Ventas/Productos already
  // populated the cache there is nothing to fetch.
  const ensureIndex = () => {
    if (indexLoaded.current) return;
    indexLoaded.current = true;
    Promise.allSettled([fetchAndCache('sucursales', apiSucursales), fetchAndCache('rpt:productos', apiProductos)]).then(results => {
      if (results[0].status === 'fulfilled') setSucursales(results[0].value as Sucursal[]);
      if (results[1].status === 'fulfilled') setProductos(results[1].value as RptProductoMasVendido[]);
    });
  };

  const INDEX: Hit[] = useMemo(() => {
    return [
      ...REPORTS,
      ...productos.map<Hit>(p => ({
        type: 'Producto',
        title: p.productoNombre ?? p.producto ?? '—',
        subtitle: p.producto ? `Código ${p.producto}` : undefined,
        href: p.producto ? `/dashboard/productos?sku=${encodeURIComponent(p.producto)}` : '/dashboard/productos',
        icon: 'shopping_bag'
      })),
      ...sucursales.map<Hit>(s => ({
        type: 'Sucursal',
        title: s.nombre,
        subtitle: `Ventas · sucursal ${s.id}`,
        href: `/dashboard/ventas/${s.id}`,
        icon: 'store'
      }))
    ];
  }, [productos, sucursales]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ensureIndex();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const source = q ? INDEX : REPORTS;
    // Hide hits for reports the user's profile can't see (covers report,
    // producto → /dashboard/productos, and sucursal → /dashboard/ventas hits).
    const base = source.filter(h => {
      const keys = reportKeysForPath(h.href);
      if (keys && !canViewReportKeys(keys)) return false;
      if (!q) return true;
      return normalize(h.title).includes(q) || (h.subtitle ? normalize(h.subtitle).includes(q) : false);
    });
    return base.slice(0, 8);
  }, [query, INDEX]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const go = (hit: Hit) => {
    setOpen(false);
    setQuery('');
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[active];
      if (hit) go(hit);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-lowest border border-surface-mid focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition">
        <Icon name="search" size={16} className="text-outline" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            ensureIndex();
            setQuery(e.target.value);
          }}
          onFocus={() => {
            ensureIndex();
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar reportes, productos, sucursales…"
          className="bg-transparent text-sm flex-1 outline-none placeholder:text-outline"
          aria-label="Búsqueda global"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-outline bg-surface-low border border-surface-mid rounded px-1.5 py-0.5">⌘K</kbd>
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-2 card-bordered overflow-hidden z-30">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-variant">
              Sin resultados para <span className="font-bold text-ink">“{query}”</span>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto zsb-scroll py-1">
              {results.map((hit, i) => {
                const isActive = i === active;
                return (
                  <li key={`${hit.type}-${hit.title}-${i}`}>
                    <Link
                      href={hit.href}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`flex items-center gap-3 px-3 py-2 mx-1 rounded-lg transition ${isActive ? 'bg-surface-low' : ''}`}>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon name={hit.icon} size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink truncate">{hit.title}</p>
                        {hit.subtitle && <p className="text-[11px] text-ink-variant truncate">{hit.subtitle}</p>}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-eyebrow text-outline shrink-0">{hit.type}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-3 py-2 border-t border-surface-mid bg-surface-low/60 flex items-center justify-between text-[10px] text-outline font-semibold">
            <span>↑ ↓ navegar · ↵ abrir · esc cerrar</span>
            <span>
              {results.length} resultado{results.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
