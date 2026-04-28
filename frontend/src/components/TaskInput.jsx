import { Check, Lightbulb, Loader2, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { hint as askHint } from '../api/ai';
import { uploadFiles } from '../api/submissions';
import { cn } from '../lib/cn';
import { haptic } from '../lib/telegram';

export function TaskInput({ task, value, onChange }) {
  switch (task.type) {
    case 'open_text':
      return <OpenTextInput task={task} value={value} onChange={onChange} />;
    case 'numeric':
      return <NumericInput task={task} value={value} onChange={onChange} />;
    case 'multiple_choice':
      return <ChoiceInput task={task} value={value} onChange={onChange} />;
    case 'file_upload':
      return <FileInput task={task} value={value} onChange={onChange} />;
    default:
      return null;
  }
}

function OpenTextInput({ task, value, onChange }) {
  const text = value?.text ?? '';
  const hint = useHint();
  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Жауабыңды жаз…"
        rows={5}
        className="w-full resize-none rounded-xl border border-border bg-bg-deep/60 px-3 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
      />
      <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
        <span>{text.length} символ</span>
        <HintButton onClick={() => hint.fetch(task.id, text)} busy={hint.busy} />
      </div>
      {hint.text ? <HintPanel text={hint.text} onDismiss={hint.dismiss} /> : null}
    </div>
  );
}

function NumericInput({ task, value, onChange }) {
  const v = value?.value ?? '';
  const hint = useHint();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-deep/60 px-3 py-3 focus-within:border-primary/60">
        <span className="label-eyebrow">мән</span>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={v}
          onChange={(e) =>
            onChange(
              e.target.value === ''
                ? null
                : { value: Number(e.target.value) },
            )
          }
          placeholder="0.00"
          className="flex-1 bg-transparent font-mono text-[18px] tabular-nums text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end">
        <HintButton
          onClick={() => hint.fetch(task.id, v !== '' ? String(v) : null)}
          busy={hint.busy}
        />
      </div>
      {hint.text ? <HintPanel text={hint.text} onDismiss={hint.dismiss} /> : null}
    </div>
  );
}

function ChoiceInput({ task, value, onChange }) {
  const selected = new Set(value?.selected ?? []);
  const toggle = (idx) => {
    haptic('select');
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    onChange({ selected: [...next].sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-2">
      {(task.options ?? []).map((opt, i) => {
        const isOn = selected.has(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition',
              isOn
                ? 'border-primary/60 bg-primary/10 text-ink'
                : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                isOn
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-strong bg-surface-2 text-transparent',
              )}
            >
              {isOn ? <Check size={12} strokeWidth={2.4} /> : null}
            </span>
            <span className="text-[14px] leading-relaxed">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function FileInput({ task, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const files = value?.files ?? [];
  const caseId = task.case_id ?? task.caseId;

  async function onPick(e) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setBusy(true);
    try {
      const { files: urls } = await uploadFiles(caseId, picked);
      onChange({ files: [...files, ...urls] });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function remove(url) {
    onChange({ files: files.filter((f) => f !== url) });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-3 py-3 text-left text-[14px] text-ink-muted hover:border-primary/60"
      >
        <span className="flex items-center gap-2">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          {busy ? 'Жүктелуде…' : 'Файл/фото жүктеу'}
        </span>
        <span className="font-mono text-[11px] text-ink-faint">jpg · png · pdf</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,.pdf,.csv,.txt,.xlsx,.docx"
        onChange={onPick}
      />
      {files.length ? (
        <ul className="space-y-1.5">
          {files.map((u) => (
            <li
              key={u}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink-muted"
            >
              <span className="truncate">{u.split('/').pop()}</span>
              <button
                type="button"
                onClick={() => remove(u)}
                className="text-ink-faint hover:text-danger"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function useHint() {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(null);

  async function fetch(taskId, attempt) {
    setBusy(true);
    try {
      const r = await askHint(taskId, attempt || null);
      setText(r.answer || 'Кеңес жоқ.');
    } catch {
      setText('AI кеңесі қазір қолжетімсіз.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, text, fetch, dismiss: () => setText(null) };
}

function HintButton({ onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-ink-muted hover:border-border-strong hover:text-ink"
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Lightbulb size={11} />}
      <span className="uppercase tracking-ticker">Кеңес</span>
    </button>
  );
}

function HintPanel({ text, onDismiss }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
      <header className="mb-1.5 flex items-center justify-between">
        <p className="label-eyebrow flex items-center gap-1.5 text-primary-soft">
          <Lightbulb size={11} /> AI кеңесі
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Жабу"
          className="text-ink-faint hover:text-ink"
        >
          <X size={12} />
        </button>
      </header>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
        {text}
      </p>
    </div>
  );
}
