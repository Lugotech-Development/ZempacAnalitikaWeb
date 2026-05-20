import { proxyGet } from '@/lib/proxy';
import { parseDevolucion } from '@/lib/types';

export async function GET() {
  return proxyGet('/api/Reportes/devoluciones-30', data => (Array.isArray(data) ? data.map(r => parseDevolucion(r as Record<string, unknown>)) : []));
}
