import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { haptic } from '../../lib/telegram';

/**
 * Fullscreen image viewer. Tap-anywhere-to-close, ESC, and an explicit close
 * button. Renders into <body> via a portal so it escapes any clipping
 * ancestors and sits above the bottom nav.
 */
export function Lightbox({ src, alt = '', onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function close() {
    haptic('light');
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg-deep/95 backdrop-blur-sm animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        aria-label="Жабу"
        className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface/90 text-ink backdrop-blur-md hover:bg-surface"
        style={{ top: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] max-w-[96vw] select-none object-contain"
        draggable={false}
      />
    </div>,
    document.body,
  );
}
