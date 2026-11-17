import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, dayLine, nowOf } from '../src/routes/body-focus';
import type { FocusPrayer } from '../src/routes/body-prayer';

const P = (key: string, state: string, prayed = false, starts = '2026-11-17T00:00:00Z', ends = '2026-11-17T02:00:00Z'): FocusPrayer =>
  ({ key, label: key[0]!.toUpperCase() + key.slice(1), label_ar: null, state, status: prayed ? 'on_time' : null, prayed,
     rating: prayed ? 'good' : null, starts_at: starts, ends_at: ends, time_label: '' });
const walk = { cue: 'After ʿAṣr', prayer: 'asr', after_min: 20, minutes: 30 };

test('countdown words', () => {
  assert.equal(countdown(0, 102 * 60_000), 'in 1 h 42 m');
  assert.equal(countdown(0, 25 * 60_000), 'in 25 m');
  assert.equal(countdown(0, 120 * 60_000), 'in 2 h');
  assert.equal(countdown(5, 0), 'now');
});

test('the walk sits after the prayer it follows', () => {
  const line = dayLine([P('fajr', 'prayed', true), P('dhuhr', 'prayed', true), P('asr', 'open'), P('maghrib', 'not_yet'), P('isha', 'not_yet')], walk, false);
  assert.deepEqual(line.map((x) => x.key), ['fajr', 'dhuhr', 'asr', 'walk', 'maghrib', 'isha']);
});

test('now: an open prayer first, then a make-up, then the walk after its prayer, then the next prayer', () => {
  const day = [P('fajr', 'prayed', true), P('dhuhr', 'open'), P('asr', 'not_yet', false, '2026-11-17T05:00:00Z')];
  assert.equal(nowOf(day, walk, false, null, Date.parse('2026-11-17T01:00:00Z')).label, 'Pray Dhuhr');
  const done = [P('fajr', 'prayed', true), P('dhuhr', 'prayed', true), P('asr', 'prayed', true, '2026-11-17T05:00:00Z')];
  assert.equal(nowOf(done, walk, false, P('fajr', 'missed'), Date.parse('2026-11-17T06:00:00Z')).kind, 'make_up');
  assert.equal(nowOf(done, walk, false, null, Date.parse('2026-11-17T06:00:00Z')).kind, 'walk');
  const later = [...done, P('maghrib', 'not_yet', false, '2026-11-17T08:00:00Z')];
  const n = nowOf(later, walk, true, null, Date.parse('2026-11-17T06:30:00Z'));
  assert.equal(n.label, 'Maghrib');
  assert.equal(n.countdown, 'in 1 h 30 m');
});
