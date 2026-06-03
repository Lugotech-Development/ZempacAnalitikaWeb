'use client';

// Horizontal bar chart for "Ventas por Facturador" ranking.
// Dynamic-imported with `next/dynamic({ ssr: false })`.

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMoney } from '@/lib/format';

// Design tokens mirrored from tailwind.config.ts (SVG can't use Tailwind classes).
const TOKEN = {
  primary: '#0040DF',
  primaryLight: '#EEF2FF',
  surfaceMid: '#EDEEEF',
  outline: '#747688',
  ink: '#191C1D',
};

export type FacturadorPoint = { name: string; total: number };

export default function FacturadorChart({ data }: { data: FacturadorPoint[] }) {
  const chartHeight = Math.max(data.length * 46, 120);
  const maxVal = data.reduce((m, d) => Math.max(m, d.total), 0);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 90, left: 0, bottom: 4 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={TOKEN.surfaceMid} horizontal={false} />
          <XAxis
            type="number"
            stroke={TOKEN.outline}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            stroke={TOKEN.outline}
            tick={{ fontSize: 11, fontWeight: 600, fill: TOKEN.ink }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 17)}…` : v}
          />
          <Tooltip
            cursor={{ fill: TOKEN.primaryLight }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${TOKEN.surfaceMid}`,
              fontSize: 12,
            }}
            formatter={(v: number) => [fmtMoney(v), 'Total']}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={TOKEN.primary}
                fillOpacity={1 - (i / data.length) * 0.35}
              />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v: number) => fmtMoney(v)}
              style={{ fontSize: 11, fontWeight: 700, fill: TOKEN.outline }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
