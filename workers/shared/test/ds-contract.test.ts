// ─── the display-spec contract ───────────────────────────────────────────────
//
// Two things keep this durable, and both are tested here.
//
// 1. A client older than the spec must still render. The vocabulary lives on
//    the worker and will grow; every client cannot be redeployed in lockstep.
//    `normaliseSpec` converts a kind a build has never heard of into a note
//    that says so, at the boundary, once — so the renderer's switch stays
//    exhaustive and narrows, and a reader never meets a blank section.
//
// 2. The golden fixture is the shared example. It carries one block of every
//    kind, and both clients decode it in their own tests: the Angular one here,
//    the Swift one in kmaps-ios. When a field is added or renamed on this side,
//    the other side's decode fails — which is the drift that produced 429
//    hand-maintained interfaces and a `children` field the API never sent.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DS_BLOCK_KINDS, normaliseBlock, normaliseSpec,
} from '../src/contracts/ds';
import type { DisplaySpec, DsBlock } from '../src/contracts/ds';

// tsx may load this as CJS or ESM depending on how it is invoked, and only one
// of __dirname / import.meta.url exists in each. Resolve from whichever is here
// so `npm test` and a direct `tsx --test` both find the fixture.
const HERE = typeof __dirname === 'string'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, 'fixtures', 'display-spec.golden.json');

describe('a client older than the spec still renders', () => {
  test('an unrecognised kind becomes a note that names it', () => {
    const b = normaliseBlock({ kind: 'sunburst', title: 'Something new' });
    assert.equal(b.kind, 'note');
    assert.equal(b.kind === 'note' && b.note_kind, 'unknown');
    assert.match(b.kind === 'note' ? b.text : '', /sunburst/);
    assert.equal(b.title, 'Something new', 'the section still has its heading');
  });

  test('a known kind passes through untouched', () => {
    const original: DsBlock = {
      kind: 'grid', title: 'Letters',
      cells: [{ id: 'a', mark: { text: 'ن', script: 'ar' } }],
    };
    assert.equal(normaliseBlock(original), original, 'same object, not a copy');
  });

  test('junk does not throw', () => {
    for (const junk of [null, undefined, {}, { kind: 42 }, 'nonsense', []]) {
      const b = normaliseBlock(junk);
      assert.equal(b.kind, 'note');
    }
  });

  test('normalising a spec converts every section', () => {
    const spec = {
      sections: [
        { blocks: [{ kind: 'hero', mark: { text: 'ن', script: 'ar' } }, { kind: 'sunburst' }] },
        { blocks: [{ kind: 'wormhole' }] },
      ],
    };
    const out = normaliseSpec(spec);
    assert.deepEqual(
      out.sections.map((s) => (s.blocks as DsBlock[]).map((b) => b.kind)),
      [['hero', 'note'], ['note']],
    );
  });

  test('the vocabulary list and the note kind agree', () => {
    // `note` must itself be a known kind, or normalising would recurse into
    // producing blocks nobody can draw.
    assert.ok((DS_BLOCK_KINDS as readonly string[]).includes('note'));
  });
});

describe('the golden fixture is the shared example', () => {
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as DisplaySpec;

  test('it carries one block of every kind in the vocabulary', () => {
    const present = new Set(golden.sections.flatMap((s) => s.blocks.map((b) => b.kind)));
    const missing = DS_BLOCK_KINDS.filter((k) => !present.has(k));
    assert.deepEqual(missing, [],
      'every kind must appear, or the other client never decodes it');
  });

  test('it survives normalising unchanged — nothing in it is unknown', () => {
    const before = JSON.stringify(golden);
    assert.equal(JSON.stringify(normaliseSpec(structuredClone(golden))), before);
  });

  test('it exercises all three section states', () => {
    const states = new Set(golden.sections.map((s) => s.state));
    assert.deepEqual([...states].sort(), ['empty', 'filled', 'unknown']);
  });

  test('it carries a plane with a measured and an unmeasured axis', () => {
    assert.ok(golden.plane, 'the composed spec carries the four outputs');
    assert.ok(golden.plane!.readings.some((r) => r.measured));
    assert.ok(golden.plane!.readings.some((r) => !r.measured),
      'an unmeasured axis is the case a client most easily gets wrong');
  });

  test('it is organised by the reader\'s chapters, in reading order', () => {
    const keys = golden.chapters.map((c) => c.key);
    assert.deepEqual(keys, ['identity', 'meaning', 'evidence', 'relations', 'remember', 'sources'],
      'what it is, what it means, who says so — not 00-CORE, 010-SRC, 12-ASL');

    // The sections follow that order, so a client can render straight through.
    const positions = golden.sections.map((s) => keys.indexOf(s.chapter));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  });

  test('every chapter says which question it answers', () => {
    for (const c of golden.chapters) {
      assert.ok(c.title && c.question, `${c.key} is unlabelled`);
    }
  });

  test('the registry code survives for whoever is building', () => {
    // The reader gets chapters; a builder still needs to find the carrier.
    assert.ok(golden.sections.every((s) => s.code));
    assert.ok(golden.sections.some((s) => s.carriers.length > 0));
  });

  test('every text run declares its script', () => {
    // A bare string would let a client set Arabic in the wrong face, which is
    // an error rather than a preference.
    const texts: unknown[] = [];
    JSON.stringify(golden, (k, v) => {
      // A text RUN has a string `text` and no `kind`. Two other things carry a
      // `text` property and are not runs: a prose block, whose `text` is itself
      // a run, and a note block, whose `text` is UI prose in the reader's own
      // language rather than content from a carrier. Blocks are the ones with
      // a `kind`, so that is the thing to exclude.
      const o = v as { text?: unknown; kind?: unknown };
      if (v && typeof v === 'object' && !Array.isArray(v)
          && typeof o.text === 'string' && o.kind === undefined) texts.push(v);
      return v;
    });
    assert.ok(texts.length > 0);
    for (const t of texts) {
      assert.ok(['ar', 'latin', 'urdu'].includes((t as { script: string }).script),
        `a text run without a script: ${JSON.stringify(t)}`);
    }
  });
});
