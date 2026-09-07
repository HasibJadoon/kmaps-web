import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

/// The acquisition layer: what there is to read and listen to, what has been
/// captured off a page or a screen, and the words that came out of it.
///
/// Three registries and one queue. The registries are read-only — the app lists
/// them, it does not author them. The queue is the one place a human writes: a
/// capture is machine-read Arabic that nobody has checked, and it stays that way
/// until someone says otherwise.
///
/// Route order matters: the router is first-match-wins, so every literal path is
/// registered before any ':id' that could swallow it.
export function acquisitionRoutes(router: Router<ArabicEnv>) {

  /// The library. Everything readable, classical first — the pre-Islamic dīwāns
  /// sort to the top because a negative death year is the earliest there is.
  router.get('/ar/acq/works', async (req, env) => {
    const url = new URL(req.url);
    const genre = url.searchParams.get('genre');
    const register = url.searchParams.get('register');
    const corpus = url.searchParams.get('corpus');
    const q = url.searchParams.get('q');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);

    const conds = [`status = 'live'`];
    const params: unknown[] = [];
    if (genre) { conds.push('genre_ref = ?'); params.push(genre); }
    if (register) { conds.push('register = ?'); params.push(register); }
    if (corpus) { conds.push('content_db = ?'); params.push(corpus); }
    if (q) { conds.push('(title_ar LIKE ? OR author LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    params.push(limit);

    return ok({
      works: await query(
        env.DB_AR,
        `SELECT id, slug, title_ar, title_en, author, note_ar AS died,
                genre_ref, medium, register, level, content_db,
                has_script, audio_state, unit_count
           FROM ar_acquisition_ref
          WHERE ${conds.join(' AND ')}
          ORDER BY CASE WHEN note_ar IS NULL THEN 1 ELSE 0 END,
                   CAST(replace(COALESCE(note_ar, '9999'), 'ت ', '') AS INTEGER),
                   title_ar
          LIMIT ?`,
        params,
      ),
    });
  });

  /// The listening library. `playUrl` is the whole point: it is anonymous-GET,
  /// because an <audio> element cannot carry a bearer token.
  router.get('/ar/acq/audio', async (req, env) => {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const register = url.searchParams.get('register');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 500);

    const conds = [`a.status = 'live'`];
    const params: unknown[] = [];
    if (category) { conds.push('a.category_ref = ?'); params.push(category); }
    if (register) { conds.push('a.register = ?'); params.push(register); }
    params.push(limit);

    const rows = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT a.id, a.object_key, a.title_ar, a.title_en, a.duration_sec,
              a.size_bytes, a.mime_type, a.register, a.dialect,
              a.transcript_state, a.category_ref,
              c.name_en AS category, c.name_ar AS categoryAr
         FROM ar_acq_audio a
         LEFT JOIN ar_acq_category c ON c.id = a.category_ref
        WHERE ${conds.join(' AND ')}
        ORDER BY c.sort_order, a.title_ar, a.title_en
        LIMIT ?`,
      params,
    );

    return ok({
      audio: rows.map((r) => ({
        ...r,
        playUrl: `/api/ar/audio/${encodeURI(String(r.object_key))}`,
      })),
    });
  });

  /// The review queue — the only screen that matters before any of this becomes
  /// a card. Densest Arabic first, because a page with more text on it is worth
  /// a human's attention sooner than a fragment.
  router.get('/ar/acq/review', async (req, env) => {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
    const bucket = url.searchParams.get('bucket');

    const conds = [`c.status = 'inbox'`, `c.raw_text IS NOT NULL`, `c.raw_text <> ''`];
    const params: unknown[] = [];
    if (bucket) { conds.push(`json_extract(c.meta_json, '$.bucket') = ?`); params.push(bucket); }
    params.push(limit);

    return ok({
      captures: await query(
        env.DB_AR,
        `SELECT c.id, c.channel, c.origin, c.media_ref, c.raw_text,
                c.register, c.status,
                json_extract(c.meta_json, '$.bucket')  AS bucket,
                json_extract(c.meta_json, '$.n_lines') AS lines,
                json_extract(c.meta_json, '$.engine')  AS engine,
                (SELECT COUNT(*) FROM ar_acq_item i WHERE i.capture_id = c.id) AS items
           FROM ar_acq_capture c
          WHERE ${conds.join(' AND ')}
          ORDER BY CAST(json_extract(c.meta_json, '$.n_lines') AS INTEGER) DESC
          LIMIT ?`,
        params,
      ),
    });
  });

  /// The words that came out, with their links into km_arabic_linguistic.
  /// `resolved=1` is the honest half — a root and a real lemma behind it.
  router.get('/ar/acq/items', async (req, env) => {
    const url = new URL(req.url);
    const resolved = url.searchParams.get('resolved');
    const register = url.searchParams.get('register');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);

    const conds = [`i.status = 'live'`];
    const params: unknown[] = [];
    if (resolved === '1') conds.push('i.al_root_ref IS NOT NULL');
    if (resolved === '0') conds.push('i.al_root_ref IS NULL');
    if (register) { conds.push('i.register = ?'); params.push(register); }
    params.push(limit);

    return ok({
      items: await query(
        env.DB_AR,
        `SELECT i.id, i.item_type, i.text_ar, i.vocalised_ar, i.lemma_ar, i.root_ar,
                i.al_lemma_ref, i.al_root_ref, i.gloss_en, i.register,
                i.frequency AS frequencyQuran, i.srs_state, i.capture_id,
                json_extract(i.meta_json, '$.n_images')  AS seenInPhotos,
                json_extract(i.meta_json, '$.match_via') AS matchVia
           FROM ar_acq_item i
          WHERE ${conds.join(' AND ')}
          ORDER BY CAST(json_extract(i.meta_json, '$.n_images') AS INTEGER) DESC
          LIMIT ?`,
        params,
      ),
    });
  });

  /// One capture and everything mined from it. Registered after the literals
  /// above so 'review' and 'items' are not read as ids.
  router.get('/ar/acq/captures/:id', async (_req, env, params) => {
    const capture = await queryOne(
      env.DB_AR,
      `SELECT id, channel, origin, media_ref, raw_text, language, register,
              status, item_count, meta_json
         FROM ar_acq_capture WHERE id = ?`,
      [params.id],
    );
    if (!capture) return notFound(`capture ${params.id}`);

    return ok({
      capture,
      items: await query(
        env.DB_AR,
        `SELECT id, item_type, text_ar, lemma_ar, root_ar, al_lemma_ref,
                al_root_ref, gloss_en, srs_state, status
           FROM ar_acq_item WHERE capture_id = ? ORDER BY text_ar`,
        [params.id],
      ),
    });
  });

  /// Reviewing a capture: correct the Arabic, or accept it as read. This is the
  /// gate — nothing downstream may treat text as trustworthy until a capture
  /// leaves 'inbox'.
  router.patch('/ar/acq/captures/:id', async (req, env, params) => {
    const body = (await req.json().catch(() => null)) as
      | { rawText?: string; status?: string; contextNote?: string }
      | null;
    if (!body) return badRequest('body must be JSON');

    const allowed = ['inbox', 'reviewed', 'mined', 'discarded'];
    if (body.status && !allowed.includes(body.status)) {
      return badRequest(`status must be one of ${allowed.join(', ')}`);
    }

    const sets: string[] = [];
    const args: unknown[] = [];
    if (body.rawText !== undefined) { sets.push('raw_text = ?'); args.push(body.rawText); }
    if (body.status !== undefined) { sets.push('status = ?'); args.push(body.status); }
    if (body.contextNote !== undefined) { sets.push('context_note = ?'); args.push(body.contextNote); }
    if (!sets.length) return badRequest('nothing to update');
    args.push(params.id);

    await env.DB_AR.prepare(
      `UPDATE ar_acq_capture SET ${sets.join(', ')} WHERE id = ?`,
    ).bind(...args).run();

    return ok({
      capture: await queryOne(
        env.DB_AR,
        `SELECT id, status, raw_text, context_note FROM ar_acq_capture WHERE id = ?`,
        [params.id],
      ),
    });
  });

  /// What the acquisition layer currently holds. Small enough to be the first
  /// thing a screen asks for.
  router.get('/ar/acq/stats', async (_req, env) =>
    ok({
      stats: await queryOne(
        env.DB_AR,
        `SELECT (SELECT COUNT(*) FROM ar_acquisition_ref WHERE status='live')            AS works,
                (SELECT COUNT(*) FROM ar_acq_audio WHERE status='live')                  AS audio,
                (SELECT ROUND(SUM(duration_sec)/3600.0, 1) FROM ar_acq_audio)            AS audioHours,
                (SELECT COUNT(*) FROM ar_acq_capture)                                    AS captures,
                (SELECT COUNT(*) FROM ar_acq_capture WHERE status='inbox')               AS awaitingReview,
                (SELECT COUNT(*) FROM ar_acq_item WHERE status='live')                   AS items,
                (SELECT COUNT(*) FROM ar_acq_item WHERE status='live'
                   AND al_root_ref IS NOT NULL)                                          AS itemsLinked`,
      ),
    }));
}
