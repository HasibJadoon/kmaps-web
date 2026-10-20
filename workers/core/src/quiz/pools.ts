import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, execute, queryOne } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import { readJsonObject, nonBlank } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { quizDrillOf } from './drills';

// ── Quiz pools ──────────────────────────────────────────────────────────────
//
// What a round deals from (migration 070). Three kinds, by id:
//   study:<scope>   a passage the person studied — its drills with one right answer among choices
//   path:<unit>     a unit of a course path — its live, scored choice questions (a section: all under it)
//   pool:<id>       a pool the person made from those
// A pool resolves to its questions in order; the room shuffles them and deals them one by one.

export type PoolEntry = { kind: 'drill'; ref: string; scope: string } | { kind: 'item'; ref: string; scope: string };
type Label = { key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null };

/** A bank question the room can ask: live, scored, a single choice among at least two plates, one of them right. */
const ASKABLE = `i.status = 'live' AND i.scoring != 'none' AND i.interaction IN ('choice', 'true_false')
  AND (SELECT COUNT(*) FROM core_bank_item_option o WHERE o.item_ref = i.id AND o.role = 'choice') >= 2
  AND EXISTS (SELECT 1 FROM core_bank_item_option o WHERE o.item_ref = i.id AND o.role = 'choice' AND o.is_correct = 1)`;

async function studyDrills(env: CoreEnv, owner: string, scope: string | null) {
  const rows = await query<{ scope_ref: string; module: string; status: string; item_ref: string; card_json: string | null }>(env.DB_CORE,
    `SELECT c.scope_ref, c.module, c.status, i.item_ref, i.card_json
       FROM core_drill_class c JOIN core_drill_class_item i ON i.class_id = c.id
      WHERE c.user_ref = ? AND (? IS NULL OR c.scope_ref = ?) AND i.card_json IS NOT NULL
      ORDER BY c.status = 'studied' DESC, c.scope_ref, i.item_ref`, [owner, scope, scope]);
  return rows.flatMap((r) => {
    const q = quizDrillOf(r.card_json);
    return q ? [{ scope: r.scope_ref, module: r.module, status: r.status, ref: r.item_ref, prompt: q.prompt, line: q.line ?? null, options: q.options }] : [];
  });
}

/** A unit's questions, and every unit under it. */
async function unitItems(env: CoreEnv, unit: string) {
  return query<{ id: string; prompt: string; options: string; unit: string }>(env.DB_CORE,
    `WITH RECURSIVE under(id) AS (SELECT ? UNION ALL SELECT u.id FROM core_bank_unit u JOIN under ON u.parent_ref = under.id)
     SELECT DISTINCT i.id, COALESCE(i.prompt_en, i.prompt_ar, i.prompt_ur) AS prompt, ui.unit_ref AS unit, ui.seq,
            (SELECT json_group_array(COALESCE(o.label_en, o.label_ar, o.label_ur)) FROM
               (SELECT * FROM core_bank_item_option o WHERE o.item_ref = i.id AND o.role = 'choice' ORDER BY o.sort_order) o) AS options
       FROM under JOIN core_bank_unit_item ui ON ui.unit_ref = under.id JOIN core_bank_item i ON i.id = ui.item_ref
      WHERE ${ASKABLE}
      ORDER BY ui.unit_ref, ui.seq`, [unit]);
}

/** A pool's questions, in its order, for the person who would host it. */
export async function poolEntries(env: CoreEnv, owner: string, id: string): Promise<PoolEntry[]> {
  const [kind, ...rest] = id.split(':');
  const key = rest.join(':');
  if (kind === 'study') return (await studyDrills(env, owner, key)).map((d) => ({ kind: 'drill', ref: d.ref, scope: d.scope }));
  if (kind === 'path') return (await unitItems(env, key)).map((i) => ({ kind: 'item', ref: i.id, scope: '' }));
  if (kind === 'pool') {
    const rows = await query<{ kind: 'drill' | 'item'; ref: string; scope: string }>(env.DB_CORE,
      `SELECT pi.kind, pi.ref, pi.scope FROM core_quiz_pool_item pi JOIN core_quiz_pool p ON p.id = pi.pool_ref
        WHERE p.id = ? AND p.owner_ref = ? AND p.status = 'live' ORDER BY pi.seq`, [key, owner]);
    return rows.map((r) => ({ kind: r.kind, ref: r.ref, scope: r.scope }));
  }
  return [];
}

/** A pool's name, for the room to show. */
export async function poolTitle(env: CoreEnv, owner: string, id: string): Promise<string | null> {
  const [kind, ...rest] = id.split(':');
  const key = rest.join(':');
  if (kind === 'study') return rangeLine(key);
  if (kind === 'path') return (await queryOne<{ title: string }>(env.DB_CORE, 'SELECT title FROM core_bank_unit WHERE id = ?', [key]))?.title ?? null;
  if (kind === 'pool') return (await queryOne<{ title: string }>(env.DB_CORE,
    'SELECT title FROM core_quiz_pool WHERE id = ? AND owner_ref = ?', [key, owner]))?.title ?? null;
  return null;
}

/** QR:SP:40:1-3 → Ghāfir-style range "40:1–3"; anything else as it is. */
function rangeLine(scope: string): string {
  const p = scope.split(':');
  return p.length === 4 && p[0] === 'QR' ? `${p[2]}:${p[3].replace('-', '–')}` : scope;
}

export function quizPoolRoutes(router: Router<CoreEnv>): void {
  /** Every pool the person can host: made for them from study and the path, and their own. */
  router.get('/core/quiz/pools', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const labels = await query<Label>(env.DB_CORE,
      `SELECT key, label, label_ar, detail, icon, color FROM core_app_label WHERE scope = 'quiz_pool' ORDER BY sort`);

    const drills = await studyDrills(env, ctx.userId, null);
    const study = new Map<string, { id: string; title: string; subtitle: string | null; n: number; done: boolean }>();
    for (const d of drills) {
      const p = study.get(d.scope) ?? { id: `study:${d.scope}`, title: rangeLine(d.scope), subtitle: d.module, n: 0, done: d.status === 'studied' };
      p.n++; study.set(d.scope, p);
    }

    const units = await query<{ id: string; title: string; title_ar: string | null; pack: string; n: number }>(env.DB_CORE,
      `SELECT u.id, u.title, u.title_ar, p.title AS pack, COUNT(DISTINCT i.id) AS n
         FROM core_bank_unit u JOIN core_bank_pack p ON p.id = u.pack_ref AND p.app = 'path'
         JOIN core_bank_unit_item ui ON ui.unit_ref = u.id JOIN core_bank_item i ON i.id = ui.item_ref
        WHERE ${ASKABLE}
        GROUP BY u.id ORDER BY p.title, u.depth, u.unit_index`);

    const mine = await query<{ id: string; title: string; n: number; updated_at: string }>(env.DB_CORE,
      `SELECT p.id, p.title, p.updated_at, (SELECT COUNT(*) FROM core_quiz_pool_item pi WHERE pi.pool_ref = p.id) AS n
         FROM core_quiz_pool p WHERE p.owner_ref = ? AND p.status = 'live' ORDER BY p.updated_at DESC`, [ctx.userId]);

    const word = (k: string) => {
      const l = labels.find((x) => x.key === k);
      return { key: k, label: l?.label ?? k, labelAr: l?.label_ar ?? null, detail: l?.detail ?? null, icon: l?.icon ?? null, color: l?.color ?? null };
    };
    return ok({ sections: [
      { ...word('study'), pools: [...study.values()].map((p) => ({ id: p.id, title: p.title, subtitle: p.done ? 'Studied' : 'Under way', n: p.n, own: false })) },
      { ...word('path'), pools: units.map((u) => ({ id: `path:${u.id}`, title: u.title, subtitle: u.pack, n: Number(u.n), own: false })) },
      { ...word('mine'), pools: mine.map((p) => ({ id: `pool:${p.id}`, title: p.title, subtitle: null, n: Number(p.n), own: true })) },
    ] });
  });

  /** One pool's questions, shown (never their answers): to look at it, or to build your own from it. */
  router.get('/core/quiz/pools/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const pid = decodeURIComponent(id);
    const entries = await poolEntries(env, ctx.userId, pid);
    const title = await poolTitle(env, ctx.userId, pid);
    if (title === null) return notFound(`pool ${pid}`);

    // the words of each question, read once per kind
    const drills = new Map((await studyDrills(env, ctx.userId, null)).map((d) => [`${d.scope}|${d.ref}`, d]));
    const itemIds = entries.filter((e) => e.kind === 'item').map((e) => e.ref);
    const items = new Map<string, { prompt: string; options: string[] }>();
    for (let i = 0; i < itemIds.length; i += 80) {
      const part = itemIds.slice(i, i + 80);
      const rows = await query<{ id: string; prompt: string; options: string }>(env.DB_CORE,
        `SELECT i.id, COALESCE(i.prompt_en, i.prompt_ar, i.prompt_ur) AS prompt,
                (SELECT json_group_array(COALESCE(o.label_en, o.label_ar, o.label_ur)) FROM
                   (SELECT * FROM core_bank_item_option o WHERE o.item_ref = i.id AND o.role = 'choice' ORDER BY o.sort_order) o) AS options
           FROM core_bank_item i WHERE i.id IN (${part.map(() => '?').join(',')})`, part);
      for (const r of rows) items.set(r.id, { prompt: r.prompt, options: JSON.parse(r.options || '[]') });
    }
    return ok({ id: pid, title, own: pid.startsWith('pool:'), questions: entries.flatMap((e): Array<{ kind: string; ref: string; scope: string; prompt: string; line: string | null; options: string[] }> => {
      if (e.kind === 'drill') {
        const d = drills.get(`${e.scope}|${e.ref}`);
        return d ? [{ kind: e.kind, ref: e.ref, scope: e.scope, prompt: d.prompt, line: d.line, options: d.options }] : [];
      }
      const it = items.get(e.ref);
      return it ? [{ kind: e.kind, ref: e.ref, scope: '', prompt: it.prompt, line: null, options: it.options }] : [];
    }) });
  });

  /** Make your own pool, or change one: a title and the questions chosen, in order. */
  const save = async (req: Request, env: CoreEnv, existing: string | null) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req) ?? {};
    const title = nonBlank(body['title']);
    const raw = Array.isArray(body['questions']) ? body['questions'] as Array<Record<string, unknown>> : null;
    if (!existing && !title) return badRequest('A pool needs a title');
    const questions = (raw ?? []).flatMap((q) => {
      const kind = q['kind'] === 'drill' || q['kind'] === 'item' ? q['kind'] : null;
      const ref = nonBlank(q['ref']);
      return kind && ref ? [{ kind, ref, scope: nonBlank(q['scope']) ?? '' }] : [];
    });
    if (raw && !questions.length) return badRequest('A pool needs at least one question');

    let id = existing;
    if (id) {
      const own = await queryOne<{ id: string }>(env.DB_CORE,
        `SELECT id FROM core_quiz_pool WHERE id = ? AND owner_ref = ? AND status = 'live'`, [id, ctx.userId]);
      if (!own) return notFound(`pool ${id}`);
      if (title) await execute(env.DB_CORE, `UPDATE core_quiz_pool SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`, [title, id]);
    } else {
      id = typedId('QZP');
      await execute(env.DB_CORE, `INSERT INTO core_quiz_pool (id, owner_ref, title) VALUES (?, ?, ?)`, [id, ctx.userId, title]);
    }
    if (raw) {
      await execute(env.DB_CORE, `DELETE FROM core_quiz_pool_item WHERE pool_ref = ?`, [id]);
      for (const [seq, q] of questions.entries()) {
        await execute(env.DB_CORE, `INSERT OR IGNORE INTO core_quiz_pool_item (pool_ref, seq, kind, ref, scope) VALUES (?, ?, ?, ?, ?)`,
          [id, seq, q.kind, q.ref, q.scope]);
      }
      await execute(env.DB_CORE, `UPDATE core_quiz_pool SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`, [id]);
    }
    return (existing ? ok : created)({ id: `pool:${id}`, title, n: questions.length });
  };
  router.post('/core/quiz/pools', (req, env) => save(req, env, null));
  router.put('/core/quiz/pools/:id', (req, env, { id }) => save(req, env, decodeURIComponent(id).replace(/^pool:/, '')));

  /** Put a pool of your own away (kept, archived). */
  router.delete('/core/quiz/pools/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    await execute(env.DB_CORE, `UPDATE core_quiz_pool SET status = 'archived', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
                                 WHERE id = ? AND owner_ref = ?`, [decodeURIComponent(id).replace(/^pool:/, ''), ctx.userId]);
    return ok({ archived: true });
  });
}
