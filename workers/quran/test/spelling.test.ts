import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spelling } from '../src/routes/practice-sarf';

test('one word written two ways is one', () => {
  assert.equal(spelling('كِتَٰب'), spelling('كِتَابٌ'));
  assert.equal(spelling('اكْتَتَبَ'), spelling('إِكْتَتَبَ'));
  assert.equal(spelling('كَاتِب'), spelling('كَاتِبٌ'));
});

test('two words stay two', () => {
  assert.notEqual(spelling('كَتَبَ'), spelling('كَتَّبَ'));
  assert.notEqual(spelling('كِتَاب'), spelling('كُتَّاب'));
  assert.notEqual(spelling('مَكْتَبٌ'), spelling('مُكْتَبٌ'));
  assert.notEqual(spelling('مُكْتَبٌ'), spelling('مُكْتِبٌ'));
});
