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

const ICONS = { Award, Compass, Eye, Flag, Flame, Sparkles, Trophy, Zap };

const SIZES = {
  sm: { tile: 'h-14 w-14', medal: 'h-9 w-9', icon: 18 },
  md: { tile: 'h-[68px] w-[68px]', medal: 'h-11 w-11', icon: 22 },
  lg: { tile: 'h-24 w-24', medal: 'h-16 w-16', icon: 32 },
};

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
  const dim = SIZES[size] ?? SIZES.md;

  // The earned palette is the badge's accent colour driven through CSS vars,
  // so each badge gets its own distinct medal hue. The locked palette is a
  // single muted slate so the gallery reads "things to unlock" at a glance.
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
          dim.tile,
          earned
            ? 'border-[--accent]/40'
            : 'border-border',
        )}
        style={
          earned
            ? {
                background:
                  'radial-gradient(140% 130% at 50% 0%, color-mix(in oklab, var(--accent) 26%, transparent), transparent 70%), #181830',
                boxShadow:
                  '0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent), 0 16px 36px -18px color-mix(in oklab, var(--accent) 70%, transparent)',
              }
            : { background: '#1A1A2E' }
        }
      >
        {/* Inner medal — the colourful part. */}
        <span
          className={cn(
            'flex items-center justify-center rounded-full transition',
            dim.medal,
          )}
          style={
            earned
              ? {
                  background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--accent) 95%, white), color-mix(in oklab, var(--accent) 70%, black))',
                  boxShadow:
                    'inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -2px 4px 0 rgba(0,0,0,0.18), 0 6px 14px -6px color-mix(in oklab, var(--accent) 80%, transparent)',
                }
              : {
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
                }
          }
        >
          <Icon
            size={dim.icon}
            className={earned ? 'text-white drop-shadow-sm' : 'text-ink-faint'}
            strokeWidth={earned ? 1.8 : 1.5}
          />
        </span>

        {/* Highlight sparkle — only when earned, only on md/lg. */}
        {earned && size !== 'sm' ? (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface ring-1 ring-[--accent]/40"
          >
            <Sparkles size={10} className="text-[--accent]" />
          </span>
        ) : null}

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
