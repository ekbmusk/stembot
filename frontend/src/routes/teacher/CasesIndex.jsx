import { ChevronRight, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listCases } from '../../api/cases';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DIFFICULTY_KK, caseTopic, topicMeta, topicStyle } from '../../lib/topics';

export default function CasesIndex() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCases()
      .then(setCases)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar
        eyebrow="мұғалім"
        title="Кейстер"
        action={
          <Link to="/teacher/cases/new">
            <Button size="sm">
              <Plus size={14} /> Жаңа
            </Button>
          </Link>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => (
            <li key={c.id} style={topicStyle(caseTopic(c))}>
              <Link
                to={`/teacher/cases/${c.id}/edit`}
                className="ring-subject group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="subject" style={{ color: 'var(--subject)' }}>
                      {topicMeta(caseTopic(c)).kk}
                    </Badge>
                    <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
                      {DIFFICULTY_KK[c.difficulty] ?? c.difficulty}
                    </span>
                    {!c.is_published ? (
                      <Badge tone="warn">черновик</Badge>
                    ) : null}
                  </div>
                  <p className="truncate font-display text-[14px] tracking-tight text-ink">
                    {c.title_kk}
                  </p>
                </div>
                <ChevronRight size={16} className="text-ink-faint group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
