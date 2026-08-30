import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

type Scope = 'root' | 'surah' | 'passage' | 'lexicon';

interface GridRow {
  base_word: string;
  root: string | null;
  d_lemma_ar: string | null;
  d_root_display: string | null;
  d_gloss_en: string | null;
  occurrences: number;
  first_key: number;
  surface_any: string;
}

interface GridCard {
  id: string;
  ar: string;
  surface_ar: string;
  root: string | null;
  root_display: string | null;
  gloss: string | null;
  occurrences: number;
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
        `SELECT COALESCE(w.lemma, w.word_text) AS base_word,
                w.root                          AS root,
                MAX(d.lemma_ar)                 AS d_lemma_ar,
                MAX(d.root_display)             AS d_root_display,
                MAX(COALESCE(dl.gloss_en, d.gloss_en)) AS d_gloss_en,
                COUNT(*)                        AS occurrences,
                MIN(w.surah * 1000000 + w.ayah * 1000 + w.word_index) AS first_key,
                MAX(w.word_text)                AS surface_any
           FROM qr_word_occurrence w
           LEFT JOIN qr_morph_display_word d
             ON d.surah_no = w.surah AND d.ayah_no = w.ayah
            AND d.word_index = w.word_index AND d.status = 'live'
           LEFT JOIN qr_morph_display_lemma dl ON dl.id = d.lemma_ref AND dl.status = 'live'
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
