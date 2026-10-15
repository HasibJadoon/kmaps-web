// A kept drill as a live quiz question: one right answer among distinct choices, its answer's
// place known only to the room; anything else is not quizzed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizDrillOf } from '../src/quiz/drills';

const card = (drill: unknown) => JSON.stringify({ module: 'QR', extra: { drill } });

test('a single-answer drill: its prompt, the Arabic it asks of, its choices, where the answer is', () => {
  const q = quizDrillOf(card({ id: 'irab:40:2:6', prompt: 'What is the iʿrāb of الْعَلِيمِ?',
    words: [{ t: 'تَنزِيلُ' }, { t: 'الْكِتَابِ' }], options: ['khabar', 'naʿt', 'badal'], answer: 'naʿt', explanation: 'An adjective of Allah.' }));
  assert.deepEqual(q, { prompt: 'What is the iʿrāb of الْعَلِيمِ?', line: 'تَنزِيلُ الْكِتَابِ',
                        options: ['khabar', 'naʿt', 'badal'], correctIndex: 1, explanation: 'An adjective of Allah.' });
});

test('a drill without one right choice among distinct options is not quizzed', () => {
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a', 'b'], answer: 'c' })), null, 'answer not among them');
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a'], answer: 'a' })), null, 'one choice');
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a', 'a'], answer: 'a' })), null, 'not distinct');
  assert.equal(quizDrillOf(card({ prompt: 'p', units: ['a', 'b'] })), null, 'an ordering drill');
  assert.equal(quizDrillOf(card({ options: ['a', 'b'], answer: 'a' })), null, 'no prompt');
  assert.equal(quizDrillOf('{bad'), null);
  assert.equal(quizDrillOf(null), null);
});

test('the note stands for the explanation when there is none', () => {
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a', 'b'], answer: 'b', note: { en: 'Because b.', ar: '' } }))?.explanation, 'Because b.');
});
