import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesPlan } from '../src/checklist';
import { buildActivity, isoWeek, mondayOf, type ActivitySeries } from '../src/activity';

const plan = seriesPlan(JSON.stringify({
  steps: [{ key: 'read', label: 'Read' }, { key: 'notes', label: 'Notes & questions' },
          { key: 'build', label: 'Build the podcast' }, { key: 'shoot', label: 'Shoot' }],
  cadence_days: 3, tz: 'Australia/Sydney',
}));
const series: ActivitySeries[] = [{
  id: 'SER:x', title: 'Liberalism', plan, accent: '#4fb39a',
  episodes: [
    { id: 'a', session_no: 0, title: 'Liberalism · 00 — Orientation',
      meta_json: JSON.stringify({ steps_done: { read: '2026-11-16T22:30:00Z' } }) }, // 17 Nov in Sydney
    { id: 'b', session_no: 1, title: 'Liberalism · 01 — The English documents', meta_json: null },
  ],
}];
const now = new Date('2026-11-17T01:00:00Z');

test('weeks start on Monday and carry their ISO number', () => {
  assert.equal(mondayOf('2026-11-19'), '2026-11-16');
  assert.equal(mondayOf('2026-11-16'), '2026-11-16');
  assert.equal(isoWeek('2026-11-16'), 47);
});

test('the week: seven labelled days, a ticked step on its day, aims on theirs', () => {
  const w = buildActivity('week', '2026-11-18', series, now, 'Australia/Sydney');
  assert.equal(w.weeks.length, 1);
  assert.equal(w.weeks[0]!.days.length, 7);
  assert.equal(w.label, 'Week of 16 Nov');
  assert.equal(w.prev, '2026-11-09');
  const tue = w.weeks[0]!.days[1]!;
  assert.equal(tue.date, '2026-11-17');
  assert.equal(tue.today, true);
  // nothing finished yet: ep 00 is aimed at today, beside the step ticked today; ep 01 waits its turn
  assert.deepEqual(tue.cards.map((c) => [c.kind, c.title]), [['step', 'Read'], ['aim', '00 · Orientation']]);
  assert.equal(w.count.steps, 1);
  assert.equal(w.count.planned, 1);
});

test('the month: whole weeks around it, the days outside it marked, counts only inside', () => {
  const m = buildActivity('month', '2026-11', series, now, 'Australia/Sydney');
  assert.equal(m.label, 'November 2026');
  assert.equal(m.prev, '2026-10');
  assert.equal(m.next, '2026-12');
  assert.equal(m.weeks[0]!.start, '2026-10-26'); // 1 Nov 2026 is a Sunday
  assert.equal(m.weeks.at(-1)!.days.at(-1)!.date, '2026-12-06');
  assert.equal(m.weeks[0]!.days[0]!.in_range, false);
  assert.equal(m.weeks[0]!.days[6]!.in_range, true);
  assert.equal(m.count.steps, 1);
  assert.equal(m.count.planned, 1); // only the active episode (ep 00) is planned
  assert.equal(m.weeks[3]!.label, '16–22 Nov');
});

test('weekly on Saturday: sessions Mon · Wed · Fri, the shoot on Saturday, rolling', () => {
  const sat = seriesPlan(JSON.stringify({
    steps: [
      { key: 's1', label: 'Session 1', offset: -5, action: 'notes' },
      { key: 's2', label: 'Session 2', offset: -3, action: 'notes' },
      { key: 's3', label: 'Session 3', offset: -1, action: 'notes' },
      { key: 'shoot', label: 'Saturday · 1 hour', offset: 0, action: 'shoot' },
    ],
    weekday: 6, tz: 'Australia/Sydney',
  }));
  const eps: ActivitySeries['episodes'] = [
    { id: 'x', session_no: 1, title: 'Ghāfir · 01 — The Names', meta_json: JSON.stringify({ planner: false }) },
    { id: 'a', session_no: 2, title: 'Ghāfir · 02 — The Charge', meta_json: null },
    { id: 'b', session_no: 3, title: 'Ghāfir · 03 — The Word', meta_json: null },
  ];
  const S = [{ id: 'S', title: 'Ghāfir', plan: sat, accent: '#D8B657', episodes: eps }];
  // today Tue 17 Nov → ep 02 is active and aims Sat 21 Nov: its sessions Mon 16, Wed 18, Fri 20; ep 03 waits
  const w = buildActivity('week', '2026-11-16', S, now, 'Australia/Sydney');
  const byDay = Object.fromEntries(w.weeks[0]!.days.map((d) => [d.date, d.cards.map((c) => `${c.title}|${c.sub}`)]));
  assert.deepEqual(byDay['2026-11-16'], ['Session 1|02 · The Charge']);
  assert.deepEqual(byDay['2026-11-18'], ['Session 2|02 · The Charge']);
  assert.deepEqual(byDay['2026-11-20'], ['Session 3|02 · The Charge']);
  assert.deepEqual(byDay['2026-11-21'], ['Saturday · 1 hour|02 · The Charge']);
  assert.equal(w.count.planned, 4);
  const next = buildActivity('week', '2026-11-23', S, now, 'Australia/Sydney');
  assert.equal(next.count.planned, 0); // ep 03 is queued until ep 02 is recorded
});

test('every second day: day 1 read + points, day 2 record; the next queues once one is recorded', () => {
  const two = seriesPlan(JSON.stringify({
    steps: [{ key: 'read', label: 'Day 1 · Read + points', opens: 'read_unit', offset: -1, action: 'notes' },
            { key: 'shoot', label: 'Day 2 · Record', offset: 0, action: 'shoot' }],
    cadence_days: 2, weekday: null, tz: 'Australia/Sydney',
  }));
  const at = '2026-10-30T08:00:00Z';
  const eps = [
    { id: 'p1', session_no: 1, title: 'P01 — Opening', meta_json: JSON.stringify({ steps_done: { read: at, shoot: at } }) },
    { id: 'p2', session_no: 2, title: 'P02 — The Charge', meta_json: null },
    { id: 'p3', session_no: 3, title: 'P03 — Next', meta_json: null },
  ];
  // today Tue 17 Nov; the last one was recorded long ago → p2 reads today and records tomorrow, never in the past
  let w = buildActivity('week', '2026-11-17', [{ id: 'S', title: 'Ghāfir', plan: two, accent: '#D8B657', episodes: eps }],
    now, 'Australia/Sydney');
  const day = (d: string) => w.weeks[0]!.days.find((x) => x.date === d)!.cards.map((c) => [c.kind, c.title, c.sub]);
  assert.deepEqual(day('2026-11-17'), [['plan', 'Day 1 · Read + points', '02 · The Charge']]);
  assert.deepEqual(day('2026-11-18'), [['plan', 'Day 2 · Record', '02 · The Charge']]);
  assert.equal(w.count.planned, 2);
  // p2 recorded on Wed 18 → p3 reads Thu 19, records Fri 20
  eps[1]!.meta_json = JSON.stringify({ steps_done: { read: '2026-11-17T03:00:00Z', shoot: '2026-11-18T03:00:00Z' } });
  w = buildActivity('week', '2026-11-17', [{ id: 'S', title: 'Ghāfir', plan: two, accent: '#D8B657', episodes: eps }],
    new Date('2026-11-18T05:00:00Z'), 'Australia/Sydney');
  assert.deepEqual(day('2026-11-19'), [['plan', 'Day 1 · Read + points', '03 · Next']]);
  assert.deepEqual(day('2026-11-20'), [['plan', 'Day 2 · Record', '03 · Next']]);
});
