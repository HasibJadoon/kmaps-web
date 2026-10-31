import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, internalError } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { softFail } from '../../../shared/src/soft-fail';

interface SurahRow {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

interface AyahRow {
  surah: number;
  ayah: number;
  text_display: string;
  text_uthmani_clean: string | null;
  text_uthmani: string | null;
  text_bare: string | null;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
}

interface TranslationSourceRow {
  id: string;
  slug: string;
  language: string;
  author: string;
  title: string;
  is_default: number;
}

interface TranslationRow {
  ayah: number;
  text: string;
}

interface CountRow { total: number }

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function toInt(raw: string | null, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/** One word of an āyah as the reader shows it. `word_index` is the qr_word_occurrence
 *  index (1-based) when the āyah's words line up with its occurrence rows, else null. */
export interface ReaderWord {
  text: string;
  word_index: number | null;
}

interface OccurrenceRow { ayah: number; word_index: number }

const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

/**
 * Split an āyah's display text into the words the reader renders. A token with no
 * Arabic letter (a pause mark such as ۖ standing alone) stays with the word before it.
 * Occurrence indexes are attached only when the counts agree, so a click never opens
 * the wrong word.
 */
export function readerWords(text: string, occurrenceIndexes: number[]): ReaderWord[] {
  const words: string[] = [];
  for (const tok of text.trim().split(/\s+/)) {
    if (!tok) continue;
    if (!ARABIC_LETTER.test(tok) && words.length) words[words.length - 1] += ` ${tok}`;
    else words.push(tok);
  }
  const aligned = occurrenceIndexes.length === words.length;
  return words.map((t, i) => ({ text: t, word_index: aligned ? occurrenceIndexes[i] : null }));
}

export function readerRoutes(router: Router<QuranEnv>) {

  router.get('/qr/surahs/:id/reader', async (req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114) {
      return badRequest('Surah ID must be 1–114');
    }

    const url         = new URL(req.url);
    const sourceParam = url.searchParams.get('source');
    const fromParam   = url.searchParams.get('from');
    const toParam     = url.searchParams.get('to');
    const rangeMode   = fromParam !== null || toParam !== null;
    const page        = Math.max(1, toInt(url.searchParams.get('page'), 1));
    const limit       = clamp(toInt(url.searchParams.get('limit'), 300), 1, 500);
    // ?words=1 — each āyah also carries its words (split here, not in the app).
    const withWords   = url.searchParams.get('words') === '1';

    try {

      const sourceSQL = sourceParam
        ? env.DB_QR.prepare(
            `SELECT id,
                    source_code AS slug,
                    language,
                    translator_name AS author,
                    COALESCE(edition, translator_name) AS title,
                    is_default
             FROM qr_translation_source
             WHERE id = ?`,
          ).bind(sourceParam).first<TranslationSourceRow>()
        : env.DB_QR.prepare(
            `SELECT id, slug, language, author, title, is_default
             FROM (
               SELECT s.id,
                      s.source_code AS slug,
                      s.language,
                      s.translator_name AS author,
                      COALESCE(s.edition, s.translator_name) AS title,
                      s.is_default,
                      CASE WHEN s.is_default = 1 THEN 0 ELSE 1 END AS default_rank,
                      CASE WHEN s.language = 'en' THEN 0 ELSE 1 END AS language_rank
               FROM qr_translation_source s
               WHERE EXISTS (
                 SELECT 1
                 FROM qr_translation t
                 WHERE t.source_id = s.id AND t.surah = ?
                 LIMIT 1
               )
             )
             ORDER BY default_rank, language_rank, author
             LIMIT 1`,
          ).bind(surahId).first<TranslationSourceRow>();

      const [surahRow, countRow, sourceRow] = await Promise.all([
        env.DB_QR
          .prepare(
            `SELECT id, name_ar, name_en, name_transliteration,
                    revelation_type, ayah_count, juz_start, page_start
             FROM qr_surah WHERE id = ?`,
          )
          .bind(surahId)
          .first<SurahRow>(),
        env.DB_QR
          .prepare(`SELECT COUNT(*) AS total FROM qr_ayah WHERE surah = ?`)
          .bind(surahId)
          .first<CountRow>(),
        sourceSQL.catch(softFail(null)),
      ]);

      if (!surahRow) return notFound(`surah ${surahId}`);

      const total = countRow?.total ?? 0;

      let ayahFrom: number;
      let ayahTo: number;
      let effectivePage: number;
      let windowSize: number;

      if (rangeMode) {
        ayahFrom      = clamp(toInt(fromParam, 1), 1, total);
        ayahTo        = clamp(toInt(toParam, total), ayahFrom, total);
        effectivePage = 1;
        windowSize    = ayahTo - ayahFrom + 1;
      } else {
        const offset  = (page - 1) * limit;
        ayahFrom      = offset + 1;
        ayahTo        = Math.min(offset + limit, total);
        effectivePage = page;
        windowSize    = limit;
      }

      const ayahSQL = `
        SELECT surah, ayah,
               COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_display,
               text_uthmani_clean, text_uthmani, text_bare,
               translation, verse_mark, page_number
        FROM qr_ayah
        WHERE surah = ? AND ayah BETWEEN ? AND ?
        ORDER BY ayah`;

      const [ayahResult, trResult, occResult] = await Promise.all([
        env.DB_QR
          .prepare(ayahSQL)
          .bind(surahId, ayahFrom, ayahTo)
          .all<AyahRow>(),
        sourceRow
          ? env.DB_QR
              .prepare(
                `SELECT ayah, translation_text AS text
                 FROM qr_translation
                 WHERE source_id = ? AND surah = ? AND ayah BETWEEN ? AND ?
                 ORDER BY ayah`,
              )
              .bind(sourceRow.id, surahId, ayahFrom, ayahTo)
              .all<TranslationRow>()
              .catch(() => ({ results: [] as TranslationRow[] }))
          : Promise.resolve({ results: [] as TranslationRow[] }),
        withWords
          ? env.DB_QR
              .prepare(
                `SELECT ayah, word_index FROM qr_word_occurrence
                 WHERE surah = ? AND ayah BETWEEN ? AND ?
                 ORDER BY ayah, word_index`,
              )
              .bind(surahId, ayahFrom, ayahTo)
              .all<OccurrenceRow>()
              .catch(softFail({ results: [] as OccurrenceRow[] }))
          : Promise.resolve({ results: [] as OccurrenceRow[] }),
      ]);

      const occByAyah = new Map<number, number[]>();
      for (const o of occResult.results ?? []) {
        const list = occByAyah.get(o.ayah) ?? [];
        list.push(o.word_index);
        occByAyah.set(o.ayah, list);
      }

      const ayahRows = ayahResult.results ?? [];
      const trRows   = trResult.results   ?? [];

      const trMap = new Map<number, string>();
      for (const tr of trRows) trMap.set(tr.ayah, tr.text);

      return ok({
        surah: {
          id:                   surahRow.id,
          name_ar:              surahRow.name_ar,
          name_en:              surahRow.name_en              ?? null,
          name_transliteration: surahRow.name_transliteration ?? null,
          revelation_type:      surahRow.revelation_type      ?? null,
          ayah_count:           surahRow.ayah_count,
          juz_start:            surahRow.juz_start            ?? null,
          page_start:           surahRow.page_start           ?? null,
        },
        translation_source: sourceRow
          ? {
              id:       sourceRow.id,
              slug:     sourceRow.slug,
              language: sourceRow.language,
              author:   sourceRow.author,
              title:    sourceRow.title,
            }
          : null,
        meta: {
          total,
          page:     effectivePage,
          per_page: windowSize,
          has_more: rangeMode
            ? ayahTo < total
            : (page - 1) * limit + windowSize < total,
        },
        ayahs: ayahRows.map(row => ({
          surah:              row.surah,
          ayah:               row.ayah,
          verse_key:          `${row.surah}:${row.ayah}`,
          text:               row.text_display,
          text_uthmani_clean: row.text_uthmani_clean ?? null,
          text_uthmani:       row.text_uthmani        ?? null,
          text_bare:          row.text_bare           ?? null,
          verse_mark:         row.verse_mark          ?? null,
          page_number:        row.page_number         ?? null,
          juz:                null,
          hizb:               null,
          ruku:               null,

          translation: trMap.get(row.ayah) ?? row.translation ?? null,
          ...(withWords ? { words: readerWords(row.text_display ?? '', occByAyah.get(row.ayah) ?? []) } : {}),
        })),
      });

    } catch (err) {
      console.error('[qr/reader]', err);
      return internalError('Failed to load surah reader');
    }
  });
}
