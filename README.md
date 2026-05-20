# Zempac Analitika Web

Web companion (Next.js) for the **Reportes Zempac** Flutter app. Built with the same _Lumina Vision Light_ design system. Includes a marketing landing page, a two-step login flow, and a CRM-style dashboard with the four core reports: **Principal · Ventas · Devoluciones · Productos**.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS 3 (custom Zempac tokens)
- Recharts (gráficas)
- Lucide icons
- Google Fonts Manrope

## Desarrollo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Credenciales de prueba

Cualquier valor en el paso de empresa + cualquier usuario/contraseña no vacíos. Los datos del dashboard son mock (ver `src/lib/mock-data.ts`).
