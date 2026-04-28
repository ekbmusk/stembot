import { cn } from '../../lib/cn';

function initials(first, last) {
  const a = (first?.[0] ?? '').toUpperCase();
  const b = (last?.[0] ?? '').toUpperCase();
  return (a + b) || '·';
}

export function Avatar({ user, size = 40, className }) {
  const url = user?.photo_url;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-border bg-surface-2 font-display text-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="tracking-tightest">
          {initials(user?.first_name, user?.last_name)}
        </span>
      )}
    </span>
  );
}
