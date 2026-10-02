// Steps 6 and 7 of the class over a real SQLite: the passage questions dealt with their options,
// the listen gate's spans (a page reaching past the passage cut where the data says), the lines'
// English and registry terms, and a marked line drawn back as its listen drill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { dealt, pageSpan, groupRange, parseLineRef, lineRef, timedWords, questionDrills, listenWorks, lineDrills, tafsirDrillsQ,
         sentenceSpan, endsSentence, endsClause, spokenWords }
  from '../src/routes/practice-tafsirq';

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
    CREATE TABLE qr_study_question (id TEXT, surah INT, ayah_from INT, ayah_to INT, options_json TEXT, sort_order INT, status TEXT);
    CREATE TABLE qr_tafsir_read_page (id TEXT, source_slug TEXT, seq INT, kind TEXT, surah_no INT, ayah_group_key TEXT, status TEXT);
    CREATE TABLE qr_tafsir_audio (id TEXT, source_slug TEXT, seq INT, object_key TEXT, status TEXT);
    CREATE TABLE qr_tafsir_audio_segment (id TEXT, audio_id TEXT, page_id TEXT, seq INT, start_sec REAL, end_sec REAL, text_ar TEXT, meta_json TEXT);
    CREATE TABLE qr_tafsir_segment_en (segment_id TEXT, audio_id TEXT, seq INT, text_en TEXT, terms_json TEXT, status TEXT);
    CREATE TABLE qr_tafsir_page_cut (page_id TEXT, audio_id TEXT, ayah INT, seq INT, note TEXT);
    CREATE TABLE qr_tafsir_book_display_source (source_slug TEXT, book_title_en TEXT, book_title_ar TEXT, author_name_ar TEXT);
    CREATE TABLE qr_tafsir_question (id TEXT, surah INT, ayah_from INT, ayah_to INT, question_en TEXT, interaction TEXT, options_json TEXT,
                                     correct_json TEXT, explain_en TEXT, support_json TEXT, sort_order INT, status TEXT);
    CREATE TABLE ar_ling_gram_term (id TEXT, name_ar TEXT, badge_color TEXT);`);
  const Q = db.prepare(`INSERT INTO qr_study_question VALUES (?, 40, ?, ?, ?, ?, ?)`);
  Q.run('QR:Q:40:1:03', 2, 2, JSON.stringify({ ask_en: 'Why تنزيل?', interaction: 'choose', options: ['In stages', 'At once', 'With force'], correct: [0], explain_en: 'form II' }), 1, 'live');
  Q.run('QR:Q:40:1:04', 3, 3, JSON.stringify({ ask_en: 'Which draw in?', interaction: 'choose_all', options: ['غافر', 'قابل', 'شديد', 'ذي الطول'], correct: [0, 1, 3] }), 2, 'live');
  Q.run('QR:Q:40:1:12', 1, 1, null, 3, 'live');                       // a reflection: no options
  Q.run('QR:Q:40:4:01', 4, 4, JSON.stringify({ ask_en: 'x', options: ['a', 'b'], correct: [0] }), 4, 'live');   // out of scope
  Q.run('QR:Q:39:1:1', 1, 1, JSON.stringify({ ask_en: 'x', options: ['a', 'b'], correct: [0] }), 1, 'draft');

  db.exec(`
    INSERT INTO qr_tafsir_book_display_source VALUES ('razi', 'Mafatih', 'مفاتيح الغيب', 'الرازي'), ('zam', 'Kashshaf', 'الكشاف', 'الزمخشري');
    INSERT INTO qr_tafsir_audio VALUES ('A:razi', 'razi', 1, 'tafsir/razi/40-01.m4a', 'live'), ('A:zam', 'zam', 1, 'tafsir/zam/40-01.m4a', 'live');
    INSERT INTO qr_tafsir_read_page VALUES ('P:razi', 'razi', 10, 'ayah', 40, '40:1-6', 'live'),
                                           ('P:zam', 'zam', 20, 'ayah', 40, '40:1-3', 'live'),
                                           ('P:zam2', 'zam', 21, 'ayah', 40, '40:4-6', 'live');
    INSERT INTO qr_tafsir_page_cut VALUES ('P:razi', 'A:razi', 4, 3, NULL);
    INSERT INTO ar_ling_gram_term VALUES ('GT:irab_role:badal', 'بدل', '#aa0000');`);
  const S = db.prepare(`INSERT INTO qr_tafsir_audio_segment VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  S.run('SEG:A:razi:1', 'A:razi', 'P:razi', 1, 0, 10, 'تنزيل مصدر', JSON.stringify({ w: [[0, 4], [4, 9]] }));
  S.run('SEG:A:razi:2', 'A:razi', 'P:razi', 2, 10, 20, 'جعله الزجاج بدلا.', JSON.stringify({ w: [[10, 12], [0, 0], [15, 19]] }));
  S.run('SEG:A:razi:3', 'A:razi', 'P:razi', 3, 20, 30, 'ما يجادل في آيات الله', '{}');          // on 40:4
  S.run('SEG:A:zam:1', 'A:zam', 'P:zam', 1, 0, 5, 'التوب والأوب', '{}');
  S.run('SEG:A:zam:2', 'A:zam', 'P:zam2', 2, 5, 9, 'ما يجادل', '{}');
  const E = db.prepare(`INSERT INTO qr_tafsir_segment_en VALUES (?, ?, ?, ?, ?, 'live')`);
  E.run('SEG:A:razi:1', 'A:razi', 1, 'Sending down is a verbal noun (مصدر)', '[]');
  E.run('SEG:A:razi:2', 'A:razi', 2, 'al-Zajjāj made it a substitute (بدل)', JSON.stringify([{ ar: 'بدلا', ref: 'GT:irab_role:badal' }, { ar: 'x', ref: 'not a ref' }]));

  db.prepare(`INSERT INTO qr_tafsir_question VALUES (?, 40, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live')`).run(
    'QR:TQ:40:1-3:01', 2, 3, 'What is تنزيل here?', 'choose', JSON.stringify(['The Book sent down', 'The night']), '[0]', 'the thing sent down',
    JSON.stringify([{ audio: 'A:razi', page: 'P:razi', from: 1, to: 2 }]), 1);
  return { DB_QR: d1(db) } as never;
}

const scope = { surah: 40, from: 1, to: 3 };

test('options are dealt in a new order and the right ones follow them', () => {
  for (let i = 0; i < 20; i++) {
    const d = dealt(['a', 'b', 'c', 'd'], [0, 3]);
    assert.deepEqual(d.correct.map((k) => d.options[k]).sort(), ['a', 'd']);
    assert.equal(d.answer, null);
    assert.equal(dealt(['a', 'b'], [1]).answer, 'b');
  }
});

test('a passage hears the part of a spanning page the cuts give it, or the whole page once', () => {
  const cuts = [{ ayah: 4, seq: 137 }];
  assert.deepEqual(pageSpan({ from: 1, to: 6 }, { from: 1, to: 3 }, cuts), { from: null, before: 137 });
  assert.deepEqual(pageSpan({ from: 1, to: 6 }, { from: 4, to: 6 }, cuts), { from: 137, before: null });
  assert.deepEqual(pageSpan({ from: 1, to: 6 }, { from: 1, to: 3 }, []), { from: null, before: null });   // no cut: whole, first passage
  assert.equal(pageSpan({ from: 1, to: 6 }, { from: 4, to: 6 }, []), null);                              // … and not again
  assert.equal(pageSpan({ from: 7, to: 9 }, { from: 1, to: 3 }, cuts), null);
  assert.deepEqual(groupRange('40:1-6'), { surah: 40, from: 1, to: 6 });
  assert.deepEqual(groupRange('40:3'), { surah: 40, from: 3, to: 3 });
});

test('line refs carry recording ids with colons', () => {
  const ref = lineRef('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 12, 14);
  assert.deepEqual(parseLineRef(ref), { audio: 'QRTA:ibn_ashur:y-m2kq2xlU4DM-02', from: 12, to: 14 });
  assert.deepEqual(parseLineRef(lineRef('QRTA:razi:40-01', 55, 55)), { audio: 'QRTA:razi:40-01', from: 55, to: 55 });
  assert.equal(parseLineRef('QR:fill:40:1'), null);
  assert.deepEqual(timedWords('أ ب', JSON.stringify([[1, 2], [0, 0]])), [{ t: 'أ', s: 1, e: 2 }, { t: 'ب', s: 0, e: 0 }]);
});

test('step 6 draws the live questions in scope that carry options', async () => {
  const ds = await questionDrills(setup(), 30, scope);
  assert.deepEqual(ds.map((d) => d.id), ['questions:QR:Q:40:1:03', 'questions:QR:Q:40:1:04']);
  const [one, all] = ds;
  assert.equal(one.interaction, 'choose');
  assert.equal(one.answer, 'In stages');
  assert.equal(one.ask, 'sq_choose');
  assert.equal(all.interaction, 'choose_all');
  assert.deepEqual((all.correct as number[]).map((k) => (all.options as string[])[k]).sort(), ['ذي الطول', 'غافر', 'قابل'].sort());
  assert.ok((one.srs as { extra: { drill: unknown } }).extra.drill);
});

test('the listen gate: each work over the passage, its lines with English and named terms', async () => {
  const works = await listenWorks(setup(), ['razi', 'zam', 'none'], { surah: 40, from: 1, to: 3 });
  assert.deepEqual(works.map((w) => w.slug), ['razi', 'zam']);
  const razi = works[0];
  assert.equal(razi.parts.length, 1);
  assert.deepEqual(razi.parts[0].lines.map((l) => l.seq), [1, 2]);          // line 3 is on 40:4: cut
  assert.equal(razi.parts[0].url, '/api/ar/audio/tafsir/razi/40-01.m4a');
  const [l1, l2] = razi.parts[0].lines;
  assert.equal(l1.en, 'Sending down is a verbal noun (مصدر)');
  assert.deepEqual(l2.terms, [{ ar: 'بدلا', ref: 'GT:irab_role:badal', nameAr: 'بدل', color: '#aa0000' }]);   // a bad ref is dropped
  assert.deepEqual(l2.words[1], { t: 'الزجاج', s: 0, e: 0 });                // an unheard word has no time
  assert.deepEqual(works[1].parts[0].lines.map((l) => l.seq), [1]);         // the 40:4-6 page is not this passage's
  assert.equal(razi.title, 'Mafatih');
});

test('step 7: the meaning drill plays its lines and reveals their English; the listen drill holds it back', async () => {
  const env = setup();
  const [m] = await tafsirDrillsQ(env, 'meaning', 30, scope);
  assert.equal(m.id, 'tafsirq:QR:TQ:40:1-3:01');
  assert.deepEqual(m.audio, { url: '/api/ar/audio/tafsir/razi/40-01.m4a', start: 0, end: 20.2 });
  assert.deepEqual(m.note, { en: 'Sending down is a verbal noun (مصدر) al-Zajjāj made it a substitute (بدل)', ar: 'تنزيل مصدر جعله الزجاج بدلا.' });
  assert.match(String(m.explanation), /the thing sent down\n— مفاتيح الغيب — الرازي/);
  const [l] = await tafsirDrillsQ(env, 'listen', 30, scope);
  assert.equal(l.id, 'tafsir_line:A:razi:1-2');
  assert.equal(l.interaction, 'listen_mark');
  assert.equal(l.en, m.note && (m.note as { en: string }).en);
  // a line marked in the gate comes back as its own drill, with its GT chips
  const [back] = await lineDrills(env, ['tafsir_line:A:razi:2', 'QR:fill:40:1'], scope);
  assert.equal(back.id, 'tafsir_line:A:razi:2');
  assert.deepEqual(back.gt, [{ ref: 'GT:irab_role:badal', nameAr: 'بدل', color: '#aa0000' }]);
});

test('a listen run is whole sentences, and holds only what was spoken', () => {
  const lines = [{ seq: 1, text_ar: 'كلام تام.' }, { seq: 2, text_ar: 'فكأنه إنما ذكر عقيب' }, { seq: 3, text_ar: 'قوله تنزيل هذه الأسماء،' },
                 { seq: 4, text_ar: 'لزم أن يكون حقا.' }, { seq: 5, text_ar: 'وقيل:' }];
  // asked 2–2: it runs on to the sentence's end at 4; asked 3–3: it reaches back to its start at 2
  assert.deepEqual(sentenceSpan(lines, 2, 2), { from: 2, to: 4 });
  assert.deepEqual(sentenceSpan(lines, 3, 3), { from: 2, to: 4 });
  assert.deepEqual(sentenceSpan(lines, 1, 1), { from: 1, to: 1 });
  // where no full stop is within reach, a semicolon closes the run
  const long = [{ seq: 1, text_ar: 'تم.' }, ...Array.from({ length: 12 }, (_, k) => ({ seq: k + 2, text_ar: k === 3 ? 'أمران؛' : 'ثم' }))];
  assert.deepEqual(sentenceSpan(long, 2, 2), { from: 2, to: 5 });
  // a citation bracket open at a line's end carries on
  assert.equal(endsSentence('مقتدرون﴾ [الزخرف:'), false);
  // the printed citation and bare marks the reciter never spoke are dropped; an untimed real word stays
  const ws = [{ t: '٣٧]', s: 0, e: 0 }, { t: '.', s: 0, e: 0 }, { t: 'وأعقب', s: 1, e: 2 }, { t: 'ذِي', s: 0, e: 0 },
              { t: '[الأنعام:', s: 0, e: 0 }, { t: '٣٧]', s: 0, e: 0 }, { t: '*', s: 0, e: 0 }, { t: 'ذلك', s: 3, e: 4 }];
  assert.deepEqual(spokenWords(ws).map((w) => w.t), ['وأعقب', 'ذِي', 'ذلك']);
});
