// The class routes over a real SQLite (node:sqlite) holding CORE's schema and migration 039:
// a sprint starts the class, a miss stays open until perfected, completion is refused while
// anything is open, then rates the class and files every drill to the SRS with its seeded grade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drillClassRoutes } from '../src/routes/drill-class';
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
  db.exec(readFileSync(new URL('../migrations/039_drill_class.sql', import.meta.url), 'utf8'));
  const routes = new Map<string, Handler>();
  drillClassRoutes({
    get: (p: string, h: Handler) => routes.set(`GET ${p}`, h),
    post: (p: string, h: Handler) => routes.set(`POST ${p}`, h),
  } as never);
  const secret = 'test-secret';
  const token = await signJwt({ sub: 'U1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
  const env = { DB_CORE: d1(db), JWT_SECRET: secret };
  const call = async (method: 'GET' | 'POST', path: string, body?: unknown) => {
    const [p, q] = path.split('?');
    const res = await routes.get(`${method} ${p}`)!(new Request(`http://x${p}${q ? `?${q}` : ''}`, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), env, {});
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  return { db, call };
}

const card = (ref: string) => ({ module: 'QR', resource_type: 'passage', resource_ref: ref, card_kind: 'fill',
                                 front_text: 'f', back_text: 'b', extra: { drill: { id: ref } } });
const bands = [{ stars: 3, min: 90 }, { stars: 2, min: 75 }];
const scope = 'QR:SP:40:1-3';

test('a class from first sprint to studied', async () => {
  const { db, call } = await setup();

  // day 1: three items, one missed then right once
  let r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'listen', sprint: 0, of: 2, seconds: 120, day: '2026-10-01', bands,
    items: [
      { ref: 'QR:fill:40:1', first: true, misses: 0, streak: 1, card: card('QR:fill:40:1') },
      { ref: 'QR:fill:40:2', first: false, misses: 1, streak: 1, card: card('QR:fill:40:2') },
      { ref: 'QR:fill:40:3', first: true, misses: 0, streak: 1, card: card('QR:fill:40:3') },
    ],
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.class.status, 'in_progress');
  assert.equal(r.body.data.class.itemsTotal, 3);
  assert.equal(r.body.data.class.firstTryRight, 2);
  assert.deepEqual(r.body.data.class.open.map((o: { item_ref: string }) => o.item_ref), ['QR:fill:40:2']);
  const listen = r.body.data.class.nodes.find((n: { node: string }) => n.node === 'listen');
  assert.deepEqual(listen.sprints, [0]);
  assert.equal(listen.met, 3);
  assert.equal(listen.best, 67);
  assert.equal(r.body.data.sprint.stars, 1);   // 2 of 3 first time: 67%

  // completion refused while one is open
  r = await call('POST', '/core/drill/class/complete', { scope, bands });
  assert.equal(r.status, 409);

  // day 3: the practice node clears it
  r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'practice', sprint: 0, of: 1, seconds: 30, day: '2026-10-03', bands,
    items: [{ ref: 'QR:fill:40:2', first: true, misses: 0, streak: 1 }],
  });
  assert.equal(r.body.data.class.open.length, 0);
  assert.equal(r.body.data.class.activeDays, 2);
  assert.equal(r.body.data.class.firstTryRight, 2);   // first-time right is kept from day 1

  r = await call('POST', '/core/drill/class/complete', { scope, bands });
  assert.equal(r.status, 200);
  const c = r.body.data.class;
  assert.equal(c.status, 'studied');
  assert.equal(c.score, 67);
  assert.equal(c.rating, 1);
  assert.equal(c.daysTaken, 3);
  assert.equal(r.body.data.filed, 3);

  // every drill is a card, graded: the perfected one Hard, the rest Good
  const reviews = db.prepare(
    `SELECT c.resource_ref AS ref, r.rating FROM core_srs_review r JOIN core_srs_card c ON c.id = r.card_id ORDER BY c.resource_ref`,
  ).all() as Array<{ ref: string; rating: number }>;
  assert.deepEqual(reviews.map((x) => [x.ref, x.rating]),
    [['QR:fill:40:1', 3], ['QR:fill:40:2', 2], ['QR:fill:40:3', 3]]);

  // completing again files nothing twice
  r = await call('POST', '/core/drill/class/complete', { scope, bands });
  assert.equal(r.body.data.filed, 0);

  // the sūra's list
  r = await call('GET', '/core/drill/classes?module=QR&prefix=QR:SP:40:');
  assert.equal(r.body.data.classes.length, 1);
  assert.equal(r.body.data.classes[0].rating, 1);
});

test('bad input is refused', async () => {
  const { call } = await setup();
  assert.equal((await call('POST', '/core/drill/class/progress', { scope, module: 'XX', node: 'n', day: '2026-10-01', items: [] })).status, 400);
  assert.equal((await call('POST', '/core/drill/class/progress', { scope, module: 'QR', node: 'n', day: 'today', items: [] })).status, 400);
  assert.equal((await call('POST', '/core/drill/class/complete', { scope })).status, 404);
  assert.equal((await call('GET', '/core/drill/class?scope=nope')).body.data.class, null);
});
