// The bank: a drill missed the first time is kept ungraded (state 'new') — its lesson deals it again — and review never
// deals it; a miss on it again leaves it there; answered well, it moves into review.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileCards } from '../src/srs/file-cards';
import { SrsRepo } from '../src/repositories/srs.repo';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    const args = params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p)) as never[];
    return {
      async all<T>() { return { results: (/^\s*(SELECT|WITH)|RETURNING/i.test(sql) ? stmt.all(...args) : (stmt.run(...args), [])) as T[] }; },
      async first<T>() { return (stmt.get(...args) as T) ?? null; },
      async run() { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes } }; },
    };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }),
           async batch(stmts: Array<{ run(): Promise<unknown> }>) { const o = []; for (const s of stmts) o.push(await s.run()); return o; } };
}

test('a first miss is banked, stays banked when missed again, and goes to review when answered well', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const env = { DB_CORE: d1(db) } as never;
  const card = (rating: number) => ({ module: 'AR', resource_type: 'vocabulary', resource_ref: 'AR:drill:fill:x', card_template: 'fill',
                                      front_text: 'q', back_text: 'a', extra: { drill: { id: 'fill:x', kind: 'fill' } }, rating });
  const state = () => { const r = db.prepare(`SELECT card_state, reps FROM core_srs_card WHERE resource_ref = 'AR:drill:fill:x'`).get() as { card_state: string; reps: number } | undefined; return r ? { ...r } : r; };

  const r1 = await fileCards(env, 'U1', [card(1)], { byModule: true, holdMisses: true });
  assert.equal(r1.held, 1);
  assert.deepEqual(state(), { card_state: 'new', reps: 0 }, 'kept in the bank, ungraded');
  const repo = new SrsRepo((env as { DB_CORE: never }).DB_CORE);
  assert.equal((await repo.due('U1', {})).length, 0, 'review never deals a banked drill');
  assert.equal((await repo.due('U1', { state: 'bank' })).length, 1, 'its lesson does');

  await fileCards(env, 'U1', [card(2)], { byModule: true, holdMisses: true });
  assert.equal(state()!.card_state, 'new', 'missed again: still banked');

  await fileCards(env, 'U1', [card(3)], { byModule: true, holdMisses: true });
  assert.notEqual(state()!.card_state, 'new', 'answered well: into review');
  assert.equal(state()!.reps, 1);
});

test('a resent answer changes nothing; review deals drills only; a leech goes back to its lesson', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const env = { DB_CORE: d1(db) } as never;
  const repo = new SrsRepo((env as { DB_CORE: never }).DB_CORE);
  const entry = (ref: string, rating: number, op: string) => ({ module: 'QR', resource_type: 'passage', resource_ref: ref, card_template: 'fill',
    front_text: 'q', back_text: 'a', extra: { drill: { id: ref, kind: 'fill' }, group: { workId: 'QR:SURAH:40' } }, rating, op_id: op });

  await fileCards(env, 'U1', [entry('QR:fill:40:1', 3, 'op-1')], { byModule: true, holdMisses: true });
  const reps = () => (db.prepare(`SELECT reps FROM core_srs_card WHERE resource_ref = 'QR:fill:40:1'`).get() as { reps: number }).reps;
  assert.equal(reps(), 1);
  // the same answer resent (a lost response): no second step — and a not-yet-due drill met again is only "seen"
  const again = await fileCards(env, 'U1', [entry('QR:fill:40:1', 3, 'op-1')], { byModule: true, holdMisses: true });
  assert.equal(reps(), 1);
  assert.ok(again.cards[0].seen || again.cards[0].graded === false);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM core_srs_review WHERE op_id = 'op-1'`).get()!.n, 1);
  assert.equal(db.prepare(`SELECT work_ref FROM core_srs_card WHERE resource_ref = 'QR:fill:40:1'`).get()!.work_ref, 'QR:SURAH:40');
  // every drill has one global id
  assert.equal(db.prepare(`SELECT drill_gid FROM core_srs_card WHERE resource_ref = 'QR:fill:40:1'`).get()!.drill_gid, 'DRL:QR:QR:fill:40:1');

  // nothing reaches SRS without its drill and its answer
  const bare = await fileCards(env, 'U1', [{ module: 'QR', resource_type: 'passage', resource_ref: 'QR:x', front_text: 'q', back_text: 'a' }],
                               { byModule: true, holdMisses: true });
  assert.match(String(bare.cards[0].error), /drill and its answer/);

  // review deals drills only, and never a leech; a leech is in its lesson's bank
  db.exec(`UPDATE core_srs_card SET next_review_at = '2000-01-01T00:00:00Z'`);
  assert.equal((await repo.due('U1', {})).length, 1);
  db.exec(`UPDATE core_srs_card SET leech = 1`);
  assert.equal((await repo.due('U1', {})).length, 0);
  assert.equal((await repo.due('U1', { state: 'bank', work: 'QR:SURAH:40' })).length, 1);
});
