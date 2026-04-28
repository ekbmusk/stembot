import { Check, Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getCase } from '../../api/cases';
import { getSubmission } from '../../api/submissions';
import { gradeSubmission } from '../../api/teacher';
import { FormulaRenderer } from '../../components/FormulaRenderer';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { formatScore, formatStatus, statusTone } from '../../lib/format';
import { useUiStore } from '../../store/uiStore';

function readableAnswer(payload, type) {
  if (!payload) return <span className="text-ink-faint">жауап жоқ</span>;
  if (type === 'open_text')
    return <p className="whitespace-pre-wrap text-[14px] text-ink">{payload.text}</p>;
  if (type === 'numeric')
    return (
      <p className="font-mono text-[18px] tabular-nums text-ink">{payload.value}</p>
    );
  if (type === 'multiple_choice')
    return (
      <div className="flex flex-wrap gap-1">
        {(payload.selected ?? []).map((i) => (
          <Badge key={i} tone="primary">
            №{i + 1}
          </Badge>
        ))}
      </div>
    );
  if (type === 'file_upload')
    return (
      <ul className="space-y-1">
        {(payload.files ?? []).map((f) => (
          <li key={f}>
            <a
              href={f}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[13px] text-primary-soft hover:underline"
            >
              {f.split('/').pop()}
            </a>
          </li>
        ))}
      </ul>
    );
  return null;
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const showToast = useUiStore((s) => s.showToast);
  const [submission, setSubmission] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [grades, setGrades] = useState({}); // { [task_id]: { score, feedback } }
  const [overallFeedback, setOverallFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sub = await getSubmission(Number(id));
      setSubmission(sub);
      const c = await getCase(sub.case_id);
      setCaseData(c);
      const seed = {};
      for (const a of sub.answers) {
        seed[a.task_id] = { score: a.score ?? '', feedback: a.feedback ?? '' };
      }
      setGrades(seed);
    })();
  }, [id]);

  const tasksById = useMemo(() => {
    const m = {};
    for (const t of caseData?.tasks ?? []) m[t.id] = t;
    return m;
  }, [caseData]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        grades: Object.entries(grades)
          .filter(([, v]) => v.score !== '')
          .map(([task_id, v]) => ({
            task_id: Number(task_id),
            score: Number(v.score),
            feedback: v.feedback || null,
          })),
        overall_feedback: overallFeedback || null,
      };
      const updated = await gradeSubmission(submission.id, payload);
      setSubmission(updated);
      showToast(`Сақталды · ${formatScore(updated.total_score)}`, 'success');
    } catch (e) {
      showToast(e.message ?? 'Сақтай алмадым', 'danger');
    } finally {
      setSaving(false);
    }
  }

  if (!submission || !caseData) {
    return (
      <>
        <TopBar back eyebrow="мұғалім" title="Тапсырыс" />
        <div className="flex items-center justify-center py-12 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        back
        eyebrow={`оқушы #${submission.user_id}`}
        title={caseData.title_kk}
      />

      <section className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="label-eyebrow mb-1">статус</p>
          <Badge tone={statusTone(submission.status)}>
            {formatStatus(submission.status)}
          </Badge>
        </div>
        <div className="text-right">
          <p className="label-eyebrow mb-1">барлығы</p>
          <p className="font-mono text-[20px] tabular-nums text-ink">
            {formatScore(submission.total_score)}
          </p>
        </div>
      </section>

      <div className="space-y-3">
        {submission.answers.map((a, i) => {
          const task = tasksById[a.task_id];
          if (!task) return null;
          const g = grades[a.task_id] ?? { score: '', feedback: '' };
          return (
            <Card key={a.id}>
              <CardBody>
                <div className="mb-2 flex items-center gap-2">
                  <span className="num-badge">{String(i + 1).padStart(2, '0')}</span>
                  <span className="label-eyebrow">{task.type}</span>
                  <span className="ml-auto font-mono text-[11px] text-ink-faint">
                    макс {task.points}
                  </span>
                </div>
                <FormulaRenderer className="mb-3 text-[14px] text-ink-muted">
                  {task.prompt_kk}
                </FormulaRenderer>

                <div className="mb-3 rounded-xl border border-border bg-bg-deep/40 px-3 py-3">
                  {readableAnswer(a.payload, task.type)}
                </div>

                {a.auto_graded ? (
                  <p className="mb-2 inline-flex items-center gap-1 font-mono text-[11px] text-success">
                    <Check size={11} /> авто-баға {formatScore(a.score)}
                  </p>
                ) : null}

                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={task.points}
                    value={g.score}
                    onChange={(e) =>
                      setGrades((s) => ({
                        ...s,
                        [a.task_id]: { ...s[a.task_id], score: e.target.value },
                      }))
                    }
                    placeholder="балл"
                    className="rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-center font-mono text-[14px] tabular-nums text-ink focus:border-primary/60 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={g.feedback}
                    onChange={(e) =>
                      setGrades((s) => ({
                        ...s,
                        [a.task_id]: { ...s[a.task_id], feedback: e.target.value },
                      }))
                    }
                    placeholder="пікір (қажет болса)"
                    className="rounded-xl border border-border bg-bg-deep/60 px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
                  />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="label-eyebrow mb-2">жалпы пікір</p>
        <textarea
          rows={3}
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          placeholder="Қалай жалпы тапсырды…"
          className="w-full resize-none rounded-xl border border-border bg-bg-deep/60 px-3 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
        />
      </section>

      <Button size="lg" className="mt-4 w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Бағаны сақтау
      </Button>
    </>
  );
}
