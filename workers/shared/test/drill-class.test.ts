import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { nextItem, starsFor, scoreOf, daysTaken, nextNode, seededRating, type ItemRecord } from '../src/drill-class';

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
  });
});

test('seeded rating', () => {
  assert.equal(seededRating('right'), 3);
  assert.equal(seededRating('perfected'), 2);
  assert.equal(seededRating('open'), 2);
});
