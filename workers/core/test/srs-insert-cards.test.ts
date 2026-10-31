// Deck copy in batches (code review 2026-10-31): insertCards writes the same rows insertCard does,
// in db.batch() chunks, and counts only the rows that were new.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SrsRepo, type CardInsert } from '../src/repositories/srs.repo';

function d1(db: DatabaseSync, log: { batches: number; singles: number }) {
  const bound = (sql: string, params: unknown[]) => {
    const args = params.map((p) => (p === undefined ? null : p)) as never[];
    const isRead = /^\s*(SELECT|WITH)/i.test(sql);
    return {
      async all<T>() { log.singles++; return { results: db.prepare(sql).all(...args) as T[] }; },
      async first<T>() { log.singles++; return (db.prepare(sql).get(...args) as T) ?? null; },
      async run() { log.singles++; const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      async step() {
        if (isRead) return { success: true, results: db.prepare(sql).all(...args), meta: { changes: 0 } };
        const r = db.prepare(sql).run(...args); return { success: true, results: [], meta: { changes: Number(r.changes) } };
      },
    };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }),
           async batch(stmts: Array<{ step(): Promise<unknown> }>) { log.batches++; const o = []; for (const s of stmts) o.push(await s.step()); return o; } };
}

test('insertCards: chunks through db.batch, skips what the deck already holds, and files what insertCard would', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const log = { batches: 0, singles: 0 };
  const repo = new SrsRepo(d1(db, log) as never);
  const deck = (await repo.createDeck({ user_ref: 'U1', title: 'QR' })).id;

  const card = (i: number): CardInsert => ({
    deck_id: deck, user_ref: 'U1', module: 'QR', resource_type: 'passage', resource_ref: `QR:fill:40:${i}`,
    card_template: `fill:${i}`, front_text: `q${i}`, back_text: `a${i}`,
    extra_json: JSON.stringify({ drill: { id: `fill:${i}`, kind: 'fill' }, group: { workId: 'QR:SURAH:40' } }),
  });
  const first = Array.from({ length: 120 }, (_, i) => card(i));
  assert.equal(await repo.insertCards(first, 50), 120);
  assert.equal(log.batches, 3, '120 rows in chunks of 50: three round trips');

  // a second copy of an overlapping set adds only the new ones
  const again = Array.from({ length: 30 }, (_, i) => card(100 + i));
  assert.equal(await repo.insertCards(again, 50), 10);

  const row = db.prepare(`SELECT deck_id, front_text, card_template, work_ref, drill_gid, next_review_at FROM core_srs_card WHERE resource_ref = 'QR:fill:40:7'`).get() as Record<string, unknown>;
  assert.equal(row.front_text, 'q7');
  assert.equal(row.card_template, 'fill:7');
  assert.equal(row.work_ref, 'QR:SURAH:40');
  assert.match(String(row.drill_gid), /^DRL:QR:[A-Z]{2}:fill:7$/);
  assert.ok(row.next_review_at);

  // the single-card path writes the same columns
  const { inserted } = await repo.insertCard(card(500));
  assert.ok(inserted);
  const one = db.prepare(`SELECT work_ref, drill_gid FROM core_srs_card WHERE resource_ref = 'QR:fill:40:500'`).get() as Record<string, unknown>;
  assert.equal(one.work_ref, 'QR:SURAH:40');
  assert.match(String(one.drill_gid), /^DRL:QR:[A-Z]{2}:fill:500$/);
});
