import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1-sqlite';
import { seedRegistry, FIXTURE_ROOT } from './ds-fixture';
import { DsRepo } from '../../ar-linguistics/src/repositories/ds.repo';
import type { DisplaySpec, DsSection, DsBlock } from '../src/contracts/ds';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repo = () => new DsRepo(fakeD1(seedRegistry) as any);
const spec = (form: 'desktop' | 'mobile' = 'desktop') => repo().root(FIXTURE_ROOT, form);
const section = (s: DisplaySpec, code: string): DsSection => {
  const found = s.sections.find((x) => x.code === code);
  assert.ok(found, `no section ${code}`);
  return found;
};
const block = (s: DsSection, kind: DsBlock['kind']): DsBlock => {
  const found = s.blocks.find((b) => b.kind === kind);
  assert.ok(found, `no ${kind} block in ${s.code}`);
  return found;
};

describe('every declared layer appears, holding rows or not', () => {
  test('a layer that holds nothing is still a section', async () => {
    const s = await spec();

    assert.ok(s.sections.length >= 8);
    assert.ok(s.sections.some((x) => x.state === 'filled'));
    assert.ok(s.sections.some((x) => x.state === 'empty'));
    assert.ok(s.sections.some((x) => x.state === 'unknown'));
  });

  test('unknown is not empty', async () => {
    const s = await spec();

    assert.equal(section(s, '30-KIN').state, 'empty');

    assert.equal(section(s, '72-MEM').state, 'unknown');

    const empty = block(section(s, '30-KIN'), 'note');
    const unknown = block(section(s, '72-MEM'), 'note');
    assert.equal(empty.kind === 'note' && empty.note_kind, 'empty');
    assert.equal(unknown.kind === 'note' && unknown.note_kind, 'unknown');
    assert.match(unknown.kind === 'note' ? unknown.text : '', /not zero/i);
  });

  test('the summary counts what the sections say', async () => {
    const s = await spec();
    assert.equal(s.summary.filled, s.sections.filter((x) => x.state === 'filled').length);
    assert.equal(s.summary.unknown, s.sections.filter((x) => x.state === 'unknown').length);
  });

  test('a band with no colour declares null rather than borrowing one', async () => {
    const s = await spec();
    assert.equal(section(s, '00-CORE').accent, '#c9a24b');
    assert.equal(section(s, '14-SENSE').accent, null, 'SENSE has no colour row');
  });
});

describe('the presentation follows the reader, not the registry', () => {
  test('sections come back in chapter order, not sub_code order', async () => {
    const s = await spec();
    const seen: string[] = [];
    for (const sec of s.sections) {
      if (seen[seen.length - 1] !== sec.chapter) seen.push(sec.chapter);
    }

    assert.deepEqual(seen, ['identity', 'meaning', 'evidence', 'relations', 'remember']);
  });

  test('a chapter appears exactly once and never empty', async () => {
    const s = await spec();
    const keys = s.chapters.map((c) => c.key);
    assert.equal(new Set(keys).size, keys.length, 'no duplicates');
    for (const c of s.chapters) {
      assert.ok(s.sections.some((x) => x.chapter === c.key),
        `chapter ${c.key} is announced but has no sections`);
    }
  });

  test('every section belongs to an announced chapter', async () => {
    const s = await spec();
    const keys = new Set(s.chapters.map((c) => c.key));
    for (const sec of s.sections) {
      assert.ok(keys.has(sec.chapter), `${sec.code} is in an unannounced chapter`);
    }
  });

  test('each chapter states the question it answers', async () => {
    const s = await spec();
    for (const c of s.chapters) {
      assert.ok(c.title.length > 0, `${c.key} has no title`);
      assert.ok(c.question.length > 0, `${c.key} does not say what it answers`);
    }

    const identity = s.chapters.find((c) => c.key === 'identity');
    assert.equal(identity?.title, 'What it is');
  });

  test('the registry code stays on the section for whoever is building', async () => {
    const s = await spec();
    assert.ok(s.sections.every((x) => /^\d+[A-Z0-9-]*$/.test(x.code) || x.code.includes('-')));
    assert.ok(s.sections.some((x) => x.code === '14-SENSE'));
  });
});

describe('identity is the root itself', () => {
  test('the hero spaces the letters from the stored JSON', async () => {
    const s = await spec();
    const b = block(section(s, '00-CORE'), 'hero');
    assert.equal(b.kind === 'hero' && b.mark.text, 'ن ز ل');
    assert.equal(b.kind === 'hero' && b.mark.script, 'ar');
  });

  test('the muṣḥaf frequency is a fact, and the Arabic is marked Arabic', async () => {
    const s = await spec();
    const b = block(section(s, '00-CORE'), 'hero');
    if (b.kind !== 'hero') throw new Error('shape');
    assert.ok(b.facts?.some((f) => f.value.text === '293×'));
    assert.equal(b.ar?.script, 'ar');
    assert.equal(b.en?.script, 'latin');
  });
});

describe('phonology marks the letter that makes the root behave', () => {
  test('three slots, named in full, with the weak one flagged', async () => {
    const s = await spec();
    const b = block(section(s, '03-ASWAT'), 'grid');
    if (b.kind !== 'grid') throw new Error('shape');
    assert.deepEqual(b.cells.map((c) => c.caption), ['fāʾ', 'ʿayn', 'lām']);
    assert.deepEqual(b.cells.map((c) => c.mark.text), ['ن', 'ز', 'ل']);
    assert.equal(b.cells[2].footnote, 'weak');
    assert.equal(b.cells[2].highlighted, true);
    assert.equal(b.cells[0].highlighted, false);
  });
});

describe('a permutation family says what the language declined to use', () => {
  test('unused members are kept and muted, not dropped', async () => {
    const s = await spec();
    const b = block(section(s, '06-TAQL'), 'grid');
    if (b.kind !== 'grid') throw new Error('shape');
    assert.equal(b.cells.length, 6, 'the family is closed; all six are shown');
    assert.equal(b.cells.filter((c) => c.muted).length, 4);
    assert.match(String(b.hint), /2 of 6 used/);
  });
});

describe('witnesses come oldest first', () => {
  test('an earlier death date leads, and the undated one is last', async () => {
    const s = await spec();
    const b = block(section(s, '12-ASL'), 'card_list');
    if (b.kind !== 'card_list') throw new Error('shape');
    const authorities = b.records.map((r) =>
      r.facts?.find((f) => f.label === 'authority')?.value.text);
    assert.deepEqual(authorities, ['ابن دريد', 'ابن فارس', 'مجهول']);
  });

  test('a sourced record cites where to check it', async () => {
    const s = await spec();
    const b = block(section(s, '12-ASL'), 'card_list');
    if (b.kind !== 'card_list') throw new Error('shape');
    const p = b.records[0].provenance;
    assert.equal(p?.source, 'jamhara');
    assert.equal(p?.is_synthesis, false);
  });
});

describe('senses lead with the core one', () => {
  test('is_core sorts first regardless of sort_order', async () => {
    const s = await spec();
    const b = block(section(s, '14-SENSE'), 'card_list');
    if (b.kind !== 'card_list') throw new Error('shape');
    assert.ok(b.records[0].badges?.some((x) => x.label === 'core'));
    assert.equal(b.records[0].ar?.text, 'النزول من عُلوّ');
  });
});

describe('a via binding is read, and its filter is honoured', () => {
  test('attestations reached through the sense they attest', async () => {
    const s = await spec();
    const sec = section(s, '19-ATT');
    assert.equal(sec.state, 'filled', 'via carriers used to report as unknown');
    const b = block(sec, 'ledger');
    if (b.kind !== 'ledger') throw new Error('shape');

    assert.equal(b.records.length, 2);
    assert.ok(!b.records.some((r) => r.ar?.text.includes('لا ينبغي')));
  });

  test('agreement is a stance, and a qualifying source is not an error', async () => {
    const s = await spec();
    const b = block(section(s, '19-ATT'), 'ledger');
    if (b.kind !== 'ledger') throw new Error('shape');
    const tones = b.records.map((r) => r.badges?.[0]?.tone);
    assert.ok(tones.includes('ok'));
    assert.ok(tones.includes('warn'));
  });
});

describe('a phone is not a small desktop', () => {
  test('mobile sends fewer rows and says how many it held back', async () => {
    const desktop = await spec('desktop');
    const mobile = await spec('mobile');

    const d = block(section(desktop, '12-ASL'), 'card_list');
    const m = block(section(mobile, '12-ASL'), 'card_list');
    if (d.kind !== 'card_list' || m.kind !== 'card_list') throw new Error('shape');

    assert.ok(m.records.length <= d.records.length);
    assert.equal(m.records.length, 3, 'mobile cap is 3');

    assert.equal(typeof m.overflow_count, 'number');
  });

  test('both forms report the same totals — only the payload differs', async () => {
    const desktop = await spec('desktop');
    const mobile = await spec('mobile');
    assert.equal(mobile.summary.rows, desktop.summary.rows);
    assert.equal(mobile.summary.filled, desktop.summary.filled);
  });
});
