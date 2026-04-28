import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { findBadge } from '../lib/badges';
import { celebrate } from '../lib/animation';
import { haptic } from '../lib/telegram';
import { AchievementBadge } from './AchievementBadge';
import { Button } from './ui/Button';

/**
 * Modal that surfaces newly-earned achievements after a successful finalize.
 * Renders all unlocked badges in sequence visually (one big card listing them).
 * Confetti fires once on mount.
 */
export function UnlockOverlay({ slugs, onClose }) {
  useEffect(() => {
    if (!slugs?.length) return;
    haptic('success');
    const first = findBadge(slugs[0]);
    celebrate(first?.accent || '#6C63FF');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [slugs]);

  if (!slugs?.length) return null;
  const badges = slugs.map((s) => findBadge(s)).filter(Boolean);

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-bg-deep/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="container-app pointer-events-auto pb-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        <div className="animate-pop-in rounded-3xl border border-border-strong bg-surface px-5 py-6 shadow-glow">
          <p className="label-eyebrow text-center text-primary-soft">
            жаңа жетістік
          </p>
          <h2 className="mt-2 text-center font-display text-[20px] tracking-tightest text-ink">
            {badges.length === 1
              ? 'Сен жаңа белгі алдың'
              : `Бірден ${badges.length} жетістік`}
          </h2>

          <div className="mt-5 flex flex-wrap items-start justify-center gap-5">
            {badges.map((b) => (
              <AchievementBadge
                key={b.slug}
                badge={b}
                state={{ earned: true }}
                size="lg"
              />
            ))}
          </div>

          <Button size="lg" className="mt-6 w-full" onClick={onClose}>
            Жалғастыру
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
