/// The three levels the Arabic home is read at, and the CEFR levels each takes
/// in. A work's level is the one stored on it (ar_acquisition_ref.level); the
/// band is only how the home groups them. 'all' is every work, levelled or not.

export type Band = 'all' | 'basic' | 'middle' | 'advanced';

export const BANDS = [
  { key: 'basic', label: 'Level 1', labelAr: 'المُسْتَوَى الأَوَّل', range: 'Basic · A1–A2', cefr: ['A1', 'A2'],
    blurb: 'Clear, slow speech — Qurʾān stories, short tales, songs' },
  { key: 'middle', label: 'Level 2', labelAr: 'المُسْتَوَى الثَّانِي', range: 'Middle · B1–B2', cefr: ['B1', 'B2'],
    blurb: 'Podcasts, clips, documentary and modern prose' },
  { key: 'advanced', label: 'Level 3', labelAr: 'المُسْتَوَى الثَّالِث', range: 'Advanced · C1+', cefr: ['C1', 'C2'],
    blurb: 'Historical drama, the poets and the classical books' },
] as const;

export function bandOf(level: string | null | undefined): Exclude<Band, 'all'> | null {
  const l = (level ?? '').toUpperCase();
  if (l === 'A1' || l === 'A2') return 'basic';
  if (l === 'B1' || l === 'B2') return 'middle';
  if (l === 'C1' || l === 'C2') return 'advanced';
  return null;
}

export function parseBand(raw: string | null): Band {
  return raw === 'basic' || raw === 'middle' || raw === 'advanced' ? raw : 'all';
}

export const inBand = (band: Band, level: string | null | undefined) => band === 'all' || bandOf(level) === band;

/// "A2" / "A2–B1" for a set of works.
export function levelSpan(levels: Array<string | null | undefined>): string | null {
  const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const got = [...new Set(levels.map((l) => (l ?? '').toUpperCase()).filter((l) => order.includes(l)))]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (!got.length) return null;
  return got.length === 1 ? got[0] : `${got[0]}–${got[got.length - 1]}`;
}

/// A work's level as the reader is shown it: its band's name ("Level 1/2/3"), not the CEFR code (owner, 2026-11-07).
export function levelLabel(level: string | null | undefined): string | null {
  const b = bandOf(level);
  return b ? BANDS.find((x) => x.key === b)!.label : null;
}

/// The bands a set of works spans: "Level 2" / "Level 2–3".
export function bandSpan(levels: Array<string | null | undefined>): string | null {
  const ranks = [...new Set(levels.map(bandRank).filter((r) => r < 9))].sort();
  if (!ranks.length) return null;
  const n = (r: number) => BANDS[r]!.label.replace('Level ', '');
  return ranks.length === 1 ? BANDS[ranks[0]!]!.label : `Level ${n(ranks[0]!)}–${n(ranks[ranks.length - 1]!)}`;
}

/// 0 for Level 1, 1 for Level 2, 2 for Level 3, 9 for an unlevelled work — for sorting easiest first.
export function bandRank(level: string | null | undefined): number {
  const b = bandOf(level);
  return b ? BANDS.findIndex((x) => x.key === b) : 9;
}

/// Arabic with its vowel marks, tatweel and punctuation taken off, for comparing
/// and searching; what is shown keeps them.
export const bare = (t: string) => t
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[؟،؛.!?"«»:…,()\[\]{}\-–—'’]/g, '')
  .trim();
