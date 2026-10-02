// Scores as an Atlas over a real SQLite: each board ranks every person from their own record; a
// figure only its owner should see (what is due) is theirs alone; a device board has no standings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { scoresRoutes } from '../src/routes/scores';
import { signJwt } from '../src/jwt';

type Handler = (req: Request, env: unknown, params: Record<string, string>) => Promise<Response>;

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    const args = params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p)) as never[];
    return {
      async all<T>() {
        return { results: (/^\s*(SELECT|WITH)|RETURNING/i.test(sql) ? stmt.all(...args) : (stmt.run(...args), [])) as T[] };
      },
      async first<T>() { return (stmt.get(...args) as T) ?? null; },
      async run() { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes } }; },
    };
  };
  return {
    prepare(sql: string) {
      return { bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) };
    },
    async batch(stmts: Array<{ run(): Promise<unknown> }>) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}

async function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  for (const m of ['039_drill_class.sql', '041_app_atlas.sql', '043_score_atlas.sql'])
    db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), 'utf8'));
  db.exec(`INSERT INTO core_users (id, email, display_name) VALUES ('U1', 'amina@x.org', 'Amina'), ('U2', 'bilal@x.org', ''), ('U3', 'c@x', 'Gone');
           UPDATE core_users SET account_status = 'deleted' WHERE id = 'U3';
           INSERT INTO core_drill_class (id, user_ref, scope_ref, module, status, rating, score, active_days) VALUES
             ('C1', 'U1', 'QR:SP:40:1-3', 'QR', 'studied', 3, 95, 2), ('C2', 'U1', 'QR:SP:40:4-5', 'QR', 'in_progress', NULL, NULL, 1),
             ('C3', 'U2', 'QR:SP:40:1-3', 'QR', 'studied', 2, 80, 4), ('C4', 'U2', 'QR:SP:40:4-5', 'QR', 'studied', 1, 60, 3),
             ('C5', 'U3', 'QR:SP:40:1-3', 'QR', 'studied', 3, 100, 1);`);
  const routes = new Map<string, Handler>();
  scoresRoutes({ get: (p: string, h: Handler) => routes.set(`GET ${p}`, h), post: () => {} } as never);
  const secret = 's';
  const env = { DB_CORE: d1(db), JWT_SECRET: secret };
  const as = async (who: string) => {
    const t = await signJwt({ sub: who, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
    const res = await routes.get('GET /core/scores/atlas')!(new Request('http://x/core/scores/atlas',
      { headers: { authorization: `Bearer ${t}` } }), env, {});
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  return { as };
}

test('each board measures each person from their own record', async () => {
  const { as } = await setup();
  const r = await as('U1');
  assert.equal(r.status, 200);
  const d = r.body.data;
  assert.deepEqual(d.boards.map((b: { key: string }) => b.key), ['study', 'review', 'practice', 'quiz', 'courses']);
  const study = d.boards[0];
  // Bilal studied two, Amina one: Bilal leads; the deleted account is not on the board
  assert.deepEqual(study.standings.map((s: { name: string; figures: { studied: number } }) => [s.name, s.figures.studied]),
    [['bilal', 2], ['Amina', 1]]);   // no display name: the part of the address before the @
  assert.equal(study.rank, 2);
  assert.equal(study.of, 2);
  assert.deepEqual({ ...study.mine }, { studied: 1, stars: 3, score: 95, days: 3, under_way: 1 });
  assert.equal(study.headline, 'studied');
  assert.equal(study.metrics[0].label, 'passages studied');
  // practice is counted on the device: words only
  const practice = d.boards[2];
  assert.equal(practice.source, 'device');
  assert.deepEqual(practice.standings, []);
  assert.equal(practice.mine, null);
  // Amina's view of Bilal's rank is Bilal's own record too
  const b = (await as('U2')).body.data.boards[0];
  assert.equal(b.rank, 1);
  assert.deepEqual({ ...b.mine }, { studied: 2, stars: 3, score: 70, days: 7, under_way: 0 });
  assert.ok(d.words.some((w: { key: string }) => w.key === 'rank'));
});

test('what is due is the reader\'s alone', async () => {
  const { as } = await setup();
  const review = (await as('U1')).body.data.boards[1];
  assert.equal(review.mine.due, 0);
  for (const s of review.standings) assert.equal(s.figures.due, null);
});
