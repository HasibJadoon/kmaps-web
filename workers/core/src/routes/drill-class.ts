import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, conflict } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import { readJsonObject } from '../../../shared/src/validate';
import {
  nextItem, nextNode, starsFor, scoreOf, daysTaken, seededRating, mergeMissed, cardWithMissed,
  type ItemRecord, type ItemState, type NodeProgress, type SprintAnswer, type StarBand,
} from '../../../shared/src/drill-class';
import type { CoreEnv } from '../env';
import { MODULES, fileCards } from '../srs/file-cards';

// The Class record (§2.3 of the drill-engine plan): what a learner did in a passage or an
// Arabic unit studied as one lesson. The domain worker says what the class is — its steps,
// its sprints, its drills, its star bands; CORE keeps the learner's side, so iOS and the Mac
// share it.
//
//   GET  /core/drill/classes?module=QR&prefix=QR:SP:40:   the learner's classes (a sūra's units)
//   GET  /core/drill/class?scope=QR:SP:40:1-3             one class: steps, open items, days
//   POST /core/drill/class/progress                       one sprint's answers
//   POST /core/drill/class/complete                       mark it studied: rate it, file every drill
//   GET  /core/drill/scores?module=QR                     each person's study: mine, and the standings
//   POST /core/drill/class/resume                         where the learner left off (after each answer)

interface ClassRow {
  id: string; user_ref: string; scope_ref: string; module: string; status: string;
  started_at: string; last_at: string | null; completed_at: string | null;
  days_taken: number | null; active_days: number; sessions: number; active_seconds: number;
  items_total: number; first_try_right: number; score: number | null; rating: number | null;
  steps_json: string;
  resume_json?: string | null; resume_at?: string | null;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const int = (v: unknown, d = 0): number => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : d);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseMissed(raw: string | null): unknown {
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}

/** The checkpoint as stored, with when it was written; null when there is none. */
function resumeOf(c: ClassRow): Record<string, unknown> | null {
  if (!c.resume_json) return null;
  try {
    const r = JSON.parse(c.resume_json);
    return r && typeof r === 'object' ? { ...r, savedAt: c.resume_at } : null;
  } catch { return null; }
}

/** The largest checkpoint kept: a sprint's ids, order, answers and marks are a few kilobytes. */
const RESUME_MAX = 32_000;

function steps(raw: string | null): Record<string, NodeProgress> {
  try { return JSON.parse(raw ?? '{}') ?? {}; } catch { return {}; }
}

/** The star bands a domain sends with a sprint or a completion; none, and a finish is one star. */
function bandsOf(v: unknown): StarBand[] {
  return Array.isArray(v)
    ? v.map((b) => ({ stars: int((b as StarBand)?.stars), min: Number((b as StarBand)?.min) }))
        .filter((b) => b.stars > 0 && Number.isFinite(b.min))
    : [];
}

async function findClass(env: CoreEnv, user: string, scope: string) {
  return queryOne<ClassRow>(env.DB_CORE,
    'SELECT * FROM core_drill_class WHERE user_ref = ? AND scope_ref = ?', [user, scope]);
}

/** One class as the device reads it. */
async function view(env: CoreEnv, c: ClassRow) {
  const [open, days, perNode] = await Promise.all([
    query<{ item_ref: string; node_key: string; misses: number; streak: number; missed_json: string | null }>(env.DB_CORE,
      `SELECT item_ref, node_key, misses, streak, missed_json FROM core_drill_class_item
        WHERE class_id = ? AND state = 'open' ORDER BY updated_at`, [c.id]),
    query<{ day: string; seconds: number; items: number; right: number }>(env.DB_CORE,
      'SELECT day, seconds, items, right FROM core_drill_class_day WHERE class_id = ? ORDER BY day', [c.id]),
    query<{ node_key: string; n: number; perfected: number }>(env.DB_CORE,
      `SELECT node_key, COUNT(*) AS n, SUM(state = 'perfected') AS perfected
         FROM core_drill_class_item WHERE class_id = ? GROUP BY node_key`, [c.id]),
  ]);
  return {
    scope: c.scope_ref, module: c.module, status: c.status,
    startedAt: c.started_at, lastAt: c.last_at, completedAt: c.completed_at,
    daysTaken: c.days_taken ?? daysTaken(days.map((d) => d.day)),
    activeDays: c.active_days, sessions: c.sessions, activeSeconds: c.active_seconds,
    itemsTotal: c.items_total, firstTryRight: c.first_try_right, score: c.score, rating: c.rating,
    // lists, not maps keyed by node: a client that turns snake_case keys into camelCase
    // would rename a node's key along with the fields
    nodes: Object.entries(steps(c.steps_json)).map(([node, p]) => {
      const met = perNode.find((r) => r.node_key === node);
      return { node, ...p, met: met?.n ?? 0, perfected: met?.perfected ?? 0 };
    }),
    // each open item with the words missed on it (a listen line), none for the rest
    open: open.map(({ missed_json, ...o }) => ({ ...o, missed: mergeMissed(parseMissed(missed_json), []) })),
    days,
    // where the learner left off: the sprint under way, or the listen-through; null when nowhere
    resume: resumeOf(c),
  };
}

function summary(c: ClassRow & { open: number }) {
  return {
    scope: c.scope_ref, module: c.module, status: c.status,
    startedAt: c.started_at, lastAt: c.last_at, completedAt: c.completed_at,
    daysTaken: c.days_taken, activeDays: c.active_days, activeSeconds: c.active_seconds,
    itemsTotal: c.items_total, firstTryRight: c.first_try_right, score: c.score, rating: c.rating,
    open: c.open,
  };
}

/**
 * Files a class's items to the SRS as they are learnt: each item right the first time (Good) or
 * perfected after a miss (Hard) that carries a card and is not yet filed — those of `refs`, or all
 * of the class's when null. So every drill of a passage reaches review as soon as it is learnt,
 * not only when the class is completed.
 */
async function fileItems(env: CoreEnv, userId: string, classId: string, refs: string[] | null): Promise<number> {
  const db = env.DB_CORE;
  const toFile = await query<{ item_ref: string; state: ItemState; card_json: string }>(db,
    `SELECT item_ref, state, card_json FROM core_drill_class_item
      WHERE class_id = ? AND card_json IS NOT NULL AND filed_card IS NULL AND state IN ('right', 'perfected')
        AND (? IS NULL OR item_ref IN (SELECT value FROM json_each(?)))`,
    [classId, refs ? 1 : null, refs ? JSON.stringify(refs) : '[]']);
  let filed = 0;
  for (let i = 0; i < toFile.length; i += 100) {
    const chunk = toFile.slice(i, i + 100);
    const entries = chunk.map((r) => {
      let card: Record<string, unknown> = {};
      try { card = JSON.parse(r.card_json) ?? {}; } catch { /* an unreadable card files nothing */ }
      return { ...card, rating: seededRating(r.state) };
    });
    const out = await fileCards(env, userId, entries, { byModule: true });
    const marks = out.cards.map((card, k) => card['id']
      ? db.prepare('UPDATE core_drill_class_item SET filed_card = ? WHERE class_id = ? AND item_ref = ?')
          .bind(String(card['id']), classId, chunk[k].item_ref)
      : null).filter((x): x is D1PreparedStatement => !!x);
    if (marks.length) await db.batch(marks);
    filed += marks.length;
  }
  return filed;
}

export function drillClassRoutes(router: Router<CoreEnv>) {
  router.get('/core/drill/classes', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const u = new URL(req.url);
    const module = u.searchParams.get('module');
    const prefix = u.searchParams.get('prefix') ?? '';
    const rows = await query<ClassRow & { open: number }>(env.DB_CORE,
      `SELECT c.*, (SELECT COUNT(*) FROM core_drill_class_item i WHERE i.class_id = c.id AND i.state = 'open') AS open
         FROM core_drill_class c
        WHERE c.user_ref = ? AND (? IS NULL OR c.module = ?) AND c.scope_ref LIKE ? || '%'
        ORDER BY c.scope_ref`,
      [ctx.userId, module, module, prefix]);
    return ok({ classes: rows.map(summary) });
  });

  /**
   * Each person's study, measured: the reader's own classes (studied or under way, with their
   * stars, first-try score and days), and the standing of every active learner by the classes
   * they have studied — counted from each one's own record, never shared between them.
   *   GET /core/drill/scores?module=QR
   */
  router.get('/core/drill/scores', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const module = new URL(req.url).searchParams.get('module');
    const [mine, standings] = await Promise.all([
      query<ClassRow & { open: number }>(env.DB_CORE,
        `SELECT c.*, (SELECT COUNT(*) FROM core_drill_class_item i WHERE i.class_id = c.id AND i.state = 'open') AS open
           FROM core_drill_class c
          WHERE c.user_ref = ? AND (? IS NULL OR c.module = ?)
          ORDER BY c.status = 'studied' DESC, COALESCE(c.completed_at, c.last_at, c.started_at) DESC`,
        [ctx.userId, module, module]),
      query<{ user_id: string; display_name: string | null; studied: number; stars: number; score: number | null;
              active_days: number; under_way: number }>(env.DB_CORE,
        `SELECT u.id AS user_id, u.display_name,
                SUM(c.status = 'studied') AS studied,
                COALESCE(SUM(CASE WHEN c.status = 'studied' THEN c.rating END), 0) AS stars,
                ROUND(AVG(CASE WHEN c.status = 'studied' THEN c.score END)) AS score,
                COALESCE(SUM(c.active_days), 0) AS active_days,
                SUM(c.status = 'in_progress') AS under_way
           FROM core_users u JOIN core_drill_class c ON c.user_ref = u.id
          WHERE u.account_status = 'active' AND (? IS NULL OR c.module = ?)
          GROUP BY u.id, u.display_name
          ORDER BY studied DESC, stars DESC, score DESC
          LIMIT 100`, [module, module]),
    ]);
    return ok({
      me: ctx.userId,
      mine: mine.map(summary),
      standings: standings.map((r) => ({ userId: r.user_id, name: r.display_name, studied: r.studied, stars: r.stars,
                                         score: r.score, activeDays: r.active_days, underWay: r.under_way })),
    });
  });

  /**
   * Where the learner is: { scope, module, resume } — the sprint under way (kind 'sprint': its node,
   * sprint, of, drill ids in order, the queue by id, the position, each drill's answers so far, the
   * words marked, the seconds) or the listen-through (kind 'listen': its node). resume null clears it.
   * Starts the class when it is the first thing done in it.
   */
  router.post('/core/drill/class/resume', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    const scope = str(body?.['scope']);
    const module = str(body?.['module']);
    if (!scope) return badRequest('scope is required');
    if (!module || !MODULES.has(module)) return badRequest('module is required');
    const r = body?.['resume'];
    if (r !== null && (typeof r !== 'object' || Array.isArray(r))) return badRequest('resume must be an object or null');
    const raw = r === null ? null : JSON.stringify(r);
    if (raw && raw.length > RESUME_MAX) return badRequest('resume is too large');
    if (raw && !str((r as Record<string, unknown>)['node'])) return badRequest('resume.node is required');

    let c = await findClass(env, ctx.userId, scope);
    if (!c && raw) {
      await env.DB_CORE.prepare(`INSERT OR IGNORE INTO core_drill_class (id, user_ref, scope_ref, module) VALUES (?, ?, ?, ?)`)
        .bind(typedId('DCL'), ctx.userId, scope, module).run();
      c = await findClass(env, ctx.userId, scope);
    }
    if (!c) return ok({ resume: null });
    await env.DB_CORE.prepare(
      `UPDATE core_drill_class SET resume_json = ?, resume_at = CASE WHEN ? IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ','now') END
        WHERE id = ?`).bind(raw, raw, c.id).run();
    const fresh = (await findClass(env, ctx.userId, scope))!;
    return ok({ resume: resumeOf(fresh) });
  });

  router.get('/core/drill/class', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const scope = new URL(req.url).searchParams.get('scope');
    if (!scope) return badRequest('scope is required');
    const c = await findClass(env, ctx.userId, scope);
    return ok({ class: c ? await view(env, c) : null });
  });

  /**
   * One sprint's answers: { scope, module, node, sprint, of, seconds, day, bands?,
   *   items: [{ ref, first, misses, streak, marked?, missed?: [word indices], card? }] }.
   * Starts the class when it is the first; keeps each item's state, the day, the node.
   */
  router.post('/core/drill/class/progress', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    const scope = str(body?.['scope']);
    const module = str(body?.['module']);
    const node = str(body?.['node']);
    const day = str(body?.['day']);
    const items = Array.isArray(body?.['items']) ? body!['items'] as Array<Record<string, unknown>> : null;
    if (!scope || !node) return badRequest('scope and node are required');
    if (!module || !MODULES.has(module)) return badRequest('module is required');
    if (!day || !DAY.test(day)) return badRequest('day must be YYYY-MM-DD');
    if (!items) return badRequest('items must be an array');
    if (items.length > 200) return badRequest('at most 200 items per sprint');
    const sprint = int(body?.['sprint']);
    const of = Math.max(1, int(body?.['of'], 1));
    const seconds = int(body?.['seconds']);
    const db = env.DB_CORE;

    let c = await findClass(env, ctx.userId, scope);
    if (!c) {
      await db.prepare(`INSERT OR IGNORE INTO core_drill_class (id, user_ref, scope_ref, module) VALUES (?, ?, ?, ?)`)
        .bind(typedId('DCL'), ctx.userId, scope, module).run();
      c = (await findClass(env, ctx.userId, scope))!;
    }
    const refs = items.map((it) => str(it['ref'])).filter((r): r is string => !!r);
    const prev = new Map<string, ItemRecord>();
    for (let i = 0; i < refs.length; i += 90) {
      const chunk = refs.slice(i, i + 90);
      const rows = await query<ItemRecord & { item_ref: string; missed_json: string | null }>(db,
        `SELECT item_ref, first_right, misses, streak, state, missed_json FROM core_drill_class_item
          WHERE class_id = ? AND item_ref IN (${chunk.map(() => '?').join(',')})`, [c.id, ...chunk]);
      for (const r of rows) prev.set(r.item_ref, r);
    }

    const stmts: D1PreparedStatement[] = [];
    let firsts = 0;
    for (const it of items) {
      const ref = str(it['ref']);
      if (!ref) continue;
      const a: SprintAnswer = { first: it['first'] === true, misses: int(it['misses']), streak: int(it['streak']),
                                marked: it['marked'] === true };
      if (a.first && !a.misses && !a.marked) firsts += 1;
      // a studied class is replayed for stars only: its items and rating stay as they were
      if (c.status === 'studied') continue;
      const next = nextItem(prev.get(ref) ?? null, a);
      // the words not caught: every sprint's kept, and written into the card it files
      const before = prev.get(ref) as (ItemRecord & { missed_json?: string | null }) | undefined;
      const missed = mergeMissed(parseMissed(before?.missed_json ?? null), it['missed']);
      const raw = it['card'] && typeof it['card'] === 'object' ? it['card'] as Record<string, unknown> : null;
      const card = raw ? JSON.stringify(cardWithMissed(raw, missed)) : null;
      stmts.push(db.prepare(
        `INSERT INTO core_drill_class_item (class_id, item_ref, node_key, first_right, misses, streak, state, card_json, missed_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (class_id, item_ref) DO UPDATE SET
           misses = excluded.misses, streak = excluded.streak, state = excluded.state,
           card_json = COALESCE(excluded.card_json, card_json),
           missed_json = COALESCE(excluded.missed_json, missed_json),
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
        .bind(c.id, ref, node, next.first_right, next.misses, next.streak, next.state, card,
              missed.length ? JSON.stringify(missed) : null));
    }

    const stars = starsFor(firsts, items.length, bandsOf(body?.['bands']));
    const nodes = steps(c.steps_json);
    nodes[node] = nextNode(nodes[node], sprint, of, items.length, firsts, seconds, stars);

    stmts.push(db.prepare(
      `INSERT INTO core_drill_class_day (class_id, day, seconds, items, right) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (class_id, day) DO UPDATE SET seconds = seconds + excluded.seconds,
         items = items + excluded.items, right = right + excluded.right`)
      .bind(c.id, day, seconds, items.length, firsts));
    stmts.push(db.prepare(
      `UPDATE core_drill_class SET
         steps_json = ?, sessions = sessions + 1, active_seconds = active_seconds + ?,
         last_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
         active_days = (SELECT COUNT(*) FROM core_drill_class_day WHERE class_id = ?),
         items_total = (SELECT COUNT(*) FROM core_drill_class_item WHERE class_id = ?),
         first_try_right = (SELECT COUNT(*) FROM core_drill_class_item WHERE class_id = ? AND first_right = 1),
         -- the sprint sent is no longer where the learner is: its checkpoint goes
         resume_json = CASE WHEN json_extract(resume_json, '$.node') = ? AND json_extract(resume_json, '$.sprint') = ?
                            THEN NULL ELSE resume_json END
       WHERE id = ?`)
      .bind(JSON.stringify(nodes), seconds, c.id, c.id, c.id, node, sprint, c.id));
    await db.batch(stmts);
    // what is learnt goes to review now — this sprint's, and any learnt before this rule and not yet filed
    const filed = c.status === 'studied' ? 0 : await fileItems(env, ctx.userId, c.id, null);

    const fresh = (await findClass(env, ctx.userId, scope))!;
    return ok({ class: await view(env, fresh), sprint: { items: items.length, right: firsts, stars, filed } });
  });

  /**
   * Marks the class studied: { scope, bands? }. Every item must be right or perfected. The
   * rating is first-try accuracy in the domain's star bands; days taken run from the first
   * study day to the last. Every item that carries a card is filed to the SRS, Good when it
   * was right the first time and Hard when it needed perfecting.
   */
  router.post('/core/drill/class/complete', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    const scope = str(body?.['scope']);
    if (!scope) return badRequest('scope is required');
    const c = await findClass(env, ctx.userId, scope);
    if (!c) return notFound(`class ${scope}`);
    const db = env.DB_CORE;

    const open = await queryOne<{ n: number }>(db,
      `SELECT COUNT(*) AS n FROM core_drill_class_item WHERE class_id = ? AND state = 'open'`, [c.id]);
    if ((open?.n ?? 0) > 0) return conflict(`${open!.n} items are still to perfect`);

    if (c.status !== 'studied') {
      const days = await query<{ day: string }>(db, 'SELECT day FROM core_drill_class_day WHERE class_id = ?', [c.id]);
      const score = scoreOf(c.first_try_right, c.items_total);
      const rating = starsFor(c.first_try_right, c.items_total, bandsOf(body?.['bands'])) || 1;
      await db.prepare(
        `UPDATE core_drill_class SET status = 'studied', score = ?, rating = ?, days_taken = ?,
           completed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
        .bind(score, rating, daysTaken(days.map((d) => d.day)), c.id).run();
    }

    // file what is not filed yet (a retry after a partial failure files the rest)
    const filed = await fileItems(env, ctx.userId, c.id, null);

    const fresh = (await findClass(env, ctx.userId, scope))!;
    return ok({ class: await view(env, fresh), filed });
  });
}
