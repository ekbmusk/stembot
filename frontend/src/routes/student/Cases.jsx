import { Check, ChevronRight, CircleDashed, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { listMine } from '../../api/submissions';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { cn } from '../../lib/cn';
import {
  DIFFICULTY_KK,
  LEVELS,
  LEVEL_ORDER,
  TOPICS,
  TOPIC_ORDER,
  caseTopic,
  topicMeta,
  topicStyle,
} from '../../lib/topics';
import { haptic } from '../../lib/telegram';
import { useCaseStore } from '../../store/caseStore';

function ChipRow({ eyebrow, options, active, onChange, allLabel = 'Барлығы' }) {
  return (
    <div className="-mx-4 mb-2 px-4">
      <p className="label-eyebrow mb-1.5">{eyebrow}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <Chip
          isActive={active === null}
          onClick={() => {
            haptic('select');
            onChange(null);
          }}
        >
          {allLabel}
        </Chip>
        {options.map(({ key, label, accent }) => (
          <Chip
            key={key}
            isActive={active === key}
            accent={accent}
            onClick={() => {
              haptic('select');
              onChange(active === key ? null : key);
            }}
          >
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ isActive, accent, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition',
        isActive
          ? 'border-transparent bg-ink text-bg'
          : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
      )}
      style={accent && !isActive ? { '--subject': accent } : undefined}
    >
      {accent ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            isActive ? 'bg-bg' : 'bg-[--subject]',
          )}
        />
      ) : null}
      {children}
    </button>
  );
}

const STATUS_META = {
  not_started: { kk: 'Бастамаған', tone: 'outline', icon: CircleDashed },
  in_progress: { kk: 'Орындалуда', tone: 'warn', icon: Loader2 },
  done:        { kk: 'Бітті',      tone: 'success', icon: Check },
};

function CaseCard({ c, status }) {
  const topic = caseTopic(c);
  const meta = topicMeta(topic);
  const sm = STATUS_META[status] ?? STATUS_META.not_started;
  const StatusIcon = sm.icon;
  return (
    <Link
      to={`/cases/${c.id}`}
      onClick={() => haptic('light')}
      style={topicStyle(topic)}
      className="group block animate-fade-up"
    >
      <article
        className={cn(
          'ring-subject sticker-glow relative overflow-hidden rounded-2xl bg-surface transition group-active:scale-[0.99]',
          status === 'done' && 'motion-safe:animate-breath-pulse',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'var(--subject)' }} />

        <div className="flex gap-3 p-4">
          <div className="relative h-20 w-20 shrink-0">
            {c.cover_image_url ? (
              <img
                src={c.cover_image_url}
                alt=""
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="h-20 w-20 rounded-xl border border-border bg-bg-deep/60"
                style={{
                  backgroundImage:
                    'radial-gradient(80% 80% at 30% 30%, color-mix(in oklab, var(--subject) 35%, transparent), transparent 70%)',
                }}
              />
            )}
            {status !== 'not_started' ? (
              <span
                aria-label={sm.kk}
                className={cn(
                  'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-bg ring-1',
                  status === 'done' && 'bg-success/90 text-bg ring-success/50',
                  status === 'in_progress' && 'bg-warn/90 text-bg ring-warn/50',
                )}
              >
                <StatusIcon size={11} strokeWidth={2.5} />
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="subject" style={{ color: 'var(--subject)' }}>
                {meta.kk}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
                {DIFFICULTY_KK[c.difficulty] ?? c.difficulty}
              </span>
              <Badge tone={sm.tone} className="ml-auto">
                {sm.kk}
              </Badge>
            </div>
            <h3 className="font-display text-[15px] leading-tight tracking-tight text-ink line-clamp-2">
              {c.title_kk}
            </h3>
            {c.objective_kk ? (
              <p className="text-[13px] leading-snug text-ink-muted line-clamp-2">
                {c.objective_kk}
              </p>
            ) : null}
          </div>
          <ChevronRight
            size={18}
            className="shrink-0 self-center text-ink-faint transition group-hover:text-ink"
          />
        </div>
      </article>
    </Link>
  );
}

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic');
  const level = params.get('level');

  const setTopic = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('topic', next);
    else p.delete('topic');
    setParams(p, { replace: true });
  };
  const setLevel = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('level', next);
    else p.delete('level');
    setParams(p, { replace: true });
  };

  const loadCatalogue = useCaseStore((s) => s.loadCatalogue);
  const cache = useCaseStore((s) => s.catalogueBySubject);
  const loading = useCaseStore((s) => s.loading);

  const [mySubs, setMySubs] = useState([]);

  // We fetch the full catalogue once and filter on the client — 26 cases comfortably fits.
  useEffect(() => {
    loadCatalogue();
    listMine().then(setMySubs).catch(() => setMySubs([]));
  }, [loadCatalogue]);

  const all = cache.__all__ ?? [];

  // Per-case status derived from the latest submission for that case.
  const statusByCase = useMemo(() => {
    const m = {};
    for (const s of mySubs) {
      const prev = m[s.case_id];
      if (!prev || new Date(s.started_at) > new Date(prev.started_at)) {
        m[s.case_id] = s;
      }
    }
    const out = {};
    for (const c of all) {
      const s = m[c.id];
      if (!s) out[c.id] = 'not_started';
      else if (s.status === 'in_progress') out[c.id] = 'in_progress';
      else out[c.id] = 'done';
    }
    return out;
  }, [mySubs, all]);

  const counts = useMemo(() => {
    const byTopic = Object.fromEntries(TOPIC_ORDER.map((k) => [k, 0]));
    const byLevel = Object.fromEntries(LEVEL_ORDER.map((k) => [k, 0]));
    for (const c of all) {
      const t = caseTopic(c);
      if (t && byTopic[t] !== undefined) byTopic[t] += 1;
      if (byLevel[c.difficulty] !== undefined) byLevel[c.difficulty] += 1;
    }
    return { byTopic, byLevel };
  }, [all]);

  const visible = useMemo(
    () =>
      all.filter(
        (c) =>
          (!topic || caseTopic(c) === topic) &&
          (!level || c.difficulty === level),
      ),
    [all, topic, level],
  );

  const isLoading = loading && all.length === 0;

  return (
    <>
      <TopBar eyebrow="каталог" title="STEM кейстер" />

      <ChipRow
        eyebrow="тема"
        active={topic}
        onChange={setTopic}
        options={TOPIC_ORDER
          .filter((k) => counts.byTopic[k] > 0)
          .map((k) => ({
            key: k,
            label: TOPICS[k].kk,
            accent: TOPICS[k].accent,
          }))}
      />
      <ChipRow
        eyebrow="деңгей"
        active={level}
        onChange={setLevel}
        options={LEVEL_ORDER
          .filter((k) => counts.byLevel[k] > 0)
          .map((k) => ({
            key: k,
            label: LEVELS[k].kk,
            accent: LEVELS[k].accent,
          }))}
      />

      <div className="mb-3 flex items-center justify-between px-1">
        <span className="font-mono text-[11px] tabular-nums text-ink-faint">
          {visible.length} / {all.length}
        </span>
        {(topic || level) && (
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setParams({}, { replace: true });
            }}
            className="font-mono text-[11px] uppercase tracking-ticker text-ink-muted hover:text-ink"
          >
            тазалау
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Бұл сүзгіге сай кейс жоқ"
          hint="Басқа тема немесе деңгейді көріп көр."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((c, i) => (
            <div key={c.id} style={{ animationDelay: `${i * 30}ms` }}>
              <CaseCard c={c} status={statusByCase[c.id] ?? 'not_started'} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
