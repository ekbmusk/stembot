import {
  AlertTriangle,
  Image as ImageIcon,
  Sigma,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';

import { Lightbox } from './ui/Lightbox';
import { haptic } from '../lib/telegram';
import { FormulaRenderer } from './FormulaRenderer';
import { VideoPlayer } from './VideoPlayer';

function BlockShell({ icon: Icon, eyebrow, tone = 'default', children }) {
  const toneStyles = {
    default: 'border-border bg-surface',
    safety: 'border-warn/40 bg-warn/5',
    equipment: 'border-border bg-surface',
  };
  const iconTone = {
    default: 'text-ink-muted',
    safety: 'text-warn',
    equipment: 'text-primary-soft',
  };
  return (
    <section className={`rounded-2xl border ${toneStyles[tone]} p-4`}>
      <header className="mb-2 flex items-center gap-2">
        {Icon ? (
          <span className={`flex h-6 w-6 items-center justify-center ${iconTone[tone]}`}>
            <Icon size={14} />
          </span>
        ) : null}
        {eyebrow ? <span className="label-eyebrow">{eyebrow}</span> : null}
      </header>
      {children}
    </section>
  );
}

function TextBlock({ payload }) {
  return (
    <FormulaRenderer className="text-[15px] leading-relaxed text-ink">
      {payload?.text_kk ?? ''}
    </FormulaRenderer>
  );
}

function FormulaBlock({ payload }) {
  const tex = payload?.latex ?? '';
  const wrapped = payload?.display === false ? `$${tex}$` : `$$${tex}$$`;
  return (
    <BlockShell icon={Sigma} eyebrow="Формула">
      <FormulaRenderer glow>{wrapped}</FormulaRenderer>
    </BlockShell>
  );
}

function ImageBlock({ payload }) {
  const [open, setOpen] = useState(false);
  if (!payload?.url) return null;
  return (
    <>
      <figure className="overflow-hidden rounded-2xl border border-border bg-bg-deep/60">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setOpen(true);
          }}
          aria-label="Үлкейту"
          className="block w-full"
        >
          <img
            src={payload.url}
            alt={payload.caption_kk || ''}
            className="w-full"
          />
        </button>
        {payload.caption_kk ? (
          <figcaption className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-muted">
            <ImageIcon size={12} />
            <span>{payload.caption_kk}</span>
          </figcaption>
        ) : null}
      </figure>
      {open ? (
        <Lightbox
          src={payload.url}
          alt={payload.caption_kk || ''}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function VideoBlock({ payload }) {
  return (
    <VideoPlayer
      video={{
        provider: payload?.provider ?? 'youtube',
        external_id_or_url: payload?.external_id_or_url ?? payload?.url ?? '',
        title_kk: payload?.title_kk,
      }}
    />
  );
}

function EquipmentBlock({ payload }) {
  const items = payload?.items ?? [];
  return (
    <BlockShell icon={Wrench} eyebrow="Құрал-жабдықтар" tone="equipment">
      <ul className="divide-y divide-border">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-[14px]">
            <span className="text-ink">{it.name}</span>
            <span className="font-mono text-[12px] tabular-nums text-ink-muted">
              ×{it.qty ?? 1}
            </span>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}

function SafetyBlock({ payload }) {
  return (
    <BlockShell icon={AlertTriangle} eyebrow="Қауіпсіздік" tone="safety">
      <p className="text-[14px] leading-relaxed text-ink">{payload?.text_kk}</p>
    </BlockShell>
  );
}

function DividerBlock() {
  return (
    <div className="my-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">·</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

const RENDERERS = {
  text: TextBlock,
  formula: FormulaBlock,
  image: ImageBlock,
  video: VideoBlock,
  equipment: EquipmentBlock,
  safety: SafetyBlock,
  divider: DividerBlock,
};

export function CaseBlocks({ blocks, taskRenderer }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-3">
      {blocks.map((b) => {
        if (b.type === 'task') {
          return taskRenderer ? <div key={b.id}>{taskRenderer(b)}</div> : null;
        }
        const Renderer = RENDERERS[b.type];
        return Renderer ? <Renderer key={b.id} payload={b.payload} /> : null;
      })}
    </div>
  );
}
