// The ṣarf step over a real SQLite loaded with its own migration (qr_073): every drill it deals for
// Ghāfir 40:1–3 is well formed, its answer is among its options, its Qurʾān quotes are cut from the
// muṣḥaf text, and its GT terms are named. Set SARF_DUMP=<file> to write the drills out for review.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { sarfDrills, sarfSheet, cutQuote, skeleton, tableOf, chantOf } from '../src/routes/practice-sarf';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    return {
      async all<T>() { return { results: stmt.all(...(params as never[])) as T[] }; },
      async first<T>() { return (stmt.get(...(params as never[])) as T) ?? null; },
      async run() { const r = stmt.run(...(params as never[])); return { success: true, meta: { changes: r.changes } }; },
    };
  };
  return { prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }) };
}

const FIXTURE = new URL('./fixtures/sarf-ayat.json', import.meta.url);

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_study_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT, min_value REAL,
                                 extra_json TEXT, sort INT, PRIMARY KEY (scope, key));
    INSERT INTO qr_study_label VALUES ('class_node', 'words', 'Words', 'المفردات', NULL, NULL, NULL, NULL, '{"kind":"step","step":2,"skills":["vocab"]}', 2),
      ('class_node', 'expressions', 'Expressions', 'التعابير', NULL, NULL, NULL, NULL, '{"kind":"step","step":3,"skills":["expression"]}', 3),
      ('class_node', 'sentences', 'Sentences', 'الجمل', NULL, NULL, NULL, NULL, '{"kind":"step","step":4,"skills":["translation","ss"]}', 4),
      ('class_node', 'check', 'Check', NULL, NULL, NULL, NULL, NULL, '{"kind":"check","step":8}', 9),
      ('skill', 'translation', 'Translation', NULL, NULL, NULL, NULL, NULL, '{}', 9),
      ('skill', 'lexicon', 'Lexicons', NULL, NULL, NULL, NULL, NULL, '{"source":"lexicon","levels":{"middle":{"types":["which_lexicon"]},"advanced":{"types":["style"]}}}', 30);
    CREATE TABLE qr_vocab_root_core (root TEXT, source_slug TEXT, text_ar TEXT, text_en TEXT, citation TEXT NOT NULL, al_ref TEXT, PRIMARY KEY (root, source_slug));
    CREATE TABLE qr_vocab_item (surah INT, ayah INT, word_index INT, here_en TEXT, gloss_en TEXT);
    CREATE TABLE ar_ling_gram_term (id TEXT PRIMARY KEY, category_key TEXT, term_key TEXT, term_order INT, name_ar TEXT, name_en TEXT,
                                    name_ur TEXT, short_ar TEXT, short_en TEXT, status TEXT);
    CREATE TABLE qr_ayah (surah INT, ayah INT, text TEXT, text_uthmani TEXT);`);
  const gt = db.prepare(`INSERT INTO ar_ling_gram_term (id, name_ar) VALUES (?, ?)`);
  for (const [id, ar] of [['GT:form_family:bab_nasara', 'بابُ نَصَرَ'], ['GT:form_family:bab_daraba', 'بابُ ضَرَبَ'], ['GT:form_family:bab_fataha', 'بابُ فَتَحَ'],
    ['GT:form_family:bab_samia', 'بابُ سَمِعَ'], ['GT:form_family:bab_hasiba', 'بابُ حَسِبَ'], ['GT:form_family:bab_karuma', 'بابُ كَرُمَ'],
    ['GT:form_family:form_ii', 'تَفْعِيل'], ['GT:form_family:form_iii', 'مُفَاعَلَة'], ['GT:form_family:form_iv', 'إِفْعَال'], ['GT:form_family:form_v', 'تَفَعُّل'],
    ['GT:form_family:form_vi', 'تَفَاعُل'], ['GT:form_family:form_vii', 'اِنْفِعَال'], ['GT:form_family:form_viii', 'اِفْتِعَال'], ['GT:form_family:form_x', 'اِسْتِفْعَال'],
    ['GT:derivation_type:active_participle', 'اسم الفاعل'], ['GT:derivation_type:sifa_mushabbaha', 'الصفة المشبّهة'],
    ['GT:derivation_type:passive_participle', 'اسم المفعول']]) gt.run(id, ar);
  db.exec(readFileSync(new URL('../migrations/qr_073_sarf_saghir.sql', import.meta.url), 'utf8'));
  const ayat = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, string> : {};
  const ins = db.prepare(`INSERT INTO qr_ayah (surah, ayah, text_uthmani) VALUES (?, ?, ?)`);
  for (const [k, t] of Object.entries(ayat)) { const [s, a] = k.split(':').map(Number); ins.run(s, a, t); }
  return { db, env: { DB_QR: d1(db) } as never };
}

test('a bare needle finds its words in the Uthmānī text', () => {
  assert.equal(skeleton('ٱلۡكِتَٰبِ'), skeleton('الكتاب'));
  assert.equal(cutQuote('غَافِرِ ٱلذَّنۢبِ وَقَابِلِ ٱلتَّوۡبِ شَدِيدِ ٱلۡعِقَابِ ذِي ٱلطَّوۡلِۖ لَآ إِلَٰهَ إِلَّا هُوَۖ إِلَيۡهِ ٱلۡمَصِيرُ', 'اليه المصير'),
    'إِلَيۡهِ ٱلۡمَصِيرُ');
  assert.equal(cutQuote('تَنزِيلُ ٱلۡكِتَٰبِ', 'نزل الكتاب'), null);
});

test('the step is Words and Expressions as one, and the retired drills are gone', () => {
  const { db } = setup();
  const node = (k: string) => db.prepare(`SELECT label_ar, extra_json FROM qr_study_label WHERE scope = 'class_node' AND key = ?`).get(k) as
    { label_ar: string; extra_json: string } | undefined;
  assert.equal(node('words')!.label_ar, 'الصَّرْف');
  assert.deepEqual(JSON.parse(node('words')!.extra_json).skills, ['sarf', 'vocab']);
  assert.equal(node('expressions'), undefined);
  assert.equal(JSON.parse(node('sentences')!.extra_json).step, 3);
  assert.equal(JSON.parse(node('check')!.extra_json).step, 7);
  assert.equal(db.prepare(`SELECT 1 FROM qr_study_label WHERE scope = 'skill' AND key = 'translation'`).get(), undefined);
  const lex = JSON.parse((db.prepare(`SELECT extra_json FROM qr_study_label WHERE scope = 'skill' AND key = 'lexicon'`).get() as { extra_json: string }).extra_json);
  assert.ok(!JSON.stringify(lex).includes('which_lexicon') && !JSON.stringify(lex).includes('style'));
});

test('every drill of 40:1–3 is sound', async () => {
  const { db, env } = setup();
  const drills = await sarfDrills(env, 1000, { surah: 40, from: 1, to: 3 });
  if (process.env.SARF_DUMP) writeFileSync(process.env.SARF_DUMP, JSON.stringify(drills.map(({ srs, ...d }) => d), null, 1));
  const kinds = new Map<string, number>();
  for (const d of drills) kinds.set(String(d.ask), (kinds.get(String(d.ask)) ?? 0) + 1);
  for (const k of ['sf_table', 'sf_bab', 'sf_form', 'sf_masadir', 'sf_plural', 'sf_prep', 'sf_family', 'sf_root', 'sf_near'])
    assert.ok((kinds.get(k) ?? 0) > 0, `no ${k} drills`);
  if (existsSync(FIXTURE)) assert.ok((kinds.get('sf_range') ?? 0) > 0, 'no sf_range drills');
  assert.equal(new Set(drills.map((d) => d.id)).size, drills.length, 'ids are unique');
  for (const d of drills) {
    const opts = d.options as string[];
    assert.ok(opts.length >= 3 && new Set(opts).size === opts.length, `${d.id}: options`);
    if (d.interaction === 'choose_all') assert.ok((d.correct as number[]).length >= 2, `${d.id}: correct`);
    else assert.ok(opts.includes(String(d.answer)), `${d.id}: answer among options`);
    assert.ok(!/[ʿʾāīūṣḍṭẓḥ]/.test(JSON.stringify([d.prompt, d.options, d.answer]).replace(/Qurʾān/g, '')), `${d.id}: no transliteration`);
    assert.ok((d.srs as { resource_ref: string }).resource_ref === `QR:${d.id}`, `${d.id}: card`);
  }
  // the table: the textbook's order, and the hidden cell is the answer
  const t = drills.find((d) => d.id === 'sarf:table:SV:غفر:I:1.3')!;
  assert.equal(t.answer, 'مَغْفُورٌ لَهُ');
  assert.deepEqual((t.table as { hidden: number[] }).hidden, [1, 3]);
  assert.ok((t.terms as string[]).includes('GT:form_family:bab_daraba'));
  assert.match(String(t.explanation), /غَفَرَ يَغْفِرُ غَفْرًا وَ ?غُفْرَانًا/);
  // a preposition drill names what the preposition does
  const p = drills.find((d) => String(d.id).startsWith('sarf:prep:SP:SV:توب:I:') && d.answer === 'عَلَى')!;
  assert.equal(p.promptEn, 'God turns to a person in mercy, accepting them');
  assert.ok((p.terms as string[]).includes('GT:harf_maani:ala_istila'));
  // a verb with no مجهول has no such row
  const v = db.prepare(`SELECT * FROM qr_sarf_verb WHERE id = 'SV:عزز:I:daraba'`).get() as never;
  assert.equal(tableOf(v, new Map()).length, 1);
  assert.equal(chantOf(v), 'عَزَّ يَعِزُّ عِزًّا وَعِزَّةً وَعَزَازَةً فَهُوَ عَزِيزٌ');
});

test('the passage’s الصرف to read: every word, each root with its verbs, range and near-synonyms', async () => {
  const { env } = setup();
  const sheet = (await sarfSheet(env, { surah: 40, from: 1, to: 3 }))!;
  assert.equal(sheet.words.length, 13);
  const tawb = sheet.words.find((w) => w.root === 'توب')!;
  assert.equal(tawb.here, 'repentance — turning back to God');
  assert.equal(tawb.picture?.en, 'Returning — coming back.');
  const root = sheet.roots.find((r) => r.root === 'توب')!;
  assert.equal(root.letters, 'ت و ب');
  const v = root.verbs[0];
  assert.ok(v.table && v.table.length === 3);
  assert.deepEqual(v.preps.map((p) => p.prep), ['إِلَى', 'عَلَى']);
  assert.ok(v.chips.includes('بابُ نَصَرَ'));
  if (existsSync(FIXTURE)) assert.match(String(v.preps[0].quote), /﴿.+﴾ 66:8/);
  assert.ok(root.range.some((s) => s.here));
  assert.equal(sheet.roots.find((r) => r.root === 'ذنب')!.near[0].members[0].ar, 'ذَنْب');
});
