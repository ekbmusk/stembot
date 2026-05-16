import { Award, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listCases } from '../../api/cases';
import { listMine } from '../../api/submissions';
import { AchievementGallery } from '../../components/AchievementGallery';
import { TopBar } from '../../components/Layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';
import { formatScore, formatStatus, statusTone } from '../../lib/format';
import {
  LEVELS,
  LEVEL_ORDER,
  TOPICS,
  TOPIC_ORDER,
  caseTopic,
  topicStyle,
} from '../../lib/topics';
import { useUserStore } from '../../store/userStore';

const COMPLETED = new Set(['submitted', 'graded']);

export default function Profile() {
  const user = useUserStore((s) => s.user);
  const [subs, setSubs] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMine(), listCases()])
      .then(([s, c]) => {
        setSubs(s);
        setCases(c);
      })
      .catch(() => {
        setSubs([]);
        setCases([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const casesById = useMemo(() => {
    const m = {};
    for (const c of cases) m[c.id] = c;
    return m;
  }, [cases]);

  // Latest submission per case — used for "топик игерілді" counters so retries
  // don't double-count and an in-progress retry can roll back an earlier
  // completion only if the retry hasn't been finalised yet.
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

  const stats = useMemo(() => {
    const out = {
      inProgress: 0,
      done: 0,
      total: 0,
      correct: 0,
      answered: 0,
    };
    for (const s of subs) {
      if (s.status === 'in_progress') out.inProgress += 1;
      else out.done += 1;
      out.total += s.total_score ?? 0;

      // Approximation: CaseListItem doesn't carry tasks/max points, so we
      // can't reproduce StudentDetail's "score == max" check. Treat any
      // non-zero score as a correct answer for the accuracy meter.
      for (const a of s.answers ?? []) {
        if (a.score == null) continue;
        out.answered += 1;
        if (a.score > 0) out.correct += 1;
      }
    }
    return out;
  }, [subs]);

  const averagePerCase = stats.done > 0 ? stats.total / stats.done : 0;
  const accuracyPct = stats.answered
    ? Math.round((stats.correct / stats.answered) * 100)
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

  const byLevel = useMemo(
    () =>
      LEVEL_ORDER.map((slug) => {
        const levelCases = cases.filter((c) => c.difficulty === slug);
        if (levelCases.length === 0) return null;
        const done = levelCases.filter((c) => {
          const ls = latestByCase[c.id];
          return ls && COMPLETED.has(ls.status);
        }).length;
        return {
          slug,
          total: levelCases.length,
          done,
          kk: LEVELS[slug].kk,
          accent: LEVELS[slug].accent,
        };
      }).filter(Boolean),
    [cases, latestByCase],
  );

  return (
    <>
      <TopBar eyebrow="профиль" title={user?.first_name ?? 'Менің профилім'} />

      <section className="mb-4 overflow-hidden rounded-3xl border border-border bg-surface">
        <div
          className="relative px-5 pb-5 pt-6"
          style={{
            backgroundImage:
              'radial-gradient(120% 80% at 100% 0%, rgba(108, 99, 255, 0.22), transparent 60%), radial-gradient(80% 60% at 0% 100%, rgba(79, 209, 197, 0.12), transparent 70%)',
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar user={user} size={84} className="ring-2 ring-primary/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[20px] tracking-tight text-ink">
                {[user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
                  'Аноним'}
              </p>
              {user?.username ? (
                <p className="font-mono text-[13px] text-primary-soft">
                  @{user.username}
                </p>
              ) : (
                <p className="font-mono text-[12px] text-ink-faint">@—</p>
              )}
              <div className="mt-1.5">
                <Badge tone={user?.role === 'teacher' ? 'primary' : 'outline'}>
                  {user?.role === 'teacher' ? 'мұғалім' : 'оқушы'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border [&>div]:p-3">
          <InfoCell label="Telegram ID" value={user?.telegram_id} mono />
          <InfoCell label="Ішкі ID" value={user?.id} mono />
          <InfoCell
            label="Тіл"
            value={user?.language_code?.toUpperCase() ?? '—'}
            mono
          />
          <InfoCell
            label="Тіркелді"
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString('kk-KZ', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'
            }
          />
        </dl>
      </section>

      <div className="mb-2 grid grid-cols-3 gap-2">
        <StatTile label="Орындалуда" value={stats.inProgress} />
        <StatTile label="Бітті" value={stats.done} />
        <StatTile label="Балл" value={formatScore(stats.total)} mono />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <StatTile
          label="Орт. балл"
          value={stats.done ? formatScore(averagePerCase) : '—'}
          mono
        />
        <StatTile
          label="Дәлдік"
          value={accuracyPct == null ? '—' : `${accuracyPct}%`}
          mono
          tone={
            accuracyPct == null
              ? 'default'
              : accuracyPct >= 75
              ? 'success'
              : accuracyPct >= 50
              ? 'warn'
              : 'danger'
          }
        />
      </div>

      {byTopic.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <header className="mb-3 flex items-center justify-between">
            <p className="label-eyebrow">тақырып бойынша игеру</p>
            <span className="font-mono text-[11px] tabular-nums text-ink-faint">
              {byTopic.filter((t) => t.done > 0).length} / {byTopic.length}
            </span>
          </header>
          <ul className="space-y-3">
            {byTopic.map((t) => (
              <ProgressRow key={t.slug} {...t} />
            ))}
          </ul>
        </section>
      ) : null}

      {byLevel.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <header className="mb-3 flex items-center justify-between">
            <p className="label-eyebrow">қиындық деңгейі</p>
            <span className="font-mono text-[11px] tabular-nums text-ink-faint">
              {byLevel.reduce((s, l) => s + l.done, 0)} /{' '}
              {byLevel.reduce((s, l) => s + l.total, 0)}
            </span>
          </header>
          <ul className="space-y-3">
            {byLevel.map((l) => (
              <ProgressRow key={l.slug} {...l} />
            ))}
          </ul>
        </section>
      ) : null}

      <AchievementGallery submissions={subs} cases={cases} />

      <p className="label-eyebrow mb-2 px-1">тарих</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Тарих бос"
          hint="Каталогтан кейс таңдап, бірінші тапсырыс жаса."
        />
      ) : (
        <ul className="space-y-2">
          {subs.map((s) => {
            const c = casesById[s.case_id];
            const topic = c ? caseTopic(c) : null;
            return (
              <li key={s.id}>
                <Link
                  to={`/cases/${s.case_id}`}
                  style={topic ? topicStyle(topic) : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:scale-[0.99]',
                    topic && 'ring-subject',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14px] tracking-tight text-ink">
                      {c?.title_kk ?? `Кейс №${s.case_id}`}
                    </p>
                    <p className="font-mono text-[11px] text-ink-faint">
                      {new Date(s.started_at).toLocaleDateString('kk-KZ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={statusTone(s.status)}>{formatStatus(s.status)}</Badge>
                    {s.total_score != null ? (
                      <span className="font-mono text-[12px] text-ink-muted">
                        {formatScore(s.total_score)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function InfoCell({ label, value, mono = false }) {
  return (
    <div>
      <p className="label-eyebrow mb-0.5">{label}</p>
      <p
        className={cn(
          'truncate text-[13px] text-ink',
          mono && 'font-mono tabular-nums text-ink-muted',
        )}
        title={String(value ?? '')}
      >
        {value ?? '—'}
      </p>
    </div>
  );
}

function StatTile({ label, value, mono = false, tone = 'default' }) {
  const toneCls = {
    default: 'text-ink',
    success: 'text-success',
    warn: 'text-warn',
    danger: 'text-danger',
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-3">
      <p className="label-eyebrow mb-1">{label}</p>
      <p
        className={cn(
          'font-display text-[22px] tracking-tightest tabular-nums',
          toneCls,
          mono && 'font-mono tracking-normal',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressRow({ kk, accent, done, total }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] text-ink">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent }}
          />
          {kk}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-faint">
          {done} / {total}
        </span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-bg-deep/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </li>
  );
}
