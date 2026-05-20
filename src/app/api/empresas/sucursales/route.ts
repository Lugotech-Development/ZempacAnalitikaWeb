import { proxyGet } from '@/lib/proxy';
import { parseSucursal } from '@/lib/types';

export async function GET() {
  return proxyGet('/api/Empresas/sucursales', data => (Array.isArray(data) ? data.map(r => parseSucursal(r as Record<string, unknown>)) : []));
}
