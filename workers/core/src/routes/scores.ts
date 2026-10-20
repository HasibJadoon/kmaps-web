import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { SrsRepo } from '../repositories/srs.repo';

// ── Scores as an Atlas ──────────────────────────────────────────────────────
//
//   GET /core/scores/atlas   every board that scores: the reader's own figures, their rank, and the
//                            standings — each person measured from their own record and nobody's else.
//
// What a board is (its name, colour, figures, the one that leads) is core_app_label (043); how each
// figure is counted is here, one measure per board. A 'device' board (practice) is counted on the
// learner's device and comes back with its words alone.

type Figures = Record<string, number | null>;
interface Row { userId: string; name: string; figures: Figures }
interface LabelRow {
  scope: string; key: string; parent: string | null; label: string; label_ar: string | null;
  detail: string | null; icon: string | null; color: string | null; extra_json: string | null; sort: number;
}

/** What a person is called on a board everyone sees: their name, never their mailbox. */
const NAME = `COALESCE(NULLIF(u.display_name, ''), substr(u.email, 1, instr(u.email, '@') - 1), u.id)`;

/** Who is on a board: active people — a test account (its mail at test.com) never stands among them. */
const PLAYER = `u.account_status = 'active' AND u.email NOT LIKE '%@test.com'`;

const num = (v: unknown): number | null => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/** Each board's measure: every active person with a record on it, their figures by metric. */
const MEASURES: Record<string, (env: CoreEnv) => Promise<Row[]>> = {
  // the classes each person has studied, from their own class records
  study: async (env) => (await query<Record<string, unknown>>(env.DB_CORE,
    `SELECT u.id AS user_id, ${NAME} AS name,
            SUM(c.status = 'studied') AS studied,
            COALESCE(SUM(CASE WHEN c.status = 'studied' THEN c.rating END), 0) AS stars,
            ROUND(AVG(CASE WHEN c.status = 'studied' THEN c.score END)) AS score,
            COALESCE(SUM(c.active_days), 0) AS days,
            SUM(c.status = 'in_progress') AS under_way
       FROM core_drill_class c JOIN core_users u ON u.id = c.user_ref
      WHERE ${PLAYER}
      GROUP BY u.id ORDER BY studied DESC, stars DESC, score DESC, days ASC`))
    .map((r) => ({ userId: String(r.user_id), name: String(r.name),
                   figures: { studied: num(r.studied), stars: num(r.stars), score: num(r.score), days: num(r.days), under_way: num(r.under_way) } })),

  // what each person holds in their own review: a card is mastered when its interval is three weeks
  review: async (env) => (await query<Record<string, unknown>>(env.DB_CORE,
    `SELECT u.id AS user_id, ${NAME} AS name, COUNT(c.id) AS cards,
            SUM(CASE WHEN c.card_state = 'review' AND c.scheduled_days >= 21 THEN 1 ELSE 0 END) AS mastered,
            COALESCE(SUM(c.reps), 0) AS reviews
       FROM core_srs_card c JOIN core_users u ON u.id = c.user_ref
      WHERE ${PLAYER}
      GROUP BY u.id ORDER BY mastered DESC, reviews DESC`))
    .map((r) => ({ userId: String(r.user_id), name: String(r.name),
                   figures: { mastered: num(r.mastered), cards: num(r.cards), reviews: num(r.reviews), due: null } })),

  // each person's own answers in live quizzes
  quiz: async (env) => (await query<Record<string, unknown>>(env.DB_CORE,
    `SELECT u.id AS user_id, ${NAME} AS name, COALESCE(SUM(a.points), 0) AS points,
            COALESCE(SUM(a.correct), 0) AS correct, COUNT(a.id) AS answered, COUNT(DISTINCT a.session_ref) AS rounds
       FROM core_quiz_answer a JOIN core_users u ON u.id = a.user_ref
      WHERE ${PLAYER}
      GROUP BY u.id ORDER BY points DESC, correct DESC`))
    .map((r) => ({ userId: String(r.user_id), name: String(r.name),
                   figures: { points: num(r.points), correct: num(r.correct), answered: num(r.answered), rounds: num(r.rounds) } })),

  // each person's own sittings of graded packs (Table is talk, never scored)
  courses: async (env) => (await query<Record<string, unknown>>(env.DB_CORE,
    `SELECT u.id AS user_id, ${NAME} AS name,
            COALESCE(SUM(a.points), 0) AS points,
            COUNT(DISTINCT CASE WHEN a.finished_at IS NOT NULL THEN a.id END) AS rounds,
            COUNT(DISTINCT CASE WHEN a.passed_at IS NOT NULL THEN a.unit_ref END) AS units,
            CASE WHEN COALESCE(SUM(r.answered), 0) > 0 THEN ROUND(100.0 * SUM(r.correct) / SUM(r.answered)) END AS accuracy
       FROM core_bank_attempt a
       JOIN core_bank_pack p ON p.id = a.pack_ref AND p.app != 'table'
       -- folded per attempt before the join, so an attempt's points are counted once
       LEFT JOIN (SELECT attempt_ref, COUNT(is_correct) AS answered, COALESCE(SUM(is_correct), 0) AS correct
                    FROM core_bank_response GROUP BY attempt_ref) r ON r.attempt_ref = a.id
       JOIN core_users u ON u.id = a.user_ref
      WHERE ${PLAYER}
      GROUP BY u.id ORDER BY points DESC, units DESC`))
    .map((r) => ({ userId: String(r.user_id), name: String(r.name),
                   figures: { points: num(r.points), rounds: num(r.rounds), units: num(r.units), accuracy: num(r.accuracy) } })),
};

const extraOf = (r: LabelRow): Record<string, unknown> => {
  try { return r.extra_json ? JSON.parse(r.extra_json) : {}; } catch { return {}; }
};
const word = (r: LabelRow) => ({ key: r.key, label: r.label, labelAr: r.label_ar, detail: r.detail, icon: r.icon, color: r.color });

/** A board as the device draws it, for the reader `me`. */
export function boardOf(b: LabelRow, rows: Row[] | null, me: string, metricWords: Map<string, ReturnType<typeof word>>,
                        own: Figures = {}) {
  const x = extraOf(b);
  const metrics = (Array.isArray(x.metrics) ? x.metrics as string[] : []);
  const source = x.source === 'device' ? 'device' : 'server';
  const standings = (rows ?? []).slice(0, 100);
  const at = (rows ?? []).findIndex((r) => r.userId === me);
  const head = typeof x.headline === 'string' ? x.headline : metrics[0] ?? null;
  const mine = at >= 0 ? { ...(rows ?? [])[at].figures, ...own } : (source === 'server' && Object.keys(own).length ? own : null);
  return {
    ...word(b), room: b.parent, source,
    headline: typeof x.headline === 'string' ? x.headline : metrics[0] ?? null,
    metrics: metrics.map((m) => metricWords.get(m) ?? { key: m, label: m, labelAr: null, detail: null, icon: null, color: null }),
    mine, rank: at >= 0 ? at + 1 : null, of: (rows ?? []).length,
    chase: head ? chaseOf(rows ?? [], at, (r) => r.figures[head] ?? 0) : null,
    standings,
  };
}

/** The friendly race: the one just ahead and how far (or, in front, the lead over the next). */
function chaseOf<T extends { name: string }>(rows: T[], at: number, value: (r: T) => number) {
  if (at < 0 || rows.length < 2) return null;
  if (at === 0) return { name: rows[1].name, gap: value(rows[0]) - value(rows[1]), ahead: true };
  return { name: rows[at - 1].name, gap: Math.max(1, value(rows[at - 1]) - value(rows[at]) + 1), ahead: false };
}

// ── This week: a fresh race every Monday ─────────────────────────────────────
//
// Anyone can win a week: points for what was done in it — reviews, passages studied, quiz answers right,
// course units passed — each weighted by the 'score_week' row (extra_json.weights), so the mix is data. Last
// week's points stand beside this week's: the race to beat is first one's own. The days a person was at it
// this week, Monday to Sunday, are shown as seven marks. Weeks start Monday 00:00 UTC.

type WeekRow = { userId: string; name: string; points: number; last: number; days: boolean[]; figures: Figures };

export async function weekRace(env: CoreEnv, weights: Record<string, number>) {
  const rows = await query<Record<string, unknown>>(env.DB_CORE,
    `WITH wk AS (SELECT date('now', '-6 days', 'weekday 1') AS s),
          act AS (
            SELECT user_ref, substr(reviewed_at, 1, 10) AS d, 'reviews' AS k, 1 AS v FROM core_srs_review
             WHERE substr(reviewed_at, 1, 10) >= date((SELECT s FROM wk), '-7 days')
            UNION ALL
            SELECT user_ref, substr(completed_at, 1, 10), 'studied', 1 FROM core_drill_class
             WHERE status = 'studied' AND substr(completed_at, 1, 10) >= date((SELECT s FROM wk), '-7 days')
            UNION ALL
            SELECT user_ref, substr(last_at, 1, 10), 'active', 0 FROM core_drill_class
             WHERE substr(last_at, 1, 10) >= (SELECT s FROM wk)
            UNION ALL
            SELECT user_ref, substr(answered_at, 1, 10), 'right', COALESCE(correct, 0) FROM core_quiz_answer
             WHERE substr(answered_at, 1, 10) >= date((SELECT s FROM wk), '-7 days')
            UNION ALL
            SELECT user_ref, substr(passed_at, 1, 10), 'units', 1 FROM core_bank_attempt
             WHERE substr(passed_at, 1, 10) >= date((SELECT s FROM wk), '-7 days'))
     SELECT a.user_ref AS user_id, ${NAME} AS name, a.d, a.k, SUM(a.v) AS v,
            CAST(julianday(a.d) - julianday((SELECT s FROM wk)) AS INTEGER) AS day
       FROM act a JOIN core_users u ON u.id = a.user_ref
      WHERE ${PLAYER}
      GROUP BY a.user_ref, a.d, a.k`);
  const people = new Map<string, WeekRow>();
  for (const r of rows) {
    const id = String(r.user_id);
    const p: WeekRow = people.get(id) ?? { userId: id, name: String(r.name), points: 0, last: 0, days: Array(7).fill(false), figures: {} };
    const k = String(r.k), v = Number(r.v) || 0, day = Number(r.day);
    const pts = v * (weights[k] ?? 0);
    if (day >= 0) {
      p.points += pts;
      if (k !== 'active') p.figures[k] = (p.figures[k] ?? 0) + v;
      if (day < 7) p.days[day] = true;
    } else {
      p.last += pts;
    }
    people.set(id, p);
  }
  return [...people.values()]
    .filter((p) => p.points > 0 || p.last > 0)
    .sort((a, b) => b.points - a.points || b.days.filter(Boolean).length - a.days.filter(Boolean).length || a.name.localeCompare(b.name));
}

/** When this week ends (next Monday 00:00 UTC), and its first day. */
export function weekBounds(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const back = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - back * 86400000);
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString(), resetsIn: Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000)) };
}

export function scoresRoutes(router: Router<CoreEnv>) {
  router.get('/core/scores/atlas', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const labels = await query<LabelRow>(env.DB_CORE,
      `SELECT scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort
         FROM core_app_label WHERE scope IN ('score_board', 'score', 'score_ui', 'score_week') ORDER BY scope, sort`);
    const boards = labels.filter((l) => l.scope === 'score_board');
    const metricWords = new Map(labels.filter((l) => l.scope === 'score').map((l) => [l.key, word(l)]));

    const measured = await Promise.all(boards.map((b) =>
      extraOf(b).source === 'device' || !MEASURES[b.key] ? Promise.resolve(null) : MEASURES[b.key](env).catch(() => [] as Row[])));
    // the reader's own figures no one else is shown: what is due in their review
    const due = (await new SrsRepo(env.DB_CORE).dueCounts(ctx.userId).catch(() => []))
      .reduce((n, d) => n + (Number(d.n) || 0), 0);

    // this week's race, weighted as its row says
    const weekRow = labels.find((l) => l.scope === 'score_week');
    const wx = weekRow ? extraOf(weekRow) : {};
    const weights = (wx.weights && typeof wx.weights === 'object' ? wx.weights : {}) as Record<string, number>;
    // on the race: who has points this week; anyone only in last week still sees their own last week
    const everyone = await weekRace(env, weights).catch(() => [] as WeekRow[]);
    const race = everyone.filter((r) => r.points > 0);
    const wat = race.findIndex((r) => r.userId === ctx.userId);
    const week = weekRow ? {
      ...word(weekRow), ...weekBounds(),
      metrics: Object.keys(weights).filter((k) => weights[k] > 0)
        .map((m) => metricWords.get(m) ?? { key: m, label: m, labelAr: null, detail: null, icon: null, color: null }),
      weights,
      standings: race.slice(0, 50),
      mine: everyone.find((r) => r.userId === ctx.userId) ?? null,
      rank: wat >= 0 ? wat + 1 : null, of: race.length,
      chase: chaseOf(race, wat, (r) => r.points),
    } : null;

    return ok({
      me: ctx.userId,
      week,
      boards: boards.map((b, i) => boardOf(b, measured[i], ctx.userId, metricWords, b.key === 'review' ? { due } : {})),
      words: labels.filter((l) => l.scope === 'score_ui').map(word),
    });
  });
}
