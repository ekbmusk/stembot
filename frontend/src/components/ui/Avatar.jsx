import { useEffect, useState } from 'react';

import { cn } from '../../lib/cn';

function initials(first, last) {
  const a = (first?.[0] ?? '').toUpperCase();
  const b = (last?.[0] ?? '').toUpperCase();
  return (a + b) || '·';
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Picks the best avatar source we have. Telegram initData often omits
 * photo_url, so fall back to the backend proxy that hits getUserProfilePhotos.
 */
function avatarSrc(user) {
  if (!user) return null;
  if (user.photo_url) return user.photo_url;
  if (user.id) return `${API_BASE}/users/${user.id}/avatar`;
  return null;
}

export function Avatar({ user, size = 40, className }) {
  const initial = avatarSrc(user);
  const [src, setSrc] = useState(initial);

  // Reset the resolved src when the underlying user changes.
  useEffect(() => {
    setSrc(initial);
  }, [initial]);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-border bg-surface-2 font-display text-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setSrc(null)}
        />
      ) : (
        <span className="tracking-tightest">
          {initials(user?.first_name, user?.last_name)}
        </span>
      )}
    </span>
  );
}
