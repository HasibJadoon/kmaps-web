import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionConfig } from '../../studio/src/repositories/episode.repo';

test('reads mode, turns and string labels', () => {
  const out = sessionConfig(JSON.stringify({ session: { mode: 'discussion', turns: 'owner', labels: { next: 'Next', bad: 3 } } }));
  assert.deepEqual(out, { mode: 'discussion', turns: 'owner', labels: { next: 'Next' } });
});

test('no session block, bad JSON, or no mode gives null', () => {
  assert.equal(sessionConfig(null), null);
  assert.equal(sessionConfig('{not json'), null);
  assert.equal(sessionConfig(JSON.stringify({ sections: [] })), null);
  assert.equal(sessionConfig(JSON.stringify({ session: { labels: {} } })), null);
});
