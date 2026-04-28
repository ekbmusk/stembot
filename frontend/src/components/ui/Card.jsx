import { cn } from '../../lib/cn';

export function Card({ className, accent, children, ...rest }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface',
        'shadow-soft',
        className,
      )}
      style={accent ? { '--subject': accent } : undefined}
      {...rest}
    >
      {accent ? (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-px opacity-80"
          style={{ background: 'var(--subject)' }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-4 pb-2 pt-4', className)}>{children}</div>;
}

export function CardBody({ className, children }) {
  return <div className={cn('px-4 pb-4', className)}>{children}</div>;
}
