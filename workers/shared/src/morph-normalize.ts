const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ࣓-ࣿ]/g;
const TATWEEL  = /ـ/g;
const NON_LETTER_WS = /[\s‌‍]+/g;

export function toAsciiDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, d => String.fromCharCode(0x30 + d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String.fromCharCode(0x30 + d.charCodeAt(0) - 0x06F0));
}

export function stripTashkeel(s: string): string {
  return (s ?? '').normalize('NFC').replace(TASHKEEL, '').replace(TATWEEL, '');
}

export const MORPH_NORM_VERSION = 1;

export function morphNorm(input: string | null | undefined): string {
  let s = (input ?? '').normalize('NFC')
    .replace(TASHKEEL, '').replace(TATWEEL, '')
    .replace(NON_LETTER_WS, ' ').trim();
  s = toAsciiDigits(s);
  s = s
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '');
  return s.toLowerCase();
}

export function rootNorm(input: string | null | undefined): string {
  return morphNorm(input).replace(/[\s\-]/g, '');
}

export type MatchKind =
  | 'root' | 'lemma' | 'surface' | 'wazn' | 'qac_flag' | 'gram_term' | 'gloss';

export function classifyKeyword(raw: string): MatchKind {
  const q = (raw ?? '').trim();
  if (/^[A-Z]{1,5}(\|[A-Z0-9()]+)*$/.test(q)) return 'qac_flag';
  if (rootNorm(q).length >= 2 && rootNorm(q).length <= 5 &&
      /^[ء-ي][\s\-ء-ي]{1,7}$/.test(q)) return 'root';
  if (/^[؀-ۿ]/.test(q)) return 'lemma';
  return 'gloss';
}
