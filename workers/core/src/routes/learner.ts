import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';

// ── The learner's level per skill (core 051) ───────────────────────────────────────────────────────────────────
//
//   GET  /core/learner/skills?module=AR          each skill's level, rounds and last score
//   POST /core/learner/skills                     { module, skill, level, right, total, levels: [...], up?, down? }
//        a round of fresh and banked drills at `level`: the skill moves up one of `levels` at ≥ up (0.8), down one
//        at ≤ down (0.5), else stays — and the level its next round is drawn at comes back.
// The levels are the domain worker's own (its home names them); core keeps where the learner stands on them.

export const UP = 0.8;
export const DOWN = 0.5;

/** Where the next round is drawn after this one — the same rule as DrillLevelLadder.next on the device. */
export function nextLevel(levels: string[], at: string, right: number, total: number, up = UP, down = DOWN): string {
  const i = levels.indexOf(at);
  if (total <= 0 || i < 0) return at;
  const share = right / total;
  if (share >= up && i + 1 < levels.length) return levels[i + 1];
  if (share <= down && i > 0) return levels[i - 1];
  return at;
}

interface Row { skill: string; level: string; rounds: number; last_right: number | null; last_total: number | null; updated_at: string }

export function learnerRoutes(router: Router<CoreEnv>) {
  router.get('/core/learner/skills', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const module = new URL(req.url).searchParams.get('module');
    const rows = await query<Row>(env.DB_CORE,
      `SELECT skill, level, rounds, last_right, last_total, updated_at FROM core_learner_skill
        WHERE user_ref = ? ${module ? 'AND module = ?' : ''} ORDER BY skill`, module ? [ctx.userId, module] : [ctx.userId]);
    return ok({ skills: rows.map((r) => ({ skill: r.skill, level: r.level, rounds: r.rounds,
      lastRight: r.last_right, lastTotal: r.last_total, updatedAt: r.updated_at })) });
  });

  router.post('/core/learner/skills', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = (await readJsonObject(req)) ?? {};
    const s = (k: string) => (typeof b[k] === 'string' && (b[k] as string).trim() ? (b[k] as string).trim() : null);
    const n = (k: string) => (Number.isFinite(Number(b[k])) ? Math.max(0, Math.floor(Number(b[k]))) : null);
    const module = s('module'), skill = s('skill'), level = s('level'), right = n('right'), total = n('total');
    const levels = Array.isArray(b.levels) ? (b.levels as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    if (!module || !skill || !level || right == null || total == null || right > total || !levels.includes(level)) {
      return badRequest('module, skill, level (one of levels), right ≤ total are required');
    }
    const frac = (k: string, d: number) => { const v = Number(b[k]); return Number.isFinite(v) && v > 0 && v <= 1 ? v : d; };
    const next = nextLevel(levels, level, right, total, frac('up', UP), frac('down', DOWN));
    await execute(env.DB_CORE,
      `INSERT INTO core_learner_skill (user_ref, module, skill, level, rounds, last_right, last_total, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, datetime('now'))
       ON CONFLICT (user_ref, module, skill) DO UPDATE SET level = excluded.level, rounds = rounds + 1,
         last_right = excluded.last_right, last_total = excluded.last_total, updated_at = excluded.updated_at`,
      [ctx.userId, module, skill, next, right, total]);
    const row = await queryOne<Row>(env.DB_CORE,
      `SELECT skill, level, rounds, last_right, last_total, updated_at FROM core_learner_skill WHERE user_ref = ? AND module = ? AND skill = ?`,
      [ctx.userId, module, skill]);
    return ok({ skill, level: next, from: level, rounds: row?.rounds ?? 1 });
  });
}
