import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gtRefsOf, attachGt } from '../src/gt-attach';

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

describe('attachGt', () => {
  const db = {
    prepare: () => ({ bind: () => ({ all: async () => ({ results: [
      { id: 'GT:irab_role:mubtada', name_ar: 'مبتدأ', badge_color: '#123456' }] }) }) }),
  } as unknown as D1Database;

  test('the drill and the copy its card keeps both carry the terms', async () => {
    const drill = { id: 'd1', role: 'GT:irab_role:mubtada', srs: { module: 'QR', extra: { drill: { id: 'd1' }, group: {} } } };
    const [out] = await attachGt(db, [drill]);
    const chip = { ref: 'GT:irab_role:mubtada', nameAr: 'مبتدأ', color: '#123456' };
    assert.deepEqual(out.gt, [chip]);
    assert.deepEqual((out.srs as { extra: { drill: { gt: unknown } } }).extra.drill.gt, [chip]);
    assert.deepEqual((out.srs as { extra: { group: unknown } }).extra.group, {});
  });

  test('a drill with no card is left without one', async () => {
    const [out] = await attachGt(db, [{ id: 'd2', role: 'GT:irab_role:mubtada' }]);
    assert.equal('srs' in out, false);
  });
});
