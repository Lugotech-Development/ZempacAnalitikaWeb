'use client';

// Generic area chart used across Ventas / Devoluciones (list + detail pages).
// Dynamic-imported with `next/dynamic({ ssr: false })` so the recharts bundle
// only loads when a chart actually needs to render.

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMoney } from '@/lib/format';

// Design tokens mirrored from tailwind.config.ts. Recharts SVG primitives
// can't read Tailwind classes, so colors are resolved here.
const TOKEN = {
  primary: '#0040DF',
  tertiary: '#993100',
  surfaceMid: '#EDEEEF',
  outline: '#747688',
  shadow: 'rgba(25,28,29,0.06)'
};

export type SeriesPoint = { fecha: string; total: number };
export type SeriesTone = 'primary' | 'tertiary';

export default function SeriesChart({
  data,
  tone = 'primary',
  tooltipLabel = 'Total',
  gradientId
}: {
  data: SeriesPoint[];
  tone?: SeriesTone;
  tooltipLabel?: string;
  /** Unique id for the SVG gradient; must be unique per chart on the page. */
  gradientId: string;
}) {
  const color = tone === 'tertiary' ? TOKEN.tertiary : TOKEN.primary;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.surfaceMid} vertical={false} />
          <XAxis dataKey="fecha" stroke={TOKEN.outline} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis stroke={TOKEN.outline} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.2 }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${TOKEN.surfaceMid}`,
              boxShadow: `0 12px 48px ${TOKEN.shadow}`,
              fontSize: 12
            }}
            formatter={(v: number) => [fmtMoney(v), tooltipLabel]}
            labelFormatter={l => `Día ${l}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={data.length <= 15 ? { r: 3, fill: color, strokeWidth: 1.5, stroke: '#fff' } : false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
