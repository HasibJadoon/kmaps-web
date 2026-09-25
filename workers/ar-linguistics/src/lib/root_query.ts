export function containsArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s);
}

export function normalizeArabicRoot(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإؤئءٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '');
}

const DIGRAPHS: Array<[RegExp, string]> = [
  [/kh/g, 'خ'], [/sh/g, 'ش'], [/th/g, 'ث'], [/dh/g, 'ذ'], [/gh/g, 'غ'],
  [/aa/g, 'ا'], [/ii/g, 'ي'], [/uu/g, 'و'], [/ee/g, 'ي'], [/oo/g, 'و'],
];

const SINGLES: Record<string, string> = {
  b: 'ب', t: 'ت', j: 'ج', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف',
  q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و', y: 'ي',
  v: 'ف', p: 'ب', g: 'غ', c: 'ك', x: 'خ',

  '7': 'ح', '5': 'خ', '3': 'ع', '8': 'غ', '9': 'ق', '6': 'ط', '4': 'ذ',

  "'": 'ع', '`': 'ع', '‘': 'ع', '’': 'ع', 'ʿ': 'ع', 'ʾ': 'ا',
};

const EMPHATICS: Record<string, string> = { S: 'ص', D: 'ض', T: 'ط', Z: 'ظ', H: 'ح' };

export function transliterateRoot(s: string): string {
  let work = '';
  for (const ch of s) work += EMPHATICS[ch] ?? ch.toLowerCase();
  for (const [re, ar] of DIGRAPHS) work = work.replace(re, ar);

  let out = '';
  for (const ch of work) {
    if (/\s|[-_]/.test(ch)) continue;
    if ('aeiou'.includes(ch)) {
      if (out === '') out += 'ا';
      continue;
    }
    if (SINGLES[ch]) { out += SINGLES[ch]; continue; }
    if (/[؀-ۿ]/.test(ch)) out += ch;
  }
  return out;
}

export function normalizeRootQuery(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  return containsArabic(trimmed) ? normalizeArabicRoot(trimmed)
                                 : transliterateRoot(trimmed);
}

export function rootQueryCandidates(raw: string): string[] {
  const trimmed = (raw ?? '').trim();
  const folded = normalizeRootQuery(trimmed);
  return folded && folded !== trimmed ? [trimmed, folded] : [trimmed];
}

/** Fold Arabic text for matching: strip ḥarakāt, unify alif forms, yāʾ/alif
 *  maqṣūra and tāʾ marbūṭa/hāʾ. Unlike normalizeArabicRoot it keeps spaces. */
export function normArabic(t: string): string {
  return t
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}
