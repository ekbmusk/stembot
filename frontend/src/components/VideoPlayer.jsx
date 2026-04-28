import { ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../lib/cn';
import { openExternal } from '../lib/telegram';

function youtubeEmbed(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

function youtubeWatch(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function VideoPlayer({ video, className }) {
  const [active, setActive] = useState(false);

  if (!video) return null;
  const { provider, external_id_or_url, title_kk } = video;

  if (provider === 'mp4') {
    return (
      <div className={cn('overflow-hidden rounded-2xl border border-border bg-black', className)}>
        <video
          src={external_id_or_url}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full"
        >
          Видеоны қарау үшін браузеріңді жаңарт.
        </video>
        {title_kk ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-ink-muted">
            <span className="truncate">{title_kk}</span>
          </div>
        ) : null}
      </div>
    );
  }

  // YouTube — render the lazy poster on first paint, embed only after click.
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-black', className)}>
      <div className="relative aspect-video w-full">
        {active ? (
          <iframe
            title={title_kk || 'YouTube video'}
            src={youtubeEmbed(external_id_or_url)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <img
              src={`https://i.ytimg.com/vi/${external_id_or_url}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-bg/80 backdrop-blur-md ring-1 ring-white/15 transition group-hover:scale-105">
              <Play size={22} className="fill-white text-white" />
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
        <span className="truncate text-ink-muted">{title_kk || 'Видео'}</span>
        <button
          type="button"
          onClick={() => openExternal(youtubeWatch(external_id_or_url))}
          className="inline-flex shrink-0 items-center gap-1.5 text-ink-muted hover:text-ink"
        >
          <ExternalLink size={14} />
          YouTube-те ашу
        </button>
      </div>
    </div>
  );
}
