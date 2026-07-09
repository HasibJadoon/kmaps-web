// Shared word-grid contract — matches GET /api/qr/word-grid.
// Lightweight card data only; the heavy morph detail lives on the Word deep-dive.

export type WordGridScope = 'root' | 'surah' | 'passage' | 'lexicon';

export interface WordGridCard {
  id: string;                 // "surah:ayah:wordIndex"
  ar: string;                 // headline (lemma, else surface)
  surface_ar: string;         // occurrence form
  root: string | null;        // bare root, for navigation
  root_display: string | null;
  gloss: string | null;       // short English gloss (may be null)
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

/** Scope params for a grid request (only the ones the scope needs). */
export interface WordGridQuery {
  scope: WordGridScope;
  root?: string;
  surahId?: number;
  ayahFrom?: number;
  ayahTo?: number;
}
