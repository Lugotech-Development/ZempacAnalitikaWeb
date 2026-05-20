import { proxyGet } from '@/lib/proxy';
import { parseVenta } from '@/lib/types';

export async function GET() {
  return proxyGet('/api/Reportes/ventas-30', data => (Array.isArray(data) ? data.map(r => parseVenta(r as Record<string, unknown>)) : []));
}
