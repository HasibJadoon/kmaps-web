import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gtRefsOf } from '../src/gt-attach';

describe('the GT refs a drill names', () => {
  test('found anywhere in the drill, once each, in order', () => {
    const drill = {
      kind: 'irab', prompt: 'What is تنزيل here?',
      srs: { resourceRef: 'QR:irab:40:2:1', extra: { role: 'GT:irab_role:mubtada' } },
      options: ['GT:irab_role:khabar', 'GT:irab_role:mubtada'],
      note: { en: 'see GT:case:nominative.' },
    };
    assert.deepEqual(gtRefsOf(drill), ['GT:irab_role:mubtada', 'GT:irab_role:khabar', 'GT:case:nominative']);
  });
  test('a drill that names no term carries none', () => {
    assert.deepEqual(gtRefsOf({ kind: 'fill', answer: 'كتاب' }), []);
    assert.deepEqual(gtRefsOf(null), []);
  });
});
