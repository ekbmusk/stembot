import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

const tones = {
  default: 'bg-surface-2 text-ink',
  success: 'bg-success/15 text-success border-success/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
};

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-auto rounded-full border border-border-strong px-4 py-2 text-[13px] shadow-soft animate-fade-up',
          tones[toast.tone] ?? tones.default,
        )}
      >
        {toast.message}
      </div>
    </div>
  );
}
