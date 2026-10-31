// One loadAyat (code review 2026-10-31): practice.ts, practice-lexicon.ts and the book-built drills
// read the āyah from practice-kit — the same English (run-on lines closed with "…") everywhere, and
// any number of āyāt in one read without passing D1's 100 bound parameters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { loadAyat, runOn } from '../src/routes/practice-kit';
import { loadAyat as fromPractice } from '../src/routes/practice';

const MAX_PARAMS = 100;

function d1(db: DatabaseSync) {
  let maxSeen = 0;
  const api = { prepare: (sql: string) => ({ bind: (...p: unknown[]) => {
    if (p.length > MAX_PARAMS) throw new Error(`D1_ERROR: too many SQL variables (${p.length})`);
    maxSeen = Math.max(maxSeen, p.length);
    return { async all<T>() { return { results: db.prepare(sql).all(...(p as never[])) as T[] }; } };
  } }) };
  return { api, maxSeen: () => maxSeen };
}

function corpus(surahs: number) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_surah (id INTEGER PRIMARY KEY, name_en TEXT);
    CREATE TABLE qr_word_occurrence (surah INT, ayah INT, word_index INT, word_text TEXT, pos TEXT, lemma TEXT, is_content_word INT);
    CREATE TABLE qr_recitation (reciter_id INT, surah INT, audio_url TEXT);
    CREATE TABLE qr_recitation_ayah (reciter_id INT, surah INT, ayah INT, start_ms INT, end_ms INT, segments_json TEXT);
    CREATE TABLE qr_translation_source (id INT, is_default INT);
    CREATE TABLE qr_translation (source_id INT, surah INT, ayah INT, translation_text TEXT);
    INSERT INTO qr_translation_source VALUES (1, 1), (2, 0);`);
  for (let s = 1; s <= surahs; s++) {
    db.prepare('INSERT INTO qr_surah VALUES (?, ?)').run(s, `Surah-${s}`);
    db.prepare('INSERT INTO qr_recitation VALUES (7, ?, ?)').run(s, `https://a/${s}.mp3`);
    for (const a of [1, 2]) {
      db.prepare('INSERT INTO qr_word_occurrence VALUES (?, ?, 1, ?, NULL, NULL, 1), (?, ?, 2, ?, NULL, NULL, 1)')
        .run(s, a, `w${s}.${a}.1`, s, a, `w${s}.${a}.2`);
      db.prepare('INSERT INTO qr_recitation_ayah VALUES (7, ?, ?, 1000, 3000, ?)').run(s, a, JSON.stringify([[1, 1000, 2000], [2, 2000, 3000]]));
      db.prepare('INSERT INTO qr_translation VALUES (1, ?, ?, ?), (2, ?, ?, ?)')
        .run(s, a, a === 1 ? `It runs on into the next,` : 'It ends here.', s, a, 'not the default');
    }
  }
  return db;
}

test('runOn closes a run-on English line with an ellipsis and leaves a finished one', () => {
  assert.equal(runOn('can only go wrong-'), 'can only go wrong …');
  assert.equal(runOn('and those who believe,'), 'and those who believe …');
  assert.equal(runOn('It ends here.'), 'It ends here.');
  assert.equal(runOn(null), null);
});

test('practice.ts serves the kit loader — one copy', () => {
  assert.equal(fromPractice, loadAyat);
});

test('every sūra at once (114 sūras, 228 āyāt) stays under the 100-parameter cap', async () => {
  const { api, maxSeen } = d1(corpus(114));
  const pairs: number[][] = [];
  for (let s = 1; s <= 114; s++) pairs.push([s, 1], [s, 2]);
  pairs.push([2, 1], [2, 1]);                                     // repeats are read once
  const out = await loadAyat({ DB_QR: api } as never, pairs);
  assert.equal(out.size, 228);
  assert.ok(maxSeen() <= 1, `each read binds one JSON list, saw ${maxSeen()}`);

  const a = out.get('40:1')!;
  assert.equal(a.title, 'Surah-40 40:1');
  assert.equal(a.surahName, 'Surah-40');
  assert.equal(a.en, 'It runs on into the next …', 'the default English, run-on closed');
  assert.equal(out.get('40:2')!.en, 'It ends here.');
  assert.ok(a.aligned);
  assert.deepEqual(a.words, [{ t: 'w40.1.1', s: 1, e: 2 }, { t: 'w40.1.2', s: 2, e: 3 }]);
  assert.deepEqual(a.audio, { url: 'https://a/40.mp3', start: 1, end: 3 });
  assert.deepEqual([...out.keys()].slice(0, 3), ['1:1', '1:2', '2:1'], 'order kept, first occurrence wins');
});

test('no āyāt: no reads', async () => {
  const { api, maxSeen } = d1(corpus(1));
  assert.equal((await loadAyat({ DB_QR: api } as never, [])).size, 0);
  assert.equal(maxSeen(), 0);
});
