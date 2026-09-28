/// The three levels the Arabic home is read at, and the CEFR levels each takes
/// in. A work's level is the one stored on it (ar_acquisition_ref.level); the
/// band is only how the home groups them. 'all' is every work, levelled or not.

export type Band = 'all' | 'basic' | 'middle' | 'advanced';

export const BANDS = [
  { key: 'basic', label: 'Basic', labelAr: 'مُبْتَدِئ', range: 'A1–A2', cefr: ['A1', 'A2'],
    blurb: 'Clear, slow speech — Qurʾān stories, short tales, songs' },
  { key: 'middle', label: 'Middle', labelAr: 'مُتَوَسِّط', range: 'B1–B2', cefr: ['B1', 'B2'],
    blurb: 'Podcasts, clips, documentary and modern prose' },
  { key: 'advanced', label: 'Advanced', labelAr: 'مُتَقَدِّم', range: 'C1+', cefr: ['C1', 'C2'],
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

/// Arabic with its vowel marks, tatweel and punctuation taken off, for comparing
/// and searching; what is shown keeps them.
export const bare = (t: string) => t
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[؟،؛.!?"«»:…,()\[\]{}\-–—'’]/g, '')
  .trim();
