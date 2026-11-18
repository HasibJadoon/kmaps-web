// Finding a deck by what a person remembers of it: its root (نزل or ن ز ل), the word with or without its marks
// (تنزيل, ٱلۡكِتَٰبِ), its English (sending down), or its Latin name (tanzil, ʿalīm). Both sides are folded the same way:
// marks and Qurʾānic signs dropped, every alif and hamza seat dropped (the muṣḥaf writes كِتَٰب with a small alif, a root
// أله has none: كتاب، كتٰب and كتب meet), case and Latin accents and spaces gone.

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g; // ḥarakāt, Qurʾānic signs, tatwīl
const ALIF = /[اأإآٱءؤئ]/g;

export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(MARKS, '')
    .replace(ALIF, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[\sʿʾ'’‘`\-_·—–.,;:()«»"“”]/g, '');
}

/** The whole query in any one of the texts, or each of its words (two letters or more) somewhere among them. */
export function matches(texts: (string | null | undefined)[], query: string): boolean {
  const hay = texts.filter((t): t is string => !!t).map(fold);
  const all = fold(query);
  if (!all) return true;
  if (hay.some((h) => h.includes(all))) return true;
  const words = query.split(/\s+/).map(fold).filter((w) => w.length >= 2);
  return words.length > 1 && words.every((w) => hay.some((h) => h.includes(w)));
}

// A root typed in Latin letters (jdl, nzl, ghfr, ʿdhb, ṣbr): every Arabic spelling it can stand for, folded like the
// rest. Only a query of consonants alone is read so (an English word has vowels): 2–6 letters, digraphs first; a plain
// letter English writes for two Arabic ones tries both (d د/ض, s س/ص, h ه/ح, t ت/ط, z ز/ظ). Nothing else returns [].
const DIGRAPHS: Record<string, string[]> = { sh: ['ش'], kh: ['خ'], gh: ['غ'], th: ['ث'], dh: ['ذ', 'ظ'] };
const SINGLE: Record<string, string[]> = {
  b: ['ب'], t: ['ت', 'ط'], j: ['ج'], d: ['د', 'ض'], r: ['ر'], z: ['ز', 'ظ'], s: ['س', 'ص'], f: ['ف'], q: ['ق'], k: ['ك'],
  l: ['ل'], m: ['م'], n: ['ن'], h: ['ه', 'ح'], w: ['و'], y: ['ي'], g: ['غ', 'ج'], x: ['خ'],
  'ʿ': ['ع'], '‘': ['ع'], "'": ['ع', 'ء'], 'ʾ': ['ء'], 'ḥ': ['ح'], 'ṣ': ['ص'], 'ḍ': ['ض'], 'ṭ': ['ط'], 'ẓ': ['ظ'],
  'š': ['ش'], 'ḫ': ['خ'], 'ġ': ['غ'], 'ṯ': ['ث'], 'ḏ': ['ذ'], 'c': ['ع'],
};
export function latinRoots(query: string): string[] {
  const q = query.trim().toLowerCase().replace(/[\s\-.]/g, '');
  if (!/^[^aeiouāīū0-9]{2,8}$/u.test(q) || /[؀-ۿ]/.test(q)) return [];
  let out: string[] = [''];
  for (let i = 0; i < q.length;) {
    const two = DIGRAPHS[q.slice(i, i + 2)];
    const opts = two ?? SINGLE[q[i]!];
    if (!opts) return [];
    out = out.flatMap((o) => opts.map((a) => o + a));
    if (out.length > 64) return [];
    i += two ? 2 : 1;
  }
  return out.filter((r) => r.length >= 2 && r.length <= 4).map(fold);
}
