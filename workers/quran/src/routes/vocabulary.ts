import type { Router } from '../../../shared/src/router';
import { ok, badRequest, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

type PosGroup = 'verbs' | 'nouns' | 'adjectives' | 'proper_nouns' | 'particles' | 'other';

function normPos(tag: string | null): PosGroup {
  if (!tag) return 'other';
  const t = tag.toUpperCase();

  if (t === 'V'   || t === 'VERB')                        return 'verbs';
  if (t === 'N'   || t === 'NOUN' || t === 'IMPN')        return 'nouns';
  if (t === 'ADJ' || t === 'SUP')                         return 'adjectives';
  if (t === 'PN'  || t === 'PROPN' || t === 'PROPER_NOUN') return 'proper_nouns';

  if (['P','REL','PRON','NEG','ACC','T','DEM','COND','CONJ','SUB','LOC',
       'RES','INTG','CERT','PRO','RET','EXP','INC','EXL','AMD','INT',
       'FUT','EXH','ANS','SUR','AVR','INL','PREP','DET','ADV'].includes(t)) return 'particles';
  return 'other';
}

interface VocabLemmaRow {
  lx_lemma_ref: string | null;
  root_text: string | null;
  pos_tag: string | null;
  frequency: number;
  sample_forms: string | null;
  first_surah: number;
  first_ayah: number;
}

export function vocabularyRoutes(router: Router<QuranEnv>) {

  router.get('/qr/surahs/:id/vocabulary', async (req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114) {
      return badRequest('Surah ID must be 1–114');
    }

    const url       = new URL(req.url);
    const fromParam = url.searchParams.get('ayah_from');
    const toParam   = url.searchParams.get('ayah_to');
    const posFilter = url.searchParams.get('pos') as PosGroup | null;
    const sort      = url.searchParams.get('sort') ?? 'frequency';
    const limit     = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));

    const ayahFrom = fromParam ? (parseInt(fromParam, 10) || null) : null;
    const ayahTo   = toParam   ? (parseInt(toParam,   10) || null) : null;

    if (ayahFrom !== null && ayahTo !== null && ayahTo < ayahFrom) {
      return badRequest('ayah_to must be >= ayah_from');
    }

    try {

      const conditions: string[] = ['surah = ?'];
      const params: unknown[]    = [surahId];
      if (ayahFrom !== null) { conditions.push('ayah >= ?'); params.push(ayahFrom); }
      if (ayahTo   !== null) { conditions.push('ayah <= ?'); params.push(ayahTo); }

      const orderBy = sort === 'ayah'
        ? 'first_ayah ASC'
        : sort === 'pos'
          ? 'pos_tag ASC, frequency DESC'
          : 'frequency DESC';

      params.push(limit);

      const rows = await query<VocabLemmaRow>(
        env.DB_QR,
        `SELECT
           lemma            AS lx_lemma_ref,
           root             AS root_text,
           pos              AS pos_tag,
           COUNT(*)         AS frequency,
           GROUP_CONCAT(DISTINCT word_text) AS sample_forms,
           MIN(surah)       AS first_surah,
           MIN(ayah)        AS first_ayah
         FROM qr_word_occurrence
         WHERE ${conditions.join(' AND ')}
         GROUP BY lemma, root, pos
         ORDER BY ${orderBy}
         LIMIT ?`,
        params,
      );

      const groups: Record<PosGroup, ReturnType<typeof toVocabItem>[]> = {
        verbs: [], nouns: [], adjectives: [], proper_nouns: [], particles: [], other: [],
      };

      let totalUnique = 0;

      for (const row of rows) {
        const group = normPos(row.pos_tag);
        if (posFilter && group !== posFilter) continue;
        groups[group].push(toVocabItem(row, group));
        totalUnique++;
      }

      const scopeFrom = ayahFrom ?? (rows[0]?.first_ayah ?? 1);
      const scopeTo   = ayahTo   ?? (rows[rows.length - 1]?.first_ayah ?? scopeFrom);

      return ok({
        surah_id:            surahId,
        scope:               { ayah_from: scopeFrom, ayah_to: scopeTo },
        total_unique_lemmas: totalUnique,
        groups,
      });

    } catch (err) {
      console.error('[qr/vocabulary]', err);
      return internalError('Failed to load surah vocabulary');
    }
  });
}

function toVocabItem(row: VocabLemmaRow, posGroup: PosGroup) {

  const forms = row.sample_forms
    ? row.sample_forms.split(',').slice(0, 5).filter(Boolean)
    : [];

  return {
    lx_lemma_ref:   row.lx_lemma_ref ?? null,
    root_text:      row.root_text    ?? null,
    pos_tag:        row.pos_tag      ?? null,
    pos_group:      posGroup,
    frequency:      row.frequency,
    sample_forms:   forms,
    first_location: {
      surah: row.first_surah,
      ayah:  row.first_ayah,
    },
  };
}
