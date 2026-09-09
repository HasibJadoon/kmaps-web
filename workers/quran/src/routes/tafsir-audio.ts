import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

// A tafsīr read aloud: the book's read pages (qr_tafsir_read_page) with the
// recordings cut to page boundaries (qr_tafsir_audio) and their per-line,
// per-word timing (qr_tafsir_audio_segment). The page shape is the Arabic
// reader's, deliberately — one reader follows every voice in the app.

const LEVEL = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as Record<string, number>;

export function tafsirAudioRoutes(router: Router<QuranEnv>) {
  /// Every tafsīr that has both read pages and at least one recording.
  router.get('/qr/tafsir/audio/books', (req, env) => cached(req, async () => {
    const books = await query<Record<string, unknown>>(env.DB_QR,
      `SELECT s.source_slug AS slug, 'QRTB:' || s.source_slug AS id, s.book_title_ar AS titleAr, s.book_title_en AS titleEn,
              s.author_name_ar AS author, s.author_name_en AS authorEn, s.death_year_hijri AS died,
              (SELECT COUNT(*) FROM qr_tafsir_read_page p WHERE p.source_slug = s.source_slug AND p.status = 'live') AS pages,
              (SELECT SUM(word_count) FROM qr_tafsir_read_page p WHERE p.source_slug = s.source_slug AND p.status = 'live') AS words,
              (SELECT COUNT(*) FROM qr_tafsir_audio a WHERE a.source_slug = s.source_slug AND a.status = 'live') AS audios,
              (SELECT SUM(aligned) FROM qr_tafsir_audio a WHERE a.source_slug = s.source_slug AND a.status = 'live') AS aligned,
              (SELECT ROUND(SUM(duration_sec) / 3600.0, 2) FROM qr_tafsir_audio a WHERE a.source_slug = s.source_slug AND a.status = 'live') AS hours,
              (SELECT MIN(seq) FROM qr_tafsir_read_page p WHERE p.source_slug = s.source_slug AND p.status = 'live') AS firstSeq
         FROM qr_tafsir_book_display_source s
        WHERE EXISTS (SELECT 1 FROM qr_tafsir_read_page p WHERE p.source_slug = s.source_slug)
        ORDER BY s.display_order`);
    // Per surah: how many pages, and how much of them is recorded — a reader
    // picks a surah, not a page number.
    const surahs = await query<Record<string, unknown>>(env.DB_QR,
      `SELECT p.source_slug AS slug, p.surah_no AS surahNo, su.name_ar AS surahAr, su.name_en AS surahEn,
              MIN(p.seq) AS firstSeq, COUNT(*) AS pages, SUM(p.word_count) AS words,
              SUM(EXISTS (SELECT 1 FROM qr_tafsir_audio a, json_each(a.meta_json, '$.pages') je WHERE je.value = p.id AND a.status = 'live')) AS recorded
         FROM qr_tafsir_read_page p LEFT JOIN qr_surah su ON su.id = p.surah_no
        WHERE p.status = 'live'
        GROUP BY p.source_slug, p.surah_no ORDER BY p.source_slug, MIN(p.seq)`);
    const out = books.map((b) => ({
      ...b,
      shape: 'prose',
      sections: surahs.filter((s) => s.slug === b.slug).map(({ slug: _s, ...rest }) => rest),
    }));
    return ok({ books: out });
  }, { edge: 300 }));

  /// A run of read pages, in the Arabic reader's page shape.
  router.get('/qr/tafsir/audio/works/:slug/pages', (req, env, params) => cached(req, async () => {
    const url = new URL(req.url);
    const from = Number(url.searchParams.get('from') ?? 1);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 1), 20);
    const slug = params.slug;
    const work = await queryOne<Record<string, unknown>>(env.DB_QR,
      `SELECT 'QRTB:' || source_slug AS id, book_title_ar AS titleAr, book_title_en AS titleEn, author_name_ar AS author,
              death_year_hijri AS died, 'prose' AS shape, NULL AS audioKey, NULL AS playUrl
         FROM qr_tafsir_book_display_source WHERE source_slug = ?`, [slug]);
    if (!work) return notFound('tafsir');
    const pages = await query<Record<string, unknown>>(env.DB_QR,
      `SELECT p.id, p.seq, NULL AS part_no, p.surah_no AS page_no, p.title_ar, p.text_ar, p.word_count, p.kind, p.ayah_group_key AS ayahGroupKey,
              a.id AS pageAudioId, a.object_key AS pageAudioKey, a.title_ar AS pageAudioTitle, a.speaker AS pageAudioBy, a.duration_sec AS pageAudioSec
         FROM qr_tafsir_read_page p
         LEFT JOIN qr_tafsir_audio a ON a.source_slug = p.source_slug AND a.status = 'live'
              AND EXISTS (SELECT 1 FROM json_each(a.meta_json, '$.pages') je WHERE je.value = p.id)
        WHERE p.source_slug = ? AND p.status = 'live' AND p.seq >= ?
        GROUP BY p.id ORDER BY p.seq LIMIT ?`, [slug, from, limit]);
    const ids = pages.map((p) => String(p.id));
    const segs = ids.length ? await query<{ page_id: string; seq: number; start_sec: number; end_sec: number; text_ar: string; words: string | null }>(env.DB_QR,
      `SELECT page_id, seq, start_sec, end_sec, text_ar, json_extract(meta_json, '$.w') AS words
         FROM qr_tafsir_audio_segment WHERE page_id IN (${ids.map(() => '?').join(',')}) ORDER BY page_id, seq`, ids) : [];
    const byPage = new Map<string, { seq: number; start: number; end: number; text: string; speaker: null; anchored: boolean; words: number[][] | null }[]>();
    for (const s of segs) {
      let words: number[][] | null = null;
      if (s.words) { try { words = JSON.parse(s.words); } catch { words = null; } }
      const l = byPage.get(s.page_id) ?? []; l.push({ seq: s.seq, start: s.start_sec, end: s.end_sec, text: s.text_ar, speaker: null, anchored: true, words }); byPage.set(s.page_id, l);
    }
    const bounds = await queryOne<{ minSeq: number; maxSeq: number; pages: number }>(env.DB_QR,
      `SELECT MIN(seq) AS minSeq, MAX(seq) AS maxSeq, COUNT(*) AS pages FROM qr_tafsir_read_page WHERE source_slug = ? AND status = 'live'`, [slug]);
    return ok({
      work: { ...work, video: null },
      pages: pages.map((p) => {
        const own = byPage.get(String(p.id)) ?? [];
        const key = p.pageAudioKey ? String(p.pageAudioKey) : null;
        return {
          ...p,
          pagePlayUrl: key ? `/api/ar/audio/${encodeURI(key)}` : null,
          pageVideo: null,
          pageAudioStart: own.length ? Math.max(0, own[0].start - 0.3) : 0,
          pageSegments: own,
        };
      }),
      bounds,
    });
  }, { edge: 300 }));
}
