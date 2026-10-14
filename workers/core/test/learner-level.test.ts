// The learner's level per skill: a round moves it up at ≥ 80%, down at ≤ 50%, never past either end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextLevel } from '../src/routes/learner';

test('a skill climbs, holds and drops on its rounds, within its levels', () => {
  const L = ['basic', 'middle', 'advanced'];
  assert.equal(nextLevel(L, 'basic', 7, 8), 'middle');
  assert.equal(nextLevel(L, 'middle', 5, 8), 'middle');
  assert.equal(nextLevel(L, 'middle', 4, 8), 'basic');
  assert.equal(nextLevel(L, 'advanced', 8, 8), 'advanced');
  assert.equal(nextLevel(L, 'basic', 0, 8), 'basic');
  assert.equal(nextLevel(L, 'basic', 0, 0), 'basic');
  assert.equal(nextLevel(L, 'unknown', 8, 8), 'unknown');
  assert.equal(nextLevel(L, 'basic', 6, 8, 0.75), 'middle');
});
