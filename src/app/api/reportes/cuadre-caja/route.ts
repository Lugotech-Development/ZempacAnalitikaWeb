import { NextResponse } from 'next/server';
import { proxyGet } from '@/lib/proxy';
import { parseCuadreLinea } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sucursal = searchParams.get('sucursal');
  if (!sucursal) {
    return NextResponse.json({ error: 'Sucursal requerida' }, { status: 400 });
  }
  return proxyGet('/api/Reportes/analitica-lote-condensado', data => (Array.isArray(data) ? data.map(r => parseCuadreLinea(r as Record<string, unknown>)) : []), {
    sucursal,
    fDesde: searchParams.get('fDesde') ?? undefined,
    fHasta: searchParams.get('fHasta') ?? undefined
  });
}
