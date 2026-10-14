// Crossing axes (AR 0057): a term on another axis of its group is never a wrong choice beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossing } from '../src/lib/grammar';

test('terms on crossing axes of one group clash; same axis or other groups do not', () => {
  const row = (key: string, group: string, axis: number) => ({ key, label: group, labelAr: null, detail: null, icon: null, color: null, min: null, extra: { group, axis } });
  const clash = crossing({ term_axis: [row('GT:idafa_kind:manawiya', 'idafa', 0), row('GT:idafa_kind:lafziya', 'idafa', 0),
                                       row('GT:idafa_kind:mumtani', 'idafa', 1), row('GT:harf_maani:zaida', 'zaida', 0)] } as never);
  assert.equal(clash('GT:idafa_kind:manawiya', 'GT:idafa_kind:mumtani'), true, 'semantic vs a kind: two right answers');
  assert.equal(clash('GT:idafa_kind:manawiya', 'GT:idafa_kind:lafziya'), false, 'same axis: a real contrast');
  assert.equal(clash('GT:idafa_kind:manawiya', 'GT:harf_maani:zaida'), false, 'other group');
  assert.equal(clash('GT:idafa_kind:manawiya', 'GT:other'), false, 'no axis: free');
});
