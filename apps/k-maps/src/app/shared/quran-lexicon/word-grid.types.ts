// Shared word-grid contract — matches GET /api/qr/word-grid.
// Lightweight card data only; the heavy morph detail lives on the Word deep-dive.

export type WordGridScope = 'root' | 'surah' | 'passage' | 'lexicon';

export interface WordGridCard {
  id: string;                 // first-occurrence "surah:ayah:wordIndex"
  ar: string;                 // BASE word headline (unique lemma)
  surface_ar: string;         // a representative occurrence form
  root: string | null;        // bare root, for navigation
  root_display: string | null;
  gloss: string | null;       // short English gloss (may be null)
  occurrences: number;        // times this word occurs in scope (detail lists them)
  surah: number;
  ayah: number;
  word_index: number;
}

export interface WordGridResult {
  scope: WordGridScope;
  params: Record<string, unknown>;
  count: number;
  words: WordGridCard[];
}

// ── Root display record (from qr_morph_display_roots — the render layer) ───────
// Every icon is a lucide NAME carried in the data; the UI never chooses icons.

export interface Tri { ar: string | null; en: string | null; ur: string | null; }

export interface FamilyLemmaVm {
  lemma_ar: string; pos: string | null; pos_icon: string; verb_form: string | null; is_quran_word: boolean;
}
export interface LensVm { key: string; label: string; icon: string; on: boolean; }

export interface RootDisplay {
  root: string;
  root_display: string | null;
  root_type: string | null;
  frequency_quran: number | null;
  meaning_core: Tri;
  hook: Tri;
  family: FamilyLemmaVm[];
  lenses: LensVm[];
  senses: string[];
  section_icons: Record<string, string>;   // { family, senses, hook, freq } → lucide names
  semantic_field: string | null;
  is_anchor: boolean;
}

/** Scope params for a grid request (only the ones the scope needs). */
export interface WordGridQuery {
  scope: WordGridScope;
  root?: string;
  surahId?: number;
  ayahFrom?: number;
  ayahTo?: number;
}
