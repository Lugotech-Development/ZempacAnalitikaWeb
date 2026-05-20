import { proxyGet } from '@/lib/proxy';
import { parseProducto } from '@/lib/types';

export async function GET() {
  return proxyGet('/api/Reportes/productos-mas-vendidos', data => (Array.isArray(data) ? data.map(r => parseProducto(r as Record<string, unknown>)) : []));
}
