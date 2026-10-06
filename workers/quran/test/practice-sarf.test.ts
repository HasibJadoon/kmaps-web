// The ṣarf step over a real SQLite loaded with its own migrations (qr_073, qr_082–085): every drill it deals for
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

/** AL's /al/sarf/sheet for the seeded roots, built from the QR rows (qr_073) the way AL 0130/0129/0138/0140/0142 took
 *  them in: verb tables, cited prepositions, root pictures, plurals, near-synonym sets. */
function alSarfSheet(db: DatabaseSync) {
  const all = (sql: string) => db.prepare(sql).all() as Record<string, string | number | null>[];
  const J = (x: unknown) => (x == null ? null : JSON.parse(String(x)));
  const roots: Record<string, unknown> = {};
  const rootOf = (r: string) => (roots[`R:${r}`] ??= { root_id: `R:${r}`, root_norm: r, picture: null, paradigms: [], preps: [], opposites: [] }) as
    { picture: unknown; paradigms: unknown[]; preps: unknown[]; opposites: unknown[] };
  for (const v of all(`SELECT * FROM qr_sarf_verb WHERE status = 'live'`)) rootOf(String(v.root)).paradigms.push({
    id: `PAR:${v.id}`, root_id: `R:${v.root}`, lemma_id: null, verb_form: null, bab_key: null, source_ref: `qr_sarf_verb ${v.id}`, paradigm: {
      past: v.madi, present: v.mudari, masadir: J(v.masadir_json), active_participle: v.fail, active_participle_gt: v.fail_gt,
      passive_past: v.madi_majhul, passive_present: v.mudari_majhul, passive_participle: v.maful, imperative: v.amr, prohibition: v.nahy,
      noun_of_place_time: J(v.zarf_json), noun_of_instrument: J(v.ala_json),
      derived: (J(v.others_json) as string[][] | null)?.map(([word, gt, pattern, meaning]) => ({ word, gt, pattern, meaning })),
      meaning: v.meaning_en, note: v.note_en, bab_gt: v.bab_gt, form_gt: v.form_gt, root_type_gt: v.root_type_gt, route_gt: v.route_gt,
      maani_gt: v.maani_gt, quran_n: v.quran_n, cite: J(v.cite_json), full_table: !!v.full } });
  for (const p of all(`SELECT p.*, v.root FROM qr_sarf_prep p JOIN qr_sarf_verb v ON v.id = p.verb_id`)) rootOf(String(p.root)).preps.push({
    id: `TDY:QR:${p.id}`, root_id: `R:${p.root}`, lemma_id: null, verb_form: null, harf: p.prep_ar, harf_term_id: p.prep_gt, frame_ar: p.usage_ar,
    meaning_en: p.meaning_en, cite: J(p.cite_json), qr_ref: null, sort_order: p.sort });
  for (const c of all(`SELECT * FROM qr_vocab_root_core WHERE source_slug = 'kmaps_root_dna'`)) rootOf(String(c.root)).picture = { en: c.text_en, ar: c.text_ar };
  const lemmas: Record<string, { plurals: unknown[] }> = {};
  for (const w of all(`SELECT w.plurals_json, o.gid_lemma FROM qr_sarf_word w JOIN qr_word_occurrence o ON o.surah = w.surah AND o.ayah = w.ayah
                         AND o.word_index = w.word_index WHERE o.gid_lemma IS NOT NULL`)) {
    const id = String(w.gid_lemma).replace(/^AL:/, '');
    lemmas[id] = { plurals: ((J(w.plurals_json) ?? []) as { ar: string; cite: { surah: number; ayah: number; needle: string } }[]).map((p) => ({
      plural_ar: p.ar, kind_ref: 'GT:noun_process:jam_taksir', kind_ar: 'جمع التكسير', wazn_ar: null, ...p.cite, note_en: null })) };
  }
  const sets = all(`SELECT * FROM qr_sarf_near WHERE status = 'live'`).map((n) => ({ id: n.id, title_en: n.title_en, title_ar: n.title_ar, contrast: null,
    members: (J(n.members_json) as { ar: string; en: string; cite: unknown }[]).map((m, k) => ({ lemma_id: `${n.id}:${k}`, root_id: k ? null : `R:${n.root}`,
      ar: m.ar, en: m.en, contrast: null, cite: m.cite })) }));
  return { roots, lemmas, sets };
}

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
    CREATE TABLE qr_ayah (surah INT, ayah INT, text TEXT, text_uthmani TEXT);
    CREATE TABLE qr_word_sense_link (id TEXT PRIMARY KEY, word_occ_id TEXT, al_sense_id TEXT, al_arc_id TEXT, surah_no INT, ayah_no INT,
                                     word_index INT, is_contextual INT DEFAULT 0, display_order INT DEFAULT 0, status TEXT DEFAULT 'live');
    CREATE TABLE qr_word_occurrence (id TEXT, word_text_bare TEXT, surah INT, ayah INT, word_index INT, lemma TEXT, gid_lemma TEXT, gt_derivation_type TEXT,
                                     gt_form_family TEXT, gt_jumud TEXT, gt_case TEXT, gt_number TEXT, gt_gender TEXT, gt_definiteness TEXT);
    CREATE TABLE qr_morph_display_lemma (gid_lemma TEXT, lemma_ar TEXT, sense_arc_en TEXT, updated_at TEXT);`);
  // the QAC parse of the 13 focus words and their lemmas (live rows, trimmed)
  const occ = db.prepare(`INSERT INTO qr_word_occurrence VALUES (NULL, NULL, 40, ?, ?, ?, ?, ?, ?, ?, ?, 'GT:number:singular', 'GT:gender:masculine', ?)`);
  const lem = db.prepare(`INSERT INTO qr_morph_display_lemma (gid_lemma, lemma_ar) VALUES (?, ?)`);
  for (const [a, i, l, g, d, f, j, c, def] of [
    [2, 1, 'تَنزِيل', '1bc35f366d52a6776e838f0c4d', 'GT:derivation_type:masdar', 'GT:form_family:form_ii', 'GT:jumud:mushtaqq', 'GT:case:nominative', null],
    [2, 2, 'كِتَٰب', '26ec9894256ccd2fcb77820470', 'GT:derivation_type:masdar_bi_mana_al_maful', null, 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [2, 5, 'عَزِيز', '3d42f257c274c5d8463f1b8371', null, null, 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [2, 6, 'عَلِيم', '9ba7ce572be40ce777e0d44853', 'GT:derivation_type:mubalagha', null, 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [3, 1, 'غَافِر', 'ea923679f32861b46d50eade95', 'GT:derivation_type:active_participle', 'GT:form_family:form_i', 'GT:jumud:mushtaqq', 'GT:case:genitive', null],
    [3, 2, 'ذَنب', '2e7a23ca384799c20b92778cf7', null, null, 'GT:jumud:jamid', 'GT:case:genitive', 'GT:definiteness:definite'],
    [3, 3, 'قَابِل', '89060f9f3668b069e4ca2ada7a', 'GT:derivation_type:active_participle', 'GT:form_family:form_i', 'GT:jumud:mushtaqq', 'GT:case:genitive', null],
    [3, 4, 'تَّوْب', 'a8886e1216f97189f836165615', null, 'GT:form_family:form_i', 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [3, 5, 'شَدِيد', 'd598d16f55259b05ab7239513e', 'GT:derivation_type:sifa_mushabbaha', null, 'GT:jumud:mushtaqq', 'GT:case:genitive', null],
    [3, 6, 'عِقَاب', 'ef9ac712524e50d06a2a1f98de', null, 'GT:form_family:form_iii', 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [3, 8, 'طَوْل', '9e553feca8a3dea46195b29917', null, 'GT:form_family:form_i', 'GT:jumud:mushtaqq', 'GT:case:genitive', 'GT:definiteness:definite'],
    [3, 10, 'إِلَٰه', 'c88f937fab2a9108ab54922b75', null, null, null, 'GT:case:accusative', null],
    [3, 14, 'مَصِير', 'a6a5a940211be758e1edae8a66', 'GT:derivation_type:masdar_mimi', 'GT:form_family:form_i', 'GT:jumud:mushtaqq', 'GT:case:nominative', 'GT:definiteness:definite'],
  ] as const) { occ.run(a, i, l, `AL:${g}`, d, f, j, c, def); lem.run(`AL:${g}`, l); }
  const gt = db.prepare(`INSERT INTO ar_ling_gram_term (id, name_ar) VALUES (?, ?)`);
  for (const [id, ar] of [['GT:form_family:bab_nasara', 'بابُ نَصَرَ'], ['GT:form_family:bab_daraba', 'بابُ ضَرَبَ'], ['GT:form_family:bab_fataha', 'بابُ فَتَحَ'],
    ['GT:form_family:bab_samia', 'بابُ سَمِعَ'], ['GT:form_family:bab_hasiba', 'بابُ حَسِبَ'], ['GT:form_family:bab_karuma', 'بابُ كَرُمَ'],
    ['GT:form_family:form_ii', 'تَفْعِيل'], ['GT:form_family:form_iii', 'مُفَاعَلَة'], ['GT:form_family:form_iv', 'إِفْعَال'], ['GT:form_family:form_v', 'تَفَعُّل'],
    ['GT:form_family:form_vi', 'تَفَاعُل'], ['GT:form_family:form_vii', 'اِنْفِعَال'], ['GT:form_family:form_viii', 'اِفْتِعَال'], ['GT:form_family:form_x', 'اِسْتِفْعَال'],
    ['GT:derivation_type:active_participle', 'اسم الفاعل'], ['GT:derivation_type:sifa_mushabbaha', 'الصفة المشبّهة'],
    ['GT:derivation_type:passive_participle', 'اسم المفعول'], ['GT:derivation_type:masdar', 'مَصْدَر'], ['GT:case:nominative', 'مَرْفُوع'],
    ['GT:jumud:mushtaqq', 'مُشتقّ'], ['GT:number:singular', 'مُفْرَد'], ['GT:gender:masculine', 'مُذَكَّر']]) gt.run(id, ar);
  db.prepare(`UPDATE ar_ling_gram_term SET name_en = 'verbal noun' WHERE id = 'GT:derivation_type:masdar'`).run();
  // the words of 40:2 as the muṣḥaf has them bare, and the senses تَنزِيل's occurrences use (qr_word_sense_link)
  db.exec(`INSERT INTO qr_word_occurrence (surah, ayah, word_index, word_text_bare) VALUES (40, 2, 3, 'من'), (40, 2, 4, 'الله'),
             (26, 192, 1, 'وانه'), (26, 192, 2, 'لتنزيل'), (26, 192, 3, 'رب'), (17, 106, 8, 'ونزلناه'), (17, 106, 9, 'تنزيلا'),
             (25, 25, 5, 'ونزل'), (25, 25, 6, 'الملائكة'), (25, 25, 7, 'تنزيلا')`);
  db.exec(`UPDATE qr_word_occurrence SET word_text_bare = 'تنزيل' WHERE surah = 40 AND ayah = 2 AND word_index = 1`);
  db.exec(`UPDATE qr_word_occurrence SET word_text_bare = 'الكتاب' WHERE surah = 40 AND ayah = 2 AND word_index = 2`);
  db.exec(`INSERT INTO qr_word_sense_link (id, al_sense_id, al_arc_id, surah_no, ayah_no, word_index, is_contextual) VALUES
             ('a', 'SNS:نزل:tanzil_revelation', 'ARC:نزل:tanzil', 40, 2, 1, 1), ('b', 'SNS:نزل:tanzil_revelation', NULL, 26, 192, 2, 1),
             ('c', 'SNS:نزل:tanzil_stages', NULL, 17, 106, 9, 1), ('d', 'SNS:نزل:tanzil_angels', NULL, 25, 25, 7, 1)`);
  db.exec(readFileSync(new URL('../migrations/qr_073_sarf_saghir.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/qr_082_sarf_word_arc.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/qr_083_sarf_lemma_level.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/qr_084_sarf_word_compact.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/qr_085_meaning_on_occurrence.sql', import.meta.url), 'utf8'));
  const ayat = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, string> : {};
  const ins = db.prepare(`INSERT INTO qr_ayah (surah, ayah, text_uthmani) VALUES (?, ?, ?)`);
  for (const [k, t] of Object.entries(ayat)) { const [s, a] = k.split(':').map(Number); ins.run(s, a, t); }
  // AL, the language authority, as /al/lemmas/resolve answers for تَنزِيل — its senses (one never cited in the Qurʾān) and arcs
  // each focus word's global root id, as qr_word_occurrence.root_uid carries it
  db.exec(`ALTER TABLE qr_word_occurrence ADD COLUMN root_uid TEXT`);
  db.exec(`UPDATE qr_word_occurrence SET root_uid = 'R:' || (SELECT w.root FROM qr_sarf_word w WHERE w.surah = qr_word_occurrence.surah
             AND w.ayah = qr_word_occurrence.ayah AND w.word_index = qr_word_occurrence.word_index)`);
  const sheet = alSarfSheet(db);
  const resolve = { 'AL:1bc35f366d52a6776e838f0c4d': {
    id: '1bc35f366d52a6776e838f0c4d', lemma_ar: 'تَنزِيل', senses: [
      { id: 'SNS:نزل:tanzil_revelation', gloss_en: 'the Revelation sent down from God — the Qurʾān', gloss_ar: 'الوحي المنزَّل من الله', is_core: 1, status: 'live' },
      { id: 'SNS:نزل:tanzil_stages', gloss_en: 'sent down part by part, in stages', gloss_ar: 'التنزيل منجَّمًا', is_core: 0, status: 'live' },
      { id: 'SNS:نزل:tanzil_angels', gloss_en: 'the angels sent down, on the Day', gloss_ar: 'تنزيل الملائكة', is_core: 0, status: 'live' },
      { id: 'SNS:نزل:tanzil_order', gloss_en: 'putting a thing in its place', gloss_ar: 'ترتيب الشيء', is_core: 0, status: 'live' }],
    wazn: [{ id: 'LW:tanzil:masdar', wazn_id: 'WZ:tafiyl', wazn_ar: 'تَفْعِيل', derivation_id: 'GT:derivation_type:masdar', derivation_ar: 'مَصْدَر',
             family_id: 'GT:form_family:form_ii', family_ar: 'تَفْعِيل', jumud_id: 'GT:jumud:mushtaqq', jumud_ar: 'مُشتقّ', transitivity_id: 'GT:transitivity:transitive', transitivity_ar: 'مُتَعَدٍّ', base_verb: 'نَزَّلَ يُنَزِّلُ', basis: 'derived', source_slug: 'kmaps_synth', source_ref: null, quote_ar: null }],
    arcs: [{ id: 'ARC:نزل:old', arc_en: 'superseded', is_primary: 0, status: 'superseded' },
           { id: 'ARC:نزل:tanzil', arc_en: 'coming down → sent down in stages → the Revelation', is_primary: 1, status: 'live' }] } };
  const AR_LINGUISTICS = { fetch: async (req: Request | string) => {
    const url = new URL(typeof req === 'string' ? req : req.url, 'https://al');
    return Response.json({ ok: true, data: url.pathname === '/al/sarf/sheet' ? sheet : resolve });
  } };
  return { db, env: { DB_QR: d1(db), AR_LINGUISTICS } as never };
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
  // a word whose lemma AL has not resolved carries no arc rather than a guess
  assert.equal(tawb.arc, null);
  // the arc and the range are the lemma's, for the whole Qurʾān; the word only says which sense it uses
  const tanzil = sheet.words.find((w) => w.root === 'نزل')!;
  assert.equal(tanzil.lemma, 'تَنزِيل');
  assert.equal(tanzil.arc, 'coming down → sent down in stages → the Revelation');
  assert.deepEqual(tanzil.arcSteps, ['coming down', 'sent down in stages', 'the Revelation']);
  // the card is the word in its verse — case, number, gender; what the word IS stays on the lemma (lemmaProps)
  assert.deepEqual(tanzil.props.map((p) => p.ar), ['مَرْفُوع', 'مُفْرَد', 'مُذَكَّر']);
  // the detail screen is the lemma's: AL's derivation + pattern only, no verse tags (case, iʿrāb)
  assert.deepEqual(tanzil.lemmaProps.map((p) => p.ar), ['مَصْدَر', 'مُشتقّ', 'مُتَعَدٍّ', 'وَزْن تَفْعِيل']);
  // the range is AL's senses of the lemma that some Qurʾānic word links to — the uncited one stays out
  const range = sheet.ranges!.filter((r) => r.root === 'نزل');
  assert.deepEqual(range.map((r) => r.lemma), ['تَنزِيل']);
  assert.deepEqual(range[0].senses.map((x) => [x.en, x.here]),
    [['the Revelation sent down from God — the Qurʾān', true], ['sent down part by part, in stages', false], ['the angels sent down, on the Day', false]]);
  if (existsSync(FIXTURE)) assert.ok(range[0].senses[0].quotes.some((q) => /﴿تَنزِيلُ ٱلۡكِتَٰبِ﴾ 40:2$/.test(String(q))));
  assert.equal(tawb.picture?.en, 'Returning — coming back.');
  const root = sheet.roots.find((r) => r.root === 'توب')!;
  assert.equal(root.letters, 'ت و ب');
  const v = root.verbs[0];
  assert.ok(v.table && v.table.length === 3);
  assert.deepEqual(v.preps.map((p) => p.prep), ['إِلَى', 'عَلَى']);
  assert.ok(v.chips.includes('بابُ نَصَرَ'));
  if (existsSync(FIXTURE)) assert.match(String(v.preps[0].quote), /﴿.+﴾ 66:8/);
  assert.ok(sheet.roots.find((r) => r.root === 'نزل')!.range.some((s) => s.here));
  assert.equal(sheet.roots.find((r) => r.root === 'ذنب')!.near[0].members[0].ar, 'ذَنْب');
});
