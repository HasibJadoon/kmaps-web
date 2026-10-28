// Deck search: a root, a word with or without its marks, English or a Latin name all find the deck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches } from '../src/lib/deck-search';

const tanzil = ['The word تَنزِيلُ — A sending down', 'دراسة تَنزِيلُ', 'qr-keyterm-study-tanzil', 'Descent', 'ن ز ل',
  'تَنْزِيل', 'A sending down', 'tanzil', 'نزل'];
const allah = ['The story of الله', 'قصّةُ الله', 'أله', 'أ ل ه', 'Worship', 'The name of God'];

test('a root finds its decks, spaced or not, any hamza seat', () => {
  assert.ok(matches(tanzil, 'نزل'));
  assert.ok(matches(tanzil, 'ن ز ل'));
  assert.ok(matches(allah, 'اله'));
  assert.ok(matches(allah, 'ءله'));
});

test('the word with or without its marks, and Qurʾānic spelling', () => {
  assert.ok(matches(tanzil, 'تنزيل'));
  assert.ok(matches(['ٱلۡكِتَٰبِ'], 'الكتاب'));
  assert.ok(matches(['ٱلۡكِتَٰبِ'], 'كتاب'));
});

test('English and Latin, any case, words in any order', () => {
  assert.ok(matches(tanzil, 'sending down'));
  assert.ok(matches(tanzil, 'Down sending'));
  assert.ok(matches(tanzil, 'TANZIL'));
  assert.ok(matches(['ʿalīm'], 'alim'));
});

test('what is not there is not found', () => {
  assert.ok(!matches(tanzil, 'كتب'));
  assert.ok(!matches(tanzil, 'mercy'));
});
