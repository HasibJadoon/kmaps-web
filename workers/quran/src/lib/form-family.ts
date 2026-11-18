// Which verb-form family (Form I … X) a word of a root belongs to, read from the word's own vowelled shape against
// the root's letters: فَعَّلَ / مُفَعَّل / تَفْعِيل → II, فَاعَلَ / مُفَاعَلَة → III, مُنْفَعِل → VII, … A word no
// derived pattern fits is the bare root's (Form I: its nouns, participles, intensives). Two shapes are read with care:
// فِعَال is Form III's verbal noun only when the root has a Form III verb, else a Form I noun; أَفْعَل is Form IV only as
// a past verb (ending in fatḥa), else a Form I noun (أَجْدَلُ, a hawk). Used to group a root's expressions by family.

export type FormFamily = 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii' | 'viii' | 'ix' | 'x';
export const FAMILIES: FormFamily[] = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

const VOWELS = /[ً-ِْ]/; // tanwīn, fatḥa, ḍamma, kasra, sukūn (not shadda, U+0651)
const FATHA = 'َ';

/** The word as patterns compare it: one alif, no tatwīl, no sukūn, the dagger alif as ا, the case ending dropped. */
function norm(s: string): string {
  let w = s.normalize('NFC').replace(/ـ/g, '').replace(/ٰ/g, 'ا').replace(/[ٱإأآ]/g, 'ا').replace(/ْ/g, '').trim();
  while (w && VOWELS.test(w.at(-1)!)) w = w.slice(0, -1);
  return w;
}

// Each family's shapes, ف ع ل standing for the root's letters; checked in this order.
const PATTERNS: Array<[FormFamily, string[]]> = [
  ['x', ['اِسْتَفْعَلَ', 'يَسْتَفْعِلُ', 'اِسْتِفْعَال', 'مُسْتَفْعِل', 'مُسْتَفْعَل']],
  ['viii', ['اِفْتَعَلَ', 'يَفْتَعِلُ', 'اِفْتِعَال', 'مُفْتَعِل', 'مُفْتَعَل']],
  ['vii', ['اِنْفَعَلَ', 'يَنْفَعِلُ', 'اِنْفِعَال', 'مُنْفَعِل']],
  ['ix', ['اِفْعَلَّ', 'اِفْعِلَال', 'مُفْعَلّ']],
  ['vi', ['تَفَاعَلَ', 'يَتَفَاعَلُ', 'تَفَاعُل', 'مُتَفَاعِل']],
  ['v', ['تَفَعَّلَ', 'يَتَفَعَّلُ', 'تَفَعُّل', 'مُتَفَعِّل', 'مُتَفَعَّل']],
  ['ii', ['فَعَّلَ', 'يُفَعِّلُ', 'تَفْعِيل', 'تَفْعِلَة', 'مُفَعِّل', 'مُفَعَّل']],
  ['iii', ['فَاعَلَ', 'يُفَاعِلُ', 'مُفَاعَلَة', 'مُفَاعِل', 'مُفَاعَل']],
  ['iv', ['يُفْعِلُ', 'إِفْعَال', 'مُفْعِل', 'مُفْعَل']],
];

/** A pattern as a regex over the normalised word: the root's letters in place, each vowel optional (an unvowelled
 *  word still matches), a vowel the word has must be the pattern's. */
function regexOf(pattern: string, [f, a, l]: string[]): RegExp {
  const body = [...norm(pattern)].map((ch) => {
    const c = ch === 'ف' ? f : ch === 'ع' ? a : ch === 'ل' ? l : ch;
    return VOWELS.test(ch) ? `${ch}?` : c!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return new RegExp(`^${body}$`);
}

/** The family of `word` (vowelled as the books give it) in `root` (its three letters joined: جدل). `rootHas` names the
 *  families the root's own verbs show, to read فِعَال. A four-letter or doubled root, or no match: Form I. */
export function formFamilyOf(word: string, root: string, rootHas: Set<FormFamily> = new Set()): FormFamily {
  const letters = [...root.replace(/[ً-ْٰ\s]/g, '')];
  if (letters.length !== 3 || !word) return 'i';
  const raw = word.normalize('NFC').replace(/ـ/g, '').replace(/ْ/g, '').trim();
  const w = norm(word);
  for (const [fam, shapes] of PATTERNS) if (shapes.some((p) => regexOf(p, letters).test(w))) return fam;
  // أَفْعَلَ as a past verb only (its final fatḥa); أَفْعَلُ / أَفْعَلٌ is a noun of the bare root
  if (regexOf('أَفْعَل', letters).test(w) && raw.endsWith(FATHA)) return 'iv';
  if (rootHas.has('iii') && regexOf('فِعَال', letters).test(w)) return 'iii';
  return 'i';
}

/** "Form III" for a family. */
export const familyEn = (f: FormFamily) => `Form ${f.toUpperCase()}`;
