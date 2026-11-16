import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesPlan, episodeSteps, checklists, dayLabel, addDays } from '../src/checklist';

const SERIES = JSON.stringify({
  steps: [
    { key: 'read', label: 'Read', hint: 'Read the part named in the plan', opens: 'read_unit' },
    { key: 'notes', label: 'Notes & questions' },
    { key: 'build', label: 'Build the podcast' },
    { key: 'shoot', label: 'Shoot' },
    { label: 'no key — skipped' },
  ],
  cadence_days: 3,
  tz: 'Australia/Sydney',
  open_url: 'com.kmaps.app://wv/unit/{unit}',
});
const plan = seriesPlan(SERIES);
const ALL = ['read', 'notes', 'build', 'shoot'];
const done = (keys: string[], at: string) => JSON.stringify({ steps_done: Object.fromEntries(keys.map((k) => [k, at])) });

test('steps come from the series row, in order, bad items dropped', () => {
  assert.deepEqual(plan.steps.map((d) => d.key), ALL);
  assert.equal(plan.cadenceDays, 3);
  assert.equal(seriesPlan(null).steps.length, 0);
  assert.equal(seriesPlan('not json').steps.length, 0);
});

test('the Read step opens the episode\'s own reading', () => {
  const steps = episodeSteps(plan, JSON.stringify({ read_unit: 'wv-corp-x:u003' }));
  assert.deepEqual(steps[0]!.open, { unit: 'wv-corp-x:u003', url: 'com.kmaps.app://wv/unit/wv-corp-x:u003' });
  assert.equal(steps[1]!.open, undefined);
  assert.equal(episodeSteps(plan, null)[0]!.open, undefined);
});

test('nothing finished: the first is up next, due in 3 days, then every 3 days', () => {
  const now = new Date('2026-11-17T01:00:00Z'); // 12:00 in Sydney
  const map = checklists(plan, [
    { id: 'b', session_no: 1, meta_json: null },
    { id: 'a', session_no: 0, meta_json: done(['read'], '2026-11-16T22:00:00Z') },
    { id: 'c', session_no: 2, meta_json: null },
  ], now);
  assert.equal(map.get('a')!.up_next, true);
  assert.equal(map.get('a')!.done, 1);
  assert.equal(map.get('a')!.target_on, '2026-11-20');
  assert.equal(map.get('b')!.target_on, '2026-11-23');
  assert.equal(map.get('c')!.target_on, '2026-11-26');
  assert.equal(map.get('b')!.up_next, false);
});

test('dates roll from the last finished episode, and never into the past', () => {
  const now = new Date('2026-11-17T01:00:00Z');
  const fresh = checklists(plan, [
    { id: 'a', session_no: 0, meta_json: done(ALL, '2026-11-16T03:00:00Z') },
    { id: 'b', session_no: 1, meta_json: null },
  ], now);
  assert.equal(fresh.get('a')!.finished_on, '2026-11-16');
  assert.equal(fresh.get('a')!.finished_label, 'Mon 16 Nov');
  assert.equal(fresh.get('a')!.target_on, null);
  assert.equal(fresh.get('b')!.up_next, true);
  assert.equal(fresh.get('b')!.target_on, '2026-11-19');

  const behind = checklists(plan, [
    { id: 'a', session_no: 0, meta_json: done(ALL, '2026-11-01T03:00:00Z') },
    { id: 'b', session_no: 1, meta_json: null },
  ], now);
  assert.equal(behind.get('b')!.target_on, '2026-11-17'); // today, not 4 Nov
});

test('labels read as a day', () => {
  assert.equal(dayLabel('2026-11-20'), 'Fri 20 Nov');
  assert.equal(addDays('2026-11-30', 3), '2026-12-03');
});
