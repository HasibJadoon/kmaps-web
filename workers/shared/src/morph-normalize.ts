// morph-normalize.ts
// =============================================================================
// THE single canonical Arabic normalization contract for all morphology /
// vocabulary search + keying across km_quran and km_arabic_linguistic.
// Today the same logic is re-implemented (differently) in morph-card.ts,
// lexicon_v2.ts, word-grid.ts, reader.ts, morphology.ts … — which is why
// "بين" sometimes matches "بَيْن" and sometimes does not.
//
// RULE: every table's searchable Arabic column X is mirrored by X_norm, and
// X_norm is ALWAYS produced by morphNorm() below — in ingestion, in build
// steps, and at query time (normalize the keyword the same way before compare).
// One function, applied everywhere. Freeze it; bump MORPH_NORM_VERSION on change
// and re-backfill every *_norm column.
// =============================================================================

// Combining marks to drop: tashkīl, superscript alef, Qurʾānic annotation marks.
// Ranges are chosen NOT to touch base letters (U+0620–U+064A). Verified against
// بَيْن مُبِين كِتَاب أَنزَلَ نَزَّلَ.
//
// Written as \u escapes on purpose. The literal form of this class read
// `[ؐ-ًؚ-ٰٟ…]`, in which the four boundary characters U+0610 U+061A U+064B
// U+0670 — correct, and in order — were paired by the hyphens as 0610–064B and
// 061A–0670. Both of those spans swallow the whole Arabic letter block, so
// morphNorm('بين') returned ''. Invisible in the literal form, obvious here.
const TASHKEEL = /[\u0610-\u061A\u064B-\u0670\u06D6-\u06DC\u06DF-\u06ED\u08D3-\u08FF]/g;
const TATWEEL  = /ـ/g;                       // ـ kashida (U+0640)
const NON_LETTER_WS = /[\s‌‍]+/g;      // spaces + ZWNJ/ZWJ

/** Arabic-Indic (٠-٩) and Extended (۰-۹) digits → ASCII 0-9. */
export function toAsciiDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, d => String.fromCharCode(0x30 + d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String.fromCharCode(0x30 + d.charCodeAt(0) - 0x06F0));
}

/** Remove diacritics + tatweel only; keep letters/spacing (display-safe bare text). */
export function stripTashkeel(s: string): string {
  return (s ?? '').normalize('NFC').replace(TASHKEEL, '').replace(TATWEEL, '');
}

export const MORPH_NORM_VERSION = 1;

/**
 * morphNorm — the canonical search/compare key. Deterministic, idempotent,
 * lossy on purpose. Steps (frozen): NFC → strip tashkīl/annotation → strip
 * tatweel + collapse ZWNJ/ZWJ/space → ASCII digits → unify alef {آأإٱ}→ا,
 * ى→ي, ة→ه, ؤ→و, ئ→ي, ء→∅ → lowercase Latin.
 */
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

/**
 * rootNorm — the bare consonant skeleton, no spaces/separators.
 * 'ب ي ن' | 'ب-ي-ن' | 'بَيْن' → 'بين'. Use for every root_norm column and the
 * root branch of search.
 */
export function rootNorm(input: string | null | undefined): string {
  return morphNorm(input).replace(/[\s\-]/g, '');
}

/** A morph keyword resolves to one of these kinds. */
export type MatchKind =
  | 'root' | 'lemma' | 'surface' | 'wazn' | 'qac_flag' | 'gram_term' | 'gloss';

/** Best-guess classification of a raw keyword so search hits the right column. */
export function classifyKeyword(raw: string): MatchKind {
  const q = (raw ?? '').trim();
  if (/^[A-Z]{1,5}(\|[A-Z0-9()]+)*$/.test(q)) return 'qac_flag';   // ACT|PCPL|(IV)
  if (rootNorm(q).length >= 2 && rootNorm(q).length <= 5 &&
      /^[ء-ي][\s\-ء-ي]{1,7}$/.test(q)) return 'root';
  if (/^[؀-ۿ]/.test(q)) return 'lemma';                            // Arabic → lemma/surface
  return 'gloss';                                                  // Latin → gloss search
}
