import Image from 'next/image';
import { Icon } from './icon';

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
