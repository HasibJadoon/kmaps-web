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
    const packRef = str(body['pack_ref']);
    const roomCode = str(body['room_code']);

    if (!unitRef && !packRef) return badRequest('unit_ref or pack_ref is required');
    if (!unitRef && !roomCode) {
      return badRequest('a round with no unit needs a room_code to be named by');
    }

    const unit = unitRef
      ? await queryOne<{ id: string; pack_ref: string; hearts: number | null }>(
          env.DB_CORE,
          'SELECT id, pack_ref, hearts FROM core_bank_unit WHERE id = ?', [unitRef])
      : null;
    if (unitRef && !unit) return notFound(`unit ${unitRef}`);

    const pack = await queryOne<{ id: string; owner_ref: string | null }>(
      env.DB_CORE,
      'SELECT id, owner_ref FROM core_bank_pack WHERE id = ?',
      [unit?.pack_ref ?? packRef]);
    if (!pack) return notFound(`pack ${packRef}`);

    if (pack.owner_ref && pack.owner_ref !== ctx.userId) return forbidden('Not your pack');

    const mode = str(body['mode']) ?? 'solo';
    if (!['solo', 'live', 'table'].includes(mode)) return badRequest('unknown mode');

    const id = typedId('BAT');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_bank_attempt (id, user_ref, unit_ref, pack_ref, mode, room_code, hearts_left)
       VALUES (?,?,?,?,?,?,?)`,
      [id, ctx.userId, unit?.id ?? null, pack.id, mode, roomCode, unit?.hearts ?? null]);
    return created({ id, unit_ref: unit?.id ?? null, pack_ref: pack.id, mode,
                     room_code: roomCode });
  });

  router.post('/core/bank/attempts/:id/answer', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const attempt = await queryOne<{ id: string; user_ref: string; started_at: string;
                                    pack_ref: string; finished_at: string | null }>(
      env.DB_CORE,
      `SELECT id, user_ref, started_at, pack_ref, finished_at
         FROM core_bank_attempt WHERE id = ?`, [id]);
    if (!attempt) return notFound(`attempt ${id}`);
    if (attempt.user_ref !== ctx.userId) return forbidden('Not your attempt');
    if (attempt.finished_at) return badRequest('That attempt is already finished');

    const body = await readJson(req);
    const itemRef = str(body['item_ref']);
    if (!itemRef) return badRequest('item_ref is required');

    const item = await queryOne<ScorableItem & { id: string }>(
      env.DB_CORE,
      `SELECT i.id, i.interaction, i.scoring, i.response_json, i.seconds,
              i.points_style, i.speed_bonus
         FROM core_bank_item i
        WHERE i.id = ? AND i.pack_ref = ?`, [itemRef, attempt.pack_ref]);
    if (!item) return notFound(`item ${itemRef} is not in this attempt`);

    const prior = await queryOne<{ id: string; is_correct: number | null; credit: number;
                                  points: number; latency_ms: number | null }>(
      env.DB_CORE,
      `SELECT id, is_correct, credit, points, latency_ms
         FROM core_bank_response WHERE attempt_ref = ? AND item_ref = ?`,
      [attempt.id, item.id]);
    if (prior) {
      return ok({
        id: prior.id,
        correct: prior.is_correct === null ? null : prior.is_correct === 1,
        credit: prior.credit, points: prior.points, latency_ms: prior.latency_ms,
        replayed: true,
      });
    }

    const options = await query<ScorableOption>(
      env.DB_CORE,
      `SELECT id, role, is_correct, pair_key, credit, sort_order
         FROM core_bank_item_option WHERE item_ref = ? ORDER BY sort_order`, [itemRef]);

    const previous = await queryOne<{ at: string | null }>(
      env.DB_CORE,
      `SELECT MAX(created_at) AS at FROM core_bank_response WHERE attempt_ref = ?`,
      [attempt.id]);
    const since = Date.parse(previous?.at ?? attempt.started_at);
    const latency = Number.isFinite(since) ? Math.max(0, Date.now() - since) : null;

    const verdict = judge(item, options, body['answer'], latency);

    const responseId = typedId('BRS');
    await execute(
      env.DB_CORE,
      `INSERT INTO core_bank_response
         (id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct,
          credit, latency_ms, points, hinted, respondent_ref, respondent_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (attempt_ref, item_ref) DO NOTHING`,
      [responseId, attempt.id, item.id, ctx.userId, Number(body['seq'] ?? 0),
       body['answer'] === undefined ? null : JSON.stringify(body['answer']),
       verdict.isCorrect === null ? null : (verdict.isCorrect ? 1 : 0),
       verdict.credit, latency, verdict.points, body['hinted'] ? 1 : 0,
       str(body['respondent_ref']), str(body['respondent_name'])]);

    if (verdict.isCorrect !== null) {
      await execute(
        env.DB_CORE,
        `UPDATE core_bank_item
            SET times_shown = times_shown + 1,
                times_correct = times_correct + ?
          WHERE id = ?`,
        [verdict.isCorrect ? 1 : 0, item.id]);
    }

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

      correct_options: options.filter((o) => o.is_correct === 1).map((o) => o.id),

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

  router.post('/core/bank/attempts/:id/finish', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const attempt = await queryOne<{ id: string; user_ref: string;
                                    unit_ref: string | null;
                                    pack_ref: string; passed_at: string | null;
                                    finished_at: string | null; score: number | null;
                                    points: number; xp: number }>(
      env.DB_CORE,
      `SELECT id, user_ref, unit_ref, pack_ref, passed_at, finished_at, score, points, xp
         FROM core_bank_attempt WHERE id = ?`, [id]);
    if (!attempt) return notFound(`attempt ${id}`);
    if (attempt.user_ref !== ctx.userId) return forbidden('Not your attempt');

    if (attempt.finished_at) {
      return ok({ id: attempt.id, score: attempt.score, points: attempt.points,
                  xp: attempt.xp, passed: attempt.passed_at !== null, already: true });
    }

    const unit = attempt.unit_ref
      ? await queryOne<{ pass_threshold: number; xp_award: number }>(
          env.DB_CORE,
          'SELECT pass_threshold, xp_award FROM core_bank_unit WHERE id = ?', [attempt.unit_ref])
      : null;

    const tally = await queryOne<{ scored: number; correct: number; points: number }>(
      env.DB_CORE,
      `SELECT COUNT(is_correct) AS scored,
              COALESCE(SUM(is_correct), 0) AS correct,
              COALESCE(SUM(points), 0) AS points
         FROM core_bank_response WHERE attempt_ref = ?`, [attempt.id]);

    const scored = Number(tally?.scored ?? 0);
    const score = scored > 0 ? Number(tally?.correct ?? 0) / scored : null;
    const threshold = Number(unit?.pass_threshold ?? 1);
    const passed = attempt.unit_ref === null ? false
                 : scored === 0 ? true : (score ?? 0) >= threshold;
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

  const MIN_RATED = 20;

  const starsFor = (accuracy: number): number =>
    accuracy >= 92 ? 5 : accuracy >= 80 ? 4 : accuracy >= 66 ? 3 : accuracy >= 50 ? 2 : 1;

  router.get('/core/bank/people', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const people = await query(
      env.DB_CORE,
      `SELECT u.id AS user_id,
              COALESCE(u.display_name, substr(u.email, 1, instr(u.email, '@') - 1), u.id) AS name,
              COALESCE(a.rounds, 0) AS rounds,
              COALESCE(a.points, 0) AS points,
              a.last_played
         FROM core_users u
         LEFT JOIN (SELECT user_ref,
                           COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END) AS rounds,
                           COALESCE(SUM(points), 0) AS points,
                           MAX(started_at) AS last_played
                      FROM core_bank_attempt GROUP BY user_ref) a ON a.user_ref = u.id
        ORDER BY points DESC, name`, []);
    return ok({ people, viewer: ctx.userId });
  });

  router.get('/core/bank/profile', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);

    const who = url.searchParams.get('user') ?? ctx.userId;

    const [career, best, form, byApp, rooms, profile] = await Promise.all([
      queryOne(
        env.DB_CORE,
        // The Table app is not scored, and must not be averaged either.
        //
        // A conversation evening was landing here as an innings worth nought:
        // it does not just fail to help, it drags the average down, so the
        // person who sits and talks the most looks like the worst player. An
        // evening at the table is not a bad innings — it is not an innings.
        //
        // Counted separately as `conversations`, which is the honest figure:
        // how often somebody showed up to talk.
        `SELECT COUNT(*) AS attempts,
                COUNT(CASE WHEN a.finished_at IS NOT NULL
                            AND p.app != 'table' THEN 1 END) AS innings,
                COUNT(CASE WHEN a.finished_at IS NOT NULL
                            AND p.app = 'table' THEN 1 END) AS conversations,
                COUNT(CASE WHEN passed_at IS NOT NULL THEN 1 END) AS passed,
                COALESCE(SUM(CASE WHEN p.app != 'table' THEN points END), 0) AS runs,
                -- Cricket's fifty is worth having because an innings has no
                -- ceiling. A round here does: it is over when its questions
                -- run out, so "fifty" was just an ordinary evening — it fired
                -- on thirteen of fourteen and told you nothing. What is rare
                -- at this scale is a big session and a flawless one, so those
                -- are the two milestones kept.
                COUNT(CASE WHEN a.finished_at IS NOT NULL AND p.app != 'table'
                            AND points >= 100 THEN 1 END) AS hundreds,
                COUNT(CASE WHEN a.finished_at IS NOT NULL AND p.app != 'table'
                            AND score >= 1.0 THEN 1 END) AS perfect,
                MIN(started_at) AS debut,
                MAX(started_at) AS last_played,
                COUNT(DISTINCT date(started_at)) AS days_played
           FROM core_bank_attempt a
           JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ?`, [who]),
      queryOne(
        env.DB_CORE,
        `SELECT a.points, a.score, a.started_at, u.title AS unit, p.slug AS pack, p.app
           FROM core_bank_attempt a
           JOIN core_bank_unit u ON u.id = a.unit_ref
           JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? AND a.finished_at IS NOT NULL AND p.app != 'table'
          ORDER BY a.points DESC, a.started_at ASC LIMIT 1`, [who]),
      query(
        env.DB_CORE,
        `SELECT a.points, a.score, a.passed_at IS NOT NULL AS passed, a.mode,
                a.started_at, u.title AS unit, p.app
           FROM core_bank_attempt a
           JOIN core_bank_unit u ON u.id = a.unit_ref
           JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? AND a.finished_at IS NOT NULL AND p.app != 'table'
          ORDER BY a.started_at DESC LIMIT 8`, [who]),
      query(
        env.DB_CORE,
        `SELECT p.app, COUNT(CASE WHEN a.finished_at IS NOT NULL THEN 1 END) AS innings,
                COALESCE(SUM(a.points), 0) AS runs
           FROM core_bank_attempt a JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? GROUP BY p.app ORDER BY runs DESC`, [who]),

      query(
        env.DB_CORE,
        `WITH played AS (
           SELECT a.room_code, a.user_ref, SUM(a.points) AS points
             FROM core_bank_attempt a
            WHERE a.room_code IS NOT NULL AND a.finished_at IS NOT NULL
            GROUP BY a.room_code, a.user_ref),
         mine AS (SELECT room_code, points FROM played WHERE user_ref = ?)
         SELECT pl.room_code, pl.user_ref, pl.points, m.points AS my_points,
                (SELECT MAX(points) FROM played x WHERE x.room_code = pl.room_code) AS best,
                (SELECT COUNT(DISTINCT user_ref) FROM played x
                  WHERE x.room_code = pl.room_code) AS players
           FROM played pl JOIN mine m ON m.room_code = pl.room_code`, [who]),
      queryOne(
        env.DB_CORE,
        `SELECT COALESCE(SUM(xp), 0) AS xp, COALESCE(MAX(streak_days), 0) AS streak_days,
                COALESCE(MAX(longest_streak), 0) AS longest_streak, MAX(last_active_on) AS last_active_on
           FROM core_bank_profile WHERE user_ref = ?`, [who]),
    ]);

    const person = await queryOne<{ name: string | null }>(
      env.DB_CORE,
      `SELECT COALESCE(display_name, substr(email, 1, instr(email, '@') - 1), id) AS name
         FROM core_users WHERE id = ?`, [who]);

    const answers = await queryOne<{ answered: number; correct: number }>(
      env.DB_CORE,
      `SELECT COUNT(is_correct) AS answered, COALESCE(SUM(is_correct), 0) AS correct
         FROM core_bank_response WHERE user_ref = ?`, [who]);

    const matchRows = rooms as Record<string, unknown>[];
    const seen = new Set<string>();
    let won = 0, lost = 0, drew = 0;
    const versus = new Map<string, { played: number; won: number; lost: number; drew: number }>();
    const nameOf = new Map<string, string>();
    for (const row of matchRows) {
      const room = String(row['room_code']);
      const players = Number(row['players']);
      if (players < 2) continue;
      if (!seen.has(room)) {
        seen.add(room);
        const mine = Number(row['my_points']);
        const best = Number(row['best']);
        const sharers = matchRows.filter(
          (r) => String(r['room_code']) === room && Number(r['points']) === best).length;
        if (mine < best) lost++;
        else if (sharers > 1) drew++;
        else won++;
      }
      const other = String(row['user_ref']);
      if (other === who) continue;
      const head = versus.get(other) ?? { played: 0, won: 0, lost: 0, drew: 0 };
      head.played++;
      const mine = Number(row['my_points']);
      const theirs = Number(row['points']);
      if (mine > theirs) head.won++; else if (mine < theirs) head.lost++; else head.drew++;
      versus.set(other, head);
    }

    const opponents = [...versus.keys()];
    if (opponents.length) {
      const rows = await query<{ id: string; name: string | null }>(
        env.DB_CORE,
        `SELECT id, COALESCE(display_name, substr(email, 1, instr(email, '@') - 1), id) AS name
           FROM core_users WHERE id IN (${opponents.map(() => '?').join(',')})`,
        opponents);
      for (const row of rows) nameOf.set(row.id, row.name ?? row.id);
    }

    const innings = Number((career as Record<string, unknown>)?.['innings'] ?? 0);
    const runs = Number((career as Record<string, unknown>)?.['runs'] ?? 0);
    const answered = Number(answers?.answered ?? 0);
    const correct = Number(answers?.correct ?? 0);
    const accuracy = answered > 0 ? Math.round((100 * correct) / answered) : null;
    const matches = won + lost + drew;

    return ok({
      user_id: who,
      name: person?.name ?? null,

      unplayed: innings === 0 && Number((career as Record<string, unknown>)?.['attempts'] ?? 0) === 0,
      viewer: ctx.userId,
      is_self: who === ctx.userId,
      career: {
        ...(career ?? {}),

        average: innings > 0 ? Math.round((10 * runs) / innings) / 10 : null,
        accuracy,
        answered,
        correct,
        stars: answered >= MIN_RATED ? starsFor(accuracy ?? 0) : null,
        rating_after: answered >= MIN_RATED ? null : MIN_RATED - answered,
      },
      record: { matches, won, lost, drew,
                win_pct: matches > 0 ? Math.round((100 * won) / matches) : null },
      versus: [...versus.entries()]
        .map(([user_id, head]) => ({ user_id, name: nameOf.get(user_id) ?? null, ...head }))
        .sort((a, b) => b.played - a.played),
      high: best ?? null,
      form,
      by_app: byApp,
      streak: profile ?? null,
    });
  });

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

    const [people, hardest, record, profiles, totals] = await Promise.all([
      query(
        env.DB_CORE,
        `SELECT a.user_ref AS user_id,
                -- Everyone can see everyone here, so this is read by people who
                -- are not the account holder: the display name if there is
                -- one, otherwise the part of the address before the @. A
                -- scoreboard does not need to hand out mailboxes.
                COALESCE(u.display_name, substr(u.email, 1, instr(u.email, '@') - 1), u.id) AS name,
                p.app,
                COUNT(DISTINCT a.id) AS attempts,
                -- A round is a sitting somebody saw through. An attempt they
                -- walked away from is not a round and should not read as one.
                COUNT(DISTINCT CASE WHEN a.finished_at IS NOT NULL
                                     AND p.app != 'table' THEN a.id END) AS rounds,
                -- Recorded, never ranked. The Table app has no score by
                -- design, so its evenings are counted on their own rather
                -- than folded into a number people compare.
                COUNT(DISTINCT CASE WHEN a.finished_at IS NOT NULL
                                     AND p.app = 'table' THEN a.id END) AS conversations,
                COUNT(DISTINCT CASE WHEN a.passed_at IS NOT NULL THEN a.unit_ref END) AS units_passed,
                COALESCE(SUM(a.points), 0) AS points,
                COALESCE(SUM(a.xp), 0) AS xp,
                COALESCE(SUM(r.answered), 0) AS answered,
                COALESCE(SUM(r.correct), 0) AS correct,
                MAX(a.started_at) AS last_played
           FROM core_bank_attempt a
           JOIN core_bank_pack p ON p.id = a.pack_ref
           -- Folded to one row per attempt BEFORE the join. Joining the
           -- responses directly fanned each attempt out into one row per
           -- answer, and SUM(a.points) then counted the attempt's points once
           -- per answer — six answers made 2,000 points read as 12,000 on the
           -- shared scorecard, which is the one number people compare.
           LEFT JOIN (SELECT attempt_ref,
                             COUNT(is_correct) AS answered,
                             COALESCE(SUM(is_correct), 0) AS correct
                        FROM core_bank_response
                       GROUP BY attempt_ref) r ON r.attempt_ref = a.id
           LEFT JOIN core_users u ON u.id = a.user_ref
          ${where}
          GROUP BY a.user_ref, p.app
          ORDER BY points DESC`,
        params),

      query(
        env.DB_CORE,
        `SELECT i.id, i.slug, i.prompt_en, i.prompt_ar, i.module, i.surah, i.step_key,
                COUNT(r.id) AS asked,
                COALESCE(SUM(r.is_correct), 0) AS correct,
                ROUND(100.0 * COALESCE(SUM(r.is_correct), 0) / COUNT(r.id)) AS pct,
                (SELECT COUNT(*) FROM core_bank_item_feedback f
                  WHERE f.item_ref = i.id AND f.flag IS NOT NULL) AS flags,
                -- The stars people gave the question, as against the score it
                -- gave them. A question everybody fails AND nobody rates is a
                -- bad question; one everybody fails and rates highly is a hard
                -- one, and those are opposite problems.
                (SELECT ROUND(AVG(f.rating), 1) FROM core_bank_item_feedback f
                  WHERE f.item_ref = i.id AND f.rating IS NOT NULL) AS stars,
                (SELECT COUNT(*) FROM core_bank_item_feedback f
                  WHERE f.item_ref = i.id AND f.rating IS NOT NULL) AS ratings
           FROM core_bank_response r
           JOIN core_bank_item i ON i.id = r.item_ref
          WHERE r.is_correct IS NOT NULL
          GROUP BY i.id
         HAVING asked >= 2
          ORDER BY pct ASC, asked DESC
          LIMIT 20`, []),

      query(
        env.DB_CORE,
        `WITH played AS (
           SELECT a.room_code, a.user_ref, p.app,
                  SUM(a.points) AS points, MAX(a.finished_at) AS ended
             FROM core_bank_attempt a
             JOIN core_bank_pack p ON p.id = a.pack_ref
            WHERE a.room_code IS NOT NULL AND a.finished_at IS NOT NULL
              ${conds.length ? 'AND ' + conds.join(' AND ') : ''}
            GROUP BY a.room_code, a.user_ref, p.app
         ),
         sized AS (
           SELECT room_code, COUNT(DISTINCT user_ref) AS players, MAX(points) AS best
             FROM played GROUP BY room_code
         ),
         -- How many finished level at the top: one is a win, more is a draw.
         shared AS (
           SELECT pl.room_code, COUNT(*) AS at_best
             FROM played pl JOIN sized s ON s.room_code = pl.room_code
            WHERE pl.points = s.best
            GROUP BY pl.room_code
         )
         SELECT pl.user_ref AS user_id, pl.app,
                COUNT(*) AS matches,
                SUM(CASE WHEN pl.points = s.best AND sh.at_best = 1 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN pl.points = s.best AND sh.at_best > 1 THEN 1 ELSE 0 END) AS draws,
                SUM(CASE WHEN pl.points < s.best THEN 1 ELSE 0 END) AS losses,
                MAX(pl.ended) AS last_match
           FROM played pl
           JOIN sized s ON s.room_code = pl.room_code
           JOIN shared sh ON sh.room_code = pl.room_code
          WHERE s.players > 1
          GROUP BY pl.user_ref, pl.app`,
        params),

      query(
        env.DB_CORE,
        `SELECT pr.user_ref AS user_id,
                COALESCE(SUM(pr.xp), 0) AS xp,
                COALESCE(MAX(pr.streak_days), 0) AS streak_days,
                COALESCE(MAX(pr.longest_streak), 0) AS longest_streak,
                MAX(pr.last_active_on) AS last_active_on
           FROM core_bank_profile pr
          GROUP BY pr.user_ref`, []),
      query<{ packs: number; items: number; attempts: number; responses: number }>(
        env.DB_CORE,
        `SELECT (SELECT COUNT(*) FROM core_bank_pack WHERE status = 'live') AS packs,
                (SELECT COUNT(*) FROM core_bank_item WHERE status = 'live') AS items,
                (SELECT COUNT(*) FROM core_bank_attempt) AS attempts,
                (SELECT COUNT(*) FROM core_bank_response) AS responses`, []),
    ]);

    const recordFor = new Map<string, Record<string, unknown>>();
    for (const row of record as Record<string, unknown>[]) {
      recordFor.set(`${row['user_id']}\u0000${row['app']}`, row);
    }
    const standings: Record<string, unknown>[] = (people as Record<string, unknown>[]).map((person) => {
      const own = recordFor.get(`${person['user_id']}\u0000${person['app']}`);
      const matches = Number(own?.['matches'] ?? 0);
      const wins = Number(own?.['wins'] ?? 0);
      return {
        ...person,
        matches,
        wins,
        conversations: Number(person['conversations'] ?? 0),
        draws: Number(own?.['draws'] ?? 0),
        losses: Number(own?.['losses'] ?? 0),

        win_pct: matches > 0 ? Math.round((100 * wins) / matches) : null,
        last_match: own?.['last_match'] ?? null,
      };
    });

    const lifetime = new Map<string, Record<string, unknown>>();
    for (const row of standings) {
      const key = String(row['user_id']);
      const soFar = lifetime.get(key) ?? {
        user_id: key, name: row['name'], points: 0, rounds: 0, conversations: 0,
        matches: 0, wins: 0, draws: 0, losses: 0, answered: 0, correct: 0,
        units_passed: 0,
        apps: [] as string[], last_played: null as string | null,
      };
      for (const field of ['points', 'rounds', 'conversations', 'matches', 'wins',
                           'draws', 'losses', 'answered', 'correct',
                           'units_passed'] as const) {
        soFar[field] = Number(soFar[field]) + Number(row[field] ?? 0);
      }
      (soFar['apps'] as string[]).push(String(row['app']));
      const seen = row['last_played'] as string | null;
      if (seen && (!soFar['last_played'] || seen > String(soFar['last_played']))) {
        soFar['last_played'] = seen;
      }
      lifetime.set(key, soFar);
    }
    for (const row of profiles as Record<string, unknown>[]) {
      const own = lifetime.get(String(row['user_id']));
      if (own) Object.assign(own, {
        xp: Number(row['xp'] ?? 0),
        streak_days: Number(row['streak_days'] ?? 0),
        longest_streak: Number(row['longest_streak'] ?? 0),
        last_active_on: row['last_active_on'] ?? null,
      });
    }
    const overall: Record<string, unknown>[] = [...lifetime.values()]
      .map((row): Record<string, unknown> => ({
        ...row,
        xp: Number(row['xp'] ?? 0),
        streak_days: Number(row['streak_days'] ?? 0),
        longest_streak: Number(row['longest_streak'] ?? 0),

        accuracy: Number(row['answered']) > 0
          ? Math.round((100 * Number(row['correct'])) / Number(row['answered'])) : null,
        win_pct: Number(row['matches']) > 0
          ? Math.round((100 * Number(row['wins'])) / Number(row['matches'])) : null,
      }))
      .sort((a, b) => Number(b['points']) - Number(a['points']))

      .map((row, index) => ({
        ...row,
        rank: index + 1,
        top: index === 0 && Number(row['points']) > 0,

        stars: Number(row['answered']) >= MIN_RATED
          ? starsFor(Number(row['accuracy'] ?? 0)) : null,
        rating_after: Number(row['answered']) >= MIN_RATED
          ? null : MIN_RATED - Number(row['answered']),
      }));

    return ok({ overall, people: standings, hardest, bank: totals[0] ?? null,
                viewer: ctx.userId });
  });

  router.get('/core/bank/rooms/:code', async (req, env, { code }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const board = await query(
      env.DB_CORE,
      `SELECT a.user_ref AS user_id,
              -- Everyone can see everyone here, so this is read by people who
                -- are not the account holder: the display name if there is
                -- one, otherwise the part of the address before the @. A
                -- scoreboard does not need to hand out mailboxes.
                COALESCE(u.display_name, substr(u.email, 1, instr(u.email, '@') - 1), u.id) AS name,
              COALESCE(SUM(a.points), 0) AS points,
              COALESCE(SUM(r.answered), 0) AS answered,
              COALESCE(SUM(r.correct), 0) AS correct,
              ROUND(AVG(r.avg_ms)) AS avg_ms
         FROM core_bank_attempt a
         -- Folded to one row per attempt before the join, for the same reason
         -- /core/bank/scores is: joining the responses directly multiplies
         -- SUM(a.points) by the number of answers in the attempt. That fix was
         -- made on the scorecard and not here, so the room board and the
         -- scorecard reported different totals for the same evening.
         LEFT JOIN (SELECT attempt_ref,
                           COUNT(is_correct) AS answered,
                           COALESCE(SUM(is_correct), 0) AS correct,
                           AVG(latency_ms) AS avg_ms
                      FROM core_bank_response
                     GROUP BY attempt_ref) r ON r.attempt_ref = a.id
         LEFT JOIN core_users u ON u.id = a.user_ref
        WHERE a.room_code = ?
        GROUP BY a.user_ref
        ORDER BY points DESC, correct DESC`,
      [code.toUpperCase()]);
    return ok({ code: code.toUpperCase(), board });
  });
}
