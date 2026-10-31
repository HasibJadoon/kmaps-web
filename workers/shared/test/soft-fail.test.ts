// Optional reads fail narrowly (code review 2026-10-31): a missing table/column gives the fallback,
// anything else — a bad query, a D1 outage — is logged and thrown, never shown as "no data".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { softFail, rethrowUnlessMissing, isMissingSchema } from '../src/soft-fail';
import { shuffle, uniq, parseJson } from '../src/collections';
import { query } from '../src/db';

function d1(db: DatabaseSync) {
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => ({
    async all<T>() { return { results: db.prepare(sql).all(...(p as never[])) as T[] }; },
    async first<T>() { return (db.prepare(sql).get(...(p as never[])) as T) ?? null; },
  }) }) } as unknown as D1Database;
}

const quiet = <T>(fn: () => Promise<T>) => async () => {
  const [w, e] = [console.warn, console.error];
  console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { console.warn = w; console.error = e; }
};

test('isMissingSchema: SQLite and D1 spellings of a missing table or column', () => {
  assert.ok(isMissingSchema(new Error('no such table: qr_corpus_version')));
  assert.ok(isMissingSchema(new Error('D1_ERROR: no such column: built_at: SQLITE_ERROR')));
  assert.ok(isMissingSchema(new Error('table core_srs_card has no column named drill_gid')));
  assert.ok(!isMissingSchema(new Error('D1_ERROR: too many SQL variables')));
  assert.ok(!isMissingSchema(new Error('Network connection lost.')));
  assert.ok(!isMissingSchema('near "SELEC": syntax error'));
});

test('softFail: a missing table reads as the fallback', quiet(async () => {
  const db = d1(new DatabaseSync(':memory:'));
  const rows = await query(db, 'SELECT x FROM not_made_yet').catch(softFail([] as unknown[]));
  assert.deepEqual(rows, []);
  const one = await query(db, 'SELECT 1 AS n').then((r) => r[0]).catch(softFail(null));
  assert.deepEqual({ ...one as object }, { n: 1 }, 'a good read passes through untouched');
}));

test('softFail: any other failure is rethrown, not swallowed', quiet(async () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE t (a INTEGER)');
  const db = d1(raw);
  await assert.rejects(query(db, 'SELEC a FROM t').catch(softFail([])), /syntax error/);
  await assert.rejects(Promise.reject(new Error('D1_ERROR: Network connection lost.')).catch(softFail(null, 'beacon')), /Network/);
}));

test('rethrowUnlessMissing: the same rule inside a try block', quiet(async () => {
  assert.doesNotThrow(() => rethrowUnlessMissing(new Error('no such column: x')));
  assert.throws(() => rethrowUnlessMissing(new Error('UNIQUE constraint failed')), /UNIQUE/);
}));

test('collections: shuffle keeps the items and does not touch its input; uniq; parseJson', () => {
  const xs = [1, 2, 3, 4, 5, 6];
  const s = shuffle(xs);
  assert.deepEqual([...s].sort(), xs);
  assert.deepEqual(xs, [1, 2, 3, 4, 5, 6]);
  let k = 0;
  const seq = () => [0.9, 0.1, 0.5, 0.3, 0.7][k++ % 5];
  k = 0; const a = shuffle(xs, seq); k = 0; const b = shuffle(xs, seq);
  assert.deepEqual(a, b, 'a seeded rand deals the same order');
  assert.deepEqual(uniq(['b', 'a', 'b', 'c', 'a']), ['b', 'a', 'c']);
  assert.deepEqual(parseJson('{"a":1}', {}), { a: 1 });
  assert.deepEqual(parseJson('{bad', { d: 1 }), { d: 1 });
  assert.equal(parseJson(null, 7), 7);
  assert.equal(parseJson('', 7), 7);
});
