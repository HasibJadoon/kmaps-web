import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { ANCESTRY } from '../lib/ancestry';

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
    // Every work that has both a text and a recording of it. The shelf it sits
    // on is its category (Songs, Short Stories, Readers, Books …) and its level
    // is stored on the row — the app groups by what it is handed and decides
    // nothing about difficulty or kind.
    const rows = await query<Record<string, unknown>>(env.DB_AR,
      `SELECT r.id, r.slug, r.title_ar AS titleAr, r.title_en AS titleEn, r.level, r.genre_ref AS genreRef,
              r.author, json_extract(r.meta_json, '$.shape') AS shape,
              r.category_ref AS shelfId, c.name_ar AS shelfAr, c.name_en AS shelfEn, c.sort_order AS shelfOrder,
              COUNT(DISTINCT a.id)                         AS audios,
              SUM(a.aligned)                               AS aligned,
              ROUND(SUM(a.duration_sec) / 3600.0, 2)       AS hours,
              CAST(ROUND(SUM(a.duration_sec) / 60.0) AS INTEGER) AS minutes,
              (SELECT COUNT(*) FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live') AS units,
              (SELECT SUM(word_count) FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live') AS words,
              (SELECT COALESCE(json_extract(r.meta_json, '$.open_at'), MIN(seq)) FROM ar_text_unit t WHERE t.acq_ref_id = r.id) AS firstSeq
         FROM ar_acquisition_ref r
         JOIN ar_acq_audio a ON a.acq_ref_id = r.id AND a.status = 'live'
         LEFT JOIN ar_acq_category c ON c.id = r.category_ref
        WHERE r.status = 'live' AND (r.platform IS NULL OR r.platform <> 'youtube')
          AND EXISTS (SELECT 1 FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.status = 'live')
        GROUP BY r.id
        ORDER BY CASE r.level WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 ELSE 9 END,
                 hours DESC`);
    // Shelves in the order a learner climbs them: by the easiest level on the
    // shelf, then by the category's own order.
    const levelRank = (l: unknown) => ({ A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as Record<string, number>)[String(l)] ?? 9;
    const byShelf = new Map<string, Record<string, unknown>[]>();
    for (const r of rows) {
      const k = String(r.shelfId ?? '—');
      if (!byShelf.has(k)) byShelf.set(k, []);
      byShelf.get(k)!.push(r);
    }
    const shelves = [...byShelf.entries()].map(([id, books]) => {
      const levels = [...new Set(books.map(b => String(b.level ?? '')).filter(Boolean))].sort((x, y) => levelRank(x) - levelRank(y));
      return {
        id, nameAr: books[0].shelfAr ?? 'متفرقات', nameEn: books[0].shelfEn ?? 'Other',
        order: Number(books[0].shelfOrder ?? 999),
        count: books.length, hours: Math.round(books.reduce((s, b) => s + Number(b.hours ?? 0), 0) * 10) / 10,
        synced: books.filter(b => Number(b.aligned) === Number(b.audios)).length,
        levels, levelFrom: levels[0] ?? null, levelTo: levels[levels.length - 1] ?? null, books,
      };
    }).sort((x, y) => levelRank(x.levelFrom) - levelRank(y.levelFrom) || x.order - y.order);
    return ok({ books: rows, shelves });
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
  // the Notion tree above every work (lib/ancestry.ts)

  router.get('/ar/text/shelf', async (req, env) => {
    const url = new URL(req.url);
    const genre = url.searchParams.get('genre');
    // One series only: the reader steps between a series' episodes and needs
    // those, not the whole library (over a thousand works) to find them in.
    const series = url.searchParams.get('series');

    // Vocabulary is a word list, not a reading. It belongs to the Words screen,
    // and on a shelf it is a book with no text in it.
    const conds = [`r.status = 'live'`,
                   `COALESCE(path.trail, '') NOT LIKE 'مفردات%'`];
    const params: unknown[] = [];
    if (genre) { conds.push('r.genre_ref = ?'); params.push(genre); }
    if (series) { conds.push('p.ar_no = ?'); params.push(series); }

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

  /// The reconstructed script for one text unit, where it has one: an episode
  /// set out scene by scene, each line carrying the Arabic, the English, and
  /// the speaker where the narration names one.
  ///
  /// The script as authored marks an āyah only inside its note ("آية قرآنية —
  /// سورة النمل ٢٧:١٩"). A view should not have to read Arabic prose to decide
  /// how to draw a line, so the kind and the reference are split out here and
  /// the note keeps only what is left to say.
  router.get('/ar/text/units/:id/script', async (_req, env, params) => {
    const row = await queryOne<{ id: string; title_ar: string | null; script_json: string | null; audio_key: string | null; audio_sec: number | null }>(
      env.DB_AR,
      // The episode's recording, so the script can be played scene by scene:
      // each line carries its own [start, end] on this recording's timeline.
      `SELECT t.id, t.title_ar, t.script_json,
              (SELECT a.object_key FROM ar_acq_audio a WHERE a.acq_ref_id = t.acq_ref_id AND a.status = 'live' LIMIT 1) AS audio_key,
              (SELECT a.duration_sec FROM ar_acq_audio a WHERE a.acq_ref_id = t.acq_ref_id AND a.status = 'live' LIMIT 1) AS audio_sec
         FROM ar_text_unit t
        WHERE t.id = ? AND t.status = 'live'`,
      [params.id],
    );
    if (!row) return notFound('no such text unit');
    if (!row.script_json) return notFound('this unit has no reconstructed script');

    let doc: Record<string, unknown>;
    try { doc = JSON.parse(row.script_json) as Record<string, unknown>; }
    catch { return notFound('the stored script is not readable'); }

    const AYAH = /آية\s*قرآنية/;
    const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const sec = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    // A review flag: where the episode says what the Qurʾān or the ḥadīth do
    // not (a "verse" that is no āyah, a report mis-attributed, a detail from
    // isrāʾīliyyāt told as fact, material heavy for children). Authored as one
    // «Arabic | English» note, served as its two halves for the red card.
    const flag = (v: unknown) => {
      const f = clean(v);
      if (!f) return null;
      const [ar, ...en] = f.split(' | ');
      return { ar: clean(ar), en: clean(en.join(' | ')) };
    };

    const scenes = (Array.isArray(doc.scenes) ? doc.scenes : []).map((raw, i) => {
      const s = raw as Record<string, unknown>;
      return {
        scene_no: typeof s.scene_no === 'number' ? s.scene_no : i + 1,
        title_ar: clean(s.title_ar),
        title_en: clean(s.title_en),
        // what a slide is drawn from: an SF Symbol, whether the scene is the
        // frame story or the tale told inside it, and one line of what happens
        icon: clean(s.icon),
        era: clean(s.era),
        summary_en: clean(s.summary_en),
        start: sec(s.start),
        end: sec(s.end),
        flag: flag(s.flag),
        lines: (Array.isArray(s.lines) ? s.lines : []).map((rawLine) => {
          const l = rawLine as Record<string, unknown>;
          const note = clean(l.note);
          const isAyah = !!note && AYAH.test(note);
          // "آية قرآنية — سورة النمل ٢٧:١٩ | Qur'an 27:19" — the reference is
          // everything after the dash; the label itself is what `kind` now says.
          const ref = isAyah ? clean(note.replace(AYAH, '').replace(/^\s*[—–-]\s*/, '')) : null;
          return {
            kind: isAyah ? 'ayah' : 'line',
            speaker: clean(l.speaker),
            ar: clean(l.ar),
            en: clean(l.en),
            note: isAyah ? null : note,
            ref,
            // where the line is said, and each of its words (one per word of
            // `ar`, split on spaces), timed against the recording
            start: sec(l.start),
            end: sec(l.end),
            words: Array.isArray(l.w) ? l.w : null,
            flag: flag(l.flag),
          };
        }).filter((l) => l.ar || l.en || l.note),
      };
    });

    return ok({
      unit_id: row.id,
      title_ar: clean(doc.title_ar) ?? row.title_ar,
      title_en: clean(doc.title_en),
      series_ar: clean(doc.series_ar),
      series_en: clean(doc.series_en),
      episode: typeof doc.episode === 'number' ? doc.episode : null,
      video_url: clean(doc.video_url),
      // the YouTube id, so the slides can play the episode's picture above
      // the scene — the script's times are that video's timeline
      video_id: (clean(doc.video_url)?.match(/(?:[?&]v=|youtu\.be\/)([\w-]{11})/) ?? [])[1] ?? null,
      colophon: clean(doc.reconstruction_notes),
      audio: row.audio_key && !row.audio_key.startsWith('youtube:')
        ? { play_url: `/api/ar/audio/${encodeURI(row.audio_key)}`, duration: row.audio_sec }
        : null,
      // who speaks, each with an icon, so a line's speaker is drawn from data
      cast: (Array.isArray(doc.cast) ? doc.cast : []).map((raw) => {
        const c = raw as Record<string, unknown>;
        return { name_ar: clean(c.name_ar), name_en: clean(c.name_en), role_en: clean(c.role_en), icon: clean(c.icon) };
      }).filter((c) => c.name_ar),
      scenes,
    });
  });

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
                ORDER BY (a.acq_ref_id = ar_acquisition_ref.id) DESC LIMIT 1) AS audioKey,
              -- The series this work is an episode of (the shelf's seriesRef),
              -- so the reader asks for its siblings by name, not by the library.
              (SELECT e.parent_ar_no FROM ar_acq_entry e
                WHERE e.ar_no = json_extract(ar_acquisition_ref.meta_json, '$.ar_no')) AS seriesRef
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
              -- whether the page has a reconstructed script, so the reader
              -- offers one without fetching it to find out
              (t.script_json IS NOT NULL)                    AS hasScript,
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
                    OR CAST(json_extract(a.meta_json, '$.seq') AS INTEGER) = t.seq
                    -- a whole-book recording cut into parts: each part lists the
                    -- units it reads, and a page belongs to the part that reads it
                    OR EXISTS (SELECT 1 FROM json_each(a.meta_json, '$.units') je WHERE je.value = t.id))
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
      ? await query<{ audio_id: string; seq: number; start_sec: number; end_sec: number; text_ar: string; speaker: string | null; anchored: number; words: string | null; unit: string | null }>(
          env.DB_AR,
          `SELECT audio_id, seq, start_sec, end_sec, text_ar, speaker,
                  COALESCE(json_extract(meta_json, '$.anchored'), 1) AS anchored,
                  json_extract(meta_json, '$.w')                     AS words,
                  json_extract(meta_json, '$.unit')                  AS unit
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
    const byAudio = new Map<string, { seq: number; start: number; end: number; text: string; speaker: string | null; anchored: boolean; words: number[][] | null; unit: string | null }[]>();
    for (const s of segments) {
      const list = byAudio.get(s.audio_id) ?? [];
      let words: number[][] | null = null;
      if (s.words) { try { words = JSON.parse(s.words); } catch { words = null; } }
      list.push({ seq: s.seq, start: s.start_sec, end: s.end_sec, text: s.text_ar,
                  speaker: s.speaker || null, anchored: !!s.anchored, words, unit: s.unit || null });
      byAudio.set(s.audio_id, list);
    }

    // Where each page a recording reads sits on its timeline, for every page
    // the recording covers: a scrub can land on a page the reader does not
    // hold, and this is how it knows which one to turn to.
    const unitSeq = new Map<string, number>();
    if (audioIds.length) {
      const units = await query<{ id: string; seq: number }>(env.DB_AR,
        `SELECT id, seq FROM ar_text_unit WHERE acq_ref_id = ? AND status = 'live'`, [params.id]);
      for (const u of units) unitSeq.set(u.id, u.seq);
    }
    const mapByAudio = new Map<string, { seq: number; start: number; end: number }[]>();
    for (const [aid, list] of byAudio) {
      const acc = new Map<number, { start: number; end: number }>();
      for (const s of list) {
        if (!(s.end > s.start)) continue;
        // a part that lists its units keys each line by unit; a recording of
        // one page keys nothing, and belongs to the page it is attached to
        const seq = s.unit ? unitSeq.get(s.unit) : pages.find((p) => p.pageAudioId === aid)?.seq as number | undefined;
        if (seq == null) continue;
        const cur = acc.get(seq);
        acc.set(seq, cur ? { start: Math.min(cur.start, s.start), end: Math.max(cur.end, s.end) } : { start: s.start, end: s.end });
      }
      mapByAudio.set(aid, [...acc.entries()].map(([seq, v]) => ({ seq, ...v })).sort((a, b) => a.seq - b.seq));
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
        // A recording that reads several pages carries every page's lines; a
        // page gets only its own, and the moment on the timeline where they
        // begin, so play starts at this page and not at the part's first word.
        const all = p.pageAudioId ? (byAudio.get(String(p.pageAudioId)) ?? []) : [];
        const own = all.some((s) => s.unit) ? all.filter((s) => !s.unit || s.unit === p.id) : all;
        const pageSegments = own.map(({ unit: _u, ...seg }) => seg);
        const pageAudioMap = p.pageAudioId ? (mapByAudio.get(String(p.pageAudioId)) ?? []) : [];
        // A recording synced to other pages but with no line on this one (the
        // Nights' dawn refrain, a preface the reader skips) is not this page's
        // recording: offering it would replay the whole episode from the top.
        const orphan = all.length > 0 && own.length === 0;
        return {
          ...rest,
          pagePlayUrl: key && !orphan && !key.startsWith('youtube:') ? `/api/ar/audio/${encodeURI(key)}` : null,
          pageVideo: video,
          pageAudioStart: pageSegments.length ? Math.max(0, pageSegments[0].start - 0.3) : 0,
          pageSegments,
          pageAudioMap,
        };
      }),
      bounds,
    });
  });

  /// Search the shelf. Unvocalised queries have to match vocalised text, which
  /// is why the FTS table is built with remove_diacritics 2.
  /// A book's recording, part by part: what a studio needs to pick one part
  /// and read along it. Each part is one audio file of about forty minutes,
  /// cut at page boundaries by the aligner.
  router.get('/ar/text/works/:id/parts', async (_req, env, params) => {
    const work = await queryOne<{ id: string; title_ar: string | null; title_en: string | null; author: string | null }>(
      env.DB_AR, 'SELECT id, title_ar, title_en, author FROM ar_acquisition_ref WHERE id = ?', [params.id]);
    if (!work) return notFound(`work ${params.id}`);
    const rows = await query<Record<string, unknown>>(env.DB_AR,
      `SELECT a.id, a.title_ar, a.title_en, a.object_key, a.duration_sec, a.speaker,
              json_array_length(json_extract(a.meta_json, '$.units')) AS pages,
              (SELECT COUNT(*) FROM ar_acq_audio_segment s WHERE s.audio_id = a.id) AS lines
         FROM ar_acq_audio a
        WHERE a.acq_ref_id = ? AND a.status = 'live' AND a.object_key NOT LIKE 'youtube:%'
        ORDER BY a.id`, [params.id]);
    return ok({
      work: { id: work.id, title_ar: work.title_ar, title_en: work.title_en, author: work.author },
      parts: rows.map((r, i) => ({
        id: r.id, part: i + 1, title_ar: r.title_ar, title_en: r.title_en, speaker: r.speaker,
        duration: r.duration_sec, pages: r.pages, lines: r.lines,
        play_url: `/api/ar/audio/${encodeURI(String(r.object_key))}`,
      })),
    });
  });

  /// One part of a book's recording with every line read in it, timed on the
  /// part's own clock and word by word — the strip a studio runs under the
  /// camera. The play URL is a path on the API host (the worker sits behind
  /// the gateway and does not know the public origin).
  router.get('/ar/text/parts/:id', async (_req, env, params) => {
    const part = await queryOne<Record<string, unknown>>(env.DB_AR,
      `SELECT a.id, a.acq_ref_id, a.title_ar, a.title_en, a.object_key, a.duration_sec, a.speaker,
              r.title_ar AS work_ar, r.title_en AS work_en, r.author
         FROM ar_acq_audio a JOIN ar_acquisition_ref r ON r.id = a.acq_ref_id
        WHERE a.id = ? AND a.status = 'live'`, [params.id]);
    if (!part) return notFound(`part ${params.id}`);
    const segs = await query<{ seq: number; start_sec: number; end_sec: number; text_ar: string; meta_json: string | null }>(
      env.DB_AR,
      'SELECT seq, start_sec, end_sec, text_ar, meta_json FROM ar_acq_audio_segment WHERE audio_id = ? ORDER BY seq',
      [params.id]);
    const lines = segs.map((s) => {
      let m: Record<string, unknown> = {};
      try { m = s.meta_json ? JSON.parse(s.meta_json) : {}; } catch { /* a bad row keeps its line, untimed by word */ }
      return {
        seq: s.seq, start: s.start_sec, end: s.end_sec, text: s.text_ar,
        anchored: m.anchored === true, words: Array.isArray(m.w) ? m.w : null,
        unit: typeof m.unit === 'string' ? m.unit : null,
      };
    });
    return ok({
      id: part.id, work: part.acq_ref_id, work_ar: part.work_ar, work_en: part.work_en, author: part.author,
      title_ar: part.title_ar, title_en: part.title_en, speaker: part.speaker, duration: part.duration_sec,
      play_url: `/api/ar/audio/${encodeURI(String(part.object_key))}`,
      lines,
    });
  });

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
