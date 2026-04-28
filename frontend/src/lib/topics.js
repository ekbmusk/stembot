/**
 * Topic taxonomy for the case catalogue. Replaces the old multi-discipline
 * subject filter — all current content is physics, so we surface the unit-
 * level topic instead. Each case's topic is derived from its tags via
 * `caseTopic()`, so the source data doesn't need a dedicated column.
 */

export const TOPICS = {
  electricity:    { kk: 'Электр',     accent: '#4FD1C5' },
  optics:         { kk: 'Оптика',     accent: '#818CF8' },
  thermodynamics: { kk: 'Жылу',       accent: '#FB923C' },
  gas:            { kk: 'Газ қысымы', accent: '#F472B6' },
  magnetism:      { kk: 'Магнетизм',  accent: '#34D399' },
  mechanics:      { kk: 'Механика',   accent: '#FBBF24' },
};

export const TOPIC_ORDER = [
  'electricity', 'optics', 'thermodynamics', 'gas', 'magnetism', 'mechanics',
];

// First match wins — order tags in the case data so the most specific topic comes first.
const TAG_TO_TOPIC = {
  electricity: 'electricity',
  electromagnetism: 'electricity',
  circuits: 'electricity',
  'ohm-law': 'electricity',
  ultrasound: 'electricity',
  optics: 'optics',
  thermodynamics: 'thermodynamics',
  'gas-pressure': 'gas',
  magnetism: 'magnetism',
  levitation: 'magnetism',
  mechanics: 'mechanics',
};

export function caseTopic(c) {
  for (const t of c?.tags ?? []) {
    const topic = TAG_TO_TOPIC[t];
    if (topic) return topic;
  }
  return null;
}

export function topicMeta(slug) {
  return TOPICS[slug] ?? { kk: slug ?? '—', accent: '#6C63FF' };
}

export function topicStyle(slug) {
  return { '--subject': topicMeta(slug).accent };
}

export const LEVELS = {
  easy:   { kk: 'Оңай',   accent: '#34D399' },
  medium: { kk: 'Орташа', accent: '#FBBF24' },
  hard:   { kk: 'Қиын',   accent: '#F87171' },
};

export const LEVEL_ORDER = ['easy', 'medium', 'hard'];

export const DIFFICULTY_KK = {
  easy: 'оңай',
  medium: 'орташа',
  hard: 'қиын',
};
