/**
 * Achievement / badge definitions and pure derivation helpers.
 *
 * Badges are computed on the client from the data we already fetch
 * (submissions + cases). No new database tables, no migrations.
 *
 * Each definition includes:
 *  - slug, kk title and description
 *  - icon (lucide-react component name as a string — looked up at render time)
 *  - accent (CSS colour for the earned state)
 *  - evaluate(ctx) → { earned: boolean, progress?: number, target?: number }
 *
 * Badges that have natural progress (`marathon`, `master`) report it via
 * progress/target so the UI can show "7 / 10" while the badge is locked.
 */
import { caseTopic } from './topics';

const COMPLETED_STATUSES = new Set(['submitted', 'graded']);

function latestPerCase(submissions) {
  const m = {};
  for (const s of submissions ?? []) {
    const prev = m[s.case_id];
    if (
      !prev ||
      new Date(s.started_at) > new Date(prev.started_at)
    ) {
      m[s.case_id] = s;
    }
  }
  return m;
}

function completedSubmissions(submissions) {
  const latest = latestPerCase(submissions);
  return Object.values(latest).filter((s) => COMPLETED_STATUSES.has(s.status));
}

function topicCompletionMap(submissions, cases) {
  const latest = latestPerCase(submissions);
  const out = {};
  for (const c of cases ?? []) {
    const topic = caseTopic(c);
    if (!topic) continue;
    if (!out[topic]) out[topic] = { total: 0, done: 0 };
    out[topic].total += 1;
    const sub = latest[c.id];
    if (sub && COMPLETED_STATUSES.has(sub.status)) out[topic].done += 1;
  }
  return out;
}

export const BADGES = [
  {
    slug: 'first-case',
    kk: 'Алғашқы қадам',
    description_kk: 'Бірінші кейсті аяқта',
    icon: 'Flag',
    accent: '#8B82FF',
    evaluate(ctx) {
      const done = completedSubmissions(ctx.submissions).length;
      return { earned: done >= 1 };
    },
  },
  {
    slug: 'perfect-score',
    kk: 'Үздік шешім',
    description_kk: 'Кейсті 100% балға аяқта',
    icon: 'Sparkles',
    accent: '#FBBF24',
    evaluate(ctx) {
      const completed = completedSubmissions(ctx.submissions);
      const casesById = {};
      for (const c of ctx.cases ?? []) casesById[c.id] = c;
      for (const s of completed) {
        const c = casesById[s.case_id];
        if (!c) continue;
        const max = (c.tasks ?? []).reduce(
          (sum, t) => sum + (t.points ?? 0),
          0,
        );
        if (max > 0 && (s.total_score ?? 0) >= max - 0.001) {
          return { earned: true };
        }
      }
      return { earned: false };
    },
  },
  {
    slug: 'topic-electricity',
    kk: 'Электр зертеуші',
    description_kk: 'Электр тақырыбының барлық кейстерін аяқта',
    icon: 'Zap',
    accent: '#4FD1C5',
    evaluate(ctx) {
      const t = topicCompletionMap(ctx.submissions, ctx.cases).electricity;
      if (!t || t.total === 0) return { earned: false };
      return {
        earned: t.done >= t.total,
        progress: t.done,
        target: t.total,
      };
    },
  },
  {
    slug: 'topic-optics',
    kk: 'Оптика магистрі',
    description_kk: 'Оптика тақырыбының барлық кейстерін аяқта',
    icon: 'Eye',
    accent: '#818CF8',
    evaluate(ctx) {
      const t = topicCompletionMap(ctx.submissions, ctx.cases).optics;
      if (!t || t.total === 0) return { earned: false };
      return {
        earned: t.done >= t.total,
        progress: t.done,
        target: t.total,
      };
    },
  },
  {
    slug: 'topic-thermo',
    kk: 'Жылу шебері',
    description_kk: 'Жылу тақырыбының барлық кейстерін аяқта',
    icon: 'Flame',
    accent: '#FB923C',
    evaluate(ctx) {
      const t = topicCompletionMap(ctx.submissions, ctx.cases).thermodynamics;
      if (!t || t.total === 0) return { earned: false };
      return {
        earned: t.done >= t.total,
        progress: t.done,
        target: t.total,
      };
    },
  },
  {
    slug: 'polymath',
    kk: 'Жан-жақты',
    description_kk: '4 және одан көп тақырыпта кейс шеш',
    icon: 'Compass',
    accent: '#F472B6',
    evaluate(ctx) {
      const latest = latestPerCase(ctx.submissions);
      const casesById = {};
      for (const c of ctx.cases ?? []) casesById[c.id] = c;
      const touched = new Set();
      for (const s of Object.values(latest)) {
        if (!COMPLETED_STATUSES.has(s.status)) continue;
        const c = casesById[s.case_id];
        const t = c ? caseTopic(c) : null;
        if (t) touched.add(t);
      }
      return {
        earned: touched.size >= 4,
        progress: Math.min(touched.size, 4),
        target: 4,
      };
    },
  },
  {
    slug: 'marathon',
    kk: 'Марафоншы',
    description_kk: '10 кейсті аяқта',
    icon: 'Trophy',
    accent: '#34D399',
    evaluate(ctx) {
      const done = completedSubmissions(ctx.submissions).length;
      return {
        earned: done >= 10,
        progress: Math.min(done, 10),
        target: 10,
      };
    },
  },
  {
    slug: 'master',
    kk: 'STEM-маман',
    description_kk: 'Барлық кейстерді аяқта',
    icon: 'Award',
    accent: '#A78BFA',
    evaluate(ctx) {
      const total = (ctx.cases ?? []).length;
      const done = completedSubmissions(ctx.submissions).length;
      return {
        earned: total > 0 && done >= total,
        progress: done,
        target: total,
      };
    },
  },
];

export function evaluateBadges(submissions, cases) {
  const ctx = { submissions, cases };
  return BADGES.map((b) => ({
    ...b,
    state: b.evaluate(ctx),
  }));
}

export function getEarnedSlugs(submissions, cases) {
  const ctx = { submissions, cases };
  return new Set(
    BADGES.filter((b) => b.evaluate(ctx).earned).map((b) => b.slug),
  );
}

export function diffEarned(prev, next) {
  const added = [];
  for (const slug of next) if (!prev.has(slug)) added.push(slug);
  return added;
}

export function findBadge(slug) {
  return BADGES.find((b) => b.slug === slug) ?? null;
}
