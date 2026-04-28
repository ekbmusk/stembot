import { TerminalSquare } from 'lucide-react';

import { getDevUser, isShimMode } from '../../lib/telegram';

export function DevBadge() {
  if (!isShimMode()) return null;
  const u = getDevUser();
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-warn/40 bg-warn/15 px-3 py-1 font-mono text-[10px] uppercase tracking-ticker text-warn shadow-soft"
      style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <span className="inline-flex items-center gap-1.5">
        <TerminalSquare size={12} />
        dev · #{u?.id} · {u?.first_name ?? '—'}
      </span>
    </div>
  );
}
