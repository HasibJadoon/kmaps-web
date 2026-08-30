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

    // The item has to belong to what is being played. Looked up globally, this
    // route was an answer oracle: start a one-item attempt on anything, then
    // post any item id in the bank and read `correct_options` back — including
    // items in somebody's private pack, and every item of a quiz that is live
    // in a room at that moment.
    const item = await queryOne<ScorableItem & { id: string }>(
      env.DB_CORE,
      `SELECT i.id, i.interaction, i.scoring, i.response_json, i.seconds,
              i.points_style, i.speed_bonus
         FROM core_bank_item i
        WHERE i.id = ? AND i.pack_ref = ?`, [itemRef, attempt.pack_ref]);
    if (!item) return notFound(`item ${itemRef} is not in this attempt`);

    // Answered already? Give back what was recorded rather than scoring it
    // again. A dropped connection makes the phone retry, and the honest answer
    // to "I sent this twice" is the first verdict — not a second one that was
    // silently discarded by the unique index while the client was told it had
    // scored.
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

    // Both ends of this are the server's. It used to take `shown_at_ms` from the
    // request body and subtract — so the client chose its own elapsed time and,
    // through the speed bonus, its own score. The comment then claimed the
    // stamps were the server's, and the test asserted it while passing a
    // client-made stamp, which is how it survived review.
    //
    // What the server can vouch for is the gap since the person became free to
    // look at this question: the attempt starting, or their previous answer
    // landing. That is the reading time, and nothing the client sends can move
    // it.
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
                                    pack_ref: string; passed_at: string | null;
                                    finished_at: string | null; score: number | null;
                                    points: number; xp: number }>(
      env.DB_CORE,
      `SELECT id, user_ref, unit_ref, pack_ref, passed_at, finished_at, score, points, xp
         FROM core_bank_attempt WHERE id = ?`, [id]);
    if (!attempt) return notFound(`attempt ${id}`);
    if (attempt.user_ref !== ctx.userId) return forbidden('Not your attempt');
    // Finishing twice used to award the XP twice. `passed_at` was COALESCE-
    // guarded and `core_bank_attempt.xp` is overwritten, but the profile's xp
    // accumulates — so N calls meant N × xp in the profile against 1 × xp in
    // the attempt, two numbers that appear on the same screen.
    if (attempt.finished_at) {
      return ok({ id: attempt.id, score: attempt.score, points: attempt.points,
                  xp: attempt.xp, passed: attempt.passed_at !== null, already: true });
    }

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

  /** How many answers before a rating means anything. */
  const MIN_RATED = 20;

  /** Accuracy in stars. The bands are wider at the bottom because the distance
   *  from 50% to 65% is a real change in what somebody knows, and the distance
   *  from 96% to 98% is mostly which questions came up. */
  const starsFor = (accuracy: number): number =>
    accuracy >= 92 ? 5 : accuracy >= 80 ? 4 : accuracy >= 66 ? 3 : accuracy >= 50 ? 2 : 1;

  /** Everyone, so anyone can be looked up.
   *
   *  The scorecard only knows people who have played, which makes a new
   *  person invisible until their first round — the moment they would most
   *  like to be on the board. This lists the whole room, with the few figures
   *  a card needs, and zeroes for anybody yet to start.
   */
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

  /** One person's career, read the way a cricket profile is read.
   *
   *  The borrowed vocabulary is not decoration — it is a set of questions that
   *  sport worked out long ago and that a learning app usually gets wrong:
   *
   *    innings   a round played through. Rounds, not attempts: walking away
   *              is not an innings and should not drag an average down.
   *    runs      points.
   *    average   runs per innings — the number that says how a person plays,
   *              as against how much they have played. A total rewards the
   *              persistent; an average does not, which is why both are here.
   *    high      the best single round, with what it was and when. A career
   *              total cannot tell you somebody once got everything right.
   *    hundreds  rounds of 100 points or more — a long evening played well.
   *    perfect   rounds where nothing was missed. This is the one that had to
   *              replace cricket's fifty: an innings here is capped by its own
   *              question count, so a half-century was simply average.
   *    form      the last eight innings, most recent first. Form is the one
   *              thing a career total actively hides.
   *    record    W-L-D across matches, and the head-to-head behind it.
   */
  router.get('/core/bank/profile', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const url = new URL(req.url);
    // Anybody's card is readable by anybody. A shared scorecard whose profiles
    // are private is a scoreboard you cannot look up — the point of playing in
    // the same room is being able to see how the others are doing, and every
    // figure here is already visible on the scorecard in aggregate.
    const who = url.searchParams.get('user') ?? ctx.userId;

    const [career, best, form, byApp, rooms, profile] = await Promise.all([
      queryOne(
        env.DB_CORE,
        `SELECT COUNT(*) AS attempts,
                COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END) AS innings,
                COUNT(CASE WHEN passed_at IS NOT NULL THEN 1 END) AS passed,
                COALESCE(SUM(points), 0) AS runs,
                -- Cricket's fifty is worth having because an innings has no
                -- ceiling. A round here does: it is over when its questions
                -- run out, so "fifty" was just an ordinary evening — it fired
                -- on thirteen of fourteen and told you nothing. What is rare
                -- at this scale is a big session and a flawless one, so those
                -- are the two milestones kept.
                COUNT(CASE WHEN finished_at IS NOT NULL AND points >= 100 THEN 1 END) AS hundreds,
                COUNT(CASE WHEN finished_at IS NOT NULL AND score >= 1.0 THEN 1 END) AS perfect,
                MIN(started_at) AS debut,
                MAX(started_at) AS last_played,
                COUNT(DISTINCT date(started_at)) AS days_played
           FROM core_bank_attempt WHERE user_ref = ?`, [who]),
      queryOne(
        env.DB_CORE,
        `SELECT a.points, a.score, a.started_at, u.title AS unit, p.slug AS pack, p.app
           FROM core_bank_attempt a
           JOIN core_bank_unit u ON u.id = a.unit_ref
           JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? AND a.finished_at IS NOT NULL
          ORDER BY a.points DESC, a.started_at ASC LIMIT 1`, [who]),
      query(
        env.DB_CORE,
        `SELECT a.points, a.score, a.passed_at IS NOT NULL AS passed, a.mode,
                a.started_at, u.title AS unit, p.app
           FROM core_bank_attempt a
           JOIN core_bank_unit u ON u.id = a.unit_ref
           JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? AND a.finished_at IS NOT NULL
          ORDER BY a.started_at DESC LIMIT 8`, [who]),
      query(
        env.DB_CORE,
        `SELECT p.app, COUNT(CASE WHEN a.finished_at IS NOT NULL THEN 1 END) AS innings,
                COALESCE(SUM(a.points), 0) AS runs
           FROM core_bank_attempt a JOIN core_bank_pack p ON p.id = a.pack_ref
          WHERE a.user_ref = ? GROUP BY p.app ORDER BY runs DESC`, [who]),
      // Every match this person was in, with what everyone scored — the record
      // and the head-to-head both come out of this one set.
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

    // Who this is. A card headed by a raw id is not a profile anybody can
    // browse, and the name is on the scorecard already.
    const person = await queryOne<{ name: string | null }>(
      env.DB_CORE,
      `SELECT COALESCE(display_name, substr(email, 1, instr(email, '@') - 1), id) AS name
         FROM core_users WHERE id = ?`, [who]);

    const answers = await queryOne<{ answered: number; correct: number }>(
      env.DB_CORE,
      `SELECT COUNT(is_correct) AS answered, COALESCE(SUM(is_correct), 0) AS correct
         FROM core_bank_response WHERE user_ref = ?`, [who]);

    // The record, from the matches above. A draw is a draw for everyone on the
    // top score — the same rule the scorecard uses, stated once here too.
    const matchRows = rooms as Record<string, unknown>[];
    const seen = new Set<string>();
    let won = 0, lost = 0, drew = 0;
    const versus = new Map<string, { played: number; won: number; lost: number; drew: number }>();
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

    const innings = Number((career as Record<string, unknown>)?.['innings'] ?? 0);
    const runs = Number((career as Record<string, unknown>)?.['runs'] ?? 0);
    const answered = Number(answers?.answered ?? 0);
    const correct = Number(answers?.correct ?? 0);
    const accuracy = answered > 0 ? Math.round((100 * correct) / answered) : null;
    const matches = won + lost + drew;

    return ok({
      user_id: who,
      name: person?.name ?? null,
      // True when this person has never played. A card that renders zeroes is
      // right; one that 404s makes an empty profile look like a broken link.
      unplayed: innings === 0 && Number((career as Record<string, unknown>)?.['attempts'] ?? 0) === 0,
      viewer: ctx.userId,
      is_self: who === ctx.userId,
      career: {
        ...(career ?? {}),
        // Kept to one decimal: an average of 47.3 is a real difference from
        // 46.8, and 47.312 is a number pretending to a precision it has not
        // earned off nine innings.
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
        .map(([user_id, head]) => ({ user_id, ...head }))
        .sort((a, b) => b.played - a.played),
      high: best ?? null,
      form,
      by_app: byApp,
      streak: profile ?? null,
    });
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
                                    THEN a.id END) AS rounds,
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
      // The questions the room keeps failing — a gap in the teaching, not in
      // the room, and the reason this is on the scorecard rather than buried.
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
      // ── the record: rounds played, matches, and who won them ──────────────
      //
      // A round is one sitting: an attempt somebody finished. A match is a
      // round other people were in — same room code, two or more players —
      // and its winner is whoever finished it on the most points.
      //
      // A tie is a DRAW, counted on its own and never folded into wins. It was
      // folded in at first, and the scorecard then showed 4 wins from 4 while
      // the same person's own profile read 3-0-1 — two screens disagreeing
      // about one evening. Both now use this rule, stated once.
      //
      // Derived, like everything else here. Nothing writes a win: a match is
      // won by having played it best, and if a round is replayed or a score
      // corrected the record follows without a second table to repair.
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
      // XP and the streak are the two numbers that must NOT be recomputed from
      // attempts: a streak is a claim about days somebody showed up, and it has
      // to survive the deletion of the round that earned it. This is the one
      // documented exception to deriving everything.
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

    // Rounds come off the people query (a finished attempt is a round); the
    // match record is folded in beside it so a client reads one row per person
    // per app and never has to join two lists to draw a card.
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
        draws: Number(own?.['draws'] ?? 0),
        losses: Number(own?.['losses'] ?? 0),
        // Only meaningful once a match has been played; null rather than 0 so
        // a card can say "—" instead of implying someone has lost every game.
        win_pct: matches > 0 ? Math.round((100 * wins) / matches) : null,
        last_match: own?.['last_match'] ?? null,
      };
    });

    // ── the career figure ────────────────────────────────────────────────
    //
    // One row per person, across all three apps: what a profile screen shows.
    // The per-app rows stay beside it, because "you are strong on the path and
    // lose every quiz" is the useful half of a scorecard — but the headline is
    // the total, and a total split three ways is not a total.
    const lifetime = new Map<string, Record<string, unknown>>();
    for (const row of standings) {
      const key = String(row['user_id']);
      const soFar = lifetime.get(key) ?? {
        user_id: key, name: row['name'], points: 0, rounds: 0, matches: 0,
        wins: 0, draws: 0, losses: 0, answered: 0, correct: 0, units_passed: 0,
        apps: [] as string[], last_played: null as string | null,
      };
      for (const field of ['points', 'rounds', 'matches', 'wins', 'draws', 'losses',
                           'answered', 'correct', 'units_passed'] as const) {
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
        // Percentages only once there is something to divide by. Zero of zero
        // is not nought per cent, it is a person who has not started.
        accuracy: Number(row['answered']) > 0
          ? Math.round((100 * Number(row['correct'])) / Number(row['answered'])) : null,
        win_pct: Number(row['matches']) > 0
          ? Math.round((100 * Number(row['wins'])) / Number(row['matches'])) : null,
      }))
      .sort((a, b) => Number(b['points']) - Number(a['points']))
      // ── the standing, and the stars ──────────────────────────────────────
      //
      // Two different questions, deliberately kept apart. RANK answers "who is
      // ahead", and it is points, so it rewards showing up — which is most of
      // what learning is. STARS answer "how well", and they are accuracy, so
      // they cannot be climbed by playing more; a person who answers eighty
      // per cent right keeps four stars whether that is their first week or
      // their fifth year.
      //
      // Collapsing the two would make the star rating a second leaderboard,
      // and then the person furthest ahead would always be the best, which is
      // the one thing a rating is for telling you is not true.
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        top: index === 0 && Number(row['points']) > 0,
        // Withheld until there is enough to judge. Five stars off three lucky
        // answers is worse than no stars: it is a wrong answer to the question
        // the rating was asked.
        stars: Number(row['answered']) >= MIN_RATED
          ? starsFor(Number(row['accuracy'] ?? 0)) : null,
        rating_after: Number(row['answered']) >= MIN_RATED
          ? null : MIN_RATED - Number(row['answered']),
      }));

    return ok({ overall, people: standings, hardest, bank: totals[0] ?? null,
                viewer: ctx.userId });
  });

  /** One room's board — the same ledger, narrowed to a code. */
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
