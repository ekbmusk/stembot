import {
  Activity,
  ChevronRight,
  FileCheck,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { listCases } from '../../api/cases';
import {
  getStats,
  listStudents,
  listSubmissions,
} from '../../api/teacher';
import { TopBar } from '../../components/Layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { formatScore, formatStatus, statusTone } from '../../lib/format';
import { TOPICS, TOPIC_ORDER, caseTopic } from '../../lib/topics';

const STATUS_COLORS = {
  in_progress: '#FBBF24',
  submitted: '#6C63FF',
  graded: '#34D399',
};
const STATUS_LABELS = {
  in_progress: 'Орындалуда',
  submitted: 'Тапсырылды',
  graded: 'Бағаланды',
};

const TOOLTIP_STYLE = {
  background: '#1A1A2E',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 12,
  padding: '6px 10px',
};

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

function ChartCard({ eyebrow, height = 176, children }) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <p className="label-eyebrow mb-3">{eyebrow}</p>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(),
      listCases(),
      listStudents(),
      listSubmissions(),
    ])
      .then(([s, c, st, subs]) => {
        setStats(s);
        setCases(c);
        setStudents(st);
        setSubmissions(subs);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── derived data ──────────────────────────────────────────────────────────

  const byTopic = useMemo(() => {
    return TOPIC_ORDER.map((slug) => {
      const count = cases.filter((c) => caseTopic(c) === slug).length;
      return { slug, name: TOPICS[slug].kk, value: count, accent: TOPICS[slug].accent };
    }).filter((d) => d.value > 0);
  }, [cases]);

  const statusBreakdown = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'in_progress', name: STATUS_LABELS.in_progress, value: stats.submissions_in_progress, color: STATUS_COLORS.in_progress },
      { key: 'submitted', name: STATUS_LABELS.submitted, value: stats.submissions_submitted, color: STATUS_COLORS.submitted },
      { key: 'graded', name: STATUS_LABELS.graded, value: stats.submissions_graded, color: STATUS_COLORS.graded },
    ].filter((s) => s.value > 0);
  }, [stats]);

  const trendSeries = useMemo(() => {
    // Submissions per day for the last 7 days (started_at).
    if (!submissions.length) return [];
    const days = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('kk-KZ', { day: '2-digit', month: 'short' }),
        value: 0,
      });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    for (const s of submissions) {
      const k = (s.started_at ?? '').slice(0, 10);
      if (k in idx) days[idx[k]].value += 1;
    }
    return days;
  }, [submissions]);

  // Per-student aggregates: { user_id: { done, in_progress, total_score, latest } }
  const perStudent = useMemo(() => {
    const m = {};
    for (const sub of submissions) {
      const e = (m[sub.user_id] = m[sub.user_id] || {
        done: 0,
        in_progress: 0,
        total_score: 0,
        latest: null,
      });
      if (sub.status === 'in_progress') e.in_progress += 1;
      else e.done += 1;
      e.total_score += sub.total_score ?? 0;
      if (
        !e.latest ||
        new Date(sub.started_at) > new Date(e.latest.started_at)
      ) {
        e.latest = sub;
      }
    }
    return m;
  }, [submissions]);

  const studentsRanked = useMemo(() => {
    return [...students]
      .map((s) => ({ ...s, agg: perStudent[s.id] ?? null }))
      .sort((a, b) => {
        const A = a.agg?.total_score ?? -1;
        const B = b.agg?.total_score ?? -1;
        return B - A;
      });
  }, [students, perStudent]);

  // ── render ────────────────────────────────────────────────────────────────

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

  return (
    <>
      <TopBar eyebrow="мұғалім" title="Шолу" />

      {/* Top stat tiles */}
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

      {/* Topic distribution — cases per topic */}
      {byTopic.length ? (
        <ChartCard eyebrow="тақырып бойынша">
          <BarChart data={byTopic} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              interval={0}
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
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'rgba(255,255,255,0.92)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {byTopic.map((d, i) => (
                <Cell key={i} fill={d.accent} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      ) : null}

      {/* Submission status donut */}
      {statusBreakdown.length ? (
        <ChartCard eyebrow="тапсырыстар күйі" height={184}>
          <PieChart>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, n) => [`${v}`, n]}
            />
            <Pie
              data={statusBreakdown}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              stroke="none"
            >
              {statusBreakdown.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>
      ) : null}

      {/* 7-day trend */}
      {trendSeries.length ? (
        <ChartCard eyebrow="соңғы 7 күн" height={140}>
          <AreaChart
            data={trendSeries}
            margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
          >
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6C63FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
              width={24}
              allowDecimals={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8B82FF"
              strokeWidth={2}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ChartCard>
      ) : null}

      {/* Students list */}
      {students.length ? (
        <section className="mb-4">
          <header className="mb-2 flex items-baseline justify-between px-1">
            <p className="label-eyebrow">оқушылар</p>
            <span className="font-mono text-[11px] tabular-nums text-ink-faint">
              {students.length}
            </span>
          </header>
          <ul className="space-y-2">
            {studentsRanked.map((s) => {
              const a = s.agg;
              const total = (a?.done ?? 0) + (a?.in_progress ?? 0);
              return (
                <li key={s.id}>
                  <Link
                    to={`/teacher/students/${s.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 active:scale-[0.99]"
                  >
                    <Avatar user={s} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[14px] tracking-tight text-ink">
                        {[s.first_name, s.last_name].filter(Boolean).join(' ') ||
                          `Оқушы #${s.id}`}
                      </p>
                      <p className="font-mono text-[11px] text-ink-faint">
                        {total > 0 ? `${a.done}/${total} тапсырыс` : 'тапсырыс жоқ'}
                        {a && a.total_score > 0
                          ? ` · ${formatScore(a.total_score)} балл`
                          : ''}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-ink-faint group-hover:text-ink"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Recent submitted (links straight to grading review). */}
      {submissions.length ? (
        <section className="mb-4">
          <p className="label-eyebrow mb-2 px-1">соңғы тапсырыстар</p>
          <ul className="space-y-2">
            {submissions
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.submitted_at ?? b.started_at) -
                  new Date(a.submitted_at ?? a.started_at),
              )
              .slice(0, 5)
              .map((s) => {
                const c = cases.find((x) => x.id === s.case_id);
                return (
                  <li key={s.id}>
                    <Link
                      to={`/teacher/submissions/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[14px] tracking-tight text-ink">
                          {c?.title_kk ?? `Кейс №${s.case_id}`}
                        </p>
                        <p className="font-mono text-[11px] text-ink-faint">
                          Оқушы #{s.user_id} ·{' '}
                          {new Date(
                            s.submitted_at ?? s.started_at,
                          ).toLocaleDateString('kk-KZ')}
                        </p>
                      </div>
                      <Badge tone={statusTone(s.status)}>
                        {formatStatus(s.status)}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
