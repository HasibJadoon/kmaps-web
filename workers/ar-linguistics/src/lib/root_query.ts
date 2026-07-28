// ─── Root query normalisation ────────────────────────────────────────────────
//
// `ar_ling_lexicon_entry.root_norm` stores one spelling per root: bare
// consonants, no vowel marks, no hamza seats — بين, كتب, امر. Nobody types
// that. They type بَيْن with the marks the muṣḥaf taught them, or أمر with the
// seat, or "byn" because the keyboard is in English. All three name the same
// root and all three used to return 404, because every route exact-matched
// whatever arrived after a `.trim()`.
//
// This lives on the worker rather than in a client because both readers — the
// Angular app and the iOS app — go through these routes, and a rule about what
// counts as the same root is a property of the index, not of a UI.

/** True when the string contains at least one Arabic-block character. */
export function containsArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s);
}

/**
 * Arabic in, stored spelling out: marks and tatweel dropped, and the letters
 * the index folds together folded the same way.
 *
 * Ingestion writes a bare alif for hamza in every position (Lane's own
 * `root_norm` does this — it is why `root_type` has to be read off the
 * vocalised lemma rather than the root's letters), so أ إ آ ٱ ء ؤ ئ all land
 * on ا. Final ى becomes ي and ة becomes ه: a root is consonantal, and neither
 * ending is ever the letter that was actually meant.
 */
export function normalizeArabicRoot(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')  // harakāt, dagger alif, annotation
    .replace(/ـ/g, '')                              // tatweel
    .replace(/[آأإؤئءٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '');
}

// Digraphs first, longest-first: `th` has to be consumed before `t`, or
// "thlth" becomes تهلته. The long vowels are here too because aa/ii/uu are
// radicals (ا و ي) and must survive the short-vowel cull below.
const DIGRAPHS: Array<[RegExp, string]> = [
  [/kh/g, 'خ'], [/sh/g, 'ش'], [/th/g, 'ث'], [/dh/g, 'ذ'], [/gh/g, 'غ'],
  [/aa/g, 'ا'], [/ii/g, 'ي'], [/uu/g, 'و'], [/ee/g, 'ي'], [/oo/g, 'و'],
];

const SINGLES: Record<string, string> = {
  b: 'ب', t: 'ت', j: 'ج', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف',
  q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و', y: 'ي',
  v: 'ف', p: 'ب', g: 'غ', c: 'ك', x: 'خ',
  // Arabic-chat digits, typed as readily as letters.
  '7': 'ح', '5': 'خ', '3': 'ع', '8': 'غ', '9': 'ق', '6': 'ط', '4': 'ذ',
  // Apostrophes stand for ʿayn or hamza; ʿayn is the commoner intent in a
  // root ("'lm" is علم far more often than it is املم).
  "'": 'ع', '`': 'ع', '‘': 'ع', '’': 'ع', 'ʿ': 'ع', 'ʾ': 'ا',
};

// Capitals conventionally mark the emphatics in ASCII transliteration, so they
// are read off the original before lowercasing loses the distinction.
const EMPHATICS: Record<string, string> = { S: 'ص', D: 'ض', T: 'ط', Z: 'ظ', H: 'ح' };

/**
 * Latin in, Arabic out.
 *
 * Short vowels carry no root information — a root *is* its consonants — so
 * "kataba", "katab" and "ktb" all have to arrive at كتب, which means dropping
 * a/e/i/o/u. The one exception is a leading vowel: أمر, أكل, أرض, أول all
 * begin with hamza, which the index writes as ا and which Latin spells as the
 * initial a-. Dropping that turned "amr" into مر — a different root, and one
 * that exists.
 */
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
    if (/[؀-ۿ]/.test(ch)) out += ch;   // survived the digraph pass
  }
  return out;
}

/**
 * The stored spelling for whatever was typed. Returns '' when nothing can be
 * made of the input, which then 404s honestly rather than being silently
 * rewritten into some other root.
 */
export function normalizeRootQuery(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  return containsArabic(trimmed) ? normalizeArabicRoot(trimmed)
                                 : transliterateRoot(trimmed);
}

/**
 * The spellings to try, in order, for a requested root: exactly what was asked
 * for first, then the folded form. Exact-first means a root that already
 * resolves keeps resolving — normalisation can only ever add a fallback, never
 * redirect a working query somewhere else.
 */
export function rootQueryCandidates(raw: string): string[] {
  const trimmed = (raw ?? '').trim();
  const folded = normalizeRootQuery(trimmed);
  return folded && folded !== trimmed ? [trimmed, folded] : [trimmed];
}
