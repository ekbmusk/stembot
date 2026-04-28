import { ChevronRight, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listGroups } from '../../api/groups';
import { TopBar } from '../../components/Layout/TopBar';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar eyebrow="мұғалім" title="Топтар" />
      {loading ? (
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                to={`/teacher/groups/${g.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                  <Users size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] tracking-tight text-ink">
                    {g.name}
                  </p>
                  {g.description ? (
                    <p className="truncate text-[12px] text-ink-muted">{g.description}</p>
                  ) : null}
                </div>
                <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                  {g.student_count}
                </span>
                <ChevronRight size={16} className="text-ink-faint group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
