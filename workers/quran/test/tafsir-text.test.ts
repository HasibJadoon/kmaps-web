import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spelled, BASMALA } from '../src/lib/tafsir-text';
import { timedWords } from '../src/routes/practice-tafsirq';

test('the basmala sign is spelt out, its time shared among its four words', () => {
  const r = spelled('مكية ﷽ ﴿حم﴾', [[0, 1], [2, 6], [6, 7]]);
  assert.equal(r.text, `مكية ${BASMALA.join(' ')} ﴿حم﴾`);
  assert.deepEqual(r.times, [[0, 1], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
});

test('a line without the sign is left as it is', () => {
  const times = [[0, 1]];
  assert.deepEqual(spelled('قال', times), { text: 'قال', times });
});

test('the words of a line keep their times after the sign', () => {
  const w = timedWords('أ ﷽ ب', JSON.stringify([[0, 1], [1, 5], [5, 6]]));
  assert.equal(w.length, 6);
  assert.deepEqual(w[5], { t: 'ب', s: 5, e: 6 });
});
