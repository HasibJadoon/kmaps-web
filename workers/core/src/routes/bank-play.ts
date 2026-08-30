// ─── /core/bank/play/* — what people actually did ─────────────────────────────
//
//   POST /core/bank/attempts                  — start a play of a unit
//   POST /core/bank/attempts/:id/answer       — answer one item, scored here
//   POST /core/bank/attempts/:id/finish       — close it, decide the pass
//   POST /core/bank/items/:id/feedback        — rate the QUESTION
//   GET  /core/bank/scores                    — the shared scorecard
//   GET  /core/bank/rooms/:code               — one room's board
//
// Everything is scored on the server, from the item's own rule, against a
// server clock. The client sends what the person picked and nothing else — no
// correctness, no elapsed, no points.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound, forbidden } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';
import { judge, type ScorableItem, type ScorableOption } from '../bank/score';

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown> : {};
  } catch { return {}; }
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export function bankPlayRoutes(router: Router<CoreEnv>): void {
  router.post('/core/bank/attempts', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const unitRef = str(body['unit_ref']);
    if (!unitRef) return badRequest('unit_ref is required');

    const unit = await queryOne<{ id: string; pack_ref: string; hearts: number | null }>(
      env.DB_CORE,
      'SELECT id, pack_ref, hearts FROM core_bank_unit WHERE id = ?', [unitRef]);
    if (!unit) return notFound(`unit ${unitRef}`);

    const mode = str(body['mode']) ?? 'solo';
    if (!['solo', 'live', 'table'].includes(mode)) return badRequest('unknown mode');

    const id = typedId('BAT');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_bank_attempt (id, user_ref, unit_ref, pack_ref, mode, room_code, hearts_left)
       VALUES (?,?,?,?,?,?,?)`,
      [id, ctx.userId, unit.id, unit.pack_ref, mode, str(body['room_code']), unit.hearts]);
    return created({ id, unit_ref: unit.id, pack_ref: unit.pack_ref, mode });
  });

  /** One answer. The server decides whether it was right, how long it took and
   *  what it is worth — none of those are things the client may say. */
  router.post('/core/bank/attempts/:id/answer', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const attempt = await queryOne<{ id: string; user_ref: string; started_at: string;
                                    finished_at: string | null }>(
      env.DB_CORE,
      'SELECT id, user_ref, started_at, finished_at FROM core_bank_attempt WHERE id = ?', [id]);
    if (!attempt) return notFound(`attempt ${id}`);
    if (attempt.user_ref !== ctx.userId) return forbidden('Not your attempt');
    if (attempt.finished_at) return badRequest('That attempt is already finished');

    const body = await readJson(req);
    const itemRef = str(body['item_ref']);
    if (!itemRef) return badRequest('item_ref is required');

    const item = await queryOne<ScorableItem & { id: string }>(
      env.DB_CORE,
      `SELECT id, interaction, scoring, response_json, seconds, points_style, speed_bonus
         FROM core_bank_item WHERE id = ?`, [itemRef]);
    if (!item) return notFound(`item ${itemRef}`);

    const options = await query<ScorableOption>(
      env.DB_CORE,
      `SELECT id, role, is_correct, pair_key, credit, sort_order
         FROM core_bank_item_option WHERE item_ref = ? ORDER BY sort_order`, [itemRef]);

    // Measured from when the item was SHOWN if the caller says so, else from
    // when the attempt began. Either way the stamps are the server's.
    const shownAt = Number(body['shown_at_ms'] ?? 0);
    const latency = shownAt > 0
      ? Math.max(0, Date.now() - shownAt)
      : null;

    const verdict = judge(item, options, body['answer'], latency);

    const responseId = typedId('BRS');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_bank_response
         (id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct,
          credit, latency_ms, points, hinted, respondent_ref, respondent_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [responseId, attempt.id, item.id, ctx.userId, Number(body['seq'] ?? 0),
       body['answer'] === undefined ? null : JSON.stringify(body['answer']),
       verdict.isCorrect === null ? null : (verdict.isCorrect ? 1 : 0),
       verdict.credit, latency, verdict.points, body['hinted'] ? 1 : 0,
       str(body['respondent_ref']), str(body['respondent_name'])]);

    // The item learns about itself. This is what lets the bank find its own bad
    // questions later, without anybody having to report one.
    if (verdict.isCorrect !== null) {
      await execute(
        env.DB_CORE,
        `UPDATE core_bank_item
            SET times_shown = times_shown + 1,
                times_correct = times_correct + ?
          WHERE id = ?`,
        [verdict.isCorrect ? 1 : 0, item.id]);
    }

    // The teaching travels with the verdict, not with the question. This is
    // the only moment it is safe to send and the only moment it is read.
    const chosen = new Set(
      Array.isArray(body['answer']) ? body['answer'].map(String)
        : typeof body['answer'] === 'string' ? [String(body['answer'])] : []);
    const explain = await queryOne<{ explanation_en: string | null;
                                    explanation_ar: string | null;
                                    explanation_ur: string | null }>(
      env.DB_CORE,
      `SELECT explanation_en, explanation_ar, explanation_ur
         FROM core_bank_item WHERE id = ?`, [item.id]);

    return created({
      id: responseId,
      correct: verdict.isCorrect,
      credit: verdict.credit,
      points: verdict.points,
      latency_ms: latency,
      // Which options were right, so the screen can show them — after the
      // answer is in, and never before.
      correct_options: options.filter((o) => o.is_correct === 1).map((o) => o.id),
      // Why the one they picked was wrong, when it was.
      why_wrong: verdict.isCorrect === false
        ? await query<Record<string, unknown>>(
            env.DB_CORE,
            `SELECT id, why_wrong_en, why_wrong_ar, why_wrong_ur
               FROM core_bank_item_option
              WHERE item_ref = ? AND is_correct = 0`, [item.id])
            .then((rows) => rows.filter((r) => chosen.has(String(r['id']))))
        : [],
      explanation_en: explain?.explanation_en ?? null,
      explanation_ar: explain?.explanation_ar ?? null,
      explanation_ur: explain?.explanation_ur ?? null,
    });
  });

  /** Close the attempt and decide the pass, once. */
  router.post('/core/bank/attempts/:id/finish', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const attempt = await queryOne<{ id: string; user_ref: string; unit_ref: string;
                                    pack_ref: string; passed_at: string | null }>(
      env.DB_CORE,
      `SELECT id, user_ref, unit_ref, pack_ref, passed_at
         FROM core_bank_attempt WHERE id = ?`, [id]);
    if (!attempt) return notFound(`attempt ${id}`);
    if (attempt.user_ref !== ctx.userId) return forbidden('Not your attempt');

    const unit = await queryOne<{ pass_threshold: number; xp_award: number }>(
      env.DB_CORE,
      'SELECT pass_threshold, xp_award FROM core_bank_unit WHERE id = ?', [attempt.unit_ref]);

    // Scored responses only: a round of conversation cards has no score, and
    // dividing by zero scored answers would make an evening look like a failure.
    const tally = await queryOne<{ scored: number; correct: number; points: number }>(
      env.DB_CORE,
      `SELECT COUNT(is_correct) AS scored,
              COALESCE(SUM(is_correct), 0) AS correct,
              COALESCE(SUM(points), 0) AS points
         FROM core_bank_response WHERE attempt_ref = ?`, [attempt.id]);

    const scored = Number(tally?.scored ?? 0);
    const score = scored > 0 ? Number(tally?.correct ?? 0) / scored : null;
    const threshold = Number(unit?.pass_threshold ?? 1);
    const passed = scored === 0 ? true : (score ?? 0) >= threshold;
    const xp = passed ? Number(unit?.xp_award ?? 10) : 0;

    await execute(
      env.DB_CORE,
      `UPDATE core_bank_attempt
          SET finished_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
              score = ?, points = ?, xp = ?,
              passed_at = COALESCE(passed_at, CASE WHEN ? THEN
                            strftime('%Y-%m-%dT%H:%M:%SZ','now') ELSE NULL END)
        WHERE id = ?`,
      [score, Number(tally?.points ?? 0), xp, passed ? 1 : 0, attempt.id]);

    if (xp > 0) {
      await execute(
        env.DB_CORE,
        `INSERT INTO core_bank_profile (user_ref, pack_ref, xp, streak_days, last_active_on)
         VALUES (?, ?, ?, 1, date('now'))
         ON CONFLICT (user_ref, pack_ref) DO UPDATE SET
           xp = xp + excluded.xp,
           -- A day later continues the streak; the same day leaves it; a gap
           -- starts again at one.
           streak_days = CASE
             WHEN core_bank_profile.last_active_on = date('now') THEN core_bank_profile.streak_days
             WHEN core_bank_profile.last_active_on = date('now','-1 day') THEN core_bank_profile.streak_days + 1
             ELSE 1 END,
           longest_streak = MAX(core_bank_profile.longest_streak, CASE
             WHEN core_bank_profile.last_active_on = date('now') THEN core_bank_profile.streak_days
             WHEN core_bank_profile.last_active_on = date('now','-1 day') THEN core_bank_profile.streak_days + 1
             ELSE 1 END),
           last_active_on = date('now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
        [ctx.userId, attempt.pack_ref, xp]);
    }

    return ok({ id: attempt.id, score, points: Number(tally?.points ?? 0), xp, passed });
  });

  /** Rate the question, not the person. */
  router.post('/core/bank/items/:id/feedback', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    const rating = body['rating'] === undefined ? null : Number(body['rating']);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return badRequest('rating must be 1..5');
    }
    await execute(
      env.DB_CORE,
      `INSERT INTO core_bank_item_feedback (id, item_ref, user_ref, rating, flag, note)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT (item_ref, user_ref) DO UPDATE SET
         rating = excluded.rating, flag = excluded.flag, note = excluded.note,
         created_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
      [typedId('BFB'), id, ctx.userId, rating, str(body['flag']), str(body['note'])]);
    return created({ item_ref: id });
  });

  /** The shared scorecard: everybody, across the three apps, from one ledger.
   *
   *  This is the query the whole design exists for. Because every play of every
   *  app writes the same two rows, "how is everyone doing" is one GROUP BY
   *  rather than a union of three tables that count different things. */
  router.get('/core/bank/scores', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    const app = url.searchParams.get('app');
    const packSlug = url.searchParams.get('pack');
    const since = url.searchParams.get('since');

    const conds: string[] = [];
    const params: unknown[] = [];
    if (app) { conds.push('p.app = ?'); params.push(app); }
    if (packSlug) { conds.push('p.slug = ?'); params.push(packSlug); }
    if (since) { conds.push('a.started_at >= ?'); params.push(since); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [people, hardest, totals] = await Promise.all([
      query(
        env.DB_CORE,
        `SELECT a.user_ref AS user_id,
                COALESCE(u.display_name, u.email) AS name,
                p.app,
                COUNT(DISTINCT a.id) AS attempts,
                COUNT(DISTINCT CASE WHEN a.passed_at IS NOT NULL THEN a.unit_ref END) AS units_passed,
                COALESCE(SUM(a.points), 0) AS points,
                COALESCE(SUM(a.xp), 0) AS xp,
                COUNT(r.is_correct) AS answered,
                COALESCE(SUM(r.is_correct), 0) AS correct,
                MAX(a.started_at) AS last_played
           FROM core_bank_attempt a
           JOIN core_bank_pack p ON p.id = a.pack_ref
           LEFT JOIN core_bank_response r ON r.attempt_ref = a.id
           LEFT JOIN core_users u ON u.id = a.user_ref
          ${where}
          GROUP BY a.user_ref, p.app
          ORDER BY points DESC`,
        params),
      // The questions the room keeps failing — a gap in the teaching, not in
      // the room, and the reason this is on the scorecard rather than buried.
      query(
        env.DB_CORE,
        `SELECT i.id, i.slug, i.prompt_en, i.prompt_ar, i.module, i.surah, i.step_key,
                COUNT(r.id) AS asked,
                COALESCE(SUM(r.is_correct), 0) AS correct,
                ROUND(100.0 * COALESCE(SUM(r.is_correct), 0) / COUNT(r.id)) AS pct,
                (SELECT COUNT(*) FROM core_bank_item_feedback f
                  WHERE f.item_ref = i.id AND f.flag IS NOT NULL) AS flags
           FROM core_bank_response r
           JOIN core_bank_item i ON i.id = r.item_ref
          WHERE r.is_correct IS NOT NULL
          GROUP BY i.id
         HAVING asked >= 2
          ORDER BY pct ASC, asked DESC
          LIMIT 20`, []),
      query<{ packs: number; items: number; attempts: number; responses: number }>(
        env.DB_CORE,
        `SELECT (SELECT COUNT(*) FROM core_bank_pack WHERE status = 'live') AS packs,
                (SELECT COUNT(*) FROM core_bank_item WHERE status = 'live') AS items,
                (SELECT COUNT(*) FROM core_bank_attempt) AS attempts,
                (SELECT COUNT(*) FROM core_bank_response) AS responses`, []),
    ]);

    return ok({ people, hardest, bank: totals[0] ?? null, viewer: ctx.userId });
  });

  /** One room's board — the same ledger, narrowed to a code. */
  router.get('/core/bank/rooms/:code', async (req, env, { code }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const board = await query(
      env.DB_CORE,
      `SELECT a.user_ref AS user_id,
              COALESCE(u.display_name, u.email) AS name,
              COALESCE(SUM(a.points), 0) AS points,
              COUNT(r.is_correct) AS answered,
              COALESCE(SUM(r.is_correct), 0) AS correct,
              ROUND(AVG(r.latency_ms)) AS avg_ms
         FROM core_bank_attempt a
         LEFT JOIN core_bank_response r ON r.attempt_ref = a.id
         LEFT JOIN core_users u ON u.id = a.user_ref
        WHERE a.room_code = ?
        GROUP BY a.user_ref
        ORDER BY points DESC, correct DESC`,
      [code.toUpperCase()]);
    return ok({ code: code.toUpperCase(), board });
  });
}
