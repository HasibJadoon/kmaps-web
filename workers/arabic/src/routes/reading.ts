import type { Router } from '../../../shared/src/router';
import { ok, badRequest, unauthorized } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { actorRef } from '../auth';

/// The reader's own side of the shelf: where they are in each book, which
/// they finished, which they keep, and what they marked in the text.
///
/// This is learner state, so it sits behind the token (the path is not in the
/// gateway's public list) and is keyed by the user the gateway vouches for.
/// The device keeps a copy for instant reads; this is the copy that survives
/// a new phone.
interface StateRow {
  work_id: string; status: string; progress_seq: number | null; favourite: number;
  bookmarks_json: string; highlights_json: string; opened_at: string; updated_at: string;
}

function shape(r: StateRow) {
  let bookmarks: number[] = []; let highlights: unknown[] = [];
  try { bookmarks = JSON.parse(r.bookmarks_json); } catch { /* keep [] */ }
  try { highlights = JSON.parse(r.highlights_json); } catch { /* keep [] */ }
  return {
    workId: r.work_id, status: r.status, progressSeq: r.progress_seq, favourite: !!r.favourite,
    bookmarks, highlights, openedAt: r.opened_at, updatedAt: r.updated_at,
  };
}

export function readingRoutes(router: Router<ArabicEnv>) {
  /// Everything this reader has touched, most recent first.
  router.get('/ar/reading/state', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to keep your place');
    const rows = await query<StateRow>(
      env.DB_AR,
      `SELECT work_id, status, progress_seq, favourite, bookmarks_json, highlights_json, opened_at, updated_at
         FROM ar_reading_state WHERE user_id = ? ORDER BY updated_at DESC`,
      [user],
    );
    return ok({ states: rows.map(shape) });
  });

  /// Merge a change into one book's state. Only the fields sent are touched:
  /// turning a page must not clear a bookmark made on another device.
  router.put('/ar/reading/state/:work', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to keep your place');
    const work = decodeURIComponent(params.work);
    let b: Record<string, unknown>;
    try { b = await req.json() as Record<string, unknown>; } catch { return badRequest('JSON body required'); }

    // The iOS client encodes snake_case; the web client camelCase. Take either.
    const progressRaw = b.progressSeq ?? b.progress_seq;
    const status = typeof b.status === 'string' && ['reading', 'read'].includes(b.status) ? b.status : null;
    const progress = typeof progressRaw === 'number' ? Math.max(1, Math.floor(progressRaw)) : null;
    const favourite = typeof b.favourite === 'boolean' ? (b.favourite ? 1 : 0) : null;
    const bookmarks = Array.isArray(b.bookmarks) ? JSON.stringify(b.bookmarks.filter((x) => typeof x === 'number')) : null;
    const highlights = Array.isArray(b.highlights) ? JSON.stringify(b.highlights.slice(0, 500)) : null;

    await env.DB_AR.prepare(
      `INSERT INTO ar_reading_state (user_id, work_id, status, progress_seq, favourite, bookmarks_json, highlights_json)
       VALUES (?, ?, COALESCE(?, 'reading'), ?, COALESCE(?, 0), COALESCE(?, '[]'), COALESCE(?, '[]'))
       ON CONFLICT(user_id, work_id) DO UPDATE SET
         status          = COALESCE(excluded.status,          ar_reading_state.status),
         progress_seq    = COALESCE(excluded.progress_seq,    ar_reading_state.progress_seq),
         favourite       = COALESCE(?,                        ar_reading_state.favourite),
         bookmarks_json  = COALESCE(?,                        ar_reading_state.bookmarks_json),
         highlights_json = COALESCE(?,                        ar_reading_state.highlights_json),
         updated_at      = datetime('now')`,
    ).bind(user, work, status, progress, favourite, bookmarks, highlights, favourite, bookmarks, highlights).run();

    const row = await queryOne<StateRow>(
      env.DB_AR,
      `SELECT work_id, status, progress_seq, favourite, bookmarks_json, highlights_json, opened_at, updated_at
         FROM ar_reading_state WHERE user_id = ? AND work_id = ?`,
      [user, work],
    );
    return ok({ state: row ? shape(row) : null });
  });

  /// Forget a book entirely — off the desk, off the shelf, marks gone.
  router.delete('/ar/reading/state/:work', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Sign in to keep your place');
    await env.DB_AR.prepare(`DELETE FROM ar_reading_state WHERE user_id = ? AND work_id = ?`)
      .bind(user, decodeURIComponent(params.work)).run();
    return ok({ deleted: true });
  });
}
