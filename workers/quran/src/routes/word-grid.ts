// ─── /qr/word-grid — lightweight, scope-based word grid ───────────────────────
// One endpoint feeds every "words grid" surface (Root, Surah, Passage/Morphology,
// Lexicon). It returns ONLY the light data a card needs — surface + lemma, root,
// a short gloss, and the ref for navigation. The heavy morph detail (the 17
// blocks) is loaded separately by the Word deep-dive, never here.
//
// A logic-free renderer paints these cards verbatim (passage-card styling).
//
// Data: BASE qr_word_occurrences ⟕ RICH qr_morph_display_words ⟕
// qr_morph_display_lemmas (LEFT JOIN for an authored lemma_ar / gloss / spaced
// root when the word is promoted; the gloss is a tier-2 lemma fact served from
// the lemma tier, word-row copy as transitional fallback).
// Content words only — filtered by `root IS NOT NULL` (particles have no root).

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

type Scope = 'root' | 'surah' | 'passage' | 'lexicon';

// One row per UNIQUE base word (lemma), aggregated over its occurrences in scope.
interface GridRow {
  base_word: string;        // the lemma (group key) — the "base word"
  root: string | null;
  d_lemma_ar: string | null;
  d_root_display: string | null;
  d_gloss_en: string | null;
  occurrences: number;      // how many times this word appears in scope
  first_key: number;        // packed surah*1e6 + ayah*1e3 + wordIndex of first occurrence
  surface_any: string;      // a representative surface form
}

interface GridCard {
  id: string;               // first occurrence "surah:ayah:wordIndex" (opens the detail)
  ar: string;               // BASE word headline — authored lemma, else lemma
  surface_ar: string;       // a representative occurrence form
  root: string | null;      // bare root, for navigation
  root_display: string | null;
  gloss: string | null;     // short English gloss (may be null)
  occurrences: number;      // occurrence count in scope (detail lists them all)
  surah: number;            // first occurrence — for opening the detail
  ayah: number;
  word_index: number;
}

const clean = (s: string | null | undefined): string | null => {
  const v = typeof s === 'string' ? s.trim() : '';
  return v.length ? v : null;
};

const spaceRoot = (root: string | null): string | null =>
  root ? Array.from(root.trim()).filter((c) => c.trim()).join(' ') : null;

export function wordGridRoutes(router: Router<QuranEnv>) {

  /**
   * GET /qr/word-grid?scope=<root|surah|passage|lexicon>&root=&surahId=&ayahFrom=&ayahTo=
   *
   * Response: { ok, data: { scope, params, count, words: GridCard[] } }
   */
  router.get('/qr/word-grid', async (req, env) => {
    const url = new URL(req.url);
    const scope = (url.searchParams.get('scope') || '').toLowerCase() as Scope;

    const conditions: string[] = ['w.root IS NOT NULL'];
    const params: unknown[] = [];
    const echo: Record<string, unknown> = { scope };

    if (scope === 'root' || scope === 'lexicon') {
      const root = clean(url.searchParams.get('root'));
      if (!root) return badRequest('scope=root requires ?root=<root>');
      conditions.push('w.root = ?');
      params.push(root);
      echo['root'] = root;
    } else if (scope === 'surah' || scope === 'passage') {
      const surahId = parseInt(url.searchParams.get('surahId') || '', 10);
      if (!surahId || surahId < 1 || surahId > 114) return badRequest('surahId must be 1–114');
      conditions.push('w.surah = ?');
      params.push(surahId);
      echo['surahId'] = surahId;
      if (scope === 'passage') {
        const from = parseInt(url.searchParams.get('ayahFrom') || '', 10);
        const to = parseInt(url.searchParams.get('ayahTo') || '', 10);
        if (!from || !to) return badRequest('scope=passage requires ?ayahFrom=&ayahTo=');
        if (to < from) return badRequest('ayahTo must be >= ayahFrom');
        conditions.push('w.ayah >= ?', 'w.ayah <= ?');
        params.push(from, to);
        echo['ayahFrom'] = from; echo['ayahTo'] = to;
      }
    } else {
      return badRequest('scope must be one of: root, surah, passage, lexicon');
    }

    try {
      // Base word = lemma. One row per unique lemma; occurrences aggregated.
      // The detail view (opened from a card) lists every occurrence of that word.
      const rows = await query<GridRow>(
        env.DB_QR,
        `SELECT COALESCE(w.lemma, w.word_text) AS base_word,
                w.root                          AS root,
                MAX(d.lemma_ar)                 AS d_lemma_ar,
                MAX(d.root_display)             AS d_root_display,
                MAX(COALESCE(dl.gloss_en, d.gloss_en)) AS d_gloss_en,
                COUNT(*)                        AS occurrences,
                MIN(w.surah * 1000000 + w.ayah * 1000 + w.word_index) AS first_key,
                MAX(w.word_text)                AS surface_any
           FROM qr_word_occurrences w
           LEFT JOIN qr_morph_display_words d
             ON d.surah_no = w.surah AND d.ayah_no = w.ayah
            AND d.word_index = w.word_index AND d.status = 'live'
           LEFT JOIN qr_morph_display_lemmas dl ON dl.id = d.lemma_ref AND dl.status = 'live'
          WHERE ${conditions.join(' AND ')}
          GROUP BY COALESCE(w.lemma, w.word_text), w.root
          ORDER BY occurrences DESC, first_key ASC
          LIMIT 2000`,
        params,
      );

      const words: GridCard[] = rows.map((r) => {
        const key = Number(r.first_key) || 0;
        const surah = Math.floor(key / 1000000);
        const ayah = Math.floor(key / 1000) % 1000;
        const wordIndex = key % 1000;
        return {
          id:           `${surah}:${ayah}:${wordIndex}`,
          ar:           clean(r.d_lemma_ar) ?? clean(r.base_word) ?? r.surface_any,
          surface_ar:   r.surface_any,
          root:         clean(r.root),
          root_display: clean(r.d_root_display) ?? spaceRoot(r.root),
          gloss:        clean(r.d_gloss_en),
          occurrences:  Number(r.occurrences) || 1,
          surah, ayah, word_index: wordIndex,
        };
      });

      return ok({ scope, params: echo, count: words.length, words });
    } catch (err) {
      console.error('[qr/word-grid]', err);
      return internalError('Failed to load word grid');
    }
  });
}
