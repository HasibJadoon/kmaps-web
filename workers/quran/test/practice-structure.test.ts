// The structure builder over a real SQLite: a sūra of five passages with the naẓm sections
// the passage studies hold — a relation, a ring pair, an unpaired passage, a movement of three.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { structureDrills } from '../src/routes/practice-structure';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    return { async all<T>() { return { results: stmt.all(...(params as never[])) as T[] }; } };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }) };
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_surah_study_passage (id TEXT, surah INT, passage_no INT, ayah_from INT, ayah_to INT, title_en TEXT, title_ar TEXT, status TEXT);
    CREATE TABLE qr_passage_section (passage_id TEXT, surah INT, renderer TEXT, data_json TEXT, status TEXT, sort_order INT);
    CREATE TABLE ar_ling_gram_term (id TEXT, category_key TEXT, term_key TEXT, name_ar TEXT, status TEXT, term_order INT);`);
  const P = db.prepare(`INSERT INTO qr_surah_study_passage VALUES (?, 40, ?, ?, ?, ?, NULL, 'live')`);
  [[1, 1, 3, 'Tanzil'], [2, 4, 5, 'The Charge'], [3, 6, 6, 'The Word Falls Due'], [4, 7, 9, 'The Throne-Bearers'], [5, 10, 12, 'The Cry']]
    .forEach(([no, a, b, t]) => P.run(`QR:SP:40:${a}-${b}`, no, a, b, t));
  const S = db.prepare(`INSERT INTO qr_passage_section VALUES (?, 40, ?, ?, NULL, 0)`);
  S.run('QR:SP:40:4-5', 'nazm_relation', JSON.stringify({ relation: { type: 'premise', partner: 'QR:SP:40:1-3', evidence_ar: 'فلا يغررك', note: 'the dependent side' } }));
  S.run('QR:SP:40:4-5', 'nazm_ring', JSON.stringify({ ring: { side: 'first', partner: 'QR:SP:40:10-12' }, evidence: '40:4 ↔ 40:10' }));
  S.run('QR:SP:40:6-6', 'nazm_ring', JSON.stringify({ ring: { side: 'unpaired' } }));
  for (const p of ['QR:SP:40:4-5', 'QR:SP:40:6-6', 'QR:SP:40:7-9'])
    S.run(p, 'nazm_arc', JSON.stringify({ arc: { key: 'indictment', label_en: 'The Indictment', label_ar: 'جدال', type: 'escalation' } }));
  S.run('QR:SP:40:10-12', 'nazm_arc', JSON.stringify({ arc: { key: 'ground', label_en: 'The Ground', type: 'bracket' } }));
  const T = db.prepare(`INSERT INTO ar_ling_gram_term VALUES (?, ?, ?, ?, 'live', ?)`);
  ([['nazm_relation', ['premise', 'التمهيد'], ['twin', 'التناظر'], ['mirror', 'التقابل'], ['contest', 'المحاجة']],
    ['nazm_arc', ['escalation', 'الترقي'], ['bracket', 'الاحتواء'], ['chain', 'التسلسل']],
    ['ring_side', ['first', 'الطرف الأول'], ['unpaired', 'المنفرد'], ['centre', 'المركز']]] as [string, ...string[][]][])
    .forEach(([cat, ...ts]) => ts.forEach(([k, ar], i) => T.run(`GT:${cat}:${k}`, cat, k, ar, i)));
  return { DB_QR: d1(db) } as never;
}

test('a passage in scope yields every structure drill it holds, each with its term', async () => {
  const ds = await structureDrills(setup(), 50, { surah: 40, from: 4, to: 5 }, {}, {});
  const byAsk = (a: string) => ds.filter((d) => d.ask === a);

  const [rel] = byAsk('st_relation');
  assert.equal(rel.answer, 'التمهيد');
  assert.equal(rel.term, 'GT:nazm_relation:premise');
  assert.ok((rel.options as string[]).includes('التمهيد'));
  assert.equal((rel.options as string[]).length, 4);
  assert.equal(rel.explanation, 'the dependent side');

  const [ring] = byAsk('st_ring');
  assert.equal(ring.answer, '40:10–12 · The Cry');
  assert.ok(!(ring.options as string[]).includes('40:4–5 · The Charge'));   // never itself

  const [arc] = byAsk('st_arc');
  assert.equal(arc.answer, 'The Indictment');
  const [shape] = byAsk('st_arc_shape');
  assert.equal(shape.answer, 'الترقي');
  const [order] = byAsk('st_arc_order');
  assert.equal(order.interaction, 'order_units');
  assert.deepEqual(order.units, ['40:4–5 · The Charge', '40:6 · The Word Falls Due', '40:7–9 · The Throne-Bearers']);
  const [place] = byAsk('st_place');
  assert.deepEqual(place.units, ['40:1–3 · Tanzil', '40:4–5 · The Charge', '40:6 · The Word Falls Due']);

  // every drill files its card, and none asks who said it (Rule 0)
  for (const d of ds) {
    assert.ok((d.srs as { resource_ref: string }).resource_ref.startsWith('QR:structure:'));
    assert.ok(!JSON.stringify(d.options ?? []).match(/Ibn|Rāzī|Islahi|Farahi/));
  }
});

test('an unpaired passage is asked where it stands; ids are never repeated', async () => {
  const ds = await structureDrills(setup(), 50, { surah: 40, from: null, to: null }, {}, {});
  const side = ds.find((d) => d.id === 'structure:ring_side:QR:SP:40:6-6')!;
  assert.equal(side.answer, 'المنفرد');
  assert.equal(side.term, 'GT:ring_side:unpaired');
  const ids = ds.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter((i) => i === 'structure:arc_order:indictment').length, 1);
});
