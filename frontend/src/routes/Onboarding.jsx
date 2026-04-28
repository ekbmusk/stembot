import { ArrowRight, Compass, ListChecks, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { useUserStore } from '../store/userStore';

const FEATURES = [
  {
    icon: Compass,
    title: 'Шынайы жағдаят',
    text: 'Әр кейс — нақты ситуация. Оқу — сұрақ қою және оны шешу.',
  },
  {
    icon: ListChecks,
    title: 'Бағаланатын тапсырмалар',
    text: 'Сан, мәтін, нұсқа таңдау, файл жүктеу — барлығы тексеріледі.',
  },
  {
    icon: Sparkles,
    title: 'Қажет кезде кеңес',
    text: 'AI көмекші тура жауап бермейді — бағыт береді.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const role = useUserStore((s) => s.role);

  function start() {
    localStorage.setItem('onboarding_completed', '1');
    navigate(role === 'teacher' ? '/teacher/dashboard' : '/home', {
      replace: true,
    });
  }

  return (
    <div className="atmosphere flex min-h-screen flex-col">
      <div className="container-app flex flex-1 flex-col pb-6 pt-12">
        <header className="mb-10 space-y-2">
          <p className="label-eyebrow">stem · case · bot</p>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tightest text-ink">
            Шынайы кейстер арқылы<br />
            <span className="text-primary-soft">STEM-ді шеш.</span>
          </h1>
          <p className="text-[14px] text-ink-muted">
            Физика, химия, биология, математика, инженерия — тек теория емес,
            қолданбалы есептер.
          </p>
        </header>

        <ul className="space-y-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-4 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                <Icon size={18} />
              </span>
              <div className="space-y-1">
                <h3 className="font-display text-[15px] tracking-tight text-ink">{title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Button
            onClick={start}
            size="lg"
            className="w-full"
          >
            Бастау
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
