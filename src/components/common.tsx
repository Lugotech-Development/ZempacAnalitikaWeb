import Image from 'next/image';
import { Icon, type IconName } from './icon';

export function EyebrowLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`eyebrow block ${className}`}>{children}</span>;
}

export function TrendBadge({
  value,
  invertColor = false
}: {
  value: number;
  /** If true, positive value is "bad" (e.g. devoluciones growth). */
  invertColor?: boolean;
}) {
  const positive = invertColor ? value < 0 : value > 0;
  const negative = invertColor ? value > 0 : value < 0;
  const neutral = value === 0;
  const cls = neutral ? 'bg-surface-mid text-ink-variant' : positive ? 'bg-positive-bg text-positive-fg' : negative ? 'bg-negative-bg text-negative-fg' : 'bg-surface-mid text-ink-variant';
  const iconName = value >= 0 ? 'call_made' : 'call_received';
  return (
    <span className={`pill gap-1 ${cls}`}>
      <Icon name={iconName} size={12} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function ZempacLogo({ size = 36, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/zempac-logo.png" alt="Zempac Analitika" width={size} height={size} priority className="rounded-full" style={{ width: size, height: size }} />
      {withWordmark && <span className="text-[20px] font-bold tracking-tight text-ink">Zempac Analitika</span>}
    </div>
  );
}

/**
 * A read-only, locked report filter shown in place of a picker when the backend
 * fixes the value via `parametrosSP` (e.g. an `Externo` user scoped to one
 * sucursal/marca). Mirrors the Flutter app's `LockedFilterField`.
 */
export function LockedFilter({ icon, value, note = 'Filtro fijado por tu perfil' }: { icon: IconName; value: string; note?: string }) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-surface-mid bg-surface-low px-4 py-2.5 text-sm font-bold text-ink min-w-[240px]">
        <Icon name={icon} size={16} className="text-outline" />
        <span className="flex-1 text-left truncate">{value}</span>
        <Icon name="lock" size={14} className="text-outline" />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-outline">
        <Icon name="lock" size={12} />
        {note}
      </p>
    </div>
  );
}

/**
 * Compact "Exportar → Excel" action, shared by every report that can download
 * its data. Mirrors the original button on Ventas por Marca. Pass `busy` while
 * an async export runs (e.g. paginated reports fetching every page first).
 */
export function ExcelExportButton({
  onClick,
  label = 'Exportar:',
  busy = false,
  disabled = false,
  className = ''
}: {
  onClick: () => void;
  /** Leading text; pass '' to render just the button. */
  label?: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {label && <span className="text-xs font-semibold text-outline">{label}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        <Icon name={busy ? 'refresh' : 'download'} size={14} className={busy ? 'animate-spin' : ''} />
        <span>{busy ? 'Exportando…' : 'Excel'}</span>
      </button>
    </div>
  );
}

export function LugotechCredit({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-outline ${className}`}>
      Desarrollado por{' '}
      <a href="https://lugotech.com.do/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
        Lugotech
      </a>
    </p>
  );
}
