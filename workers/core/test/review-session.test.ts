// Review together, as the room decides it: an asked card goes out as its drill when it was filed
// from one, and a drill is answered at once by each — no reveal; a card with none waits for it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drillOf, canRateNow } from '../src/review-session.do';

test('a card\'s drill is what it was filed with; none when it has none or the json is bad', () => {
  assert.deepEqual(drillOf(JSON.stringify({ drill: { id: 'irab:40:2:6', kind: 'feature' }, group: {} })), { id: 'irab:40:2:6', kind: 'feature' });
  assert.equal(drillOf(JSON.stringify({ group: {} })), null);
  assert.equal(drillOf('{not json'), null);
  assert.equal(drillOf(null), null);
});

test('a drill is rated at once; a card only once revealed', () => {
  assert.equal(canRateNow({ back: null, drill: { id: 'x' } }), true);
  assert.equal(canRateNow({ back: null, drill: null }), false);
  assert.equal(canRateNow({ back: 'the answer', drill: null }), true);
  assert.equal(canRateNow(null), false);
});
