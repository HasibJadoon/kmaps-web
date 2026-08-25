// ─── a structured card, rendered ─────────────────────────────────────────────
//
// These run against a REAL payload — the كتب card as it is stored in km_core,
// copied verbatim into fixtures/. A hand-written fixture would have been shaped
// by my reading of the field schema, and the schema is exactly where the drift
// is: it documents `masadir[{m,s}]` where every card writes `status`, and
// describes SenseArc as flat where the data nests `rungs`. Testing against my
// reading would have tested the misreading.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardBlocks } from '../../core/src/repositories/card-ds.repo';
import type { DsBlock } from '../src/contracts/ds';

const here = typeof __dirname === 'string'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const FIELDS = JSON.parse(
  readFileSync(join(here, 'fixtures/card-fields.kutub.json'), 'utf8'),
) as Record<string, unknown>;

const blocks = (form: 'desktop' | 'mobile' = 'desktop') => cardBlocks(FIELDS, form);
const find = (kind: DsBlock['kind'], titleLike?: string): DsBlock => {
  const b = blocks().find((x) =>
    x.kind === kind && (!titleLike || (x.title ?? '').includes(titleLike)));
  assert.ok(b, `no ${kind} block${titleLike ? ` titled ~${titleLike}` : ''}`);
  return b;
};

describe('the fields become blocks at all', () => {
  test('a card that rendered as two strings now renders as many blocks', () => {
    // The whole point: front_text and back_text were the entire card.
    assert.ok(blocks().length >= 10, `only ${blocks().length} blocks`);
  });

  test('an optional field nobody filled produces no block, not an empty one', () => {
    // filled/empty/unknown is for declared LAYERS, where an absence is a build
    // signal. An optional note-type field is not a layer.
    const sparse = cardBlocks({ Root: 'كتب' });
    assert.equal(sparse.length, 1);
    assert.equal(sparse[0].kind, 'hero');
  });

  test('a malformed field is skipped rather than throwing', () => {
    const junk = cardBlocks({ Root: 'كتب', Radicals: 'not an array', Axes: [1, 2, 3] });
    assert.equal(junk.length, 1, 'only the hero survives, and nothing threw');
  });
});

describe('the letters carry where they are made', () => {
  test('radicals come in their stated order with makhraj and ṣifa', () => {
    const b = find('grid', 'letters');
    if (b.kind !== 'grid') throw new Error('shape');
    assert.deepEqual(b.cells.map((c) => c.mark.text), ['ك', 'ت', 'ب']);
    // `order` is 5, 3, 1 in the payload — sorting by it, not by array position,
    // is what puts them in root order.
    assert.match(String(b.cells[0].footnote), /مهموس/);
  });
});

describe('the render hints that are not decoration', () => {
  test('a qiyāsī maṣdar is marked, an attested one is not', () => {
    // "pattern-supplied, no witness" — showing it unmarked beside an attested
    // one claims a source it does not have.
    const marked = cardBlocks({
      Root: 'كتب',
      FormLadder: [{
        verb: 'كَتَبَ',
        masadir: [{ m: 'كَتْب', status: 'attested' }, { m: 'كُتُوب', status: 'qiyasi' }],
      }],
    }).find((b) => b.kind === 'card_list');
    if (marked?.kind !== 'card_list') throw new Error('shape');
    const labels = marked.records[0].facts?.map((f) => f.label);
    assert.deepEqual(labels, ['maṣdar', 'maṣdar °']);
  });

  test('the documented key and the stored key both count as a status', () => {
    // The schema says `s`; every payload writes `status`. A card authored
    // against the documentation is not wrong.
    const bySchemaKey = cardBlocks({
      Root: 'ك', FormLadder: [{ verb: 'x', masadir: [{ m: 'y', s: 'qiyasi' }] }],
    }).find((b) => b.kind === 'card_list');
    if (bySchemaKey?.kind !== 'card_list') throw new Error('shape');
    assert.equal(bySchemaKey.records[0].facts?.[0].label, 'maṣdar °');
  });

  test('the physical rungs of an arc are lit and the abstract ones are not', () => {
    const b = find('chain');
    if (b.kind !== 'chain') throw new Error('shape');
    const lit = b.nodes.filter((x) => x.terminal);
    assert.ok(lit.length > 0, 'an arc with no lit rung asserts a thread it cannot show');
    assert.ok(b.nodes.some((x) => x.unresolved), 'the abstract rungs are the claim');
    // A rung is one or the other, never both and never neither.
    assert.ok(b.nodes.every((x) => Boolean(x.terminal) !== Boolean(x.unresolved)));
  });

  test('an attested opposite and a derived one never share a tone', () => {
    // "An inference shown as an attestation launders our reasoning into the
    // tradition's voice."
    const b = cardBlocks({
      Root: 'كتب',
      Addad: [
        { w: 'نَشَرَ', ar: 'x', status: 'attested', auth: 'al-Jawhari' },
        { w: 'فَرَّقَ', ar: 'y', status: 'derived' },
      ],
    }).find((x) => x.kind === 'card_list' && x.title === 'Opposites');
    if (b?.kind !== 'card_list') throw new Error('shape');

    const toneOf = (i: number) =>
      b.records[i].badges?.find((x) => x.value === 'attested' || x.value === 'derived')?.tone;
    assert.equal(toneOf(0), 'ok');
    assert.equal(toneOf(1), 'warn');
    assert.notEqual(toneOf(0), toneOf(1));

    // And a derived one does not borrow an authority it has none of.
    assert.equal(b.records[0].provenance?.is_synthesis, false);
    assert.equal(b.records[1].provenance?.is_synthesis, true);
  });

  test('the three languages stay three runs', () => {
    // The note types' own contract: never mix scripts in one string.
    const b = find('card_list', 'thread');
    if (b.kind !== 'card_list') throw new Error('shape');
    const r = b.records[0];
    assert.equal(r.ar?.script, 'ar');
    assert.equal(r.en?.script, 'latin');
    assert.equal(r.ur?.script, 'urdu');
    assert.ok(!/[a-zA-Z]/.test(r.ar?.text ?? ''), 'no Latin inside the Arabic run');
  });
});

describe('the muṣḥaf is set in the muṣḥaf face', () => {
  test('the verse is marked as Qurʾānic, not as an Arabic label', () => {
    const b = find('prose_blocks');
    if (b.kind !== 'prose_blocks') throw new Error('shape');
    assert.equal(b.blocks[0].text.register, 'mushaf');
    assert.equal(b.blocks[0].role, 'verse');
  });
});

describe('what the language declined to use', () => {
  test('the unused permutation is kept and muted, and the root is marked', () => {
    const b = find('grid', 'permutations');
    if (b.kind !== 'grid') throw new Error('shape');
    assert.equal(b.cells.length, 6, 'the family is closed');
    const unused = b.cells.filter((c) => c.muted);
    assert.equal(unused.length, 1);
    assert.equal(unused[0].mark.text, 'تكب');
    assert.ok(b.cells.some((c) => c.highlighted && c.mark.text === 'كتب'));
  });

  test('the primary sense of the field stands out by the others receding', () => {
    const b = find('pills');
    if (b.kind !== 'pills') throw new Error('shape');
    assert.equal(b.pills.filter((p) => !p.muted).length, 1);
  });
});

describe('a phone is not a small desktop', () => {
  test('mobile holds rows back and says how many', () => {
    const d = blocks('desktop').find((b) => b.kind === 'card_list' && b.title === 'The forms');
    const m = blocks('mobile').find((b) => b.kind === 'card_list' && b.title === 'The forms');
    if (d?.kind !== 'card_list' || m?.kind !== 'card_list') throw new Error('shape');
    assert.ok(m.records.length <= d.records.length);
    assert.equal(typeof m.overflow_count, 'number');
    // Nothing truncates silently: shown + held back is the whole list.
    assert.equal(m.records.length + (m.overflow_count ?? 0),
                 d.records.length + (d.overflow_count ?? 0));
  });
});
