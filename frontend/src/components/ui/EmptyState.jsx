import { cn } from '../../lib/cn';

export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-muted">
          <Icon size={20} />
        </span>
      ) : null}
      <div className="space-y-1">
        <h3 className="font-display text-[15px] tracking-tight text-ink">{title}</h3>
        {hint ? <p className="text-[13px] text-ink-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
