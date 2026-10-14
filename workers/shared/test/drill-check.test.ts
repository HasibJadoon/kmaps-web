import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validOptions } from '../src/drill-check';

test('a drill is dealt only with sound choices', () => {
  assert.equal(validOptions({ kind: 'fill', options: ['كِتَاب', 'قَلَم', 'بَيْت'], answer: 'كِتَاب' }), true);
  assert.equal(validOptions({ kind: 'fill', options: ['قَلَم', 'بَيْت', 'سَيْف'], answer: 'كِتَاب' }), false, 'answer missing');
  assert.equal(validOptions({ kind: 'fill', options: ['كِتَابٌ', 'كِتَاب', 'قَلَم'], answer: 'كِتَاب' }), false, 'two the same once vowels go');
  assert.equal(validOptions({ kind: 'grammar', options: ['كِتَابٌ', 'كِتَابٍ', 'كِتَابًا'], answer: 'كِتَابٌ' }), true, 'iʿrāb endings differ on purpose');
  assert.equal(validOptions({ kind: 'feature', options: ['x'], answer: 'x' }), false, 'nothing to choose');
  assert.equal(validOptions({ kind: 'gt_khilaf_whose', options: ['Kūfans', 'Baṣrans'], answer: 'Kūfans' }), true, 'a binary question');
  assert.equal(validOptions({ kind: 'pairs', pairs: [['a', '1'], ['b', '2']] }), false);
  assert.equal(validOptions({ kind: 'order', shuffled: [1, 0, 2] }), true);
});
