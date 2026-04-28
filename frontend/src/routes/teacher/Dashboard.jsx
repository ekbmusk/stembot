import { Activity, FileCheck, GraduationCap, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { listCases } from '../../api/cases';
import { listSubmissions } from '../../api/teacher';
import { getStats } from '../../api/teacher';
import { TopBar } from '../../components/Layout/TopBar';
import { formatScore, formatStatus, statusTone } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { TOPICS, TOPIC_ORDER, caseTopic } from '../../lib/topics';

function StatTile({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="label-eyebrow">{label}</p>
        <Icon size={14} className="text-ink-faint" />
      </div>
      <p className="font-display text-[26px] tracking-tightest text-ink">{value}</p>
      {hint ? <p className="mt-1 font-mono text-[11px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(),
      listSubmissions({ status: 'submitted' }),
      listCases(),
    ])
      .then(([s, subs, cs]) => {
        setStats(s);
        setRecent(subs.slice(0, 5));
        setCases(cs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <TopBar eyebrow="мұғалім" title="Шолу" />
        <div className="flex items-center justify-center py-12 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </>
    );
  }

  const byTopic = TOPIC_ORDER.map((slug) => {
    const count = cases.filter((c) => caseTopic(c) === slug).length;
    return { name: TOPICS[slug].kk, value: count, accent: TOPICS[slug].accent };
  }).filter((d) => d.value > 0);

  return (
    <>
      <TopBar eyebrow="мұғалім" title="Шолу" />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <StatTile label="Оқушылар" value={stats?.total_students ?? 0} icon={Users} />
        <StatTile label="Кейстер" value={stats?.total_cases ?? 0} icon={GraduationCap} />
        <StatTile
          label="Тапсырылды"
          value={stats?.submissions_submitted ?? 0}
          icon={FileCheck}
          hint={`${stats?.submissions_in_progress ?? 0} орындалуда`}
        />
        <StatTile
          label="Орт. балл"
          value={formatScore(stats?.average_score)}
          icon={Activity}
          hint={`${stats?.submissions_graded ?? 0} бағаланды`}
        />
      </div>

      {byTopic.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-3">тема бойынша</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTopic} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: '#1A1A2E',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.92)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byTopic.map((d, i) => (
                    <Bar
                      key={i}
                      dataKey="value"
                      data={[d]}
                      isAnimationActive={false}
                      fill={d.accent}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <p className="label-eyebrow mb-2 px-1">соңғы тапсырыстар</p>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-[13px] text-ink-muted">
          Жаңа тапсырыс жоқ.
        </div>
      ) : (
        <ul className="space-y-2">
          {recent.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[14px] tracking-tight text-ink">
                  Кейс №{s.case_id}
                </p>
                <p className="font-mono text-[11px] text-ink-faint">
                  Оқушы #{s.user_id} ·{' '}
                  {new Date(s.submitted_at ?? s.started_at).toLocaleDateString('kk-KZ')}
                </p>
              </div>
              <Badge tone={statusTone(s.status)}>{formatStatus(s.status)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
