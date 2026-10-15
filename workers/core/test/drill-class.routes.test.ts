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

async function setup(user = 'U1') {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const routes = new Map<string, Handler>();
  drillClassRoutes({
    get: (p: string, h: Handler) => routes.set(`GET ${p}`, h),
    post: (p: string, h: Handler) => routes.set(`POST ${p}`, h),
  } as never);
  const secret = 'test-secret';
  const token = await signJwt({ sub: user, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
  const env = { DB_CORE: d1(db), JWT_SECRET: secret };
  const call = async (method: 'GET' | 'POST', path: string, body?: unknown) => {
    const [p, q] = path.split('?');
    const res = await routes.get(`${method} ${p}`)!(new Request(`http://x${p}${q ? `?${q}` : ''}`, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), env, {});
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  const as = async (who: string) => {
    const t = await signJwt({ sub: who, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
    return async (method: 'GET' | 'POST', path: string, body?: unknown) => {
      const [p, q] = path.split('?');
      const res = await routes.get(`${method} ${p}`)!(new Request(`http://x${p}${q ? `?${q}` : ''}`, {
        method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }), env, {});
      return { status: res.status, body: await res.json() as Record<string, any> };
    };
  };
  return { db, call, as };
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
  // what is learnt goes to review at once: the two right the first time; the missed one waits
  assert.equal(r.body.data.sprint.filed, 2);

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
  assert.equal(r.body.data.sprint.filed, 1);          // perfected now, so filed now

  r = await call('POST', '/core/drill/class/complete', { scope, bands });
  assert.equal(r.status, 200);
  const c = r.body.data.class;
  assert.equal(c.status, 'studied');
  assert.equal(c.score, 67);
  assert.equal(c.rating, 1);
  assert.equal(c.daysTaken, 3);
  assert.equal(r.body.data.filed, 0);                 // all already filed as they were learnt

  // every drill is filed Good — learnt is learnt, a perfected one too (a Hard would undercut the bank rule)
  const reviews = db.prepare(
    `SELECT c.resource_ref AS ref, r.rating FROM core_srs_review r JOIN core_srs_card c ON c.id = r.card_id ORDER BY c.resource_ref`,
  ).all() as Array<{ ref: string; rating: number }>;
  assert.deepEqual(reviews.map((x) => [x.ref, x.rating]),
    [['QR:fill:40:1', 3], ['QR:fill:40:2', 3], ['QR:fill:40:3', 3]]);

  // completing again files nothing twice
  r = await call('POST', '/core/drill/class/complete', { scope, bands });
  assert.equal(r.body.data.filed, 0);

  // the sūra's list
  r = await call('GET', '/core/drill/classes?module=QR&prefix=QR:SP:40:');
  assert.equal(r.body.data.classes.length, 1);
  assert.equal(r.body.data.classes[0].rating, 1);
});

test('words not caught are kept with the line, every sprint, and filed on its card', async () => {
  const { db, call } = await setup();
  const ref = 'tafsir_line:QRTA:razi:40-01:55';
  // heard in the listen gate (work 0 of 4): two words tapped, the line comes back to perfect
  let r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'listen', sprint: 0, of: 4, seconds: 900, day: '2026-10-01', bands,
    items: [{ ref, first: false, misses: 0, streak: 0, marked: true, missed: [3, 1], card: card(ref) }],
  });
  assert.deepEqual(r.body.data.class.open.map((o: { item_ref: string; missed: number[] }) => [o.item_ref, o.missed]), [[ref, [1, 3]]]);
  // in practice another word is missed: both sprints' words are kept
  r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'practice', sprint: 0, of: 1, seconds: 20, day: '2026-10-01', bands,
    items: [{ ref, first: false, misses: 0, streak: 0, marked: true, missed: [5, 3], card: card(ref) }],
  });
  assert.deepEqual(r.body.data.class.open[0].missed, [1, 3, 5]);
  const row = db.prepare('SELECT card_json, missed_json FROM core_drill_class_item WHERE item_ref = ?').get(ref) as { card_json: string; missed_json: string };
  assert.deepEqual(JSON.parse(row.missed_json), [1, 3, 5]);
  assert.deepEqual(JSON.parse(row.card_json).extra.drill.missed, [1, 3, 5]);
  // a clean replay keeps them: the card still shows which words were hard
  r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'practice', sprint: 0, of: 1, seconds: 20, day: '2026-10-02', bands,
    items: [{ ref, first: true, misses: 0, streak: 2, card: card(ref) }],
  });
  assert.equal(r.body.data.class.open.length, 0);
  const after = db.prepare('SELECT card_json FROM core_drill_class_item WHERE item_ref = ?').get(ref) as { card_json: string };
  assert.deepEqual(JSON.parse(after.card_json).extra.drill.missed, [1, 3, 5]);
});

test('each person has their own study and their own score', async () => {
  const { db, as } = await setup();
  db.exec(`INSERT INTO core_users (id, email, display_name) VALUES ('U1', 'a@x', 'Amina'), ('U2', 'b@x', 'Bilal')`);
  const amina = await as('U1');
  const bilal = await as('U2');
  // Amina studies 40:1-3 cleanly; Bilal misses one and only starts
  const run = (who: typeof amina, first: boolean) => who('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'read', sprint: 0, of: 1, seconds: 60, day: '2026-10-02', bands,
    items: [{ ref: 'QR:fill:40:1', first, misses: first ? 0 : 1, streak: 1, card: card('QR:fill:40:1') }],
  });
  await run(amina, true);
  await run(bilal, false);
  assert.equal((await amina('POST', '/core/drill/class/complete', { scope, bands })).status, 200);
  assert.equal((await bilal('POST', '/core/drill/class/complete', { scope, bands })).status, 409);   // his miss is still open

  // each sees only their own record of the same passage
  const a = (await amina('GET', `/core/drill/class?scope=${scope}`)).body.data.class;
  const b = (await bilal('GET', `/core/drill/class?scope=${scope}`)).body.data.class;
  assert.equal(a.status, 'studied');
  assert.equal(a.score, 100);
  assert.equal(b.status, 'in_progress');
  assert.equal(b.open.length, 1);
  assert.equal(a.open.length, 0);

  // the scores: mine is mine; the standings count each from their own record
  const s1 = (await amina('GET', '/core/drill/scores?module=QR')).body.data;
  assert.equal(s1.me, 'U1');
  assert.deepEqual(s1.mine.map((c: { scope: string; status: string }) => [c.scope, c.status]), [[scope, 'studied']]);
  assert.deepEqual(s1.standings.map((r: { name: string; studied: number; underWay: number }) => [r.name, r.studied, r.underWay]),
    [['Amina', 1, 0], ['Bilal', 0, 1]]);
  const s2 = (await bilal('GET', '/core/drill/scores?module=QR')).body.data;
  assert.deepEqual(s2.mine.map((c: { status: string }) => c.status), ['in_progress']);
  // and the cards filed went to Amina's review alone
  const owners = db.prepare('SELECT DISTINCT user_ref FROM core_srs_card').all() as Array<{ user_ref: string }>;
  assert.deepEqual(owners.map((o) => o.user_ref), ['U1']);
});

test('a class picks up exactly where the learner left it, and only theirs', async () => {
  const { as } = await setup();
  const amina = await as('U1');
  const bilal = await as('U2');
  // mid-sprint: the third drill of node 'words' sprint 1 is up; one was missed, a word marked
  const where = { kind: 'sprint', node: 'words', sprint: 1, of: 3, drills: ['a', 'b', 'c', 'd'], queue: ['a', 'b', 'c', 'd', 'b'],
                  pos: 2, tally: { a: { first: true, misses: 0, streak: 1 }, b: { first: false, misses: 1, streak: 0 } },
                  marked: { a: [2] }, seconds: 95 };
  let r = await amina('POST', '/core/drill/class/resume', { scope, module: 'QR', resume: where });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.resume.pos, 2);

  // the class (made by the checkpoint) hands it back, with when it was saved
  const c = (await amina('GET', `/core/drill/class?scope=${scope}`)).body.data.class;
  assert.deepEqual({ ...c.resume, savedAt: undefined }, { ...where, savedAt: undefined });
  assert.ok(c.resume.savedAt);
  // Bilal's same passage has nothing
  assert.equal((await bilal('GET', `/core/drill/class?scope=${scope}`)).body.data.class, null);

  // a different sprint sent leaves it; the sprint it holds, sent, clears it
  const send = (sprint: number) => amina('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'words', sprint, of: 3, seconds: 10, day: '2026-10-02', bands, items: [] });
  r = await send(0);
  assert.equal(r.body.data.class.resume.pos, 2);
  r = await send(1);
  assert.equal(r.body.data.class.resume, null);

  // a listen-through is a place too; null clears; junk is refused
  r = await amina('POST', '/core/drill/class/resume', { scope, module: 'QR', resume: { kind: 'listen', node: 'listen' } });
  assert.equal(r.body.data.resume.kind, 'listen');
  r = await amina('POST', '/core/drill/class/resume', { scope, module: 'QR', resume: null });
  assert.equal(r.body.data.resume, null);
  assert.equal((await amina('POST', '/core/drill/class/resume', { scope, module: 'QR', resume: [1] })).status, 400);
  assert.equal((await amina('POST', '/core/drill/class/resume', { scope, module: 'QR', resume: { kind: 'sprint' } })).status, 400);
});

test('bad input is refused', async () => {
  const { call } = await setup();
  assert.equal((await call('POST', '/core/drill/class/progress', { scope, module: 'XX', node: 'n', day: '2026-10-01', items: [] })).status, 400);
  assert.equal((await call('POST', '/core/drill/class/progress', { scope, module: 'QR', node: 'n', day: 'today', items: [] })).status, 400);
  assert.equal((await call('POST', '/core/drill/class/complete', { scope })).status, 404);
  assert.equal((await call('GET', '/core/drill/class?scope=nope')).body.data.class, null);
});

test('the roadmap: a sūra\'s classes, the streak from the learner\'s days, only the reader\'s own', async () => {
  const { call, as } = await setup();
  await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'read', sprint: 0, of: 2, seconds: 60, day: '2026-10-14', bands,
    items: [{ ref: 'QR:fill:40:9', first: false, misses: 1, streak: 1, card: card('QR:fill:40:9') }],
  });
  await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'read', sprint: 1, of: 2, seconds: 30, day: '2026-10-15', bands,
    items: [{ ref: 'QR:fill:40:8', first: true, misses: 0, streak: 1, card: card('QR:fill:40:8') }],
  });
  const r = await call('GET', '/core/drill/roadmap?module=QR&today=2026-10-15');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.sections, [{ section: 'QR:SP:40', studied: 0, underWay: 1, stars: 0, days: 0, open: 1 }]);
  assert.equal(r.body.data.units[0].scope, scope);
  assert.deepEqual(r.body.data.streak, { current: 2, best: 2, today: true });
  assert.equal(r.body.data.days.length, 28);
  assert.equal(r.body.data.days[27].seconds, 30);
  // another reader sees nothing of it
  const other = await (await as('U2'))('GET', '/core/drill/roadmap?module=QR&today=2026-10-15');
  assert.deepEqual(other.body.data.sections, []);
  assert.equal(other.body.data.streak.current, 0);
});

test('a filing that died is taken again once its claim is stale; a live claim is left alone', async () => {
  const { db, call } = await setup();
  const send = (ref: string, day = '2026-10-01') => call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'read', sprint: 0, of: 1, seconds: 10, day, bands,
    items: [{ ref, first: true, misses: 0, streak: 1, card: card(ref) }],
  });
  await send('fill:40:1:1');
  await send('fill:40:1:2');
  const filedAs = (ref: string) => (db.prepare('SELECT filed_card FROM core_drill_class_item WHERE item_ref = ?').get(ref) as { filed_card: string }).filed_card;
  const firstCard = filedAs('fill:40:1:1');
  assert.match(firstCard, /^SRSCARD:|^[^p]/, 'filed at once');
  // one left claimed by a filing that died long ago, one claimed by a filing still under way
  db.prepare(`UPDATE core_drill_class_item SET filed_card = 'pending:2000-01-01T00:00:00Z' WHERE item_ref = 'fill:40:1:1'`).run();
  db.prepare(`UPDATE core_drill_class_item SET filed_card = 'pending:' || strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE item_ref = 'fill:40:1:2'`).run();
  await send('fill:40:1:3', '2026-10-02');
  assert.equal(filedAs('fill:40:1:1'), firstCard, 'the stale claim is filed again, to the same card');
  assert.match(filedAs('fill:40:1:2'), /^pending:/, 'a live claim is not taken from the filing that holds it');
  const cards = db.prepare(`SELECT COUNT(*) AS n FROM core_srs_card WHERE resource_ref = 'fill:40:1:1'`).get() as { n: number };
  assert.equal(cards.n, 1, 'filing again makes no second card');
});

test("a vocabulary drill kept with the old 'vocab' type still reaches review", async () => {
  const { db, call } = await setup();
  const ref = 'vocab:vocab_lemma:40:3:3';
  await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'words', sprint: 0, of: 1, seconds: 10, day: '2026-10-01', bands,
    items: [{ ref, first: true, misses: 0, streak: 1, card: { ...card('QR:vocab:lemma:قبل:قَابِل'), resource_type: 'vocab' } }],
  });
  const row = db.prepare('SELECT filed_card FROM core_drill_class_item WHERE item_ref = ?').get(ref) as { filed_card: string | null };
  assert.ok(row.filed_card && !row.filed_card.startsWith('pending'), 'filed');
  const c = db.prepare('SELECT resource_type FROM core_srs_card WHERE id = ?').get(row.filed_card) as { resource_type: string };
  assert.equal(c.resource_type, 'vocabulary');
});

test('each sub-node (a node\'s drill style) counts its drills passed: right first time or perfected', async () => {
  const { call } = await setup();
  let r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'words', sprint: 0, of: 1, seconds: 60, day: '2026-10-01', bands,
    items: [
      { ref: 'sarf:table:SV:نزل:I:0.1', style: 'sarf:table', first: true, misses: 0, streak: 1, card: card('a') },
      { ref: 'sarf:table:SV:نزل:I:0.2', style: 'sarf:table', first: false, misses: 1, streak: 0, card: card('b') },
      { ref: 'vocab:vocab_root:40:2:1', style: 'vocab:vocab_root', first: true, misses: 0, streak: 1, card: card('c') },
    ],
  });
  const styles = (x: Record<string, any>) => Object.fromEntries(x.data.class.styles.map((s: Record<string, any>) => [s.style, [s.met, s.done]]));
  assert.deepEqual(styles(r.body), { 'sarf:table': [2, 1], 'vocab:vocab_root': [1, 1] });
  // the missed one put right: the sub-node is whole
  r = await call('POST', '/core/drill/class/progress', {
    scope, module: 'QR', node: 'words', sprint: 1, of: 1, seconds: 20, day: '2026-10-01', bands,
    items: [{ ref: 'sarf:table:SV:نزل:I:0.2', style: 'sarf:table', first: true, misses: 0, streak: 2 }],
  });
  assert.deepEqual(styles(r.body), { 'sarf:table': [2, 2], 'vocab:vocab_root': [1, 1] });
});
