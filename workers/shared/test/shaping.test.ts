// ─── shaping — the pinned behaviour ──────────────────────────────────────────
//
// These rules are about to move out of the clients and into the display-spec
// builder. Nothing in the repo failed when they changed, because nothing tested
// them: the iOS per-layer views have 7 tests and none of them covers the
// shaping. So they are pinned here first, and the builder is written against
// them afterwards.
//
// Each test names the behaviour it protects, not the function it calls — if one
// of these fails, the message should tell you what the reader would see.
//
//   npm test          (node --test, via tsx — no new dependencies)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  byDeathHijri, verbFormRank, byVerbForm, orderingKey, sortedBy,
  sortedByInferredKey, arcPath, arcNodes, offArcSenses, normaliseWeights,
  fillState, sensorFraction, numOrNull, scopeFold,
} from '../src/shaping';

describe('uṣūl are ordered oldest witness first', () => {
  test('an earlier death date outranks a more famous later one', () => {
    const out = byDeathHijri([
      { source_slug: 'maqayis', death_hijri: 395 },
      { source_slug: 'jamhara', death_hijri: 321 },
      { source_slug: 'lisan', death_hijri: 711 },
    ]);
    assert.deepEqual(out.map((r) => r['source_slug']), ['jamhara', 'maqayis', 'lisan']);
  });

  test('an undated witness sorts LAST, never first', () => {
    // The bug this guards: treating a NULL death date as 0 puts an unknown
    // source at the head of the ledger, where it reads as the earliest source.
    const out = byDeathHijri([
      { source_slug: 'undated', death_hijri: null },
      { source_slug: 'jamhara', death_hijri: 321 },
      { source_slug: 'blank', death_hijri: '' },
    ]);
    assert.deepEqual(out.map((r) => r['source_slug']), ['jamhara', 'undated', 'blank']);
  });
});

describe('verb forms follow the ladder, not the alphabet', () => {
  test('X sorts after III — the reason this table exists', () => {
    assert.ok(verbFormRank('X') > verbFormRank('III'));
  });

  test('the full ladder is I..XV in order', () => {
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    const ranks = romans.map(verbFormRank);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    assert.equal(new Set(ranks).size, romans.length, 'every form has a distinct rank');
  });

  test('an unrecognised form sorts last rather than colliding with Form I', () => {
    assert.equal(verbFormRank('XVI'), 99);
    assert.equal(verbFormRank(''), 99);
    assert.equal(verbFormRank(null), 99);
    assert.ok(verbFormRank('QUADRILITERAL') > verbFormRank('XV'));
  });

  test('sorting a form list is stable and lexicographic-proof', () => {
    const out = byVerbForm([
      { verb_form: 'X' }, { verb_form: 'II' }, { verb_form: 'I' }, { verb_form: 'IV' },
    ]);
    assert.deepEqual(out.map((r) => r['verb_form']), ['I', 'II', 'IV', 'X']);
  });
});

describe('a carrier is ordered by the column it actually has', () => {
  test('the precedence list picks step_no over sort_order', () => {
    assert.equal(orderingKey([{ sort_order: 1, step_no: 1, id: 'a' }]), 'step_no');
  });

  test('a carrier with no ordering column is left alone, not reordered', () => {
    const rows = [{ id: 'b' }, { id: 'a' }];
    assert.equal(orderingKey(rows), null);
    assert.deepEqual(sortedByInferredKey(rows).map((r) => r['id']), ['b', 'a']);
  });

  test('ordering is numeric — 10 comes after 9, not after 1', () => {
    const out = sortedBy(
      [{ seq: 10 }, { seq: 9 }, { seq: 1 }].map((r) => ({ ...r })), 'seq');
    assert.deepEqual(out.map((r) => r['seq']), [1, 9, 10]);
  });

  test('rows missing the ordering value sort last', () => {
    const out = sortedBy([{ seq: null, id: 'x' }, { seq: 2, id: 'y' }], 'seq');
    assert.deepEqual(out.map((r) => r['id']), ['y', 'x']);
  });
});

describe('the sense arc is the path its arc_key spells', () => {
  const senses = [
    { id: 'S1', sense_key: 'gathering', gloss_ar: 'الجمع', gloss_en: 'gathering', is_core: 1, sort_order: 0 },
    { id: 'S2', sense_key: 'decree', gloss_ar: 'القضاء', gloss_en: 'decree', is_core: 0, sort_order: 1 },
    { id: 'S3', sense_key: 'scripture', gloss_ar: 'الكتاب', gloss_en: 'scripture', is_core: 0, sort_order: 2 },
    { id: 'S4', sense_key: 'orphan', gloss_ar: 'يتيم', gloss_en: 'off the arc', is_core: 0, sort_order: 3 },
  ];
  const arc = { id: 'A1', arc_key: 'gathering>decree>scripture', terminal_sense_id: 'S3' };

  test('the path splits on > and trims', () => {
    assert.deepEqual(arcPath(' a > b>c '), ['a', 'b', 'c']);
    assert.deepEqual(arcPath('single'), ['single']);
    assert.deepEqual(arcPath(''), []);
    assert.deepEqual(arcPath('a>>b'), ['a', 'b'], 'an empty segment is dropped');
  });

  test('each rung resolves to the root\'s own sense, in path order', () => {
    const nodes = arcNodes(arc, senses);
    assert.deepEqual(nodes.map((n) => n.key), ['gathering', 'decree', 'scripture']);
    assert.deepEqual(nodes.map((n) => n.title), ['الجمع', 'القضاء', 'الكتاب']);
    assert.ok(nodes.every((n) => n.titleIsArabic));
  });

  test('only the terminal sense is marked terminal', () => {
    const nodes = arcNodes(arc, senses);
    assert.deepEqual(nodes.map((n) => n.isTerminal), [false, false, true]);
  });

  test('a rung naming a sense the root lacks is kept and flagged, not dropped', () => {
    // Silently dropping it would make a broken arc look complete.
    const nodes = arcNodes({ ...arc, arc_key: 'gathering>missing>scripture' }, senses);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[1].unresolved, true);
    assert.equal(nodes[1].title, 'missing', 'falls back to the raw key');
    assert.match(String(nodes[1].subtitle), /not among/);
    assert.equal(nodes[0].unresolved, false);
  });

  test('steps annotate rungs positionally, and only their own arc', () => {
    const steps = [
      { arc_id: 'A1', step_no: 2, note_md: 'second move' },
      { arc_id: 'A1', step_no: 1, note_md: 'first move' },
      { arc_id: 'OTHER', step_no: 1, note_md: 'not this arc' },
    ];
    const nodes = arcNodes(arc, senses, steps);
    assert.equal(nodes[0].detail, 'first move');
    assert.equal(nodes[1].detail, 'second move');
    assert.notEqual(nodes[2].detail, 'not this arc');
  });

  test('senses off every arc surface, core first', () => {
    const off = offArcSenses(senses, [arc]);
    assert.deepEqual(off.map((s) => s['sense_key']), ['orphan']);
  });

  test('with no arcs at all, every sense is off-arc and core leads', () => {
    const off = offArcSenses(senses, []);
    assert.equal(off.length, 4);
    assert.equal(off[0]['sense_key'], 'gathering', 'is_core sorts first');
    assert.deepEqual(off.slice(1).map((s) => s['sort_order']), [1, 2, 3]);
  });
});

describe('weights are published as fractions of the heaviest', () => {
  test('the heaviest row is 1 and the rest are proportional', () => {
    const out = normaliseWeights([{ weight: 5 }, { weight: 10 }, { weight: 0 }]);
    assert.deepEqual(out.map((w) => w.fraction), [0.5, 1, 0]);
  });

  test('an all-zero set does not divide by zero and reads as empty', () => {
    const out = normaliseWeights([{ weight: 0 }, { weight: 0 }]);
    assert.deepEqual(out.map((w) => w.fraction), [0, 0]);
    assert.ok(out.every((w) => Number.isFinite(w.fraction)));
  });

  test('a single row is full, not undefined', () => {
    assert.equal(normaliseWeights([{ weight: 3 }])[0].fraction, 1);
  });
});

describe('unknown is not empty', () => {
  test('the three states are distinct', () => {
    assert.equal(fillState(4), 'filled');
    assert.equal(fillState(0), 'empty');
    assert.equal(fillState(null), 'unknown');
    assert.equal(fillState(undefined), 'unknown');
  });

  test('an unread sub-layer never reports as a measured zero', () => {
    // This is the distinction the whole registry reader exists to preserve:
    // "nobody bound a carrier here" and "the carrier holds nothing" are
    // different findings, and only the second is a measurement.
    assert.notEqual(fillState(null), fillState(0));
  });
});

describe('an uncalibrated sensor has no opinion', () => {
  test('expected > 0 gives the capped ratio', () => {
    assert.equal(sensorFraction(14, 16), 0.875);
    assert.equal(sensorFraction(20, 16), 1, 'capped at full');
  });

  test('expected = 0 yields null, NOT a perfect score', () => {
    // The control plane currently scores this case at 100%; iOS excludes it.
    // Pinning the excluding definition so the builder cannot inherit the other.
    assert.equal(sensorFraction(1, 0), null);
    assert.equal(sensorFraction(0, 0), null);
    assert.notEqual(sensorFraction(1, 0), 1);
  });
});

describe('a form folds under lemma, a letter under root', () => {
  test('the two levels with no scope of their own fold onto their owner', () => {
    assert.equal(scopeFold('form'), 'lemma');
    assert.equal(scopeFold('letter'), 'root');
  });

  test('the three real scopes fold to themselves, and context is word', () => {
    assert.equal(scopeFold('root'), 'root');
    assert.equal(scopeFold('lemma'), 'lemma');
    assert.equal(scopeFold('word'), 'word');
    assert.equal(scopeFold('context'), 'word');
  });

  test('an unrecognised level folds nowhere rather than guessing a home', () => {
    assert.equal(scopeFold('sentence'), null);
    assert.equal(scopeFold(''), null);
    assert.equal(scopeFold(null), null);
  });
});

describe('a cell that is absent is not a cell that is zero', () => {
  test('numOrNull separates them', () => {
    assert.equal(numOrNull(0), 0);
    assert.equal(numOrNull('0'), 0);
    assert.equal(numOrNull(null), null);
    assert.equal(numOrNull(''), null);
    assert.equal(numOrNull('  '), null);
    assert.equal(numOrNull('not a number'), null);
  });
});
