import { ScreenNames } from './events';

/** Maps a Next.js pathname to a canonical screen name (see ScreenNames). */
export function screenNameForPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, '');
  if (p === '' || p === '/login') return ScreenNames.login;
  if (p === '/dashboard') return ScreenNames.principal;
  if (/^\/dashboard\/ventas\/[^/]+$/.test(p)) return ScreenNames.ventasSucursalDetail;
  if (/^\/dashboard\/devoluciones\/[^/]+$/.test(p)) return ScreenNames.devolucionesSucursalDetail;
  const seg = p.startsWith('/dashboard/') ? p.slice('/dashboard/'.length) : p.replace(/^\//, '');
  switch (seg) {
    case 'ventas':
      return ScreenNames.ventas;
    case 'devoluciones':
      return ScreenNames.devoluciones;
    case 'productos':
      return ScreenNames.productos;
    case 'cuadre-caja':
      return ScreenNames.cuadreCaja;
    case 'cuentas-por-cobrar':
      return ScreenNames.cuentasPorCobrar;
    case 'ventas-producto-marca':
      return ScreenNames.ventasProductoMarca;
    case 'ventas-facturador':
      return ScreenNames.ventasFacturador;
    case 'inventario':
      return ScreenNames.inventario;
    case 'vencimientos':
      return ScreenNames.vencimientos;
    case 'transferencias':
      return ScreenNames.transferencias;
    default:
      return seg || 'unknown';
  }
}
