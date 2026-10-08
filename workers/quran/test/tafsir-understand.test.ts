// The commentary's four views over a real SQLite: the work's own English pinned to the recorded lines (passage
// view), its sentences with what they say and mean (Understanding), and a sentence marked "not understood" drawn
// back as its drill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { alignParagraphs, arTokens, listenWorks, parseSentenceRef, sentenceRef, sentenceDrills } from '../src/routes/practice-tafsirq';

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
    CREATE TABLE qr_tafsir_read_page (id TEXT, source_slug TEXT, seq INT, kind TEXT, surah_no INT, ayah_group_key TEXT, status TEXT);
    CREATE TABLE qr_tafsir_audio (id TEXT, source_slug TEXT, seq INT, object_key TEXT, status TEXT);
    CREATE TABLE qr_tafsir_audio_segment (id TEXT, audio_id TEXT, page_id TEXT, seq INT, start_sec REAL, end_sec REAL, text_ar TEXT, meta_json TEXT);
    CREATE TABLE qr_tafsir_segment_en (segment_id TEXT, audio_id TEXT, seq INT, text_en TEXT, terms_json TEXT, status TEXT);
    CREATE TABLE qr_tafsir_page_cut (page_id TEXT, audio_id TEXT, ayah INT, seq INT, note TEXT);
    CREATE TABLE qr_tafsir_book_display_source (source_slug TEXT, book_title_en TEXT, book_title_ar TEXT, author_name_ar TEXT);
    CREATE TABLE ar_ling_gram_term (id TEXT, name_ar TEXT, badge_color TEXT);
    CREATE TABLE qr_surah_tafsir_reading (id TEXT, surah INT, ayah_from INT, ayah_to INT, source_slug TEXT);
    CREATE TABLE qr_surah_tafsir_chunk (id TEXT, reading_id TEXT, source_slug TEXT, chunk_index INT, text_ar TEXT, text_en TEXT);
    CREATE TABLE qr_tafsir_sentence (id TEXT, audio_id TEXT, source_slug TEXT, seq_from INT, seq_to INT, surah INT, ayah_from INT, ayah_to INT,
      gist_en TEXT, wrong_json TEXT, concept_en TEXT, concept_ar TEXT, terms_json TEXT, meaning_en TEXT, status TEXT);
    INSERT INTO qr_tafsir_book_display_source VALUES ('zam', 'Kashshaf', 'الكشاف', 'الزمخشري');
    INSERT INTO qr_tafsir_audio VALUES ('A:zam', 'zam', 1, 'tafsir/zam/40-01.m4a', 'live');
    INSERT INTO qr_tafsir_read_page VALUES ('P:zam', 'zam', 20, 'ayah', 40, '40:1-3', 'live');
    INSERT INTO ar_ling_gram_term VALUES ('GT:x:waqf', 'الوقف', '#123456');`);
  const S = db.prepare(`INSERT INTO qr_tafsir_audio_segment VALUES (?, 'A:zam', 'P:zam', ?, ?, ?, ?, '{}')`);
  S.run('SEG:A:zam:1', 1, 0, 4, 'مَكِّيَّةٌ. قالَ الحَسَنُ:');
  S.run('SEG:A:zam:2', 2, 4, 9, 'إلّا قَوْلَهُ وسَبِّحْ بِحَمْدِ رَبِّكَ');
  S.run('SEG:A:zam:3', 3, 9, 14, 'وهي خمس وثمانون آية');
  S.run('SEG:A:zam:4', 4, 14, 20, 'التوب والثوب والأوب أخوات في معنى الرجوع.');
  db.exec(`
    INSERT INTO qr_surah_tafsir_reading VALUES ('R1', 40, 1, 3, 'zam'), ('R2', 40, 4, 6, 'zam');
    INSERT INTO qr_surah_tafsir_chunk VALUES
      ('C1', 'R1', 'zam', 1, 'مكية. قال الحسن: إلا قوله وسبح', 'Makkan, except one verse.'),
      ('C2', 'R1', 'zam', 2, 'وهي خمس وثمانون آية', 'It has eighty-five verses.'),
      ('C3', 'R1', 'zam', 3, 'التوب والثوب والأوب أخوات', 'Tawb and awb are sisters.'),
      ('C9', 'R2', 'zam', 1, 'ما يجادل في آيات الله إلا', 'Not in this recording.');
    INSERT INTO qr_tafsir_sentence VALUES
      ('tafsir_sent:A:zam:1-2', 'A:zam', 'zam', 1, 2, 40, 1, 3, 'The sura is Makkan but for one verse.', '["The sura is Madinan but for one verse.","Every verse of it is Makkan, without exception."]',
       'Where the sura came down', NULL, '[]', 'He says it came down in Makkah. One verse is an exception.', 'live'),
      ('tafsir_sent:A:zam:3-3', 'A:zam', 'zam', 3, 3, 40, 1, 3, 'It has eighty-five verses.', '["It has fifty-eight verses.","It has eighty-five words."]',
       'How many verses', NULL, '[]', 'He counts the verses.', 'live'),
      ('tafsir_sent:A:zam:4-4', 'A:zam', 'zam', 4, 4, 40, 1, 3, 'Three words share the sense of returning.', '["Three words mean clothing.","The words are opposites."]',
       'Words for returning', 'الوقف', '["GT:x:waqf","bad"]', 'التوب and الأوب both mean coming back.', 'live');
    ALTER TABLE qr_tafsir_sentence ADD COLUMN word_from INT NOT NULL DEFAULT 0;`);
  return { DB_QR: d1(db) } as never;
}

test('arTokens folds marks and spellings so a book and a recording match', () => {
  assert.deepEqual(arTokens('مَكِّيَّةٌ. قالَ الحَسَنُ:'), ['مكيه', 'قال', 'الحسن']);
  assert.deepEqual(arTokens('إلّا آية'), ['الا', 'ايه']);
});

test('the English paragraphs are pinned to the lines their Arabic starts on; one not recorded is dropped', () => {
  const lines = [{ seq: 1, text: 'مَكِّيَّةٌ. قالَ الحَسَنُ:' }, { seq: 2, text: 'إلّا قَوْلَهُ وسَبِّحْ' }, { seq: 3, text: 'وهي خمس وثمانون آية' },
                 { seq: 4, text: 'التوب والثوب والأوب أخوات' }];
  const p = alignParagraphs(lines, [
    { text_ar: 'وهي خمس وثمانون آية', text_en: 'B' }, { text_ar: 'مكية. قال الحسن: إلا', text_en: 'A' },
    { text_ar: 'التوب والثوب والأوب', text_en: 'C1' }, { text_ar: 'التوب والثوب والأوب أخوات في', text_en: 'C2' },
    { text_ar: 'ما يجادل في آيات', text_en: 'X' }]);
  assert.deepEqual(p, [{ from: 1, to: 2, en: 'A' }, { from: 3, to: 3, en: 'B' }, { from: 4, to: 4, en: 'C1 C2' }]);
  // lines before the first paragraph found belong to it
  assert.equal(alignParagraphs(lines, [{ text_ar: 'وهي خمس وثمانون', text_en: 'B' }])[0].from, 1);
  assert.deepEqual(alignParagraphs([], [{ text_ar: 'x y z', text_en: 'x' }]), []);
});

test('each part carries its paragraphs and its sentences', async () => {
  const [w] = await listenWorks(setup(), ['zam'], { surah: 40, from: 1, to: 3 });
  const part = w.parts[0];
  assert.deepEqual(part.paragraphs.map((x) => [x.from, x.to, x.en]),
    [[1, 2, 'Makkan, except one verse.'], [3, 3, 'It has eighty-five verses.'], [4, 4, 'Tawb and awb are sisters.']]);
  assert.deepEqual(part.sentences.map((x) => x.id), ['tafsir_sent:A:zam:1-2', 'tafsir_sent:A:zam:3-3', 'tafsir_sent:A:zam:4-4']);
  assert.equal(part.sentences[2].conceptAr, 'الوقف');
  assert.equal(part.sentences[0].meaning, 'He says it came down in Makkah. One verse is an exception.');
});

test('sentence refs carry recording ids with colons', () => {
  assert.equal(sentenceRef('QRTA:zam:40-01', 3, 5), 'tafsir_sent:QRTA:zam:40-01:3-5');
  assert.deepEqual(parseSentenceRef('tafsir_sent:QRTA:zam:40-01:3-5'), { audio: 'QRTA:zam:40-01', from: 3, to: 5 });
  assert.equal(parseSentenceRef('tafsir_line:A:1'), null);
});

test('a sentence marked "not understood" comes back as its drill: the gist among near misses, its meaning after', async () => {
  const env = setup();
  const [d, none] = [await sentenceDrills(env, ['tafsir_sent:A:zam:1-2', 'tafsir_line:A:zam:1', 'tafsir_sent:A:zam:9-9'], { surah: 40, from: 1, to: 3 }), null];
  assert.equal(none, null);
  assert.equal(d.length, 1);
  const x = d[0] as Record<string, any>;
  assert.equal(x.id, 'tafsir_sent:A:zam:1-2');
  assert.equal(x.kind, 'tafsir_understand');
  assert.equal(x.interaction, 'choose');
  assert.equal(x.answer, 'The sura is Makkan but for one verse.');
  assert.equal(x.options.length, 4);
  assert.ok(x.options.includes('The sura is Madinan but for one verse.'));
  assert.equal(x.explanation, 'He says it came down in Makkah. One verse is an exception.');
  assert.deepEqual(x.audio, { url: '/api/ar/audio/tafsir/zam/40-01.m4a', start: 0, end: 9.2 });
  assert.equal(x.srs.resource_ref, 'QR:tafsir_sent:A:zam:1-2');
  // only registry refs ride as terms
  const [w] = await sentenceDrills(env, ['tafsir_sent:A:zam:4-4'], { surah: 40, from: 1, to: 3 });
  assert.deepEqual((w as Record<string, any>).terms, ['GT:x:waqf']);
});

test('English that opens on Arabic is served to read left to right, the Arabic isolated', async () => {
  const [w] = await listenWorks(setup(), ['zam'], { surah: 40, from: 1, to: 3 });
  const m = w.parts[0].sentences[2].meaning;
  assert.ok(m.startsWith('‎⁧التوب⁩‎ and'));
  const [d] = await sentenceDrills(setup(), ['tafsir_sent:A:zam:4-4'], { surah: 40, from: 1, to: 3 });
  assert.ok((d.options as string[]).includes(d.answer as string));
});
