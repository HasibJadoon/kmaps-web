// ─── the composed display spec ───────────────────────────────────────────────
//
// km_core assembles four things that live in four places. The tests worth
// having are about what happens at the seams: a spread stored per card and
// asked for per root, an axis nobody has measured, and a domain worker that
// does not answer.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { fakeD1 } from './d1-sqlite';
import { CoreDsRepo } from '../../core/src/repositories/ds.repo';
import type { DisplaySpec, DsSection } from '../src/contracts/ds';

const ROOT = 'بين';

/** Five cards for one root, every one of them carrying the SAME spread — which
 *  is how core_srs_card_surah actually stores it, and the reason the reader has
 *  to collect surahs DISTINCT. */
function seedCore(db: Database.Database): void {
  db.exec(`
    CREATE TABLE cyb_node (
      id TEXT, domain TEXT, scale TEXT, target_ref TEXT, meta_json TEXT);
    CREATE TABLE v_cyb_node_reading (
      node_id TEXT, axis TEXT, pct REAL, measured INTEGER, stale INTEGER,
      sensors INTEGER, read_sensors INTEGER);
    CREATE TABLE core_srs_card (
      id TEXT, root_norm TEXT, resource_ref TEXT, resource_type TEXT,
      card_kind TEXT, front_text TEXT, back_text TEXT, card_state TEXT,
      next_review_at TEXT, reps INTEGER, lapses INTEGER,
      note_type_id TEXT, fields_json TEXT);
    CREATE TABLE core_srs_card_surah (
      card_id TEXT, surah INTEGER, n_occur INTEGER, is_intro INTEGER);
  `);

  // The root's canonical node keys on meta_json; target_ref holds the ULID.
  db.prepare(`INSERT INTO cyb_node VALUES (?,?,?,?,?)`).run(
    'CYB:arabic:root:بين', 'arabic', 'root', 'AL01BYN', JSON.stringify({ root_ar: ROOT }));
  // A decoy: same scale, different root, whose target_ref must not be matched.
  db.prepare(`INSERT INTO cyb_node VALUES (?,?,?,?,?)`).run(
    'CYB:arabic:root:other', 'arabic', 'root', ROOT, JSON.stringify({ root_ar: 'زخرف' }));

  const read = db.prepare(`INSERT INTO v_cyb_node_reading VALUES (?,?,?,?,?,?,?)`);
  read.run('CYB:arabic:root:بين', 'build',     34, 1, 0, 170, 58);
  read.run('CYB:arabic:root:بين', 'study',      0, 0, 0,   0,  0);
  read.run('CYB:arabic:root:بين', 'content',    0, 0, 0,   0,  0);
  read.run('CYB:arabic:root:بين', 'retention',  0, 0, 0,   0,  0);

  const card = db.prepare(`INSERT INTO core_srs_card VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const kinds = ['root_dna', 'senses', 'furuq', 'addad', 'mubin_link'];
  kinds.forEach((k, i) => card.run(
    `CARD${i}`, ROOT, `AL:root:AL01BYN`, 'root', k,
    'بين', 'to separate and make clear', i === 0 ? 'review' : 'new',
    i === 0 ? '2026-09-01T00:00:00Z' : null, i, 0, null, null));

  // Every card repeats the same three sūras.
  const spread = db.prepare(`INSERT INTO core_srs_card_surah VALUES (?,?,?,?)`);
  kinds.forEach((_, i) => {
    spread.run(`CARD${i}`, 2,  40, 0);
    spread.run(`CARD${i}`, 44,  9, 1);   // where it was first met
    spread.run(`CARD${i}`, 12, 15, 0);
  });
}

const LAYERS: DisplaySpec = {
  subject: { kind: 'root', ref: ROOT, display: { text: 'ب ي ن', script: 'ar' } },
  scope: 'root', form: 'desktop',
  sections: [{
    code: '00-CORE', band: 'CORE', title: 'Core identity', accent: '#c9a24b',
    state: 'filled', total_rows: 1, carriers: ['ar_ling_roots'],
    blocks: [{ kind: 'hero', mark: { text: 'ب ي ن', script: 'ar' } }],
  }],
  summary: { filled: 1, empty: 0, unknown: 0, rows: 1 },
};

function env(al?: { ok: boolean; body?: unknown }) {
  return {
    AR_LINGUISTICS: al === undefined ? undefined : {
      async fetch() {
        if (!al.ok) return new Response('nope', { status: 502 });
        return new Response(JSON.stringify({ ok: true, data: al.body }),
          { headers: { 'Content-Type': 'application/json' } });
      },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repo = (al?: { ok: boolean; body?: unknown }) =>
  new CoreDsRepo(fakeD1(seedCore) as any, env(al) as any);

const find = (s: DisplaySpec, code: string): DsSection => {
  const x = s.sections.find((y) => y.code === code);
  assert.ok(x, `no section ${code}`);
  return x;
};

describe('the plane is read for the right node', () => {
  test('the root is matched on meta_json, not on target_ref', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    // A decoy node carries this root in target_ref; matching that would read
    // another root's sensors entirely.
    assert.equal(s.plane?.node_id, 'CYB:arabic:root:بين');
  });

  test('an axis nobody has read is unmeasured, not zero per cent', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    const build = s.plane?.readings.find((r) => r.axis === 'build');
    const study = s.plane?.readings.find((r) => r.axis === 'study');

    assert.equal(build?.measured, true);
    assert.equal(build?.pct, 34);
    assert.equal(build?.read_sensors, 58, 'says how much of the axis was looked at');

    assert.equal(study?.measured, false);
    assert.equal(study?.sensors, 0);
    // The number is 0 and the flag is what stops a screen printing "0%".
    assert.equal(study?.pct, 0);
  });
});

describe('a spread stored per card is reported per root', () => {
  test('five cards with the same three sūras report three, not fifteen', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    const dist = find(s, '91-QURAN');
    assert.equal(dist.total_rows, 3);

    const b = dist.blocks[0];
    if (b.kind !== 'bars') throw new Error('shape');
    assert.equal(b.bars.length, 3);
    assert.match(String(b.hint), /3 sūras/);
    // 40 + 9 + 15 counted once each, not five times over.
    assert.match(String(b.hint), /64 occurrences/);
  });

  test('the sūra it was first met in is named', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    const b = find(s, '91-QURAN').blocks[0];
    if (b.kind !== 'bars') throw new Error('shape');
    assert.match(String(b.hint), /first met in 44/);
    assert.ok(b.bars.some((x) => x.sublabel === 'first met here'));
  });

  test('the heaviest sūra is a full bar and the rest are proportional', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    const b = find(s, '91-QURAN').blocks[0];
    if (b.kind !== 'bars') throw new Error('shape');
    assert.equal(b.bars[0].fraction, 1, 'sorted heaviest first');
    assert.ok(b.bars.every((x) => x.fraction > 0 && x.fraction <= 1));
  });
});

describe('the cards built from this root', () => {
  test('all five appear, soonest due first', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT);
    const cards = find(s, '90-CARD');
    assert.equal(cards.state, 'filled');
    assert.equal(cards.total_rows, 5);
    const b = cards.blocks[0];
    if (b.kind !== 'card_list') throw new Error('shape');
    assert.equal(b.records[0].badges?.some((x) => x.value === 'root_dna'), true);
  });

  test('mobile sends fewer and says how many it held back', async () => {
    const s = await repo({ ok: true, body: LAYERS }).root(ROOT, 'mobile');
    const b = find(s, '90-CARD').blocks[0];
    if (b.kind !== 'card_list') throw new Error('shape');
    assert.equal(b.records.length, 3);
    assert.equal(b.overflow_count, 2);
  });
});

describe('one source failing costs one section', () => {
  test('the layers worker being down does not blank the spec', async () => {
    const s = await repo({ ok: false }).root(ROOT);
    // The plane, cards and distribution still arrive.
    assert.ok(s.plane?.node_id);
    assert.equal(find(s, '90-CARD').state, 'filled');
    assert.equal(find(s, '91-QURAN').state, 'filled');
  });

  test('and it says so, rather than reporting an empty root', async () => {
    const s = await repo({ ok: false }).root(ROOT);
    const core = find(s, '00-CORE');
    assert.equal(core.state, 'unknown');
    const b = core.blocks[0];
    assert.equal(b.kind === 'note' && b.note_kind, 'unknown');
    assert.match(b.kind === 'note' ? b.text : '', /reachability/i);
  });

  test('with no binding at all, the same holds', async () => {
    const s = await repo(undefined).root(ROOT);
    assert.equal(find(s, '00-CORE').state, 'unknown');
    assert.ok(s.plane?.readings.length);
  });
});
