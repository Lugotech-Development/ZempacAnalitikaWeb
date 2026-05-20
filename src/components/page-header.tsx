import { Icon, type IconName } from './icon';

export function PageHeader({ eyebrow, title, subtitle, icon = 'bar_chart', isRefreshing = false }: { eyebrow: string; title: string; subtitle?: string; icon?: IconName; isRefreshing?: boolean }) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-primary-gradient text-white items-center justify-center shrink-0">
        <Icon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="eyebrow text-primary">{eyebrow}</p>
          {isRefreshing && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-eyebrow text-ink-variant bg-surface-mid rounded-pill px-2 py-0.5" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              Actualizando
            </span>
          )}
        </div>
        <h1 className="mt-1 text-3xl sm:text-[32px] font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-variant">{subtitle}</p>}
      </div>
    </div>
  );
}
