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
import { caseTopic, topicStyle } from '../../lib/topics';
import { useUserStore } from '../../store/userStore';

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

  const stats = subs.reduce(
    (acc, s) => {
      if (s.status === 'in_progress') acc.inProgress += 1;
      else acc.done += 1;
      acc.total += s.total_score ?? 0;
      return acc;
    },
    { inProgress: 0, done: 0, total: 0 },
  );

  return (
    <>
      <TopBar eyebrow="профиль" title={user?.first_name ?? 'Менің профилім'} />

      <section className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <Avatar user={user} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[16px] tracking-tight text-ink">
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}
          </p>
          {user?.username ? (
            <p className="font-mono text-[12px] text-ink-muted">@{user.username}</p>
          ) : null}
        </div>
        <Badge tone={user?.role === 'teacher' ? 'primary' : 'outline'}>
          {user?.role === 'teacher' ? 'мұғалім' : 'оқушы'}
        </Badge>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Орындалуда" value={stats.inProgress} />
        <StatTile label="Бітті" value={stats.done} />
        <StatTile label="Балл" value={formatScore(stats.total)} mono />
      </div>

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

function StatTile({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-3">
      <p className="label-eyebrow mb-1">{label}</p>
      <p
        className={`font-display text-[22px] tracking-tightest text-ink ${
          mono ? 'font-mono tracking-normal' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
