// A root typed in Latin letters, every way: the Arabic roots it can stand for (matched against root_normalized).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latinVariants } from '../src/routes/lookup';

test('Latin spellings reach their roots', () => {
  const has = (q: string, root: string) => assert.ok(latinVariants(q).includes(root), `${q} → ${root}: ${latinVariants(q).slice(0, 10)}`);
  has('jdl', 'جدل'); has('Jdl', 'جدل'); has('j d l', 'جدل'); has('jidal', 'جدل');
  has('nzl', 'نزل'); has('tanzil', 'نزل'); has('munazzal', 'نزل');
  has('ʿqb', 'عقب'); has('aqb', 'عقب'); has("'qb", 'عقب');
  has('alh', 'اله'); has('ghfr', 'غفر'); has('shdd', 'شدد'); has('dhnb', 'ذنب'); has('syr', 'صير');
});

test('not a spelling: Arabic, digits, or letters with no Arabic reading', () => {
  assert.deepEqual(latinVariants('جدل'), []);
  assert.deepEqual(latinVariants('40:35'), []);
  assert.deepEqual(latinVariants('p'), []);
});
