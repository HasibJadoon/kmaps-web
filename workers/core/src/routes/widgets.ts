import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { SrsRepo } from '../repositories/srs.repo';
import { softFail } from '../../../shared/src/soft-fail';

// ── The home-screen widgets: everything they show, in one call ─────────────────
//   GET /core/widgets
// Five widgets read it (iOS WidgetKit): the Qurʾān class under way (its sūra, passage and the node it is on), the
// Arabic one, Worldview (named, not built yet), the reviews due today, and everyone's standing. The learner's side is
// CORE's; what a class is (its titles, its nodes and their drills) is its domain's, asked through the service bindings
// from the domain's own kept reads (/qr/practice/class/path, /ar/practice/class/path). Words from core_app_label
// scope 'widget' (migration 067).

type Row = { id: string; module: string; scope_ref: string; status: string; last_at: string | null; started_at: string;
             steps_json: string; open_n: number };
type PathNode = { key: string; kind: string; title: string; titleAr: string; icon: string; color: string; drills: number };
type PathBody = { passage: { id: string; surah: number; number: number; label: string | null; title: string | null; titleAr: string | null };
                  nodes: PathNode[] };

const INTERNAL = 'http://internal.k-maps.local';

async function ask<T>(f: Fetcher | undefined, path: string): Promise<T | null> {
  if (!f) return null;
  try {
    const r = await f.fetch(new Request(`${INTERNAL}${path}`));
    if (!r.ok) return null;
    const b = await r.json() as { ok?: boolean; data?: T };
    return b?.data ?? null;
  } catch { return null; }
}

/** The class a learner is on in a module: the one under way touched last, else the last one studied. */
function activeOf(rows: Row[], module: string): Row | null {
  const mine = rows.filter((r) => r.module === module);
  const at = (r: Row) => r.last_at ?? r.started_at ?? '';
  const going = mine.filter((r) => r.status !== 'studied').sort((a, b) => at(b).localeCompare(at(a)));
  if (going[0]) return going[0];
  return mine.sort((a, b) => at(b).localeCompare(at(a)))[0] ?? null;
}

/** A class's card: its path from the domain, set against the drills the learner has passed in it. */
async function classCard(env: CoreEnv, f: Fetcher | undefined, base: string, param: string, scope: string, row: Row | null) {
  const path = await ask<PathBody>(f, `${base}/path?${param}=${encodeURIComponent(scope)}`);
  if (!path) return null;
  const passed = row ? await query<{ node_key: string; n: number }>(env.DB_CORE,
    `SELECT node_key, COUNT(*) AS n FROM core_drill_class_item WHERE class_id = ? AND state IN ('right', 'perfected') GROUP BY node_key`,
    [row.id]).catch(softFail([])) : [];
  // a node's drills passed: its own, and its sub-nodes' ("<node>#<style>")
  const passedOf = (key: string) => passed.filter((p) => p.node_key === key || p.node_key.startsWith(`${key}#`)).reduce((a, p) => a + p.n, 0);
  const steps = path.nodes.filter((n) => n.kind === 'step' && n.drills > 0);
  const done = steps.filter((n) => passedOf(n.key) >= n.drills);
  const current = steps.find((n) => passedOf(n.key) < n.drills) ?? null;
  const drills = steps.reduce((a, n) => a + n.drills, 0);
  const got = steps.reduce((a, n) => a + Math.min(passedOf(n.key), n.drills), 0);
  return {
    scope, status: row?.status ?? 'new', surah: path.passage.surah || null, number: path.passage.number,
    label: path.passage.label, title: path.passage.title, titleAr: path.passage.titleAr,
    current: current ? { key: current.key, title: current.title, titleAr: current.titleAr, icon: current.icon, color: current.color } : null,
    nodesDone: done.length, nodes: steps.length, drillsPassed: got, drills, open: row?.open_n ?? 0,
  };
}

/** The Qurʾān card: the passage under way — or, its class studied, the next passage of its sūra the learner has not. */
async function quranCard(env: CoreEnv, rows: Row[]) {
  const row = activeOf(rows, 'QR');
  if (!row) return null;
  const m = /^QR:SP:(\d+):/.exec(row.scope_ref);
  const surah = m ? Number(m[1]) : null;
  const list = surah ? await ask<{ surah: { id: number; name: string | null; nameAr: string | null };
                                   passages: Array<{ id: string; number: number }> }>(env.QURAN, `/qr/practice/class/surah?surah=${surah}`) : null;
  let scope = row.scope_ref, at: Row | null = row;
  if (row.status === 'studied' && list) {
    const studied = new Set(rows.filter((r) => r.module === 'QR' && r.status === 'studied').map((r) => r.scope_ref));
    const next = list.passages.find((p) => !studied.has(p.id));
    if (next) { scope = next.id; at = rows.find((r) => r.scope_ref === next.id) ?? null; }
  }
  const card = await classCard(env, env.QURAN, '/qr/practice/class', 'passage', scope, at);
  if (!card) return null;
  const studied = list ? list.passages.filter((p) => rows.some((r) => r.scope_ref === p.id && r.status === 'studied')).length : 0;
  return { ...card, surahName: list?.surah.name ?? null, surahNameAr: list?.surah.nameAr ?? null,
           passages: list?.passages.length ?? null, passagesStudied: studied };
}

export function widgetRoutes(router: Router<CoreEnv>) {
  router.get('/core/widgets', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new SrsRepo(env.DB_CORE);
    const [rows, due, today, standings, words] = await Promise.all([
      query<Row>(env.DB_CORE,
        `SELECT id, module, scope_ref, status, last_at, started_at, steps_json, open_n FROM core_drill_class WHERE user_ref = ?`, [ctx.userId]),
      repo.dueCounts(ctx.userId),
      repo.todayCounts(ctx.userId),
      query<{ user_id: string; display_name: string | null; studied: number; stars: number; score: number | null;
              active_days: number; under_way: number; last_at: string | null }>(env.DB_CORE,
        `SELECT u.id AS user_id, u.display_name,
                SUM(c.status = 'studied') AS studied,
                COALESCE(SUM(CASE WHEN c.status = 'studied' THEN c.rating END), 0) AS stars,
                ROUND(AVG(CASE WHEN c.status = 'studied' THEN c.score END)) AS score,
                COALESCE(SUM(c.active_days), 0) AS active_days,
                SUM(c.status = 'in_progress') AS under_way,
                MAX(c.last_at) AS last_at
           FROM core_users u JOIN core_drill_class c ON c.user_ref = u.id
          WHERE u.account_status = 'active'
          GROUP BY u.id, u.display_name
          ORDER BY studied DESC, stars DESC, score DESC
          LIMIT 12`),
      query<{ key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null }>(env.DB_CORE,
        `SELECT key, label, label_ar, detail, icon, color FROM core_app_label WHERE scope = 'widget' ORDER BY sort`).catch(softFail([])),
    ]);
    const arRow = activeOf(rows, 'AR');
    const [quran, arabic] = await Promise.all([
      quranCard(env, rows),
      arRow ? classCard(env, env.ARABIC, '/ar/practice/class', 'unit', arRow.scope_ref, arRow) : Promise.resolve(null),
    ]);
    // each learner's study under way, by module: their latest class's scope
    const active = await query<{ user_ref: string; module: string; scope_ref: string }>(env.DB_CORE,
      `SELECT user_ref, module, scope_ref FROM core_drill_class c
        WHERE status = 'in_progress' AND user_ref IN (SELECT value FROM json_each(?))
        ORDER BY COALESCE(last_at, started_at) DESC`, [JSON.stringify(standings.map((s) => s.user_id))]).catch(softFail([]));
    return ok({
      at: new Date().toISOString(),
      quran, arabic,
      worldview: { ready: false },
      reviews: { due: due.reduce((a, d) => a + d.n, 0), byModule: due, reviewedToday: today.reviewed, newToday: today.introduced },
      progress: {
        me: ctx.userId,
        people: standings.map((s) => ({
          userId: s.user_id, name: s.display_name, me: s.user_id === ctx.userId, studied: s.studied, stars: s.stars,
          score: s.score, activeDays: s.active_days, underWay: s.under_way, lastAt: s.last_at,
          studying: active.filter((a) => a.user_ref === s.user_id).slice(0, 2).map((a) => ({ module: a.module, scope: a.scope_ref })),
        })),
      },
      words: words.map((w) => ({ key: w.key, label: w.label, labelAr: w.label_ar, detail: w.detail, icon: w.icon, color: w.color })),
    });
  });
}
