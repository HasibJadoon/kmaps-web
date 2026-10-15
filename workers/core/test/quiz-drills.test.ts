// A kept drill as a live quiz question, in the room's three ways — one plate, every plate that holds, tiles in
// order — its answer known only to the room; and how each answer is graded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizDrillOf, quizAnswerHolds } from '../src/quiz/drills';

const card = (drill: unknown) => JSON.stringify({ module: 'QR', extra: { drill } });

test('one plate: its prompt, the Arabic it asks of, its choices, where the answer is', () => {
  const q = quizDrillOf(card({ id: 'irab:40:2:6', prompt: 'What is the iʿrāb of الْعَلِيمِ?',
    words: [{ t: 'تَنزِيلُ' }, { t: 'الْكِتَابِ' }], options: ['khabar', 'naʿt', 'badal'], answer: 'naʿt', explanation: 'An adjective of Allah.' }))!;
  assert.equal(q.mode, 'one'); assert.equal(q.correctIndex, 1); assert.equal(q.line, 'تَنزِيلُ الْكِتَابِ');
  assert.deepEqual(q.options, ['khabar', 'naʿt', 'badal']); assert.equal(q.explanation, 'An adjective of Allah.');
});

test('odd one out is one plate too', () => {
  const q = quizDrillOf(card({ prompt: 'Which word is not in the line?', interaction: 'odd_one_out', options: ['a', 'b', 'c', 'd'], answer: 'c' }))!;
  assert.equal(q.mode, 'one'); assert.equal(q.correctIndex, 2);
});

test('every plate that holds: the set, ascending', () => {
  const q = quizDrillOf(card({ prompt: 'Which of these are sound plurals?', interaction: 'choose_all', options: ['a', 'b', 'c', 'd'], correct: [3, 1] }))!;
  assert.equal(q.mode, 'all'); assert.deepEqual(q.correct, [1, 3]);
});

test('tiles in order: the tokens, decoys among them; its instruction stands for a prompt', () => {
  const q = quizDrillOf(card({ instruction: 'Listen, then build the English', interaction: 'tiles', tokens: ['boy', 'The', 'cat', 'went'], solution: [1, 0, 3] }))!;
  assert.equal(q.mode, 'order'); assert.deepEqual(q.options, ['boy', 'The', 'cat', 'went']); assert.deepEqual(q.correct, [1, 0, 3]);
});

test('a drill that cannot be played is not quizzed', () => {
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a', 'b'], answer: 'c' })), null, 'answer not among them');
  assert.equal(quizDrillOf(card({ prompt: 'p', options: ['a', 'a'], answer: 'a' })), null, 'not distinct');
  assert.equal(quizDrillOf(card({ prompt: 'p', interaction: 'choose_all', options: ['a', 'b'], correct: [] })), null, 'nothing holds');
  assert.equal(quizDrillOf(card({ prompt: 'p', interaction: 'tiles', tokens: ['a', 'b'], solution: [0, 5] })), null, 'a tile out of range');
  assert.equal(quizDrillOf(card({ options: ['a', 'b'], answer: 'a' })), null, 'no prompt');
  assert.equal(quizDrillOf('{bad'), null);
});

test('graded: one plate; exactly the set, in any order; the tiles in their order', () => {
  assert.equal(quizAnswerHolds({ mode: 'one', correctIndex: 2, correct: [2] }, { choice: 2 }), true);
  assert.equal(quizAnswerHolds({ mode: 'all', correctIndex: -1, correct: [1, 3] }, { picked: [3, 1] }), true);
  assert.equal(quizAnswerHolds({ mode: 'all', correctIndex: -1, correct: [1, 3] }, { picked: [1] }), false);
  assert.equal(quizAnswerHolds({ mode: 'order', correctIndex: -1, correct: [1, 0, 3] }, { picked: [1, 0, 3] }), true);
  assert.equal(quizAnswerHolds({ mode: 'order', correctIndex: -1, correct: [1, 0, 3] }, { picked: [0, 1, 3] }), false);
});
