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
  assert.deepEqual(tue.cards.map((c) => [c.kind, c.title, c.sub]), [['step', 'Read', '00 · Orientation']]);
  const fri = w.weeks[0]!.days[4]!;
  assert.deepEqual(fri.cards.map((c) => [c.kind, c.title]), [['aim', '00 · Orientation']]);
  assert.equal(w.count.steps, 1);
  assert.equal(w.count.aims, 1); // ep 00 aims Fri 20; ep 01's Mon 23 is next week
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
  assert.equal(m.count.aims, 2); // Fri 20 and Mon 23
  assert.equal(m.weeks[3]!.label, '16–22 Nov');
});
