// A Latin query's keys for the root table: its consonants as the table's simple_lat is compared, tried in turn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latinKeys, latinSkeleton } from '../src/routes/lookup';

test('a Latin spelling reads as the root table writes it: consonants only', () => {
  for (const q of ['jdl', 'Jdl', 'j d l', 'j-d-l', 'jidal', 'jadala']) assert.equal(latinSkeleton(q), 'jdl', q);
  assert.equal(latinSkeleton('ʿqb'), 'qb');     // the table writes عقب as 'qb'
  assert.equal(latinSkeleton('aqb'), 'qb');
  assert.equal(latinSkeleton('ghafara'), 'ghfr');
  assert.equal(latinSkeleton('ḥamd'), 'hmd');
});

test('keys in turn: as typed, a doubled letter as one, then the first letter off', () => {
  assert.deepEqual(latinKeys('jdl'), [['jdl']]);
  assert.deepEqual(latinKeys('tanzil'), [['tnzl'], ['nzl']]);
  assert.deepEqual(latinKeys('munazzal'), [['mnzzl'], ['mnzl'], ['nzzl', 'nzl']]);
  assert.deepEqual(latinKeys('جدل'), []);
  assert.deepEqual(latinKeys('40:35'), []);
});
