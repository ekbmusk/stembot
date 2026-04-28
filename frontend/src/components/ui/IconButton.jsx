import { cn } from '../../lib/cn';
import { haptic } from '../../lib/telegram';

export function IconButton({
  icon: Icon,
  label,
  className,
  onClick,
  haptic: hapticType = 'light',
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        if (!rest.disabled) haptic(hapticType);
        onClick?.(e);
      }}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full',
        'border border-border bg-surface text-ink-muted',
        'hover:text-ink hover:border-border-strong active:scale-[0.96] transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        className,
      )}
      {...rest}
    >
      <Icon size={18} />
    </button>
  );
}
