import { Send } from 'lucide-react';
import { useState } from 'react';

import { evaluateBadges } from '../lib/badges';
import { shareAchievements } from '../lib/share';
import { haptic } from '../lib/telegram';
import { AchievementBadge } from './AchievementBadge';

/**
 * Full grid for Profile / dedicated views. Tap a badge to read its condition.
 * Header offers a Telegram share button when at least one badge is earned.
 */
export function AchievementGallery({ submissions, cases }) {
  const items = evaluateBadges(submissions ?? [], cases ?? []);
  const earned = items.filter((b) => b.state.earned).length;
  const [activeSlug, setActiveSlug] = useState(null);
  const active = items.find((b) => b.slug === activeSlug) ?? null;

  function onShare() {
    haptic('light');
    shareAchievements(items);
  }

  return (
    <section className="mb-4">
      <header className="mb-3 flex items-center justify-between px-1">
        <p className="label-eyebrow">жетістіктер</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-ink-faint">
            {earned} / {items.length}
          </span>
          {earned > 0 ? (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-ticker text-primary-soft hover:bg-primary/20"
            >
              <Send size={11} />
              бөлісу
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 rounded-2xl border border-border bg-surface p-4">
        {items.map((b) => (
          <AchievementBadge
            key={b.slug}
            badge={b}
            state={b.state}
            onClick={() =>
              setActiveSlug((s) => (s === b.slug ? null : b.slug))
            }
          />
        ))}
      </div>

      {active ? (
        <div className="mt-2 animate-fade-up rounded-xl border border-border bg-surface/70 px-3 py-3">
          <p className="font-display text-[14px] tracking-tight text-ink">
            {active.kk}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {active.description_kk}
          </p>
          {active.state.target ? (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-ink-faint">
              ағымдағы: {Math.min(active.state.progress ?? 0, active.state.target)} / {active.state.target}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
