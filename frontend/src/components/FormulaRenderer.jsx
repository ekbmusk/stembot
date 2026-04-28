import katex from 'katex';
import { useMemo } from 'react';

import { cn } from '../lib/cn';

/**
 * Renders mixed text with LaTeX. Supports: $...$, $$...$$, \(...\), \[...\].
 *
 * The block-level forms (`$$...$$` or `\[...\]`) are rendered on their own
 * line; inline forms stay inline.
 */
const TOKEN_RE = /(\$\$[^$]+\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+\$|\\\(.+?\\\))/g;

function renderTeX(tex, displayMode) {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: 'ignore',
    });
  } catch {
    return tex;
  }
}

export function FormulaRenderer({ children, glow = false, className }) {
  const segments = useMemo(() => {
    const text = children ?? '';
    const out = [];
    let last = 0;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      if (m.index > last) {
        out.push({ kind: 'text', value: text.slice(last, m.index) });
      }
      const raw = m[0];
      let inner;
      let display = false;
      if (raw.startsWith('$$')) {
        inner = raw.slice(2, -2);
        display = true;
      } else if (raw.startsWith('\\[')) {
        inner = raw.slice(2, -2);
        display = true;
      } else if (raw.startsWith('\\(')) {
        inner = raw.slice(2, -2);
      } else {
        inner = raw.slice(1, -1);
      }
      out.push({ kind: display ? 'block' : 'inline', value: inner });
      last = m.index + raw.length;
    }
    if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
    return out;
  }, [children]);

  return (
    <div className={cn('whitespace-pre-wrap leading-relaxed text-[15px] text-ink', className)}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.value}</span>;
        if (seg.kind === 'inline')
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: renderTeX(seg.value, false) }}
            />
          );
        return (
          <div
            key={i}
            className={cn(
              'my-3 overflow-x-auto rounded-xl border border-border bg-bg-deep/60 px-4 py-3 text-center',
              glow && 'formula-glow',
            )}
            dangerouslySetInnerHTML={{ __html: renderTeX(seg.value, true) }}
          />
        );
      })}
    </div>
  );
}
