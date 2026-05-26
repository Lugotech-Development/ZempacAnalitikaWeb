import VentasSucursalDetail from './_detail';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ sucursal: '_' }];
}

export default function VentasSucursalPage() {
  return <VentasSucursalDetail />;
}
