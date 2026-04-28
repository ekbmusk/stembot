import {
  Award,
  Compass,
  Eye,
  Flag,
  Flame,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

import { cn } from '../lib/cn';

// Centralised lookup so the BADGES table stays JSON-shaped.
const ICONS = { Award, Compass, Eye, Flag, Flame, Sparkles, Trophy, Zap };

export function AchievementBadge({
  badge,
  state,
  size = 'md',
  showLabel = true,
  onClick,
  className,
}) {
  const Icon = ICONS[badge.icon] ?? Award;
  const earned = !!state?.earned;
  const tile =
    size === 'sm'
      ? 'h-12 w-12'
      : size === 'lg'
        ? 'h-20 w-20'
        : 'h-16 w-16';
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 30 : 24;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-2 text-center transition',
        onClick ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
        className,
      )}
      style={{ '--accent': badge.accent }}
    >
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-2xl border transition',
          tile,
          earned
            ? 'border-[--accent]/35 bg-surface'
            : 'border-border bg-surface/60',
        )}
        style={
          earned
            ? {
                background:
                  'radial-gradient(120% 120% at 50% 0%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%), #1A1A2E',
                boxShadow:
                  '0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent), 0 12px 40px -20px color-mix(in oklab, var(--accent) 50%, transparent)',
              }
            : undefined
        }
      >
        <Icon
          size={iconSize}
          className={earned ? 'text-[--accent]' : 'text-ink-faint'}
        />
        {!earned ? (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-ink-faint">
            <Lock size={10} />
          </span>
        ) : null}
      </span>

      {showLabel ? (
        <div className="space-y-0.5">
          <p
            className={cn(
              'font-display text-[12px] leading-tight tracking-tight',
              earned ? 'text-ink' : 'text-ink-faint',
            )}
          >
            {badge.kk}
          </p>
          {state?.target ? (
            <p className="font-mono text-[10px] tabular-nums text-ink-faint">
              {Math.min(state.progress ?? 0, state.target)} / {state.target}
            </p>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
