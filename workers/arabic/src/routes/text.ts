import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

/// The reading shelf. This is the half of the acquisition layer a learner
/// actually spends time in: pages of classical Arabic, in reading order.
///
/// A page here is one `ar_text_unit` — Shamela's own pagination, kept rather
/// than re-chunked, because the printed page is what a citation refers to.
export function textRoutes(router: Router<ArabicEnv>) {

  /// What can be read right now. Only works that actually have pages — a
  /// catalogue entry with no text is not a book you can open, and listing it
  /// as one is a lie the reader discovers by tapping it.
  router.get('/ar/text/shelf', async (req, env) => {
    const url = new URL(req.url);
    const genre = url.searchParams.get('genre');

    const conds = [`r.status = 'live'`];
    const params: unknown[] = [];
    if (genre) { conds.push('r.genre_ref = ?'); params.push(genre); }

    return ok({
      shelf: await query(
        env.DB_AR,
        `SELECT r.id, r.slug, r.title_ar, r.title_en, r.author, r.note_ar AS died,
                r.genre_ref, r.register, r.level,
                json_extract(r.meta_json, '$.shape') AS shape,
                COUNT(t.id)             AS pages,
                SUM(t.word_count)       AS words,
                MIN(t.seq)              AS firstSeq,
                (SELECT a.object_key FROM ar_acq_audio a
                  WHERE a.status = 'live' AND a.title_ar = r.title_ar
                  LIMIT 1)              AS audioKey
           FROM ar_acquisition_ref r
           JOIN ar_text_unit t ON t.acq_ref_id = r.id AND t.status = 'live'
          WHERE ${conds.join(' AND ')}
          GROUP BY r.id
          ORDER BY r.genre_ref,
                   CAST(replace(COALESCE(r.note_ar, '9999'), 'ت ', '') AS INTEGER),
                   r.title_ar`,
        params,
      ),
    });
  });

  /// A book's table of contents: only the pages that open a chapter. Cheap
  /// enough to send whole, and it is how someone picks up where they meant to.
  router.get('/ar/text/works/:id/toc', async (_req, env, params) =>
    ok({
      toc: await query(
        env.DB_AR,
        `SELECT id, seq, page_no, part_no, title_ar
           FROM ar_text_unit
          WHERE acq_ref_id = ? AND status = 'live'
            AND title_ar IS NOT NULL AND title_ar <> ''
          ORDER BY seq`,
        [params.id],
      ),
    }));

  /// A run of pages. `from` is a seq, not an offset, so a link into the middle
  /// of a book keeps meaning after more pages are ingested.
  router.get('/ar/text/works/:id/pages', async (req, env, params) => {
    const url = new URL(req.url);
    const from = Number(url.searchParams.get('from') ?? 1);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 5), 30);

    const work = await queryOne(
      env.DB_AR,
      `SELECT id, title_ar, title_en, author, note_ar AS died, genre_ref, register,
              json_extract(meta_json, '$.shape') AS shape,
              (SELECT a.object_key FROM ar_acq_audio a
                WHERE a.status = 'live' AND a.title_ar = ar_acquisition_ref.title_ar
                LIMIT 1) AS audioKey
         FROM ar_acquisition_ref WHERE id = ?`,
      [params.id],
    );
    if (!work) return notFound(`work ${params.id}`);

    const pages = await query(
      env.DB_AR,
      `SELECT id, seq, part_no, page_no, title_ar, text_ar, word_count
         FROM ar_text_unit
        WHERE acq_ref_id = ? AND status = 'live' AND seq >= ?
        ORDER BY seq LIMIT ?`,
      [params.id, from, limit],
    );

    const bounds = await queryOne<{ minSeq: number; maxSeq: number; pages: number }>(
      env.DB_AR,
      `SELECT MIN(seq) AS minSeq, MAX(seq) AS maxSeq, COUNT(*) AS pages
         FROM ar_text_unit WHERE acq_ref_id = ? AND status = 'live'`,
      [params.id],
    );

    /// An <audio> element cannot carry a bearer token, so this is the same
    /// anonymous path the Listening screen uses — a recording is playable
    /// from inside the reader, not only from the audio list.
    return ok({
      work: {
        ...work,
        playUrl: work.audioKey ? `/api/ar/audio/${encodeURI(String(work.audioKey))}` : null,
      },
      pages,
      bounds,
    });
  });

  /// Search the shelf. Unvocalised queries have to match vocalised text, which
  /// is why the FTS table is built with remove_diacritics 2.
  router.get('/ar/text/search', async (req, env) => {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (!q) return badRequest('q param required');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100);

    return ok({
      hits: await query(
        env.DB_AR,
        `SELECT t.id, t.seq, t.page_no, t.title_ar, t.acq_ref_id,
                r.title_ar AS work_ar, r.author,
                snippet(ar_text_unit_fts, 0, '‹', '›', '…', 14) AS snippet
           FROM ar_text_unit_fts f
           JOIN ar_text_unit t ON t.rowid = f.rowid
           JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
          WHERE ar_text_unit_fts MATCH ?
          ORDER BY rank LIMIT ?`,
        [q.replace(/["*]/g, ' '), limit],
      ),
    });
  });
}
