// Spanish-locale formatters used across all dashboard pages. Centralised so
// the web mirrors the Flutter app's NumberFormat/DateFormat output.

const numberFmt = new Intl.NumberFormat('es-HN', {
  maximumFractionDigits: 0
});

const number2Fmt = new Intl.NumberFormat('es-HN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const currencyFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

export function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '$0.00';
  const neg = v < 0;
  return `${neg ? '-' : ''}$${currencyFmt.format(Math.abs(v))}`;
}

export function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '0';
  return numberFmt.format(v);
}

export function fmtDecimal(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '0.00';
  return number2Fmt.format(v);
}

export function fmtPercent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '0.00%';
  return `${number2Fmt.format(v)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function fmtDayMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-HN', {
    day: '2-digit',
    month: 'short'
  });
}

export function toIsoStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function toIsoEndOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
