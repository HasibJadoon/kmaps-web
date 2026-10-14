// The vocab drills read the grade and the flags (qr_120): a common word comes only where it is flagged, an
// adverbial noun never, medium → super everywhere; each drill carries its grade and its flags, the source quoted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { vocabDrills } from '../src/routes/practice-vocab';
import { labels } from '../src/lib/labels';

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

// surah 1, three āyāt: [ayah, word_index, word, root, lemma, pos, lemma_n, grade, focus]
const WORDS = [
  [1, 0, 'قَالَ', 'قول', 'قَالَ', 'V', 1618, 'common', 1],          // common, never flagged → out
  [1, 1, 'كِتَٰبًا', 'كتب', 'كِتَٰب', 'N', 40, 'medium', 1],        // medium → in
  [2, 0, 'شَآءَ', 'شيا', 'شَآءَ', 'V', 236, 'common', 1],            // common, flagged (theology) here → in, here only
  [2, 1, 'يُبْلِسُ', 'بلس', 'أَبْلَسَ', 'V', 5, 'hard', 1],          // hard → in
  [3, 0, 'شَآءَ', 'شيا', 'شَآءَ', 'V', 236, 'common', 1],            // the same common word, not flagged here → out
  [3, 1, 'أَقْنَىٰ', 'قني', 'أَقْنَىٰ', 'V', 1, 'super', 1],          // super → in
  [3, 2, 'قَبْلُ', 'قبل', 'قَبْل', 'N', 242, 'medium', 0],           // adverbial noun → out
] as const;

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_study_label (scope TEXT NOT NULL, key TEXT NOT NULL, label TEXT NOT NULL, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
                                 min_value INTEGER, extra_json TEXT, sort INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (scope, key));
    INSERT INTO qr_study_label (scope, key, label, extra_json, sort) VALUES
      ('skill', 'vocab', 'Vocabulary', '{"levels":{"basic":{"asks":["vocab_root","vocab_lemma","vocab_meaning"]}}}', 1);
    CREATE TABLE qr_vocab_item (surah INT, ayah INT, word_index INT, word_text TEXT, root TEXT, lemma TEXT, pos TEXT, form_roman TEXT, wazn_ar TEXT,
      lemma_n INT, root_n INT, tier INT, n_lemmas INT, gloss_en TEXT, gloss_ref TEXT, here_en TEXT, here_ref TEXT, here_sense TEXT, senses_json TEXT,
      n_range INT DEFAULT 0, PRIMARY KEY (surah, ayah, word_index));
    CREATE TABLE qr_vocab_gloss (id TEXT, surah INT, ayah INT, word_index INT, lang TEXT, text TEXT, source_slug TEXT, source_kind TEXT, citation TEXT,
      method TEXT, confidence TEXT, rank INT, role TEXT, grp INT, quote_ar TEXT, al_ref TEXT);
    CREATE TABLE qr_vocab_sense (id TEXT, source TEXT, root TEXT, al_root TEXT, head_ar TEXT, label_ar TEXT, label_en TEXT, kind TEXT, marker TEXT,
      page TEXT, seq INT, group_key TEXT, ref TEXT, al_ref TEXT, ayat_json TEXT, n_ayat INT, arc_json TEXT);
    CREATE TABLE qr_vocab_place (surah INT, ayah INT, word_index INT, sense_id TEXT, how TEXT, note_ar TEXT);
    CREATE TABLE qr_vocab_root_core (root TEXT, source_slug TEXT, text_ar TEXT, text_en TEXT, citation TEXT, al_ref TEXT);
    CREATE TABLE qr_root_freq (root_ar TEXT, n INT);
    CREATE TABLE qr_word_occurrence (surah INT, ayah INT, word_index INT, word_text TEXT, pos TEXT, lemma TEXT, is_content_word INT);
    CREATE TABLE qr_recitation (reciter_id INT, surah INT, audio_url TEXT);
    CREATE TABLE qr_recitation_ayah (reciter_id INT, surah INT, ayah INT, start_ms INT, end_ms INT, segments_json TEXT);
    CREATE TABLE qr_translation_source (id INT, is_default INT);
    CREATE TABLE qr_translation (source_id INT, surah INT, ayah INT, translation_text TEXT);
    CREATE TABLE qr_surah (id INT, name_en TEXT);
    INSERT INTO qr_surah VALUES (1, 'Test');`);
  db.exec(readFileSync(new URL('../migrations/qr_120_vocab_grade.sql', import.meta.url), 'utf8'));
  const item = db.prepare(`INSERT INTO qr_vocab_item (surah, ayah, word_index, word_text, root, lemma, pos, lemma_n, root_n, tier, n_lemmas)
                           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`);
  const occ = db.prepare(`INSERT INTO qr_word_occurrence VALUES (1, ?, ?, ?, ?, ?, 1)`);
  const grade = db.prepare(`INSERT OR IGNORE INTO qr_vocab_grade (root, lemma, grade, quran_n, focus) VALUES (?, ?, ?, ?, ?)`);
  for (const [a, w, t, r, l, p, n, g, f] of WORDS) { item.run(a, w, t, r, l, p, n, n); occ.run(a, w, t, p, l); grade.run(r, l, g, n, f); }
  // other roots, for the root drill's wrong answers
  db.exec(`INSERT INTO qr_root_freq VALUES ('كتم', 5), ('بلغ', 9), ('قنط', 6), ('شيب', 3), ('قول', 1700), ('كبت', 2), ('بلو', 30), ('قنو', 2)`);
  db.exec(`INSERT INTO qr_vocab_flag VALUES (1, 2, 0, 'theology', 'المعتزل', 'zamakhshari TAFSIR_BLK_x p.12', 'قالت المعتزلة إن المشيئة هنا مشيئة قسر')`);
  return { DB_QR: d1(db) } as never;
}

test('common words come only where flagged; adverbial nouns never; each drill carries grade and flags', async () => {
  const env = setup();
  const L = await labels(env);
  const drills = await vocabDrills(env, 10, { surah: 1, from: null, to: null } as never, { asks: ['vocab_root'] }, L);
  const at = drills.map((d) => (d.id as string).split(':').slice(2).join(':')).sort();
  assert.deepEqual(at, ['1:1:1', '1:2:0', '1:2:1', '1:3:1']);
  const byAt = new Map(drills.map((d) => [(d.id as string).split(':').slice(2).join(':'), d]));
  const shaa = byAt.get('1:2:0')!;
  assert.equal(shaa.grade, 'common');
  assert.deepEqual(shaa.hard, ['theology']);
  const badges = (shaa.badges as Array<{ label: string }>).map((b) => b.label);
  assert.ok(badges.includes('Debated') && badges.includes('Common'), badges.join(','));
  assert.match(String(shaa.explanation), /Debated — المعتزل: «قالت المعتزلة/);
  assert.match(String(shaa.explanation), /\(al-Zamakhsharī, p\. 12\)/);
  assert.equal(byAt.get('1:3:1')!.grade, 'super');
  assert.ok((byAt.get('1:2:1')!.badges as Array<{ label: string }>).some((b) => b.label === 'Hard'));
});

test('a QR drill dealt without its card gets one — nothing practised is left out of review', async () => {
  const { ensureCard } = await import('../src/routes/practice-kit');
  const d = ensureCard({ id: 'newkind:44:3', kind: 'newkind', prompt: 'لِمَ؟', answer: 'لأنّ', source: { workId: 'QR:SURAH:44' } }, 'newkind');
  const srs = d.srs as { module: string; front_text: string; back_text: string; extra: { drill: { id: string }; group: { work: string } } };
  assert.equal(srs.module, 'QR');
  assert.equal(srs.front_text, 'لِمَ؟');
  assert.equal(srs.back_text, 'لأنّ');
  assert.equal(srs.extra.drill.id, 'newkind:44:3');
  assert.equal(srs.extra.group.work, '44:3');
  const own = { id: 'x', kind: 'fill', srs: { module: 'QR', front_text: 'mine' } };
  assert.equal((ensureCard(own, 'fill').srs as { front_text: string }).front_text, 'mine', "a builder's own card wins");
});
