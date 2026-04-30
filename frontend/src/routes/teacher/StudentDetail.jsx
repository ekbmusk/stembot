import { Check, ChevronRight, CircleDashed, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { listCases } from '../../api/cases';
import { listStudents, listSubmissions } from '../../api/teacher';
import { TopBar } from '../../components/Layout/TopBar';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';
import {
  formatScore,
  formatStatus,
  statusTone,
  studentName,
} from '../../lib/format';
import { caseTopic, topicMeta, topicStyle } from '../../lib/topics';

const COMPLETED = new Set(['submitted', 'graded']);

function answerSummary(answer, task) {
  if (!task) return null;
  const score = answer?.score;
  const max = task.points ?? 0;
  if (score == null) {
    return { tone: 'muted', icon: CircleDashed, label: 'күтуде' };
  }
  if (score >= max - 0.001) return { tone: 'success', icon: Check, label: 'дұрыс' };
  if (score <= 0) return { tone: 'danger', icon: X, label: 'қате' };
  return { tone: 'warn', icon: Check, label: 'жартылай' };
}

export default function StudentDetail() {
  const { id } = useParams();
  const studentId = Number(id);

  const [students, setStudents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listStudents(), listSubmissions(), listCases()])
      .then(([st, s, c]) => {
        setStudents(st);
        setSubs(s.filter((x) => x.user_id === studentId));
        setCases(c);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const student = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );

  const casesById = useMemo(() => {
    const m = {};
    for (const c of cases) m[c.id] = c;
    return m;
  }, [cases]);

  const stats = useMemo(() => {
    const out = { total: 0, completed: 0, totalScore: 0, correct: 0, wrong: 0 };
    for (const s of subs) {
      out.total += 1;
      if (COMPLETED.has(s.status)) {
        out.completed += 1;
        out.totalScore += s.total_score ?? 0;
      }
      const c = casesById[s.case_id];
      if (!c) continue;
      const tasksById = {};
      for (const t of c.tasks ?? []) tasksById[t.id] = t;
      for (const a of s.answers ?? []) {
        const t = tasksById[a.task_id];
        if (!t) continue;
        if (a.score == null) continue;
        const max = t.points ?? 0;
        if (max <= 0) continue;
        if (a.score >= max - 0.001) out.correct += 1;
        else if (a.score <= 0) out.wrong += 1;
      }
    }
    return out;
  }, [subs, casesById]);

  if (loading) {
    return (
      <>
        <TopBar back eyebrow="оқушы" title="Жүктелуде…" />
        <div className="flex items-center justify-center py-12 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <TopBar back eyebrow="оқушы" title="Табылмады" />
        <EmptyState title="Бұл оқушы табылмады" />
      </>
    );
  }

  return (
    <>
      <TopBar back eyebrow="оқушы" title={studentName(student, student.id)} />

      {/* Profile header */}
      <section className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <Avatar user={student} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[16px] tracking-tight text-ink">
            {studentName(student, student.id)}
          </p>
          {student.username ? (
            <p className="font-mono text-[12px] text-ink-muted">@{student.username}</p>
          ) : null}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Tile label="Тапсырыс" value={stats.total} />
        <Tile label="Аяқталған" value={stats.completed} />
        <Tile label="Балл" value={formatScore(stats.totalScore)} mono />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Tile
          label="Дұрыс жауап"
          value={stats.correct}
          tone="success"
        />
        <Tile label="Қате жауап" value={stats.wrong} tone="danger" />
      </div>

      <p className="label-eyebrow mb-2 px-1">тапсырыстар</p>

      {subs.length === 0 ? (
        <EmptyState
          title="Тапсырыс жоқ"
          hint="Бұл оқушы әлі бірде-бір кейс бастамаған."
        />
      ) : (
        <ul className="space-y-2">
          {subs
            .slice()
            .sort(
              (a, b) =>
                new Date(b.started_at) - new Date(a.started_at),
            )
            .map((s) => {
              const c = casesById[s.case_id];
              const topic = c ? caseTopic(c) : null;
              const tasksById = {};
              for (const t of c?.tasks ?? []) tasksById[t.id] = t;
              return (
                <li key={s.id} style={topic ? topicStyle(topic) : undefined}>
                  <Link
                    to={`/teacher/submissions/${s.id}`}
                    className={cn(
                      'group flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3 active:scale-[0.99]',
                      topic && 'ring-subject',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[14px] tracking-tight text-ink">
                          {c?.title_kk ?? `Кейс №${s.case_id}`}
                        </p>
                        <p className="font-mono text-[11px] text-ink-faint">
                          {new Date(s.started_at).toLocaleDateString('kk-KZ', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={statusTone(s.status)}>
                          {formatStatus(s.status)}
                        </Badge>
                        {s.total_score != null ? (
                          <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                            {formatScore(s.total_score)}
                          </span>
                        ) : null}
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-ink-faint group-hover:text-ink"
                      />
                    </div>

                    {/* Per-task correctness pips */}
                    {(s.answers?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {s.answers.map((a) => {
                          const t = tasksById[a.task_id];
                          const m = answerSummary(a, t);
                          if (!m) return null;
                          const Icon = m.icon;
                          const cls = {
                            success:
                              'bg-success/15 text-success ring-1 ring-success/30',
                            warn: 'bg-warn/15 text-warn ring-1 ring-warn/30',
                            danger:
                              'bg-danger/15 text-danger ring-1 ring-danger/30',
                            muted:
                              'bg-surface-2 text-ink-faint ring-1 ring-border',
                          }[m.tone];
                          return (
                            <span
                              key={a.id}
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md',
                                cls,
                              )}
                              title={m.label}
                            >
                              <Icon size={11} strokeWidth={2.4} />
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </>
  );
}

function Tile({ label, value, mono = false, tone = 'default' }) {
  const toneCls = {
    default: 'text-ink',
    success: 'text-success',
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
