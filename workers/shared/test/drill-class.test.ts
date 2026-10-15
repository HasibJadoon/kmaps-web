import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { nextItem, starsFor, scoreOf, daysTaken, nextNode, seededRating, type ItemRecord,
         roadmapOf, streakOf, recentDays, sectionOf } from '../src/drill-class';

describe('nextItem', () => {
  test('right the first time is right', () => {
    assert.deepEqual(nextItem(null, { first: true, misses: 0, streak: 1 }),
      { first_right: 1, misses: 0, streak: 1, state: 'right' });
  });

  test('missed, then right once, stays open', () => {
    const r = nextItem(null, { first: false, misses: 1, streak: 1 });
    assert.equal(r.state, 'open');
    assert.equal(r.first_right, 0);
  });

  test('an open item clears on its second right in a row, across sprints', () => {
    const a = nextItem(null, { first: false, misses: 1, streak: 1 });
    const b = nextItem(a, { first: true, misses: 0, streak: 1 });
    assert.equal(b.state, 'perfected');
    assert.equal(b.misses, 1);
    assert.equal(b.first_right, 0);
  });

  test('a miss on replay resets the streak and reopens a perfected item', () => {
    const p: ItemRecord = { first_right: 0, misses: 1, streak: 2, state: 'perfected' };
    const r = nextItem(p, { first: false, misses: 1, streak: 1 });
    assert.equal(r.state, 'open');
    assert.equal(r.streak, 1);
    assert.equal(r.misses, 2);
  });

  test('a marked word is open even when answered', () => {
    assert.equal(nextItem(null, { first: true, misses: 0, streak: 1, marked: true }).state, 'open');
    const right: ItemRecord = { first_right: 1, misses: 0, streak: 1, state: 'right' };
    assert.equal(nextItem(right, { first: true, misses: 0, streak: 3, marked: true }).state, 'open');
  });

  test('first-time right never changes once recorded', () => {
    const right: ItemRecord = { first_right: 1, misses: 0, streak: 1, state: 'right' };
    assert.equal(nextItem(right, { first: false, misses: 2, streak: 1 }).first_right, 1);
  });
});

describe('stars and score', () => {
  const bands = [{ stars: 3, min: 90 }, { stars: 2, min: 75 }];
  test('bands, highest first', () => {
    assert.equal(starsFor(9, 10, bands), 3);
    assert.equal(starsFor(8, 10, bands), 2);
    assert.equal(starsFor(5, 10, bands), 1);
    assert.equal(starsFor(0, 0, bands), 0);
  });
  test('score is a rounded percentage', () => {
    assert.equal(scoreOf(2, 3), 67);
    assert.equal(scoreOf(0, 0), 0);
  });
});

describe('daysTaken', () => {
  test('both ends counted, gaps included', () => {
    assert.equal(daysTaken(['2026-10-01']), 1);
    assert.equal(daysTaken(['2026-10-03', '2026-10-01']), 3);
    assert.equal(daysTaken([]), 0);
  });
});

describe('nextNode', () => {
  test('sprints are a set; stars keep the best', () => {
    const a = nextNode(undefined, 0, 3, 12, 10, 300, 2);
    const b = nextNode(a, 0, 3, 12, 12, 200, 3);
    const c = nextNode(b, 1, 3, 12, 6, 250, 1);
    assert.deepEqual(c.sprints, [0, 1]);
    assert.equal(c.stars, 3);
    assert.equal(c.items, 36);
    assert.equal(c.of, 3);
    assert.equal(c.best, 100);
  });
});

test('seeded rating', () => {
  assert.equal(seededRating('right'), 3);
  assert.equal(seededRating('perfected'), 2);
  assert.equal(seededRating('open'), 2);
});

// ── the roadmap ──────────────────────────────────────────────────────────────

test('a class belongs to its sūra: the scope less its last part', () => {
  assert.equal(sectionOf('QR:SP:40:1-3'), 'QR:SP:40');
  assert.equal(sectionOf('AR:unit:U7'), 'AR:unit');
});

test('the streak runs back from today, or from yesterday while today is not yet studied', () => {
  assert.deepEqual(streakOf(['2026-10-13', '2026-10-14', '2026-10-15'], '2026-10-15'), { current: 3, best: 3, today: true });
  assert.deepEqual(streakOf(['2026-10-13', '2026-10-14'], '2026-10-15'), { current: 2, best: 2, today: false });
  assert.deepEqual(streakOf(['2026-10-12'], '2026-10-15'), { current: 0, best: 1, today: false });
  // the longest run there has been, not only the current one
  assert.equal(streakOf(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-15'], '2026-10-15').best, 4);
  assert.deepEqual(streakOf([], '2026-10-15'), { current: 0, best: 0, today: false });
});

test('the last four weeks: every day there, oldest first, summed across classes', () => {
  const d = recentDays([{ day: '2026-10-15', seconds: 60, items: 5, right: 4 }, { day: '2026-10-15', seconds: 30, items: 2, right: 2 },
                        { day: '2026-09-01', seconds: 9, items: 9, right: 9 }], '2026-10-15');
  assert.equal(d.length, 28);
  assert.equal(d[0].day, '2026-09-18');
  assert.deepEqual(d[27], { day: '2026-10-15', seconds: 90, items: 7, right: 6 });
  assert.equal(d.reduce((a, x) => a + x.items, 0), 7, 'a day before the window is not counted');
});

test('per sūra: studied with their stars and days, under way, still to perfect', () => {
  const m = roadmapOf([
    { scope: 'QR:SP:40:1-3', status: 'studied', rating: 3, daysTaken: 2, activeDays: 2, open: 0 },
    { scope: 'QR:SP:40:4-5', status: 'in_progress', rating: null, daysTaken: null, activeDays: 1, open: 4 },
    { scope: 'QR:SP:44:1-9', status: 'studied', rating: 2, daysTaken: null, activeDays: 3, open: 0 },
  ], [{ day: '2026-10-14', seconds: 100, items: 10, right: 9 }], '2026-10-15');
  assert.deepEqual(m.sections, [
    { section: 'QR:SP:40', studied: 1, underWay: 1, stars: 3, days: 2, open: 4 },
    { section: 'QR:SP:44', studied: 1, underWay: 0, stars: 2, days: 3, open: 0 },
  ]);
  assert.equal(m.units.length, 3);
  assert.equal(m.units[1].section, 'QR:SP:40');
  assert.deepEqual(m.streak, { current: 1, best: 1, today: false });
});
