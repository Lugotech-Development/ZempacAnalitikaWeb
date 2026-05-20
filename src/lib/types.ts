// TypeScript types mirroring lib/models/*.dart from the Flutter app.
// All fields are optional because the upstream API may omit them; the UI must
// handle nulls/zeros gracefully.

export type Sucursal = {
  id: number;
  nombre: string;
};

export type RptPantallaPrincipal = {
  totalVendidoMesActual: number | null;
  totalVendidoMesAnterior: number | null;
  diferenciaVentas: number | null;
  porcCrecimientoVentas: number | null;
  facturasMesActual: number | null;
  facturasMesAnterior: number | null;
  diferenciaFacturas: number | null;
  porcCrecimientoFacturas: number | null;
  ticketPromedioMesActual: number | null;
  ticketPromedioMesAnterior: number | null;
  diferenciaTicket: number | null;
  porcCrecimientoTicket: number | null;
  clientesMesActual: number | null;
  clientesMesAnterior: number | null;
  diferenciaClientes: number | null;
  unidadesMesActual: number | null;
  unidadesMesAnterior: number | null;
  diferenciaUnidades: number | null;
  productosDistintosMesActual: number | null;
  productosDistintosMesAnterior: number | null;
  descuentoMesActual: number | null;
  descuentoMesAnterior: number | null;
  porcDescuentoMesActual: number | null;
  porcDescuentoMesAnterior: number | null;
  devolucionesMesActual: number | null;
  devolucionesMesAnterior: number | null;
  totalDevueltoMesActual: number | null;
  totalDevueltoMesAnterior: number | null;
  porcDevolucionSobreVentaMesActual: number | null;
  porcDevolucionSobreVentaMesAnterior: number | null;
  costoEstimadoMesActual: number | null;
  costoEstimadoMesAnterior: number | null;
  margenEstimadoMesActual: number | null;
  margenEstimadoMesAnterior: number | null;
  porcMargenEstimadoMesActual: number | null;
  porcMargenEstimadoMesAnterior: number | null;
};

export type RptVenta = {
  company: number | null;
  sucursal: number | null;
  almacenNombre: string | null;
  fecha: string | null;
  cantidadFacturas: number | null;
  subTotal: number | null;
  montoDescuento: number | null;
  montoImpuesto: number | null;
  totalVendido: number | null;
  totalPagado: number | null;
  ticketPromedio: number | null;
  totalCosto: number | null;
  porcMargenEstimado: number | null;
};

export type RptDevolucion = {
  company: number | null;
  sucursal: number | null;
  almacenNombre: string | null;
  fecha: string | null;
  motivo: string | null;
  cantidadDevoluciones: number | null;
  subTotalDevuelto: number | null;
  descuentoDevuelto: number | null;
  impuestoDevuelto: number | null;
  totalDevuelto: number | null;
  totalNC: number | null;
  totalCredito: number | null;
};

export type RptProductoMasVendido = {
  producto: string | null;
  productoNombre: string | null;
  cantidadVendida: number | null;
  totalVendido: number | null;
  costoEstimado: number | null;
  margenEstimado: number | null;
  cantidadFacturas: number | null;
};

export type RptCuadreCajaLinea = {
  nir: number;
  descripcion: string | null;
  cantidad: number | null;
  signo: number | null;
  valor: number | null;
  formato: string | null;
  grupo: number | null;
  cajaInicial: number | null;
  fechaImpresion: string | null;
};

export type SessionInfo = {
  empresa: string;
  usuario: string;
};

// ─── Parsers ────────────────────────────────────────────────────────────
// Upstream returns PascalCase keys (e.g. TotalVendidoMesActual). Convert to
// our camelCase shapes, tolerant to missing/non-numeric values.

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

type J = Record<string, unknown>;

export const parseSucursal = (j: J): Sucursal => ({
  id: num(j.Id ?? j.id) ?? 0,
  nombre: str(j.Nombre) ?? str(j.nombre) ?? str(j.AlmacenNombre) ?? ''
});

export const parsePantallaPrincipal = (j: J): RptPantallaPrincipal => ({
  totalVendidoMesActual: num(j.TotalVendidoMesActual),
  totalVendidoMesAnterior: num(j.TotalVendidoMesAnterior),
  diferenciaVentas: num(j.DiferenciaVentas),
  porcCrecimientoVentas: num(j.PorcCrecimientoVentas),
  facturasMesActual: num(j.FacturasMesActual),
  facturasMesAnterior: num(j.FacturasMesAnterior),
  diferenciaFacturas: num(j.DiferenciaFacturas),
  porcCrecimientoFacturas: num(j.PorcCrecimientoFacturas),
  ticketPromedioMesActual: num(j.TicketPromedioMesActual),
  ticketPromedioMesAnterior: num(j.TicketPromedioMesAnterior),
  diferenciaTicket: num(j.DiferenciaTicket),
  porcCrecimientoTicket: num(j.PorcCrecimientoTicket),
  clientesMesActual: num(j.ClientesMesActual),
  clientesMesAnterior: num(j.ClientesMesAnterior),
  diferenciaClientes: num(j.DiferenciaClientes),
  unidadesMesActual: num(j.UnidadesMesActual),
  unidadesMesAnterior: num(j.UnidadesMesAnterior),
  diferenciaUnidades: num(j.DiferenciaUnidades),
  productosDistintosMesActual: num(j.ProductosDistintosMesActual),
  productosDistintosMesAnterior: num(j.ProductosDistintosMesAnterior),
  descuentoMesActual: num(j.DescuentoMesActual),
  descuentoMesAnterior: num(j.DescuentoMesAnterior),
  porcDescuentoMesActual: num(j.PorcDescuentoMesActual),
  porcDescuentoMesAnterior: num(j.PorcDescuentoMesAnterior),
  devolucionesMesActual: num(j.DevolucionesMesActual),
  devolucionesMesAnterior: num(j.DevolucionesMesAnterior),
  totalDevueltoMesActual: num(j.TotalDevueltoMesActual),
  totalDevueltoMesAnterior: num(j.TotalDevueltoMesAnterior),
  porcDevolucionSobreVentaMesActual: num(j.PorcDevolucionSobreVentaMesActual),
  porcDevolucionSobreVentaMesAnterior: num(j.PorcDevolucionSobreVentaMesAnterior),
  costoEstimadoMesActual: num(j.CostoEstimadoMesActual),
  costoEstimadoMesAnterior: num(j.CostoEstimadoMesAnterior),
  margenEstimadoMesActual: num(j.MargenEstimadoMesActual),
  margenEstimadoMesAnterior: num(j.MargenEstimadoMesAnterior),
  porcMargenEstimadoMesActual: num(j.PorcMargenEstimadoMesActual),
  porcMargenEstimadoMesAnterior: num(j.PorcMargenEstimadoMesAnterior)
});

export const parseVenta = (j: J): RptVenta => ({
  company: num(j.Company),
  sucursal: num(j.Sucursal),
  almacenNombre: str(j.AlmacenNombre),
  fecha: str(j.Fecha),
  cantidadFacturas: num(j.CantidadFacturas),
  subTotal: num(j.SubTotal),
  montoDescuento: num(j.MontoDescuento),
  montoImpuesto: num(j.MontoImpuesto),
  totalVendido: num(j.TotalVendido),
  totalPagado: num(j.TotalPagado),
  ticketPromedio: num(j.TicketPromedio),
  totalCosto: num(j.TotalCosto),
  porcMargenEstimado: num(j.PorcMargenEstimado)
});

export const parseDevolucion = (j: J): RptDevolucion => ({
  company: num(j.Company),
  sucursal: num(j.Sucursal),
  almacenNombre: str(j.AlmacenNombre),
  fecha: str(j.Fecha),
  motivo: str(j.Motivo),
  cantidadDevoluciones: num(j.CantidadDevoluciones),
  subTotalDevuelto: num(j.SubTotalDevuelto),
  descuentoDevuelto: num(j.DescuentoDevuelto),
  impuestoDevuelto: num(j.ImpuestoDevuelto),
  totalDevuelto: num(j.TotalDevuelto),
  totalNC: num(j.TotalNC),
  totalCredito: num(j.TotalCredito)
});

export const parseProducto = (j: J): RptProductoMasVendido => ({
  producto: str(j.Producto),
  productoNombre: str(j.ProductoNombre),
  cantidadVendida: num(j.CantidadVendida),
  totalVendido: num(j.TotalVendido),
  costoEstimado: num(j.CostoEstimado),
  margenEstimado: num(j.MargenEstimado),
  cantidadFacturas: num(j.CantidadFacturas)
});

export const parseCuadreLinea = (j: J): RptCuadreCajaLinea => ({
  nir: num(j.NIR) ?? 0,
  descripcion: str(j.Descripcion),
  cantidad: num(j.Cantidad),
  signo: num(j.Signo),
  valor: num(j.Valor),
  formato: str(j.Formato),
  grupo: num(j.Grupo),
  cajaInicial: num(j.CajaInicial),
  fechaImpresion: str(j.FechaImpresion)
});

// ─── Cuadre helpers (mirror lib/models/rpt_cuadre_caja.dart getters) ────

export const cuadreCleanDesc = (l: RptCuadreCajaLinea): string => (l.descripcion ?? '').trimStart();

export const cuadreIsDivider = (l: RptCuadreCajaLinea): boolean => l.formato === 'RAYA';

export const cuadreIsSpacer = (l: RptCuadreCajaLinea): boolean => l.descripcion == null && l.formato == null && l.valor == null && l.signo == null;

export const cuadreIsSubItem = (l: RptCuadreCajaLinea): boolean => (l.descripcion ?? '').startsWith('       ');

export const cuadreIsSectionHeader = (l: RptCuadreCajaLinea): boolean => l.descripcion != null && !cuadreIsSubItem(l) && l.signo == null && l.valor == null && !cuadreIsDivider(l);

// ─── Per-sucursal aggregators (mirror Flutter's *SucursalSummary.fromItems) ─

export type VentaSucursalSummary = {
  sucursal: number;
  almacenNombre: string;
  cantidadFacturas: number;
  subTotal: number;
  montoDescuento: number;
  montoImpuesto: number;
  totalVendido: number;
  totalPagado: number;
  ticketPromedio: number;
  totalCosto: number;
  porcMargenEstimado: number;
  dailyItems: RptVenta[];
};

export function groupVentasBySucursal(items: RptVenta[]): VentaSucursalSummary[] {
  const grouped = new Map<number, RptVenta[]>();
  for (const it of items) {
    const k = it.sucursal ?? 0;
    const arr = grouped.get(k) ?? [];
    arr.push(it);
    grouped.set(k, arr);
  }
  const out: VentaSucursalSummary[] = [];
  for (const [sucursal, rows] of grouped) {
    rows.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
    const sum = (k: keyof RptVenta) => rows.reduce((s, r) => s + ((r[k] as number | null) ?? 0), 0);
    const cantidadFacturas = sum('cantidadFacturas');
    const totalVendido = sum('totalVendido');
    const margens = rows.map(r => r.porcMargenEstimado).filter((x): x is number => x != null);
    const porcMargenEstimado = margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;
    out.push({
      sucursal,
      almacenNombre: rows[0].almacenNombre ?? '',
      cantidadFacturas,
      subTotal: sum('subTotal'),
      montoDescuento: sum('montoDescuento'),
      montoImpuesto: sum('montoImpuesto'),
      totalVendido,
      totalPagado: sum('totalPagado'),
      ticketPromedio: cantidadFacturas > 0 ? totalVendido / cantidadFacturas : 0,
      totalCosto: sum('totalCosto'),
      porcMargenEstimado,
      dailyItems: rows
    });
  }
  out.sort((a, b) => b.totalVendido - a.totalVendido);
  return out;
}

export type DevolucionSucursalSummary = {
  sucursal: number;
  almacenNombre: string;
  cantidadDevoluciones: number;
  subTotalDevuelto: number;
  descuentoDevuelto: number;
  impuestoDevuelto: number;
  totalDevuelto: number;
  totalNC: number;
  totalCredito: number;
  motivos: string[];
  dailyItems: RptDevolucion[];
};

export function groupDevolucionesBySucursal(items: RptDevolucion[]): DevolucionSucursalSummary[] {
  const grouped = new Map<number, RptDevolucion[]>();
  for (const it of items) {
    const k = it.sucursal ?? 0;
    const arr = grouped.get(k) ?? [];
    arr.push(it);
    grouped.set(k, arr);
  }
  const out: DevolucionSucursalSummary[] = [];
  for (const [sucursal, rows] of grouped) {
    rows.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
    const sum = (k: keyof RptDevolucion) => rows.reduce((s, r) => s + ((r[k] as number | null) ?? 0), 0);
    const motivos = Array.from(new Set(rows.map(r => r.motivo).filter((m): m is string => !!m && m.length > 0)));
    out.push({
      sucursal,
      almacenNombre: rows[0].almacenNombre ?? '',
      cantidadDevoluciones: sum('cantidadDevoluciones'),
      subTotalDevuelto: sum('subTotalDevuelto'),
      descuentoDevuelto: sum('descuentoDevuelto'),
      impuestoDevuelto: sum('impuestoDevuelto'),
      totalDevuelto: sum('totalDevuelto'),
      totalNC: sum('totalNC'),
      totalCredito: sum('totalCredito'),
      motivos,
      dailyItems: rows
    });
  }
  out.sort((a, b) => b.totalDevuelto - a.totalDevuelto);
  return out;
}
