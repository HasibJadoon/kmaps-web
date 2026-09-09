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
  /// Audio books: every work that has both a text and a recording, with how
  /// much of the recording is synced to the text word by word. The level is
  /// the one stored on the work — computed from the text and recorded with
  /// its basis, never decided here. Public: the shelf is the same for everyone.
  router.get('/ar/text/audiobooks', async (_req, env) => {
    const rows = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT r.id, r.slug, r.title_ar AS titleAr, r.title_en AS titleEn, r.level, r.genre_ref AS genreRef,
              r.author, json_extract(r.meta_json, '$.shape') AS shape,
              COUNT(DISTINCT a.id)                         AS audios,
              SUM(a.aligned)                               AS aligned,
              ROUND(SUM(a.duration_sec) / 3600.0, 1)       AS hours,
              (SELECT COUNT(*) FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live') AS units,
              (SELECT SUM(word_count) FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live') AS words,
              (SELECT COALESCE(json_extract(r.meta_json, '$.open_at'), MIN(seq)) FROM ar_text_unit t WHERE t.acq_ref_id = r.id) AS firstSeq
         FROM ar_acquisition_ref r
         JOIN ar_acq_audio a ON a.acq_ref_id = r.id AND a.status = 'live'
        WHERE r.status = 'live' AND (r.platform IS NULL OR r.platform <> 'youtube')
          AND EXISTS (SELECT 1 FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live')
        GROUP BY r.id
        ORDER BY CASE r.level WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 ELSE 9 END,
                 hours DESC`,
    );
    return ok({ books: rows });
  });


  /// What can be read right now. Only works that actually have pages — a
  /// catalogue entry with no text is not a book you can open, and listing it
  /// as one is a lie the reader discovers by tapping it.
  /// The ancestor path of every entry, Arabic-preferred.
  ///
  /// A Bayyinah session sits three deep — Readers ▸ BR - Class ▸ the sūra — and
  /// only the whole chain says what it is. `ar_acq_category` carries the Arabic
  /// name of each root, so the path reads in Arabic where Arabic exists rather
  /// than in the English slug Notion happened to use.
  const ANCESTRY = `
    WITH RECURSIVE up(start_ar_no, ar_no, name, parent_ar_no, depth) AS (
      SELECT e.ar_no, e.ar_no, e.name, e.parent_ar_no, 0 FROM ar_acq_entry e
      UNION ALL
      SELECT up.start_ar_no, p.ar_no, p.name, p.parent_ar_no, up.depth + 1
        FROM ar_acq_entry p JOIN up ON p.ar_no = up.parent_ar_no
       WHERE up.depth < 6
    ),
    named AS (
      SELECT up.start_ar_no, up.depth,
             COALESCE(c.name_ar, up.name) AS label
        FROM up LEFT JOIN ar_acq_category c ON c.id = up.ar_no
       WHERE up.depth > 0
    ),
    path AS (
      SELECT start_ar_no,
             group_concat(label, ' ▸ ') AS trail,
             MAX(depth)                 AS levels
        FROM (SELECT * FROM named ORDER BY start_ar_no, depth DESC)
       GROUP BY start_ar_no
    )`;

  router.get('/ar/text/shelf', async (req, env) => {
    const url = new URL(req.url);
    const genre = url.searchParams.get('genre');

    // Vocabulary is a word list, not a reading. It belongs to the Words screen,
    // and on a shelf it is a book with no text in it.
    const conds = [`r.status = 'live'`,
                   `COALESCE(path.trail, '') NOT LIKE 'مفردات%'`];
    const params: unknown[] = [];
    if (genre) { conds.push('r.genre_ref = ?'); params.push(genre); }

    return ok({
      shelf: await query(
        env.DB_AR,
        `${ANCESTRY}
         SELECT r.id, r.slug, r.title_ar, r.title_en, r.author, r.note_ar AS died,
                r.genre_ref, r.register, r.level,
                json_extract(r.meta_json, '$.shape') AS shape,
                r.verse_form                         AS verseForm,
                COUNT(t.id)             AS pages,
                SUM(t.word_count)       AS words,
                -- Where the reading starts. A dīwān's first pages are the
                -- publisher's colophon; opening there is opening on nothing.
                COALESCE(json_extract(r.meta_json, '$.open_at'), MIN(t.seq)) AS firstSeq,
                (SELECT a.object_key FROM ar_acq_audio a
                  WHERE a.status = 'live'
                    AND (a.acq_ref_id = r.id OR a.title_ar = r.title_ar)
                  ORDER BY (a.acq_ref_id = r.id) DESC LIMIT 1) AS audioKey,
                -- The series an episode belongs to, from the Notion tree. An
                -- episode called "Episode 1" means nothing on its own; its
                -- parent's name is what makes it a thing you can pick.
                COALESCE(pc.name_ar, p.name) AS series,
                p.ar_no                      AS seriesRef,
                -- The grandparent too: BR sessions sit under a sūra, which sits
                -- under the reader class. Without it the group reads as a sūra
                -- floating on its own with no idea what is reading it.
                COALESCE(gpc.name_ar, gp.name) AS seriesParent,
                path.trail                     AS trail,
                path.levels                    AS trailLevels,
                CAST(substr(e.ar_no, 4) AS INTEGER) AS episodeOrder,
                -- An episode that can be watched, not only heard: the series
                -- screen says so before the reader is opened.
                json_extract(r.meta_json, '$.video.id')  AS videoId,
                json_extract(r.meta_json, '$.episode')   AS episode
           FROM ar_acquisition_ref r
           JOIN ar_text_unit t ON t.acq_ref_id = r.id AND t.status = 'live'
           LEFT JOIN ar_acq_entry e ON e.ar_no = json_extract(r.meta_json, '$.ar_no')
           LEFT JOIN ar_acq_entry p ON p.ar_no = e.parent_ar_no
           LEFT JOIN ar_acq_entry gp ON gp.ar_no = p.parent_ar_no
           LEFT JOIN ar_acq_category pc  ON pc.id  = p.ar_no
           LEFT JOIN ar_acq_category gpc ON gpc.id = gp.ar_no
           LEFT JOIN path ON path.start_ar_no = e.ar_no
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
              verse_form                         AS verseForm,
              (SELECT a.object_key FROM ar_acq_audio a
                WHERE a.status = 'live'
                  AND (a.acq_ref_id = ar_acquisition_ref.id
                       OR a.title_ar = ar_acquisition_ref.title_ar)
                ORDER BY (a.acq_ref_id = ar_acquisition_ref.id) DESC LIMIT 1) AS audioKey
         FROM ar_acquisition_ref WHERE id = ?`,
      [params.id],
    );
    if (!work) return notFound(`work ${params.id}`);

    const pages = await query(
      env.DB_AR,
      // A recording for the page, where one exists. The Nights are one work of
      // a thousand pages read night by night, so a single playUrl for the whole
      // book would play night one on every page of it.
      // A recording claims its page either by night (the Nights) or by seq (a
      // reader whose every story was recorded on its own).
      `SELECT t.id, t.seq, t.part_no, t.page_no, t.title_ar, t.text_ar, t.word_count,
              a.id                                           AS pageAudioId,
              a.object_key                                   AS pageAudioKey,
              json_extract(a.meta_json, '$.video')           AS pageVideoJson,
              a.title_ar                                     AS pageAudioTitle,
              a.speaker                                      AS pageAudioBy,
              a.duration_sec                                 AS pageAudioSec
         FROM ar_text_unit t
         LEFT JOIN ar_acq_audio a
                ON a.acq_ref_id = t.acq_ref_id
               AND a.status = 'live'
               AND (CAST(json_extract(a.meta_json, '$.night') AS INTEGER) = t.page_no
                    OR CAST(json_extract(a.meta_json, '$.seq') AS INTEGER) = t.seq)
        WHERE t.acq_ref_id = ? AND t.status = 'live' AND t.seq >= ?
        ORDER BY t.seq LIMIT ?`,
      [params.id, from, limit],
    );

    /// The recording's timeline, where it has been aligned: one segment per
    /// printed line, so the reader can light the line being read. Sent with the
    /// page rather than fetched on play — the highlight has to be ready the
    /// instant the audio starts, not a round trip later.
    const audioIds = pages.map((p) => p.pageAudioId).filter((x): x is string => !!x);
    const segments = audioIds.length
      ? await query<{ audio_id: string; seq: number; start_sec: number; end_sec: number; text_ar: string; speaker: string | null; anchored: number; words: string | null }>(
          env.DB_AR,
          `SELECT audio_id, seq, start_sec, end_sec, text_ar, speaker,
                  COALESCE(json_extract(meta_json, '$.anchored'), 1) AS anchored,
                  json_extract(meta_json, '$.w')                     AS words
             FROM ar_acq_audio_segment
            WHERE audio_id IN (${audioIds.map(() => '?').join(',')})
            ORDER BY audio_id, seq`,
          audioIds,
        )
      : [];
    // `words` is one [start, end] per word of the line, in the line's word
    // order — the reader lights the word being spoken, not a guess at it.
    // `speaker` is who says the line, where the transcript records it: a
    // series is a cast, and the readers set the name over the turn rather
    // than leaving the voice guessable only by ear.
    const byAudio = new Map<string, { seq: number; start: number; end: number; text: string; speaker: string | null; anchored: boolean; words: number[][] | null }[]>();
    for (const s of segments) {
      const list = byAudio.get(s.audio_id) ?? [];
      let words: number[][] | null = null;
      if (s.words) { try { words = JSON.parse(s.words); } catch { words = null; } }
      list.push({ seq: s.seq, start: s.start_sec, end: s.end_sec, text: s.text_ar,
                  speaker: s.speaker || null, anchored: !!s.anchored, words });
      byAudio.set(s.audio_id, list);
    }

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
        playUrl: work.audioKey && !String(work.audioKey).startsWith('youtube:')
          ? `/api/ar/audio/${encodeURI(String(work.audioKey))}` : null,
        video: work.audioKey && String(work.audioKey).startsWith('youtube:')
          ? { provider: 'youtube', id: String(work.audioKey).slice('youtube:'.length) } : null,
      },
      pages: pages.map((p) => {
        // A recording keyed `youtube:<id>` is not a file in the bucket: the
        // apps embed the video and the text follows it the same way.
        // An episode can have both: its audio in the bucket for listening, and
        // the video it came from for watching. Either drives the same text.
        const key = p.pageAudioKey ? String(p.pageAudioKey) : null;
        let video: { provider: string; id: string } | null = null;
        if (p.pageVideoJson) { try { video = JSON.parse(String(p.pageVideoJson)); } catch { video = null; } }
        if (!video && key?.startsWith('youtube:')) video = { provider: 'youtube', id: key.slice('youtube:'.length) };
        const { pageVideoJson: _drop, ...rest } = p as Record<string, unknown> & { pageVideoJson?: unknown };
        return {
          ...rest,
          pagePlayUrl: key && !key.startsWith('youtube:') ? `/api/ar/audio/${encodeURI(key)}` : null,
          pageVideo: video,
          pageSegments: p.pageAudioId ? (byAudio.get(String(p.pageAudioId)) ?? []) : [],
        };
      }),
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
