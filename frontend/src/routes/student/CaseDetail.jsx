import {
  ArrowRight,
  Check,
  Clock,
  FlaskConical,
  ListChecks,
  Loader2,
  PlayCircle,
  RotateCw,
  Send,
  Sparkles,
  Trophy,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { listCases } from '../../api/cases';
import { listMine } from '../../api/submissions';
import { CaseBlocks } from '../../components/CaseBlocks';
import { FormulaRenderer } from '../../components/FormulaRenderer';
import { TopBar } from '../../components/Layout/TopBar';
import { TaskInput } from '../../components/TaskInput';
import { UnlockOverlay } from '../../components/UnlockOverlay';
import { VideoPlayer } from '../../components/VideoPlayer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Lightbox } from '../../components/ui/Lightbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { celebrate, useCountUp } from '../../lib/animation';
import { diffEarned, getEarnedSlugs } from '../../lib/badges';
import { DIFFICULTY_KK, caseTopic, topicMeta, topicStyle } from '../../lib/topics';
import { haptic } from '../../lib/telegram';
import { useCaseStore } from '../../store/caseStore';
import { useUiStore } from '../../store/uiStore';

function TaskCard({ task, index, value, onChange, onSave, isDirty, isSaving }) {
  return (
    <Card className="animate-fade-up">
      <CardBody>
        <div className="mb-3 flex items-center gap-3">
          <span className="num-badge">{String(index + 1).padStart(2, '0')}</span>
          <span className="label-eyebrow">{taskTypeLabel(task.type)}</span>
          <span className="ml-auto font-mono text-[11px] text-ink-faint">
            {task.points} балл
          </span>
        </div>
        <FormulaRenderer className="mb-3 text-[14px] leading-relaxed text-ink">
          {task.prompt_kk}
        </FormulaRenderer>
        <TaskInput task={task} value={value} onChange={onChange} />
        <div className="mt-3 flex items-center">
          <Button
            size="sm"
            variant={isDirty ? 'primary' : 'secondary'}
            onClick={onSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Сақтау
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function taskTypeLabel(type) {
  return (
    {
      open_text: 'мәтінді жауап',
      numeric: 'сандық жауап',
      multiple_choice: 'нұсқа таңдау',
      file_upload: 'файл жүктеу',
    }[type] ?? type
  );
}

function StatPill({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface px-2 py-3 text-center">
      <Icon size={14} className="text-ink-faint" />
      <span className="font-display text-[18px] leading-none tracking-tightest text-ink">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
        {label}
      </span>
    </div>
  );
}

function Intro({ caseData, existingSubmission, onStart, starting }) {
  const topic = caseTopic(caseData);
  const meta = topicMeta(topic);
  const [zoomSrc, setZoomSrc] = useState(null);
  const totalPoints = (caseData.tasks ?? []).reduce(
    (s, t) => s + (t.points ?? 0),
    0,
  );

  let cta = { label: 'Бастау', icon: ArrowRight };
  if (existingSubmission?.status === 'in_progress') {
    cta = { label: 'Жалғастыру', icon: PlayCircle };
  }
  const Icon = cta.icon;

  return (
    <div style={topicStyle(topic)}>
      <TopBar back eyebrow="кейс" title={caseData.title_kk} />

      {/* Poster */}
      <article className="ring-subject animate-fade-in mb-4 overflow-hidden rounded-3xl bg-surface">
        <div className="relative">
          {caseData.cover_image_url ? (
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setZoomSrc(caseData.cover_image_url);
              }}
              aria-label="Үлкейту"
              className="block w-full"
            >
              <img
                src={caseData.cover_image_url}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
            </button>
          ) : (
            <div
              aria-hidden
              className="aspect-[16/10] w-full"
              style={{
                backgroundImage:
                  'radial-gradient(120% 100% at 20% 0%, color-mix(in oklab, var(--subject) 32%, transparent), transparent 70%)',
              }}
            />
          )}
          {/* Gradient veil so badges read on any photo */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg-deep/85 via-bg-deep/40 to-transparent"
          />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <Badge tone="subject" style={{ color: 'var(--subject)' }}>
              {meta.kk}
            </Badge>
            <Badge tone="outline">
              {DIFFICULTY_KK[caseData.difficulty] ?? caseData.difficulty}
            </Badge>
            {caseData.age_range ? (
              <Badge tone="outline">{caseData.age_range} жас</Badge>
            ) : null}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
            <h1 className="font-display text-[22px] leading-tight tracking-tightest text-ink">
              {caseData.title_kk}
            </h1>
          </div>
        </div>
      </article>

      {/* Stat strip */}
      <section className="mb-4 grid grid-cols-3 gap-2">
        <StatPill
          icon={ListChecks}
          value={(caseData.tasks ?? []).length}
          label="тапсырма"
        />
        <StatPill icon={Trophy} value={totalPoints} label="балл" />
        <StatPill
          icon={Video}
          value={(caseData.videos ?? []).length}
          label="видео"
        />
      </section>

      {/* Objective */}
      {caseData.objective_kk ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-2">мақсаты</p>
          <p className="text-[14px] leading-relaxed text-ink">
            {caseData.objective_kk}
          </p>
        </section>
      ) : null}

      {/* Situation */}
      {caseData.situation_kk ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-2">жағдаят</p>
          <FormulaRenderer className="text-[14px] leading-relaxed text-ink">
            {caseData.situation_kk}
          </FormulaRenderer>
        </section>
      ) : null}

      {/* Equipment short list */}
      {caseData.equipment?.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <header className="mb-2 flex items-center justify-between">
            <p className="label-eyebrow">құрал-жабдықтар</p>
            <span className="font-mono text-[10px] tabular-nums text-ink-faint">
              {caseData.equipment.length}
            </span>
          </header>
          <ul className="space-y-1">
            {caseData.equipment.slice(0, 4).map((it, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 text-[13px]"
              >
                <span className="text-ink">{it.name}</span>
                <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                  ×{it.qty ?? 1}
                </span>
              </li>
            ))}
            {caseData.equipment.length > 4 ? (
              <li className="pt-1 font-mono text-[11px] uppercase tracking-ticker text-ink-faint">
                +{caseData.equipment.length - 4} тағы
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* CTA — inline at the end of content, lives above the bottom nav. */}
      <section>
        {existingSubmission?.status === 'in_progress' ? (
          <p className="mb-2 flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
            <Sparkles size={11} />
            сенде орындалуда тұрған жауаптар бар
          </p>
        ) : null}
        {existingSubmission?.status === 'graded' &&
        existingSubmission.total_score != null ? (
          <p className="mb-2 px-1 font-mono text-[11px] tabular-nums text-ink-faint">
            алдыңғы нәтиже: {existingSubmission.total_score} балл
          </p>
        ) : null}
        <Button
          size="lg"
          className="w-full"
          onClick={onStart}
          disabled={starting}
          haptic="medium"
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
          {cta.label}
        </Button>
      </section>

      {zoomSrc ? <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} /> : null}
    </div>
  );
}

function renderAnswer(payload, type) {
  if (!payload || Object.keys(payload).length === 0) {
    return <span className="text-[13px] text-ink-faint">жауап жоқ</span>;
  }
  if (type === 'open_text') {
    return (
      <FormulaRenderer className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
        {payload.text || ''}
      </FormulaRenderer>
    );
  }
  if (type === 'numeric') {
    return (
      <p className="font-mono text-[20px] tabular-nums text-ink">{payload.value}</p>
    );
  }
  if (type === 'multiple_choice') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(payload.selected ?? []).map((i) => (
          <Badge key={i} tone="primary">
            №{i + 1}
          </Badge>
        ))}
      </div>
    );
  }
  if (type === 'file_upload') {
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
  }
  return null;
}

function scoreTone(score, points) {
  if (score == null) return 'muted';
  if (score >= points - 0.001) return 'success';
  if (score <= 0) return 'danger';
  return 'warn';
}

function ReviewTaskCard({ task, answer, index }) {
  const tone = scoreTone(answer?.score, task.points);
  const scoreClass = {
    success: 'text-success',
    warn: 'text-warn',
    danger: 'text-danger',
    muted: 'text-ink-faint',
  }[tone];

  return (
    <Card className="animate-fade-up">
      <CardBody>
        <header className="mb-3 flex items-center gap-3">
          <span className="num-badge">{String(index + 1).padStart(2, '0')}</span>
          <span className="label-eyebrow">{taskTypeLabel(task.type)}</span>
          <span
            className={`ml-auto font-mono text-[13px] tabular-nums ${scoreClass}`}
          >
            {answer?.score != null ? answer.score : '—'}
            <span className="text-ink-faint"> / {task.points}</span>
          </span>
        </header>

        <FormulaRenderer className="mb-3 text-[14px] leading-relaxed text-ink">
          {task.prompt_kk}
        </FormulaRenderer>

        <div className="mb-2 rounded-xl border border-border bg-bg-deep/40 px-3 py-3">
          <p className="label-eyebrow mb-1.5">сенің жауабың</p>
          {renderAnswer(answer?.payload, task.type)}
        </div>

        {answer?.feedback ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
            <p className="label-eyebrow mb-1.5 text-primary-soft">
              {answer.auto_graded ? 'AI пікірі' : 'мұғалім пікірі'}
            </p>
            <p className="text-[13px] leading-relaxed text-ink">{answer.feedback}</p>
          </div>
        ) : answer?.score == null ? (
          <p className="flex items-center gap-1.5 px-1 font-mono text-[11px] text-ink-faint">
            <Clock size={11} /> күтуде — бағаланбаған
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Review({ caseData, submission, onRetry, retrying }) {
  const topic = caseTopic(caseData);
  const meta = topicMeta(topic);
  const [zoomSrc, setZoomSrc] = useState(null);

  const totalPoints = (caseData.tasks ?? []).reduce(
    (s, t) => s + (t.points ?? 0),
    0,
  );
  const tasksById = useMemo(() => {
    const m = {};
    for (const t of caseData.tasks ?? []) m[t.id] = t;
    return m;
  }, [caseData]);

  const isFullyGraded = submission.status === 'graded';
  const scoreDisplay = useCountUp(submission.total_score ?? 0, 1100);

  return (
    <div style={topicStyle(topic)}>
      <TopBar back eyebrow="нәтиже" title={caseData.title_kk} />

      {/* Result hero */}
      <article className="ring-subject animate-fade-in mb-4 overflow-hidden rounded-3xl bg-surface">
        <div className="relative">
          {caseData.cover_image_url ? (
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setZoomSrc(caseData.cover_image_url);
              }}
              aria-label="Үлкейту"
              className="block w-full"
            >
              <img
                src={caseData.cover_image_url}
                alt=""
                className="aspect-[16/8] w-full object-cover"
              />
            </button>
          ) : (
            <div
              aria-hidden
              className="aspect-[16/8] w-full"
              style={{
                backgroundImage:
                  'radial-gradient(120% 100% at 20% 0%, color-mix(in oklab, var(--subject) 32%, transparent), transparent 70%)',
              }}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg-deep/95 via-bg-deep/55 to-transparent"
          />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <Badge tone="subject" style={{ color: 'var(--subject)' }}>
              {meta.kk}
            </Badge>
            <Badge tone={isFullyGraded ? 'success' : 'warn'}>
              {isFullyGraded ? 'бағаланды' : 'тапсырылды'}
            </Badge>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="label-eyebrow mb-1">нәтижең</p>
          <p className="font-display text-[44px] leading-none tracking-tightest text-ink tabular-nums">
            {Math.round(scoreDisplay * 10) / 10}
            <span className="text-ink-faint"> / {totalPoints}</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {isFullyGraded
              ? 'AI барлық жауаптарыңды бағалады'
              : 'мұғалім қарап жатыр — кейбір жауаптар әлі бағаланбаған'}
          </p>
        </div>
      </article>

      <p className="label-eyebrow mb-2 px-1">жауаптарың</p>
      <div className="mb-4 space-y-3">
        {(submission.answers ?? []).map((a, i) => {
          const task = tasksById[a.task_id];
          if (!task) return null;
          return (
            <ReviewTaskCard
              key={a.id}
              task={task}
              answer={a}
              index={i}
            />
          );
        })}
      </div>

      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={onRetry}
        disabled={retrying}
        haptic="medium"
      >
        {retrying ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RotateCw size={16} />
        )}
        Қайта тапсыру
      </Button>
      <p className="mt-2 px-1 text-center font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
        жаңа тапсырыс жасалады
      </p>

      {zoomSrc ? <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} /> : null}
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);

  const loadCase = useCaseStore((s) => s.loadCase);
  const ensureSubmission = useCaseStore((s) => s.ensureSubmission);
  const setDraft = useCaseStore((s) => s.setDraftAnswer);
  const drafts = useCaseStore((s) => s.draftAnswers);
  const pushAnswer = useCaseStore((s) => s.pushAnswer);
  const finalize = useCaseStore((s) => s.finalize);
  const currentCase = useCaseStore((s) => s.currentCase);
  const submission = useCaseStore((s) => s.currentSubmission);

  // Existing submission (if any) for THIS case — used to label the start CTA.
  const [existingSub, setExistingSub] = useState(null);

  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [unlockedSlugs, setUnlockedSlugs] = useState([]);

  // Reset transient state when navigating between cases.
  useEffect(() => {
    setStarted(false);
    setSavedSnapshot({});
    setExistingSub(null);
  }, [id]);

  useEffect(() => {
    (async () => {
      const data = await loadCase(Number(id));
      if (!data) return;
      // Look up an existing submission so we can show "Жалғастыру" / "Қайта қарау"
      // — without creating a new one.
      try {
        const mine = await listMine();
        const found = mine
          .filter((s) => s.case_id === data.id)
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
        setExistingSub(found ?? null);
      } catch {
        /* surface fall-through on the intro screen */
      }
    })();
  }, [id, loadCase]);

  const topic = caseTopic(currentCase);
  const meta = topicMeta(topic);
  const tasks = currentCase?.tasks ?? [];

  const allSaved = useMemo(
    () =>
      tasks.length > 0 &&
      tasks.every(
        (t) =>
          savedSnapshot[t.id] !== undefined &&
          JSON.stringify(savedSnapshot[t.id]) === JSON.stringify(drafts[t.id]),
      ),
    [tasks, savedSnapshot, drafts],
  );

  async function start() {
    setStarting(true);
    try {
      await ensureSubmission(currentCase.id);
      setStarted(true);
      window.scrollTo({ top: 0 });
      haptic('medium');
    } catch (e) {
      showToast(e.message ?? 'Бастай алмадым', 'danger');
    } finally {
      setStarting(false);
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      // Old submission is finalized → ensureSubmission creates a fresh in-progress one.
      await ensureSubmission(currentCase.id);
      setExistingSub(null);
      setSavedSnapshot({});
      setStarted(true);
      window.scrollTo({ top: 0 });
      haptic('medium');
    } catch (e) {
      showToast(e.message ?? 'Қайта баст алмадым', 'danger');
    } finally {
      setRetrying(false);
    }
  }

  async function saveOne(task) {
    if (!drafts[task.id]) return;
    setSavingId(task.id);
    try {
      await pushAnswer(task.id);
      setSavedSnapshot((s) => ({ ...s, [task.id]: drafts[task.id] }));
      haptic('success');
    } catch (e) {
      showToast(e.message ?? 'Сақтай алмадым', 'danger');
    } finally {
      setSavingId(null);
    }
  }

  async function onFinalize() {
    setFinalizing(true);
    try {
      // Snapshot earned badges before this submission flips state.
      const [allCases, mineBefore] = await Promise.all([
        listCases().catch(() => []),
        listMine().catch(() => []),
      ]);
      const prevEarned = getEarnedSlugs(mineBefore, allCases);

      const final = await finalize();
      haptic('success');

      // Detect newly earned badges by re-fetching mine post-finalize.
      const mineAfter = await listMine().catch(() => mineBefore);
      const nextEarned = getEarnedSlugs(mineAfter, allCases);
      const added = diffEarned(prevEarned, nextEarned);

      celebrate(meta?.accent);
      setExistingSub(final);

      if (added.length) {
        setUnlockedSlugs(added);
        // The overlay's "Continue" button navigates onward.
      } else {
        showToast(
          `Тапсырылды · ${final?.total_score ?? 0} балл`,
          'success',
        );
        navigate('/me');
      }
    } catch (e) {
      showToast(e.message ?? 'Тапсыра алмадым', 'danger');
    } finally {
      setFinalizing(false);
    }
  }

  function dismissUnlock() {
    setUnlockedSlugs([]);
    navigate('/me');
  }

  if (!currentCase) {
    return (
      <>
        <TopBar back title="Кейс" />
        <div className="space-y-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </>
    );
  }

  if (!started) {
    // Finalized submission — show the review screen with per-task feedback.
    if (
      existingSub &&
      (existingSub.status === 'submitted' || existingSub.status === 'graded')
    ) {
      return (
        <>
          <Review
            caseData={currentCase}
            submission={existingSub}
            onRetry={retry}
            retrying={retrying}
          />
          {unlockedSlugs.length ? (
            <UnlockOverlay slugs={unlockedSlugs} onClose={dismissUnlock} />
          ) : null}
        </>
      );
    }
    return (
      <Intro
        caseData={currentCase}
        existingSubmission={existingSub}
        onStart={start}
        starting={starting}
      />
    );
  }

  return (
    <div style={topicStyle(topic)}>
      <TopBar back eyebrow="кейс" title={currentCase.title_kk} />

      {/* Hero */}
      <section className="ring-subject animate-fade-in mb-4 overflow-hidden rounded-3xl bg-surface">
        <div className="relative">
          {currentCase.cover_image_url ? (
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setZoomSrc(currentCase.cover_image_url);
              }}
              aria-label="Үлкейту"
              className="block w-full"
            >
              <img
                src={currentCase.cover_image_url}
                alt=""
                className="h-44 w-full object-cover"
              />
            </button>
          ) : (
            <div
              aria-hidden
              className="h-32 w-full"
              style={{
                backgroundImage:
                  'radial-gradient(120% 100% at 20% 0%, color-mix(in oklab, var(--subject) 28%, transparent), transparent 70%)',
              }}
            />
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <Badge tone="subject" style={{ color: 'var(--subject)' }}>
              {meta.kk}
            </Badge>
            <Badge tone="outline">
              {DIFFICULTY_KK[currentCase.difficulty] ?? currentCase.difficulty}
            </Badge>
            {currentCase.age_range ? (
              <Badge tone="outline">{currentCase.age_range} жас</Badge>
            ) : null}
          </div>
        </div>
        {currentCase.objective_kk ? (
          <div className="border-t border-border px-4 py-4">
            <p className="label-eyebrow mb-1">мақсаты</p>
            <p className="text-[14px] leading-relaxed text-ink">{currentCase.objective_kk}</p>
          </div>
        ) : null}
      </section>

      {/* Situation */}
      {currentCase.situation_kk ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-2">жағдаят</p>
          <FormulaRenderer className="text-[15px] leading-relaxed text-ink">
            {currentCase.situation_kk}
          </FormulaRenderer>
        </section>
      ) : null}

      {/* Theory */}
      {currentCase.theory_kk ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-2">теориялық түсінік</p>
          <FormulaRenderer glow className="text-[15px] leading-relaxed text-ink">
            {currentCase.theory_kk}
          </FormulaRenderer>
        </section>
      ) : null}

      {/* Equipment */}
      {currentCase.equipment?.length ? (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <p className="label-eyebrow mb-2">құрал-жабдықтар</p>
          <ul className="divide-y divide-border">
            {currentCase.equipment.map((it, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-[14px]">
                <span className="text-ink">{it.name}</span>
                <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                  ×{it.qty ?? 1}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Videos */}
      {currentCase.videos?.length ? (
        <section className="mb-4 space-y-3">
          <p className="label-eyebrow">видео</p>
          {currentCase.videos.map((v) => (
            <VideoPlayer key={v.id} video={v} />
          ))}
        </section>
      ) : null}

      {currentCase.blocks?.length ? (
        <section className="mb-4 space-y-3">
          <CaseBlocks blocks={currentCase.blocks} taskRenderer={() => null} />
        </section>
      ) : null}

      {tasks.length ? (
        <section className="space-y-4">
          <header className="flex items-center gap-2">
            <FlaskConical size={16} className="text-ink-muted" />
            <p className="label-eyebrow">тапсырмалар</p>
            <span className="ml-auto font-mono text-[11px] text-ink-faint">
              {tasks.length} тапсырма
            </span>
          </header>
          <div className="space-y-3">
            {tasks.map((t, i) => (
              <TaskCard
                key={t.id}
                task={{ ...t, case_id: currentCase.id }}
                index={i}
                value={drafts[t.id]}
                onChange={(payload) => setDraft(t.id, payload)}
                onSave={() => saveOne(t)}
                isDirty={
                  drafts[t.id] !== undefined &&
                  JSON.stringify(drafts[t.id]) !==
                    JSON.stringify(savedSnapshot[t.id])
                }
                isSaving={savingId === t.id}
              />
            ))}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!allSaved || finalizing || submission?.status !== 'in_progress'}
            onClick={onFinalize}
            haptic="success"
          >
            {finalizing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submission?.status === 'in_progress' ? 'Тапсыру' : 'Тапсырылды'}
          </Button>

          {!allSaved && submission?.status === 'in_progress' ? (
            <p className="flex items-center gap-2 px-1 text-[12px] text-ink-faint">
              <Sparkles size={12} />
              Тапсыру үшін барлық жауаптарды сақта.
            </p>
          ) : null}
        </section>
      ) : null}

      {zoomSrc ? <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} /> : null}
    </div>
  );
}
