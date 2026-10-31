// The reader's words are split in the worker: a standalone pause mark stays with the word
// before it, and occurrence indexes are attached only when the counts line up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readerWords } from '../src/routes/reader';

test('splits an āyah into words with their occurrence indexes', () => {
  const w = readerWords('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', [1, 2, 3, 4]);
  assert.deepEqual(w.map((x) => x.text), ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']);
  assert.deepEqual(w.map((x) => x.word_index), [1, 2, 3, 4]);
});

test('a standalone pause mark joins the word before it', () => {
  const w = readerWords('ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ', [1, 2, 3, 4, 5]);
  assert.equal(w.length, 5);
  assert.equal(w[3].text, 'رَيْبَ ۛ');
  assert.equal(w[4].word_index, 5);
});

test('no indexes when the occurrence rows do not line up', () => {
  const w = readerWords('قُلْ هُوَ ٱللَّهُ أَحَدٌ', [1, 2, 3]);
  assert.ok(w.every((x) => x.word_index === null));
  assert.equal(w.length, 4);
});
