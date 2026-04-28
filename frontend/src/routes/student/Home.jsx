import { ArrowRight, Flame, PlayCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listCases } from '../../api/cases';
import { listMine } from '../../api/submissions';
import { AchievementBadge } from '../../components/AchievementBadge';
import { SplashCurtain } from '../../components/SplashCurtain';
import { TopBar } from '../../components/Layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useCountUp } from '../../lib/animation';
import { evaluateBadges } from '../../lib/badges';
import { cn } from '../../lib/cn';
import { formatScore, formatStatus, statusTone } from '../../lib/format';
import { haptic } from '../../lib/telegram';
import {
  TOPICS,
  TOPIC_ORDER,
  caseTopic,
  topicMeta,
  topicStyle,
} from '../../lib/topics';
import { useUserStore } from '../../store/userStore';

const COMPLETED = new Set(['submitted', 'graded']);

export default function Home() {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Splash curtain — show on first session entry; subsequent renders skip it.
  const [splashShown, setSplashShown] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !sessionStorage.getItem('home_splash_seen');
  });
  const mountedAt = useRef(performance.now());

  useEffect(() => {
    Promise.all([listCases(), listMine()])
      .then(([c, s]) => {
        setCases(c);
        setSubs(s);
      })
      .finally(() => setLoading(false));
  }, []);

  // Hide splash once data is ready AND a minimum cover time has elapsed —
  // keeps short loads from flashing the curtain off too quickly.
  useEffect(() => {
    if (!splashShown || loading) return undefined;
    const elapsed = performance.now() - mountedAt.current;
    const remaining = Math.max(0, 1300 - elapsed);
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem('home_splash_seen', '1');
      } catch {
        /* ignore */
      }
      setSplashShown(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [loading, splashShown]);

  // Latest submission per case (for progress accounting).
  const latestByCase = useMemo(() => {
    const m = {};
    for (const s of subs) {
      const prev = m[s.case_id];
      if (!prev || new Date(s.started_at) > new Date(prev.started_at)) {
        m[s.case_id] = s;
      }
    }
    return m;
  }, [subs]);

  const completed = useMemo(
    () => subs.filter((s) => COMPLETED.has(s.status)),
    [subs],
  );
  const totalPoints = useMemo(
    () => completed.reduce((sum, s) => sum + (s.total_score ?? 0), 0),
    [completed],
  );

  const inProgress = subs.find((s) => s.status === 'in_progress');
  const inProgressCase = inProgress
    ? cases.find((c) => c.id === inProgress.case_id)
    : null;

  const byTopic = useMemo(
    () =>
      TOPIC_ORDER.map((slug) => {
        const topicCases = cases.filter((c) => caseTopic(c) === slug);
        if (topicCases.length === 0) return null;
        const done = topicCases.filter((c) => {
          const ls = latestByCase[c.id];
          return ls && COMPLETED.has(ls.status);
        }).length;
        return {
          slug,
          total: topicCases.length,
          done,
          kk: TOPICS[slug].kk,
          accent: TOPICS[slug].accent,
        };
      }).filter(Boolean),
    [cases, latestByCase],
  );

  const recent = useMemo(() => subs.slice(0, 3), [subs]);

  const totalCases = cases.length;
  const completedCount = completed.length;
  const progressPct = totalCases ? Math.round((completedCount / totalCases) * 100) : 0;

  // Achievements — show 4: earned first, then locked-with-progress, then locked.
  const badgePreview = useMemo(() => {
    if (!cases.length) return [];
    const items = evaluateBadges(subs, cases);
    const earned = items.filter((b) => b.state.earned);
    const inProgress = items
      .filter((b) => !b.state.earned && b.state.target)
      .sort(
        (a, b) =>
          (b.state.progress ?? 0) / b.state.target -
          (a.state.progress ?? 0) / a.state.target,
      );
    const rest = items.filter(
      (b) => !b.state.earned && !b.state.target,
    );
    return [...earned, ...inProgress, ...rest].slice(0, 4);
  }, [subs, cases]);

  const completedDisplay = useCountUp(completedCount, 800);
  const pointsDisplay = useCountUp(totalPoints, 900);

  return (
    <>
      <SplashCurtain visible={splashShown} />

      <div
        className="transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
        style={{
          opacity: splashShown ? 0 : 1,
          transform: splashShown ? 'translateY(64px)' : 'translateY(0)',
        }}
      >
      <TopBar
        eyebrow={`сәлем, ${user?.first_name?.toLowerCase?.() || 'оқушы'}`}
        title="STEM кейстер"
        action={
          user ? (
            <Link
              to="/me"
              onClick={() => haptic('light')}
              aria-label="Профиль"
              className="rounded-full transition active:scale-[0.94]"
            >
              <Avatar user={user} size={36} />
            </Link>
          ) : null
        }
      />

      {/* Hero / progress overview */}
      <section
        className="relative mb-4 overflow-hidden rounded-3xl border border-border bg-surface p-5"
        style={{
          backgroundImage:
            'radial-gradient(120% 80% at 100% 0%, rgba(108, 99, 255, 0.22), transparent 60%), radial-gradient(80% 60% at 0% 100%, rgba(79, 209, 197, 0.14), transparent 70%)',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl motion-safe:animate-breath-pulse"
        />
        <p className="label-eyebrow mb-3">прогресс</p>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-[44px] leading-none tracking-tightest text-ink tabular-nums">
              {Math.round(completedDisplay)}
              <span className="text-ink-faint">/{totalCases}</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">кейс бітті</p>
          </div>

          <div className="text-right">
            <p className="font-mono text-[28px] tabular-nums leading-none text-primary-soft">
              {formatScore(pointsDisplay)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
              жалпы балл
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-deep/80">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-right font-mono text-[10px] tabular-nums text-ink-faint">
            {progressPct}%
          </p>
        </div>
      </section>

      {/* Continue */}
      {inProgressCase ? (
        <Link
          to={`/cases/${inProgressCase.id}`}
          onClick={() => haptic('light')}
          style={topicStyle(caseTopic(inProgressCase))}
          className="ring-subject mb-4 flex items-center gap-3 overflow-hidden rounded-2xl bg-surface p-4 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-deep text-[--subject]">
            <PlayCircle size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow mb-1">жалғастыр</p>
            <p className="truncate font-display text-[15px] tracking-tight text-ink">
              {inProgressCase.title_kk}
            </p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-ink-muted" />
        </Link>
      ) : null}

      {/* Topic mastery */}
      {byTopic.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <header className="mb-3 flex items-center justify-between">
            <p className="label-eyebrow">тема бойынша игеру</p>
            <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
              {byTopic.filter((t) => t.done > 0).length} / {byTopic.length}
            </span>
          </header>
          <ul className="space-y-3">
            {byTopic.map((t) => (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => {
                    haptic('select');
                    navigate(`/cases?topic=${t.slug}`);
                  }}
                  className="w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13px] text-ink">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: t.accent }}
                      />
                      {t.kk}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                      {t.done} / {t.total}
                    </span>
                  </div>
                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-bg-deep/80">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(t.done / t.total) * 100}%`,
                        background: t.accent,
                      }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Achievements preview */}
      {badgePreview.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <header className="mb-3 flex items-center justify-between">
            <p className="label-eyebrow">жетістіктер</p>
            <Link
              to="/me"
              onClick={() => haptic('light')}
              className="font-mono text-[10px] uppercase tracking-ticker text-ink-muted hover:text-ink"
            >
              барлығы →
            </Link>
          </header>
          <div className="grid grid-cols-4 gap-3">
            {badgePreview.map((b) => (
              <AchievementBadge
                key={b.slug}
                badge={b}
                state={b.state}
                size="sm"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent */}
      {recent.length ? (
        <section className="mb-4">
          <p className="label-eyebrow mb-2 px-1">соңғы әрекет</p>
          <ul className="space-y-2">
            {recent.map((s) => {
              const c = cases.find((x) => x.id === s.case_id);
              const topic = c ? caseTopic(c) : null;
              return (
                <li key={s.id}>
                  <Link
                    to={`/cases/${s.case_id}`}
                    onClick={() => haptic('light')}
                    style={topic ? topicStyle(topic) : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:scale-[0.99]',
                      topic && 'ring-subject',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[14px] tracking-tight text-ink">
                        {c?.title_kk ?? `Кейс #${s.case_id}`}
                      </p>
                      <p className="font-mono text-[11px] text-ink-faint">
                        {new Date(s.started_at).toLocaleDateString('kk-KZ', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={statusTone(s.status)}>{formatStatus(s.status)}</Badge>
                      {s.total_score != null ? (
                        <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                          {formatScore(s.total_score)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="mb-4 rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
          <Sparkles size={18} className="mx-auto mb-2 text-ink-faint" />
          <p className="text-[13px] text-ink-muted">
            Әзірге бастаған кейс жоқ. Каталогтан таңдап, бірінші кейсті ашайық.
          </p>
        </div>
      )}

      <Link to="/cases">
        <Button size="lg" className="w-full">
          Каталогты ашу
          <ArrowRight size={16} />
        </Button>
      </Link>

      <p className="mt-3 flex items-center justify-center gap-2 px-1 text-[12px] text-ink-faint">
        <Flame size={12} />
        {completedCount > 0
          ? `Сен бүгінге дейін ${completedCount} кейсті аяқтадың — әрі қарай!`
          : 'Бірінші кейс — ең қызықтысы. Бастайық.'}
      </p>
      </div>
    </>
  );
}
