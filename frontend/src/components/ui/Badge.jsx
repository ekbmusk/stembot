import { cn } from '../../lib/cn';

const tones = {
  default: 'bg-surface-2 text-ink-muted',
  primary: 'bg-primary/15 text-primary-soft',
  success: 'bg-success/15 text-success',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  outline: 'border border-border-strong text-ink-muted',
  subject: 'text-[--subject]',
};

export function Badge({ tone = 'default', className, children, style }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-ticker',
        tones[tone],
        className,
      )}
      style={tone === 'subject' ? style : undefined}
    >
      {children}
    </span>
  );
}
