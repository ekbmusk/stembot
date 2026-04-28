import { forwardRef } from 'react';

import { cn } from '../../lib/cn';
import { haptic } from '../../lib/telegram';

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary-soft active:bg-primary-dim shadow-soft',
  secondary:
    'bg-surface-2 text-ink border border-border-strong hover:border-primary/60 hover:text-white',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-2',
  outline:
    'border border-border-strong text-ink hover:border-primary hover:text-white',
  danger: 'bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20',
};

const sizes = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
  icon: 'h-10 w-10',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    className,
    haptic: hapticType = 'light',
    onClick,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={(e) => {
        if (!props.disabled) haptic(hapticType);
        onClick?.(e);
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
