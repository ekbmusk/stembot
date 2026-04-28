import { Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { listGroups } from '../../api/groups';
import { broadcast } from '../../api/teacher';
import { TopBar } from '../../components/Layout/TopBar';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

export default function Broadcast() {
  const showToast = useUiStore((s) => s.showToast);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listGroups().then(setGroups);
  }, []);

  function toggleGroup(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await broadcast({
        text,
        group_ids: selected.size ? [...selected] : null,
      });
      showToast(`${r.queued} оқушыға жіберілді`, 'success');
      setText('');
    } catch (e) {
      showToast(e.message ?? 'Жібере алмадым', 'danger');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar eyebrow="мұғалім" title="Хабарлама" />

      <p className="label-eyebrow mb-2 px-1">кімге</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[13px] transition',
            selected.size === 0
              ? 'border-transparent bg-ink text-bg'
              : 'border-border bg-surface text-ink-muted',
          )}
        >
          барлық оқушы
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => toggleGroup(g.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[13px] transition',
              selected.has(g.id)
                ? 'border-primary/50 bg-primary/10 text-ink'
                : 'border-border bg-surface text-ink-muted',
            )}
          >
            {g.name}
            <span className="ml-2 font-mono text-[11px] text-ink-faint">
              {g.student_count}
            </span>
          </button>
        ))}
      </div>

      <p className="label-eyebrow mb-2 px-1">мәтін</p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Хабарлама жаз…"
        className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary/60 focus:outline-none"
      />

      <Button
        size="lg"
        className="mt-4 w-full"
        onClick={send}
        disabled={!text.trim() || sending}
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Жіберу
      </Button>
    </>
  );
}
