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
