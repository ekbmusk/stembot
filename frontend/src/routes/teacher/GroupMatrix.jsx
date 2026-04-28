import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getProgress } from '../../api/groups';
import { listSubmissions } from '../../api/teacher';
import { TopBar } from '../../components/Layout/TopBar';
import { cn } from '../../lib/cn';
import { formatScore } from '../../lib/format';

const STATUS_TONE = {
  in_progress: 'bg-warn/15 text-warn ring-1 ring-warn/30',
  submitted: 'bg-primary/15 text-primary-soft ring-1 ring-primary/40',
  graded: 'bg-success/15 text-success ring-1 ring-success/40',
};

function Cell({ status, score, submissionId }) {
  if (!status) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-border text-[12px] text-ink-faint">
        ·
      </span>
    );
  }
  return (
    <Link
      to={submissionId ? `/teacher/submissions/${submissionId}` : '#'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md font-mono text-[11px] tabular-nums transition active:scale-[0.95]',
        STATUS_TONE[status],
      )}
    >
      {score != null ? formatScore(score) : '·'}
    </Link>
  );
}

export default function GroupMatrix() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [submissionsByCell, setSubmissionsByCell] = useState({});

  useEffect(() => {
    (async () => {
      const progress = await getProgress(Number(id));
      setData(progress);
      // Pull submissions to find IDs for cells. Cheap on demo data.
      const subs = await listSubmissions({ groupId: Number(id) });
      const map = {};
      for (const s of subs) {
        const key = `${s.user_id}-${s.case_id}`;
        const prev = map[key];
        if (!prev || new Date(s.started_at) > new Date(prev.started_at)) {
          map[key] = s;
        }
      }
      setSubmissionsByCell(map);
    })();
  }, [id]);

  if (!data) {
    return (
      <>
        <TopBar back eyebrow="топ" title="Прогресс" />
        <div className="flex items-center justify-center py-10 text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back eyebrow="топ" title={`Прогресс №${data.group_id}`} />
      {data.case_ids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-[13px] text-ink-muted">
          Бұл топта әзірге кейс жоқ.
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="min-w-full border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 bg-bg pr-2 text-left font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
                  оқушы
                </th>
                {data.case_ids.map((cid) => (
                  <th
                    key={cid}
                    className="px-1 pb-1 text-center font-mono text-[10px] tabular-nums text-ink-faint"
                  >
                    №{cid}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.student.user_id} className="rounded-xl">
                  <td className="sticky left-0 z-10 bg-bg pr-2">
                    <div className="flex flex-col">
                      <span className="truncate text-[13px] text-ink">
                        {[row.student.first_name, row.student.last_name]
                          .filter(Boolean)
                          .join(' ') || `#${row.student.user_id}`}
                      </span>
                      {row.student.username ? (
                        <span className="truncate font-mono text-[10px] text-ink-faint">
                          @{row.student.username}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  {row.cases.map((c, i) => {
                    const key = `${row.student.user_id}-${c.case_id}`;
                    const sub = submissionsByCell[key];
                    return (
                      <td key={i} className="px-1">
                        <Cell
                          status={c.status}
                          score={c.total_score}
                          submissionId={sub?.id}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 px-1 font-mono text-[11px] text-ink-faint">
        ұяшықты басу — тапсырыстың толық бетіне өту
      </p>
    </>
  );
}
