import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holds, stageOf, stageStates, type EpisodeFacts } from '../src/studio/rules';

const facts = (p: Partial<EpisodeFacts> = {}): EpisodeFacts => ({
  refs: {}, checks: {}, defined_checks: ['ready.slides', 'ready.room', 'research.tafsir'], resources: {}, takes: 0, publications: [], ...p,
});

// the sprint as the registry seeds it
const STAGES = [
  { key: 'planned', seq: 1, done_rule: { has: 'boundary_ref' } },
  { key: 'research', seq: 2, done_rule: { all: [{ resources: 'tafsir', min: 5 }, { checks: 'research.*' }] } },
  { key: 'scenes', seq: 3, done_rule: { has: 'scenes_ref' } },
  { key: 'ready', seq: 4, done_rule: { all: [{ checks: 'ready.*' }, { has: 'slides_ref' }] } },
  { key: 'filmed', seq: 5, done_rule: { takes_min: 1 } },
  { key: 'published', seq: 6, done_rule: { publication: 'long' } },
];

test('rules: each kind, and an unknown rule never holds', () => {
  const f = facts({ refs: { scenes_ref: 'CM:DOC:x' }, checks: { 'ready.slides': 'pass', 'ready.room': 'na' }, resources: { tafsir: 5 }, takes: 2, publications: ['long'] });
  assert.equal(holds({}, f), true);
  assert.equal(holds({ has: 'scenes_ref' }, f), true);
  assert.equal(holds({ has: 'slides_ref' }, f), false);
  assert.equal(holds({ checks: 'ready.*' }, f), true);
  assert.equal(holds({ checks: 'research.*' }, f), false);
  assert.equal(holds({ checks: 'nothing.*' }, f), false);
  assert.equal(holds({ resources: 'tafsir', min: 5 }, f), true);
  assert.equal(holds({ resources: 'tafsir', min: 6 }, f), false);
  assert.equal(holds({ takes_min: 3 }, f), false);
  assert.equal(holds({ publication: 'long' }, f), true);
  assert.equal(holds({ any: [{ has: 'slides_ref' }, { takes_min: 1 }] }, f), true);
  assert.equal(holds({ not: { publication: 'short' } }, f), true);
  assert.equal(holds({ hass: 'scenes_ref' }, f), false);
});

test('the stage is derived, never stored', () => {
  assert.equal(stageOf(STAGES, facts()), 'planned');
  assert.equal(stageOf(STAGES, facts({ refs: { boundary_ref: 'QR:40:1-5' } })), 'research');
  const researched = facts({ refs: { boundary_ref: 'QR:40:1-5' }, resources: { tafsir: 5 }, checks: { 'research.tafsir': 'pass' } });
  assert.equal(stageOf(STAGES, researched), 'scenes');
  const ready = { ...researched, refs: { ...researched.refs, scenes_ref: 'd', slides_ref: 's' }, checks: { ...researched.checks, 'ready.slides': 'pass', 'ready.room': 'pass' } };
  assert.equal(stageOf(STAGES, ready), 'filmed');
  assert.deepEqual(stageStates(STAGES, ready).map((s) => s.state), ['done', 'done', 'done', 'done', 'current', 'next']);
  assert.equal(stageOf(STAGES, { ...ready, takes: 1, publications: ['long'] }), 'published');
  // a later stage holding does not skip an earlier one that does not
  assert.equal(stageOf(STAGES, facts({ publications: ['long'] })), 'planned');
});

test('the room turns a take into D1 rows: one take, one marker per scene shown', async () => {
  const { takeStatements, tc } = await import('../src/studio/room.do');
  assert.equal(tc(3_723_456), '1:02:03.456');
  const st = takeStatements('EP:dz-qr:002', 3, { markAt: 10_000, log: [
    { scene: 0, beat: 0, id: 'open', t: 10_000 }, { scene: 1, beat: 2, id: 'read', t: 25_500 }] }, 70_000, 2);
  assert.equal(st.id, 'EP:dz-qr:002:take:3');
  assert.deepEqual(st.take.args.slice(0, 3), ['EP:dz-qr:002:take:3', 'EP:dz-qr:002', 3]);
  assert.deepEqual(st.markers.map((m) => m.args.slice(1)), [[0, 'open', 0, '0:00:00.000', '0:00:15.500'], [1, 'read', 2, '0:00:15.500', '0:01:00.000']]);
});
