import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveView } from '../../studio/src/live-view';

const sec = (id: string, type: string) => ({ id, type, points: [{ id: id + ':1' }] });
const ep = (sections: unknown[]) => ({ id: 'EP:x', sections } as never);

test('a discussion episode keeps only its discussion sections', () => {
  const out = liveView(ep([sec('a', 'sentence_structure'), sec('t1', 'discussion'), sec('b', 'main_point'), sec('t2', 'discussion')]));
  assert.deepEqual(out.sections.map((s: { id: string }) => s.id), ['t1', 't2']);
});

test('a class episode keeps every section', () => {
  const out = liveView(ep([sec('a', 'sentence_structure'), sec('b', 'main_point')]));
  assert.equal(out.sections.length, 2);
});

test('null passes through', () => {
  assert.equal(liveView(null), null);
});
