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
  porcentajeRelativo: number | null;
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

// ─── Cuadre de Caja · Por Lotes ──────────────────────────────────────────
// `analitica-lotes` returns one row per cash-drawer lote for the sucursal/
// range. `NIR` is the lote id used to fetch its condensed report. The
// condensed report (`analitica-lote-condensado/{lote}`) returns the same
// receipt-line shape as the general cuadre, plus the lote's metadata repeated
// on every row.

/** Lote status as the stored procedure expects it on the `status` query param. */
export const LOTE_ESTATUS = { ABIERTO: 0, CERRADO: 1 } as const;

export type RptLote = {
  nir: number;
  docNum: number | null;
  fecha: string | null;
  cajaInicial: number | null;
  estatus: number | null;
  estatusNombre: string | null;
  tipo: number | null;
  tipoNombre: string | null;
  usuario: number | null;
  usuarioNombre: string | null;
  desglosado: boolean | null;
};

export type RptLoteCondensadoLinea = {
  // Receipt-line fields (same shape as RptCuadreCajaLinea).
  nir: number;
  descripcion: string | null;
  cantidad: number | null;
  signo: number | null;
  valor: number | null;
  formato: string | null;
  grupo: number | null;
  // Lote metadata, repeated on every row.
  loteNir: number | null;
  loteDocNum: number | null;
  loteFecha: string | null;
  cajaInicial: number | null;
  loteUsuario: number | null;
  loteUsuarioNombre: string | null;
  loteEstatus: number | null;
  loteEstatusNombre: string | null;
  ncf: string | null;
};

// One product row of a lote's detail (`analitica-productos-por-lote/{lote}`).
// Raw stored-procedure output: only Codigo (DocNum), Nombre and Vendido (qty).
export type RptProductoPorLote = {
  codigo: number | null;
  nombre: string | null;
  vendido: number | null;
};

/** Ordering options for analitica-productos-por-lote, as the `orderBy` query
 *  param expects them. Directions are fixed by the SP (código/nombre asc,
 *  vendido desc). */
export const PRODUCTO_LOTE_ORDER = { CODIGO: 1, NOMBRE: 2, VENDIDO: 3 } as const;
export type ProductoLoteOrder = (typeof PRODUCTO_LOTE_ORDER)[keyof typeof PRODUCTO_LOTE_ORDER];

// ─── Productos Negativos ────────────────────────────────────────────────
// Products whose stock (existencia) has gone negative, per sucursal. Comes
// straight from a stored procedure (no DTO), so keys are PascalCase and the
// response is a paginated envelope — unlike the other array reports. Shapes
// derived by hitting the live endpoint. `sucursal` is required (> 0).

export type RptProductoNegativo = {
  /** Product code (DocNum in the SP). Render raw — it's a code, not a quantity. */
  docNum: number | null;
  nombre: string | null;
  /** Warehouse number within the sucursal. */
  almacen: number | null;
  /** Stock quantity — negative by definition for this report. */
  existencia: number | null;
};

/** Server-paginated envelope for /reportes/analitica/productos-negativos. */
export type ProductosNegativosPage = {
  pagina: number;
  porPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  data: RptProductoNegativo[];
};

// ─── Cuentas por Cobrar (CxC) ───────────────────────────────────────────
// Field names mirror the live API response (PascalCase). The OpenAPI doc
// only declares responses as `array of object` with no schema, so these
// shapes were derived by hitting the live endpoint.

export type RptCxcResumen = {
  saldoTotal: number;
  /** Not returned by the API — computed from antiguedad.corriente on the page. */
  saldoCorriente: number;
  /** Not returned by the API — computed as saldoTotal - saldoCorriente. */
  saldoVencido: number;
  porcentajeVencido: number;
  clientesConSaldo: number;
  facturasPendientes: number;
};

/** `/cxc/antiguedad` returns a single wide row with 4 buckets (no 1-30). */
export type RptCxcAntiguedad = {
  corriente: number;
  de31a60: number;
  de61a90: number;
  mayor90: number;
};

export type RptCxcTopCliente = {
  clienteCodigo: string;
  clienteNombre: string;
  saldoTotal: number;
  corriente: number;
  vencido: number;
  totalFacturas: number;
  ultimaFacturaFecha: string | null;
  diasMaxAtraso: number;
  categoria: string | null;
};

export type RptCxcDetalleFactura = {
  clienteCodigo: string;
  clienteNombre: string;
  facturaNumero: string;
  facturaClienteCodigo: string | null;
  facturaFecha: string | null;
  fecha: string | null;
  balance: number;
  diasAtraso: number;
  categoria: string | null;
};

export type RptCuentasPorCobrar = {
  resumen: RptCxcResumen;
  antiguedad: RptCxcAntiguedad;
  topClientes: RptCxcTopCliente[];
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
  porcMargenEstimado: num(j.PorcMargenEstimado),
  porcentajeRelativo: num(j.PorcentajeRelativo)
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

export const parseLote = (j: J): RptLote => ({
  nir: num(j.NIR) ?? 0,
  docNum: num(j.DocNum),
  fecha: str(j.Fecha),
  cajaInicial: num(j.CajaInicial),
  estatus: num(j.Estatus),
  estatusNombre: str(j.EstatusNombre),
  tipo: num(j.Tipo),
  tipoNombre: str(j.TipoNombre),
  usuario: num(j.Usuario),
  usuarioNombre: str(j.UsuarioNombre),
  desglosado: j.Desglosado == null ? null : Boolean(j.Desglosado)
});

export const parseLoteCondensadoLinea = (j: J): RptLoteCondensadoLinea => ({
  nir: num(j.NIR) ?? 0,
  descripcion: str(j.Descripcion),
  cantidad: num(j.Cantidad),
  signo: num(j.Signo),
  valor: num(j.Valor),
  formato: str(j.Formato),
  grupo: num(j.Grupo),
  loteNir: num(j.LoteNIR),
  loteDocNum: num(j.LoteDocNum),
  loteFecha: str(j.LoteFecha),
  cajaInicial: num(j.CajaInicial),
  loteUsuario: num(j.LoteUsuario),
  loteUsuarioNombre: str(j.LoteUsuarioNombre),
  loteEstatus: num(j.LoteEstatus),
  loteEstatusNombre: str(j.LoteEstatusNombre),
  ncf: str(j.NCF)
});

export const parseProductoNegativo = (j: J): RptProductoNegativo => ({
  docNum: num(j.DocNum ?? j.docNum),
  nombre: str(j.Nombre ?? j.nombre),
  almacen: num(j.Almacen ?? j.almacen),
  existencia: num(j.Existencia ?? j.existencia)
});

/** Parses the paginated envelope, tolerant to a missing/empty body. Row-level
 *  `TotalRegistros` (an SP artifact repeated on every row) is ignored in favor
 *  of the envelope's `totalRegistros`. */
export const parseProductosNegativosPage = (data: unknown): ProductosNegativosPage => {
  const d = (data && typeof data === 'object' ? data : {}) as J;
  const rows = Array.isArray(d.data) ? d.data : [];
  return {
    pagina: num(d.pagina) ?? 1,
    porPagina: num(d.porPagina) ?? 0,
    totalRegistros: num(d.totalRegistros) ?? rows.length,
    totalPaginas: num(d.totalPaginas) ?? (rows.length ? 1 : 0),
    data: rows.map(r => parseProductoNegativo(r as J))
  };
};

export const parseProductoPorLote = (j: J): RptProductoPorLote => ({
  codigo: num(j.Codigo),
  nombre: str(j.Nombre),
  vendido: num(j.Vendido)
});

// ─── CxC parsers (tolerant of PascalCase / camelCase / common aliases) ──

/** Pick the first non-null/undefined value among the given keys. */
const pick = (j: J, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = j[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const numAny = (j: J, ...keys: string[]): number => num(pick(j, ...keys)) ?? 0;
const strAny = (j: J, ...keys: string[]): string | null => str(pick(j, ...keys));

export const parseCxcResumen = (j: J): RptCxcResumen => {
  const saldoTotal = numAny(j, 'SaldoTotal', 'saldoTotal', 'Saldo', 'TotalSaldo', 'MontoTotal');
  // API doesn't return SaldoCorriente; aliases kept for forward compat.
  const saldoCorriente = numAny(j, 'SaldoCorriente', 'saldoCorriente', 'Corriente', 'TotalCorriente');
  let saldoVencido = numAny(j, 'SaldoVencido', 'saldoVencido', 'Vencido', 'TotalVencido');
  if (saldoVencido === 0 && saldoTotal > 0 && saldoCorriente > 0) {
    saldoVencido = Math.max(0, saldoTotal - saldoCorriente);
  }
  let porcentajeVencido = numAny(j, 'PorcentajeVencido', 'porcentajeVencido', 'PorcVencido', 'PctVencido');
  if (porcentajeVencido === 0 && saldoTotal > 0 && saldoVencido > 0) {
    porcentajeVencido = (saldoVencido / saldoTotal) * 100;
  }
  return {
    saldoTotal,
    saldoCorriente,
    saldoVencido,
    porcentajeVencido,
    clientesConSaldo: numAny(j, 'TotalClientes', 'ClientesConSaldo', 'clientesConSaldo', 'Clientes', 'CantidadClientes'),
    facturasPendientes: numAny(j, 'FacturasPendientes', 'facturasPendientes', 'TotalFacturas', 'Facturas', 'CantidadFacturas', 'FacturasAbiertas')
  };
};

export const parseCxcAntiguedad = (j: J): RptCxcAntiguedad => ({
  corriente: numAny(j, 'Corriente', 'corriente', 'AlDia', 'Vigente'),
  de31a60: numAny(j, 'De31a60', 'de31a60', 'Rango31_60', 'Saldo31a60', 'D31a60'),
  de61a90: numAny(j, 'De61a90', 'de61a90', 'Rango61_90', 'Saldo61a90', 'D61a90'),
  mayor90: numAny(j, 'Mayor90', 'mayor90', 'Mas90', 'Mayor90Dias', 'SaldoMas90')
});

export const parseCxcTopCliente = (j: J): RptCxcTopCliente => ({
  clienteCodigo: strAny(j, 'ClienteCodigo', 'clienteCodigo', 'Cliente', 'Codigo') ?? '',
  clienteNombre: strAny(j, 'ClienteNombre', 'clienteNombre', 'Nombre', 'NombreCliente') ?? '',
  saldoTotal: numAny(j, 'SaldoTotal', 'saldoTotal', 'Saldo', 'Total'),
  corriente: numAny(j, 'Corriente', 'corriente', 'SaldoCorriente', 'AlDia'),
  vencido: numAny(j, 'Vencido', 'vencido', 'SaldoVencido', 'TotalVencido'),
  totalFacturas: numAny(j, 'TotalFacturas', 'totalFacturas', 'FacturasPendientes', 'Facturas', 'CantidadFacturas'),
  ultimaFacturaFecha: strAny(j, 'UltimaFacturaFecha', 'ultimaFacturaFecha', 'UltimaFactura', 'FechaUltimaFactura'),
  diasMaxAtraso: numAny(j, 'DiasMaxAtraso', 'diasMaxAtraso', 'MaxDiasAtraso', 'DiasAtraso'),
  categoria: strAny(j, 'Categoria', 'categoria', 'Rango', 'Bucket')
});

export const parseCxcDetalleFactura = (j: J): RptCxcDetalleFactura => ({
  clienteCodigo: strAny(j, 'ClienteCodigo', 'clienteCodigo', 'Cliente') ?? '',
  clienteNombre: strAny(j, 'ClienteNombre', 'clienteNombre', 'Nombre') ?? '',
  facturaNumero: strAny(j, 'FacturaNumero', 'facturaNumero', 'Factura', 'NumeroFactura', 'Documento') ?? '',
  facturaClienteCodigo: strAny(j, 'FacturaClienteCodigo', 'facturaClienteCodigo'),
  facturaFecha: strAny(j, 'FacturaFecha', 'facturaFecha', 'FechaFactura'),
  fecha: strAny(j, 'Fecha', 'fecha', 'FechaEmision'),
  balance: numAny(j, 'Balance', 'balance', 'Saldo', 'SaldoPendiente', 'Monto'),
  diasAtraso: numAny(j, 'DiasAtraso', 'diasAtraso', 'DiasVencidos', 'DiasMora'),
  categoria: strAny(j, 'Categoria', 'categoria', 'Rango', 'Bucket')
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
  porcentajeRelativo: number;
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
      porcentajeRelativo: sum('porcentajeRelativo'),
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

// ─── Ventas por Marca ────────────────────────────────────────────────────────

export type RptVentaProductoMarca = {
  marca: string | null;
  marcaId: number | null;
  sucursal: string | null;
  sucursalId: number | null;
  producto: string | null;
  codigoProducto: string | null;
  cantidad: number | null;
  totalVenta: number | null;
};

export function parseVentaProductoMarca(j: J): RptVentaProductoMarca {
  return {
    marca: str(j['Marca']) ?? str(j['marca']),
    marcaId: num(j['CodigoMarca']) ?? num(j['codigoMarca']),
    sucursal: str(j['Sucursal']) ?? str(j['sucursal']),
    sucursalId: num(j['CodigoSucursal']) ?? num(j['codigoSucursal']),
    producto: str(j['Producto']) ?? str(j['producto']),
    codigoProducto: str(j['CodigoProducto']) ?? str(j['codigoProducto']),
    cantidad: num(j['Unidades']) ?? num(j['unidades']) ?? num(j['Cantidad']) ?? num(j['cantidad']),
    totalVenta: num(j['Importe']) ?? num(j['importe']) ?? num(j['TotalVenta']) ?? num(j['totalVenta']),
  };
}

// ─── Ventas por Facturador ───────────────────────────────────────────────────

export type RptVentaFacturador = {
  sucursal: string | null;
  sucursalId: number | null;
  codigoFacturador: number | null;
  facturador: string | null;
  cedula: string | null;
  cantidadFacturas: number | null;
  totalVenta: number | null;
};

export function parseVentaFacturador(j: J): RptVentaFacturador {
  return {
    sucursal: str(j['NombreSucursal']) ?? str(j['sucursal']),
    sucursalId: num(j['CodigoSucursal']) ?? num(j['sucursalId']),
    codigoFacturador: num(j['CodigoFacturador']) ?? num(j['codigoFacturador']),
    facturador: str(j['NombreFacturador']) ?? str(j['facturador']),
    cedula: str(j['Cedula']) ?? str(j['cedula']),
    cantidadFacturas: num(j['CantidadFacturas']) ?? num(j['cantidadFacturas']),
    totalVenta: num(j['TotalFacturado']) ?? num(j['totalFacturado']) ?? num(j['TotalVenta']) ?? num(j['totalVenta']),
  };
}

// ─── Catálogo de Marcas ──────────────────────────────────────────────────────

export type Marca = {
  id: number | null;
  nombre: string | null;
};

export function parseMarca(j: J): Marca {
  return {
    id: num(j['CodigoMarca']) ?? num(j['codigoMarca']) ?? num(j['Id']) ?? num(j['id']),
    nombre: str(j['NombreMarca']) ?? str(j['nombreMarca']) ?? str(j['Marca']) ?? str(j['marca']) ?? str(j['Nombre']) ?? str(j['nombre']),
  };
}
