// ─── /qr/word-grid — lightweight, scope-based word grid ───────────────────────
// One endpoint feeds every "words grid" surface (Root, Surah, Passage/Morphology,
// Lexicon). It returns ONLY the light data a card needs — surface + lemma, root,
// a short gloss, and the ref for navigation. The heavy morph detail (the 17
// blocks) is loaded separately by the Word deep-dive, never here.
//
// A logic-free renderer paints these cards verbatim (passage-card styling).
//
// Data: BASE qr_word_occurrences ⟕ RICH qr_morph_display_words (LEFT JOIN for an
// authored lemma_ar / gloss / spaced root when the word is promoted).
// Content words only — filtered by `root IS NOT NULL` (particles have no root).

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

type Scope = 'root' | 'surah' | 'passage' | 'lexicon';

interface GridRow {
  surah: number;
  ayah: number;
  word_index: number;
  word_text: string;
  root: string | null;
  lemma: string | null;
  d_lemma_ar: string | null;
  d_root_display: string | null;
  d_gloss_en: string | null;
}

interface GridCard {
  id: string;               // "surah:ayah:wordIndex"
  ar: string;               // headline — authored lemma, else lemma, else surface
  surface_ar: string;       // occurrence form
  root: string | null;      // bare root, for navigation
  root_display: string | null;
  gloss: string | null;     // short English gloss (may be null)
  surah: number;
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
      const rows = await query<GridRow>(
        env.DB_QR,
        `SELECT w.surah, w.ayah, w.word_index, w.word_text, w.root, w.lemma,
                d.lemma_ar     AS d_lemma_ar,
                d.root_display AS d_root_display,
                d.gloss_en     AS d_gloss_en
           FROM qr_word_occurrences w
           LEFT JOIN qr_morph_display_words d
             ON d.surah_no = w.surah AND d.ayah_no = w.ayah
            AND d.word_index = w.word_index AND d.status = 'live'
          WHERE ${conditions.join(' AND ')}
          ORDER BY w.surah, w.ayah, w.word_index
          LIMIT 2000`,
        params,
      );

      const words: GridCard[] = rows.map((r) => ({
        id:           `${r.surah}:${r.ayah}:${r.word_index}`,
        ar:           clean(r.d_lemma_ar) ?? clean(r.lemma) ?? r.word_text,
        surface_ar:   r.word_text,
        root:         clean(r.root),
        root_display: clean(r.d_root_display) ?? spaceRoot(r.root),
        gloss:        clean(r.d_gloss_en),
        surah:        r.surah,
        ayah:         r.ayah,
        word_index:   r.word_index,
      }));

      return ok({ scope, params: echo, count: words.length, words });
    } catch (err) {
      console.error('[qr/word-grid]', err);
      return internalError('Failed to load word grid');
    }
  });
}
