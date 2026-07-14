// Canonical mapping between dashboard routes and their backend permission key.
// The backend keys a report by its primary API endpoint path (verified live:
// `/api/Reportes/pantalla-principal-v2` → `pantalla-principal-v2`,
// `/api/Reportes/cxc/antiguedad` → `cxc-antiguedad`). A screen calls several
// endpoints; we gate on its primary one and let the per-request 403 handling
// cover any sub-endpoint the user lacks. Mirror of the Flutter report catalog.
// This is the single place navigation, the Cmd-K search index, and the route
// guard read from — keep report identities here only.

export type ReportRoute = { href: string; reportKey: string };

export const REPORT_ROUTES: ReportRoute[] = [
  { href: '/dashboard', reportKey: 'pantalla-principal-v2' },
  { href: '/dashboard/ventas', reportKey: 'ventas-30' },
  { href: '/dashboard/devoluciones', reportKey: 'devoluciones-30' },
  { href: '/dashboard/productos', reportKey: 'productos-mas-vendidos' },
  { href: '/dashboard/cuentas-por-cobrar', reportKey: 'cuentas-por-cobrar' },
  { href: '/dashboard/cuadre-caja', reportKey: 'analitica-lote-condensado' },
  { href: '/dashboard/ventas-producto-marca', reportKey: 'ventas-producto-marca' },
  { href: '/dashboard/ventas-facturador', reportKey: 'ventas-facturador-sucursal' },
  { href: '/dashboard/productos-negativos', reportKey: 'analitica-productos-negativos' }
];

/**
 * The permission key guarding [pathname], or `null` when the route isn't a
 * gated report (e.g. the preview reports or change-password). `/dashboard`
 * matches exactly; report sub-routes (e.g. `/dashboard/ventas/[sucursal]`)
 * match by prefix, preferring the most specific route.
 */
export function reportKeyForPath(pathname: string): string | null {
  pathname = pathname.split('?')[0].split('#')[0];
  let best: ReportRoute | null = null;
  for (const r of REPORT_ROUTES) {
    if (r.href === '/dashboard') {
      if (pathname === '/dashboard') return r.reportKey;
      continue;
    }
    if (pathname === r.href || pathname.startsWith(r.href + '/')) {
      if (!best || r.href.length > best.href.length) best = r;
    }
  }
  return best?.reportKey ?? null;
}
