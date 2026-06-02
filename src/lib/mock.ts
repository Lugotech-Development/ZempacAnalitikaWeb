// Placeholder data + fake async fetchers for the new reports that don't yet
// have a real upstream endpoint (Inventario, Vencimientos, Transferencias,
// Cuentas por Cobrar). When the API exposes these, replace the bodies of
// the api* functions in `src/lib/api.ts` and remove the corresponding
// section here. The TYPES are designed to mirror Zempac's domain naming so
// they map cleanly to whatever the backend ends up returning.

// ─── Types ──────────────────────────────────────────────────────────────

export type RptInventarioItem = {
  producto: string;
  productoNombre: string;
  categoria: string;
  sucursal: number;
  almacenNombre: string;
  existencia: number;
  minimo: number;
  maximo: number;
  costoUnitario: number;
  valorEstimado: number;
  ultimoMovimiento: string; // ISO date
};

export type RptInventarioResumen = {
  totalSku: number;
  totalUnidades: number;
  valorEstimadoTotal: number;
  productosBajoMinimo: number;
  productosAgotados: number;
  productosSobreMaximo: number;
  porcentajeRotacionMes: number;
  porSucursal: {
    sucursal: number;
    almacenNombre: string;
    totalSku: number;
    totalUnidades: number;
    valorEstimado: number;
    bajoMinimo: number;
  }[];
  topBajoMinimo: RptInventarioItem[];
};

export type RptVencimientoLote = {
  producto: string;
  productoNombre: string;
  lote: string;
  sucursal: number;
  almacenNombre: string;
  existencia: number;
  fechaVencimiento: string; // ISO date
  diasParaVencer: number;
  valorEnRiesgo: number;
  categoria: string;
};

export type RptVencimientosResumen = {
  totalLotes: number;
  valorEnRiesgoTotal: number;
  vencidos: { lotes: number; valor: number };
  ventana30: { lotes: number; valor: number };
  ventana60: { lotes: number; valor: number };
  ventana90: { lotes: number; valor: number };
  masDe90: { lotes: number; valor: number };
  lotes: RptVencimientoLote[];
};

export type RptTransferencia = {
  documento: string;
  fecha: string; // ISO date
  origenSucursal: number;
  origenNombre: string;
  destinoSucursal: number;
  destinoNombre: string;
  unidades: number;
  productosDistintos: number;
  montoCosto: number;
  estado: 'Recibida' | 'En tránsito' | 'Pendiente';
};

export type RptTransferenciasResumen = {
  totalTransferencias: number;
  unidadesTransferidas: number;
  montoCostoTotal: number;
  enTransito: number;
  pendientes: number;
  recibidas: number;
  topRutas: {
    origenNombre: string;
    destinoNombre: string;
    transferencias: number;
    unidades: number;
    monto: number;
  }[];
  movimientos: RptTransferencia[];
};

// ─── Mock fixtures ──────────────────────────────────────────────────────

const SUCURSALES = [
  { id: 1, nombre: 'Sucursal Centro' },
  { id: 2, nombre: 'Sucursal Boulevard' },
  { id: 3, nombre: 'Sucursal Mall Multiplaza' },
  { id: 4, nombre: 'Sucursal La Ceiba' }
];

const PRODUCTOS = [
  { sku: '7501001230012', nombre: 'Acetaminofén 500mg x 100 tabletas', categoria: 'Analgésicos', costo: 32.5 },
  { sku: '7501001230029', nombre: 'Ibuprofeno 400mg x 50 tabletas', categoria: 'Analgésicos', costo: 41.0 },
  { sku: '7501001230036', nombre: 'Loratadina 10mg x 30 tabletas', categoria: 'Antihistamínicos', costo: 28.75 },
  { sku: '7501001230043', nombre: 'Amoxicilina 500mg x 21 cápsulas', categoria: 'Antibióticos', costo: 95.0 },
  { sku: '7501001230050', nombre: 'Omeprazol 20mg x 28 cápsulas', categoria: 'Gastro', costo: 78.4 },
  { sku: '7501001230067', nombre: 'Metformina 850mg x 60 tabletas', categoria: 'Diabetes', costo: 65.2 },
  { sku: '7501001230074', nombre: 'Losartán 50mg x 30 tabletas', categoria: 'Cardiovascular', costo: 88.0 },
  { sku: '7501001230081', nombre: 'Salbutamol Inhalador 100mcg', categoria: 'Respiratorios', costo: 142.5 },
  { sku: '7501001230098', nombre: 'Vitamina C 1000mg x 30 tabletas', categoria: 'Suplementos', costo: 55.0 },
  { sku: '7501001230104', nombre: 'Diclofenaco Sódico 75mg x 20', categoria: 'Analgésicos', costo: 49.8 },
  { sku: '7501001230111', nombre: 'Atorvastatina 20mg x 30 tabletas', categoria: 'Cardiovascular', costo: 120.0 },
  { sku: '7501001230128', nombre: 'Glibenclamida 5mg x 30 tabletas', categoria: 'Diabetes', costo: 38.5 },
  { sku: '7501001230135', nombre: 'Cetirizina 10mg x 20 tabletas', categoria: 'Antihistamínicos', costo: 31.2 },
  { sku: '7501001230142', nombre: 'Ranitidina 150mg x 30 tabletas', categoria: 'Gastro', costo: 44.0 },
  { sku: '7501001230159', nombre: 'Pañal Adulto Talla M x 8', categoria: 'Cuidado Personal', costo: 89.9 }
];

const daysFromNow = (d: number): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
};

// ─── Inventario ─────────────────────────────────────────────────────────

function buildInventarioItems(): RptInventarioItem[] {
  const items: RptInventarioItem[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const suc of SUCURSALES) {
    for (const p of PRODUCTOS) {
      const minimo = 20 + Math.floor(rand() * 40);
      const maximo = minimo + 80 + Math.floor(rand() * 120);
      const existencia = Math.max(0, Math.floor(rand() * (maximo + 30)) - 5);
      items.push({
        producto: p.sku,
        productoNombre: p.nombre,
        categoria: p.categoria,
        sucursal: suc.id,
        almacenNombre: suc.nombre,
        existencia,
        minimo,
        maximo,
        costoUnitario: p.costo,
        valorEstimado: existencia * p.costo,
        ultimoMovimiento: daysFromNow(-Math.floor(rand() * 25))
      });
    }
  }
  return items;
}

export async function apiInventarioMock(): Promise<RptInventarioResumen> {
  await fakeLatency();
  const items = buildInventarioItems();
  const porSucursalMap = new Map<number, RptInventarioItem[]>();
  for (const it of items) {
    const arr = porSucursalMap.get(it.sucursal) ?? [];
    arr.push(it);
    porSucursalMap.set(it.sucursal, arr);
  }
  const porSucursal = [...porSucursalMap.entries()].map(([sucursal, rows]) => ({
    sucursal,
    almacenNombre: rows[0].almacenNombre,
    totalSku: rows.length,
    totalUnidades: rows.reduce((s, r) => s + r.existencia, 0),
    valorEstimado: rows.reduce((s, r) => s + r.valorEstimado, 0),
    bajoMinimo: rows.filter(r => r.existencia < r.minimo).length
  }));
  porSucursal.sort((a, b) => b.valorEstimado - a.valorEstimado);

  const topBajoMinimo = items
    .filter(i => i.existencia < i.minimo)
    .sort((a, b) => a.existencia / Math.max(1, a.minimo) - b.existencia / Math.max(1, b.minimo))
    .slice(0, 12);

  return {
    totalSku: PRODUCTOS.length,
    totalUnidades: items.reduce((s, r) => s + r.existencia, 0),
    valorEstimadoTotal: items.reduce((s, r) => s + r.valorEstimado, 0),
    productosBajoMinimo: items.filter(i => i.existencia > 0 && i.existencia < i.minimo).length,
    productosAgotados: items.filter(i => i.existencia === 0).length,
    productosSobreMaximo: items.filter(i => i.existencia > i.maximo).length,
    porcentajeRotacionMes: 38.4,
    porSucursal,
    topBajoMinimo
  };
}

// ─── Vencimientos ───────────────────────────────────────────────────────

export async function apiVencimientosMock(): Promise<RptVencimientosResumen> {
  await fakeLatency();
  let seed = 13;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const lotes: RptVencimientoLote[] = [];
  for (let i = 0; i < 36; i++) {
    const p = PRODUCTOS[Math.floor(rand() * PRODUCTOS.length)];
    const suc = SUCURSALES[Math.floor(rand() * SUCURSALES.length)];
    const existencia = 5 + Math.floor(rand() * 80);
    const dias = Math.floor(rand() * 220) - 25; // some already expired
    lotes.push({
      producto: p.sku,
      productoNombre: p.nombre,
      lote: `L${(2400 + i).toString()}`,
      sucursal: suc.id,
      almacenNombre: suc.nombre,
      existencia,
      fechaVencimiento: daysFromNow(dias),
      diasParaVencer: dias,
      valorEnRiesgo: existencia * p.costo,
      categoria: p.categoria
    });
  }
  lotes.sort((a, b) => a.diasParaVencer - b.diasParaVencer);

  const bucket = (lo: number, hi: number) => {
    const sel = lotes.filter(l => l.diasParaVencer >= lo && l.diasParaVencer < hi);
    return { lotes: sel.length, valor: sel.reduce((s, r) => s + r.valorEnRiesgo, 0) };
  };

  return {
    totalLotes: lotes.length,
    valorEnRiesgoTotal: lotes.reduce((s, l) => s + l.valorEnRiesgo, 0),
    vencidos: bucket(-9999, 0),
    ventana30: bucket(0, 31),
    ventana60: bucket(31, 61),
    ventana90: bucket(61, 91),
    masDe90: bucket(91, 9999),
    lotes
  };
}

// ─── Transferencias ─────────────────────────────────────────────────────

export async function apiTransferenciasMock(): Promise<RptTransferenciasResumen> {
  await fakeLatency();
  let seed = 21;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const estados: RptTransferencia['estado'][] = ['Recibida', 'En tránsito', 'Pendiente'];
  const movs: RptTransferencia[] = [];
  for (let i = 0; i < 28; i++) {
    let oi = Math.floor(rand() * SUCURSALES.length);
    let di = Math.floor(rand() * SUCURSALES.length);
    if (di === oi) di = (di + 1) % SUCURSALES.length;
    const origen = SUCURSALES[oi];
    const destino = SUCURSALES[di];
    const productos = 2 + Math.floor(rand() * 14);
    const unidades = productos * (10 + Math.floor(rand() * 40));
    const montoCosto = unidades * (30 + rand() * 80);
    const rawEstado = i < 4 ? estados[2] : i < 9 ? estados[1] : estados[0];
    movs.push({
      documento: `TR-${(10254 + i).toString()}`,
      fecha: daysFromNow(-Math.floor(rand() * 28)),
      origenSucursal: origen.id,
      origenNombre: origen.nombre,
      destinoSucursal: destino.id,
      destinoNombre: destino.nombre,
      unidades,
      productosDistintos: productos,
      montoCosto,
      estado: rawEstado
    });
  }
  movs.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));

  const rutaKey = (m: RptTransferencia) => `${m.origenNombre}→${m.destinoNombre}`;
  const rutaMap = new Map<string, { origenNombre: string; destinoNombre: string; transferencias: number; unidades: number; monto: number }>();
  for (const m of movs) {
    const k = rutaKey(m);
    const cur = rutaMap.get(k) ?? {
      origenNombre: m.origenNombre,
      destinoNombre: m.destinoNombre,
      transferencias: 0,
      unidades: 0,
      monto: 0
    };
    cur.transferencias += 1;
    cur.unidades += m.unidades;
    cur.monto += m.montoCosto;
    rutaMap.set(k, cur);
  }
  const topRutas = [...rutaMap.values()].sort((a, b) => b.monto - a.monto).slice(0, 5);

  return {
    totalTransferencias: movs.length,
    unidadesTransferidas: movs.reduce((s, m) => s + m.unidades, 0),
    montoCostoTotal: movs.reduce((s, m) => s + m.montoCosto, 0),
    enTransito: movs.filter(m => m.estado === 'En tránsito').length,
    pendientes: movs.filter(m => m.estado === 'Pendiente').length,
    recibidas: movs.filter(m => m.estado === 'Recibida').length,
    topRutas,
    movimientos: movs
  };
}

// ─── Cuentas por Cobrar ─────────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────────────────

function fakeLatency() {
  return new Promise<void>(res => setTimeout(res, 350));
}
