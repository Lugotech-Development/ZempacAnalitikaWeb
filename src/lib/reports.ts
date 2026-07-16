// Canonical mapping between dashboard routes and the backend permission keys
// their screen requires. Reports are gated at the MODULE level: the backend's
// granular in-module permissions (e.g. cxc-resumen / cxc-antiguedad /
// cxc-top-clientes for Cuentas por Cobrar) aren't implemented yet, so having the
// module key means full access to the module. A route lists every key it needs
// and a report shows only if the user holds them all (see canViewReportKeys) —
// today that's one module key each, but the list is ready for when granular
// sub-report keys land. Mirror of the Flutter report catalog. Single source for
// nav, Cmd-K search, and route guard.

export type ReportRoute = { href: string; reportKeys: string[] };

export const REPORT_ROUTES: ReportRoute[] = [
  { href: '/dashboard', reportKeys: ['pantalla-principal-v2'] },
  { href: '/dashboard/ventas', reportKeys: ['ventas-30'] },
  { href: '/dashboard/devoluciones', reportKeys: ['devoluciones-30'] },
  { href: '/dashboard/productos', reportKeys: ['productos-mas-vendidos'] },
  { href: '/dashboard/cuentas-por-cobrar', reportKeys: ['cuentas-por-cobrar'] },
  { href: '/dashboard/cuadre-caja', reportKeys: ['analitica-lote-condensado'] },
  { href: '/dashboard/ventas-producto-marca', reportKeys: ['ventas-producto-marca'] },
  { href: '/dashboard/ventas-facturador', reportKeys: ['ventas-facturador-sucursal'] },
  { href: '/dashboard/productos-negativos', reportKeys: ['analitica-productos-negativos'] }
];

/**
 * The permission keys guarding [pathname], or `null` when the route isn't a
 * gated report (e.g. preview reports or change-password). `/dashboard` matches
 * exactly; report sub-routes (e.g. `/dashboard/ventas/[sucursal]`) match by
 * prefix, preferring the most specific route. Query/hash are ignored.
 */
export function reportKeysForPath(pathname: string): string[] | null {
  pathname = pathname.split('?')[0].split('#')[0];
  let best: ReportRoute | null = null;
  for (const r of REPORT_ROUTES) {
    if (r.href === '/dashboard') {
      if (pathname === '/dashboard') return r.reportKeys;
      continue;
    }
    if (pathname === r.href || pathname.startsWith(r.href + '/')) {
      if (!best || r.href.length > best.href.length) best = r;
    }
  }
  return best?.reportKeys ?? null;
}
