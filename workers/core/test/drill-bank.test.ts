// The authored bank's rules (core 052, AGR:DRL): a clean drill breaks none; each fault is caught by its own rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { auditDrills } from '../src/routes/drills';

function d1(db: DatabaseSync) {
  return { prepare: (sql: string) => {
    const run = (args: unknown[]) => ({
      async all<T>() { return { results: db.prepare(sql).all(...(args as never[])) as T[] }; },
      async first<T>() { return (db.prepare(sql).get(...(args as never[])) as T) ?? null; },
      async run() { db.prepare(sql).run(...(args as never[])); return { success: true }; },
    });
    return { bind: (...a: unknown[]) => run(a), ...run([]) };
  } } as unknown as D1Database;
}

test('AGR:DRL: a clean drill passes; a broken one is caught by its rule', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  // the rules themselves, as migration 052 writes them
  const mig = readFileSync(new URL('../migrations/052_cyb_drill.sql', import.meta.url), 'utf8');
  db.exec(mig.slice(mig.indexOf('INSERT OR REPLACE INTO cyb_agent_rule')));
  db.exec(`INSERT INTO cyb_discipline (code, ord, name_ar, name_en, question_en, deck_id) VALUES ('SF', 10, 'صرف', 'Morphology', 'q', 'DECK:AL');
           INSERT INTO cyb_drill_type (domain, scope, code, discipline, status) VALUES ('QR', 'kind', 'gt_book', 'NH', 'retired');`);
  const put = (gid: string, kind: string, payload: object, interaction = 'choose', discipline = 'SF') =>
    db.prepare(`INSERT INTO cyb_drill (gid, domain, discipline, kind, interaction, payload_json, status) VALUES (?, 'QR', ?, ?, ?, ?, 'live')`)
      .run(gid, discipline, kind, interaction, JSON.stringify(payload));
  put('DRL:QR:SF:a', 'sarf_mudari', { id: 'a', options: ['يُنْزِلُ', 'يَنْزِلُ', 'يُنَزِّلُ'], answer: 'يُنْزِلُ' });
  let audit = await auditDrills(d1(db));
  assert.ok(audit.length >= 8);
  assert.ok(audit.every((r) => r.ok), JSON.stringify(audit.filter((r) => !r.ok)));

  put('DRL:QR:XX:b', 'x', { id: 'b' }, 'choose', 'XX');                                        // 001 unclassified
  put('DRL:QR:SF:wrong', 'x', { id: 'c' });                                                      // 002 gid ≠ standard
  put('DRL:QR:SF:d', 'x', { id: 'd', options: ['أ', 'ب'], answer: 'ج' });                         // 003 two, answer missing
  put('DRL:QR:SF:e', 'x', { id: 'e', options: ['أ', 'أ', 'ب'], answer: 'أ' });                     // 004 the same twice
  put('DRL:QR:SF:f', 'x', { id: 'f', pairs: [['أ', 'a'], ['ب', 'b']] }, 'pairs');                 // 005 two pairs
  put('DRL:QR:SF:g', 'x', { id: 'g' }, 'type_it');                                               // 006 typed
  put('DRL:QR:SF:h', 'gt_book', { id: 'h' });                                                    // 007 who/which book
  put('DRL:QR:SF:i', 'fill', { id: 'i', words: [{ t: 'حم' }] });                                 // 008 no audio
  audit = await auditDrills(d1(db));
  const bad = Object.fromEntries(audit.map((r) => [r.id, r.found]));
  for (const id of ['AGR:DRL:001', 'AGR:DRL:002', 'AGR:DRL:003', 'AGR:DRL:004', 'AGR:DRL:005', 'AGR:DRL:006', 'AGR:DRL:007', 'AGR:DRL:008']) {
    assert.ok((bad[id] ?? 0) >= 1, `${id} catches its fault (found ${bad[id]})`);
  }
});
