import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

// Key terms (qr_178). A term is one, shared by every sūra and the whole Qurʾān; it points at every word it stands
// in (qr_keyterm_word → qr_word_occurrence, where sūra, āyah and word index live). term_key is the key its essay,
// story and study decks carry in CM.
//   GET /qr/keyterms/:key           the term and every place it stands, sūra by sūra, word by word
//   GET /qr/keyterms?surah=N[&ayah=] the terms that stand in a sūra (or one āyah), with how often

interface TermRow { term_key: string; kind: string; head_ar: string; label_en: string; root: string | null; total: number }
interface WordRow {
  surah: number; ayah: number; word_index: number; word_text: string;
  word_to: number | null; surah_ar: string; surah_en: string;
}

export function keytermRoutes(router: Router<QuranEnv>) {
  router.get('/qr/keyterms', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    const ayah = parseIntParam(url.searchParams.get('ayah') ?? '');
    const rows = await query<TermRow & { count: number }>(env.DB_QR,
      `SELECT t.term_key, t.kind, t.head_ar, t.label_en, t.root, t.total, COUNT(o.id) AS count
         FROM qr_keyterm t
         JOIN qr_keyterm_word w ON w.term_key = t.term_key
         JOIN qr_word_occurrence o ON o.id = w.word_ref
        WHERE (?1 IS NULL OR o.surah = ?1) AND (?2 IS NULL OR o.ayah = ?2)
        GROUP BY t.term_key
        ORDER BY MIN(o.surah), MIN(o.ayah), MIN(o.word_index)`,
      [surah ?? null, surah && ayah ? ayah : null]);
    return ok({ terms: rows });
  });

  router.get('/qr/keyterms/:key', async (_req, env, params) => {
    const term = await queryOne<TermRow>(env.DB_QR,
      `SELECT term_key, kind, head_ar, label_en, root, total FROM qr_keyterm WHERE term_key = ?`, [params.key]);
    if (!term) return notFound(`key term ${params.key}`);
    const words = await query<WordRow>(env.DB_QR,
      `SELECT o.surah, o.ayah, o.word_index, o.word_text, n.word_index AS word_to,
              s.name_ar AS surah_ar, s.name_en AS surah_en
         FROM qr_keyterm_word w
         JOIN qr_word_occurrence o ON o.id = w.word_ref
         LEFT JOIN qr_word_occurrence n ON n.id = w.word_to_ref
         JOIN qr_surah s ON s.id = o.surah
        WHERE w.term_key = ?
        ORDER BY o.surah, o.ayah, o.word_index`, [params.key]);
    const surahs: { surah: number; name_ar: string; name_en: string; count: number;
                    words: { ayah: number; word_index: number; word_to: number | null; word_text: string; ref: string }[] }[] = [];
    for (const w of words) {
      let s = surahs[surahs.length - 1];
      if (!s || s.surah !== w.surah) surahs.push(s = { surah: w.surah, name_ar: w.surah_ar, name_en: w.surah_en, count: 0, words: [] });
      s.count++;
      s.words.push({ ayah: w.ayah, word_index: w.word_index, word_to: w.word_to, word_text: w.word_text,
                     ref: `${w.surah}:${w.ayah}:${w.word_index}` });
    }
    return ok({ ...term, count: words.length, surah_count: surahs.length, surahs });
  });
}
