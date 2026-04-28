import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { haptic } from '../../lib/telegram';

export function TopBar({ title, eyebrow, action, back = false, className }) {
  const navigate = useNavigate();
  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 mb-3 px-4 pt-3 pb-3',
        'bg-bg/85 backdrop-blur-md',
        'border-b border-border',
        className,
      )}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="flex items-center gap-3">
        {back ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              haptic('light');
              navigate(-1);
            }}
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:scale-[0.96]"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="label-eyebrow">{eyebrow}</p> : null}
          <h1 className="truncate font-display text-[18px] tracking-tightest text-ink">
            {title}
          </h1>
        </div>
        {action}
      </div>
    </header>
  );
}
