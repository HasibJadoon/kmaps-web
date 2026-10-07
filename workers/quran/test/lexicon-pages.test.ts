// A root's and a lemma's pages are the lexicon's: built from every Qurʾānic word of the root or the lemma, not from a
// passage. Over a real SQLite with no AL service, so only the Qurʾān's side is read: the words, their counts, the labels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { lexiconRoot, lexiconLemma } from '../src/routes/practice-sarf';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    return {
      async all<T>() { return { results: stmt.all(...(params as never[])) as T[] }; },
      async first<T>() { return (stmt.get(...(params as never[])) as T) ?? null; },
    };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }) };
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_word_occurrence (surah INT, ayah INT, word_index INT, root TEXT, root_uid TEXT, gid_lemma TEXT, lemma TEXT);
    CREATE TABLE ar_ling_gram_term (id TEXT, name_ar TEXT, name_en TEXT);
    CREATE TABLE qr_study_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, sort INT);
    INSERT INTO qr_study_label VALUES ('lex_page', 'lemma', 'Lemma', 'اللفظة', NULL, NULL, 1), ('sarf_section', 'tables', 'The verb tables', NULL, NULL, NULL, 1);`);
  const W = db.prepare(`INSERT INTO qr_word_occurrence VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (let i = 0; i < 3; i++) W.run(2, i + 1, 1, 'كتب', 'RK', 'AL:aaaaaaaaaaaaaaaaaaaaaa', 'كِتَٰب');   // the book, three times
  W.run(2, 9, 2, 'كتب', 'RK', 'AL:bbbbbbbbbbbbbbbbbbbbbb', 'كَتَبَ');                                   // the verb, once
  W.run(3, 1, 1, 'علم', 'RA', 'AL:cccccccccccccccccccccc', 'عَلِيم');                                    // another root
  W.run(3, 2, 1, null, null, 'AL:dddddddddddddddddddddd', 'مِن');                                        // a particle: no root
  return { DB_QR: d1(db) } as never;
}

test('a root\'s page lists its words across the Qurʾān, most used first, and its total', async () => {
  const p = (await lexiconRoot(setup(), 'كتب'))!;
  assert.equal(p.root, 'كتب');
  assert.equal(p.letters, 'ك ت ب');
  assert.equal(p.count, 4);
  assert.deepEqual(p.lemmas.map((l) => [l.id, l.lemma, l.count]),
    [['AL:aaaaaaaaaaaaaaaaaaaaaa', 'كِتَٰب', 3], ['AL:bbbbbbbbbbbbbbbbbbbbbb', 'كَتَبَ', 1]]);
  assert.deepEqual(p.lex.map((l) => l.key), ['lemma']);
  assert.deepEqual(p.sections.map((s) => s.key), ['tables']);
});

test('a root the Qurʾān does not use has no page', async () => {
  assert.equal(await lexiconRoot(setup(), 'زرق'), null);
});

test('a lemma\'s page is the same from every verse: its root and its count across the Qurʾān', async () => {
  const env = setup();
  const a = (await lexiconLemma(env, 'AL:aaaaaaaaaaaaaaaaaaaaaa'))!;
  const b = (await lexiconLemma(env, 'aaaaaaaaaaaaaaaaaaaaaa'))!;    // with or without the AL: prefix
  assert.equal(a.lemma, 'كِتَٰب');
  assert.equal(a.root, 'كتب');
  assert.equal(a.count, 3);
  assert.deepEqual(a, b);
});

test('a lemma with no root (a particle) still has its page; an unknown lemma has none', async () => {
  const p = (await lexiconLemma(setup(), 'AL:dddddddddddddddddddddd'))!;
  assert.equal(p.root, null);
  assert.equal(p.letters, null);
  assert.deepEqual(p.constructions, []);
  assert.equal(await lexiconLemma(setup(), 'AL:eeeeeeeeeeeeeeeeeeeeee'), null);
});

import { baseVerbOf } from '../src/routes/practice-sarf';
const verb = (id: string, madi: string, mudari: string, form: string, bab: string | null) =>
  ({ id, madi, mudari, form_gt: `GT:form_family:${form}`, bab_gt: bab }) as never;

test('a derived word comes from the verb AL names, in its باب; else its family; else the root\'s one Form I verb', () => {
  const daraba = verb('V1', 'كَتَبَ', 'يَكْتِبُ', 'form_i', 'GT:form_family:bab_daraba');
  const nasara = verb('V2', 'كَتَبَ', 'يَكْتُبُ', 'form_i', 'GT:form_family:bab_nasara');
  const iftaala = verb('V3', 'اكْتَتَبَ', 'يَكْتَتِبُ', 'form_viii', null);
  // AL names the verb and its باب: that one, even where the root has two باب of the same past
  assert.equal((baseVerbOf({ base_verb: 'كَتَبَ يَكْتُبُ', family_id: 'GT:form_family:bab_nasara' }, null, [daraba, nasara, iftaala]) as { id: string }).id, 'V2');
  // a named form family with one verb in it
  assert.equal((baseVerbOf({ base_verb: null, family_id: 'GT:form_family:form_viii' }, null, [nasara, iftaala]) as { id: string }).id, 'V3');
  // a participle with nothing named: the root's only Form I verb
  assert.equal((baseVerbOf(null, 'GT:derivation_type:active_participle', [nasara, iftaala]) as { id: string }).id, 'V2');
  // two Form I verbs and nothing named: no guess
  assert.equal(baseVerbOf(null, 'GT:derivation_type:active_participle', [daraba, nasara]), null);
  // a جامد word has no verb behind it
  assert.equal(baseVerbOf({ base_verb: null, family_id: null, jumud_id: 'GT:jumud:jamid' }, 'GT:derivation_type:active_participle', [nasara]), null);
});
