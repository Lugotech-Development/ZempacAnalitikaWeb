import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: 'Zempac Analitika · Reportes inteligentes para tu negocio',
  description: 'Plataforma de análisis de ventas, devoluciones, productos y cuadres de caja para empresas en Centroamérica.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body suppressHydrationWarning className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
