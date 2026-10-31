// The brainstorm board: frames from the points decks, stickies from the questions decks, the board and Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBoard } from '../src/brainstorm';

const H = 'CORE:H', A = 'CORE:A';
const slide = (slug: string, seq: number, graphic: unknown) => ({ slug, seq_order: seq, attrs_json: JSON.stringify({ graphic }) });

function fakeDb(rows: Record<string, unknown[]>): D1Database {
  const pick = (sql: string) => sql.includes('cm_study_sticky_vote') ? rows.votes
    : sql.includes('cm_study_sticky') ? rows.stickies : sql.includes('cm_blocks') ? rows.slides : [];
  return { prepare: (sql: string) => ({ bind: () => ({ all: async () => ({ results: pick(sql) ?? [] }) }) }) } as unknown as D1Database;
}

const raw = {
  people: [H, A],
  names: { [H]: { name: 'Hasib', color: '#c9a84c' }, [A]: { name: 'Ali', color: '#6fa8e0' } },
  steps: [{ key: 'points', decks: { [H]: 'p-h', [A]: 'p-a' } }, { key: 'questions', decks: { [H]: 'q-h', [A]: 'q-a' } }],
  brainstorm: {
    title: 'Brainstorm', claude: { name: 'Claude', color: '#b388eb' },
    points: [{ key: 'hm', ring: 'A', deck: 'p-h', slide: 2 }, { key: 'across', title: 'Across the passage' }],
    questions: [{ point: 'hm', deck: 'q-h', slide: 2 }, { point: 'across', deck: 'q-a', slide: 8 }],
  },
};
const board = () => buildBoard(fakeDb({
  slides: [
    slide('p-h', 2, { term_ar: 'حمٓ', term: 'Two letters', ref: '40:1', items: [{ en: 'The listener stops.' }] }),
    slide('q-h', 2, { term_ar: 'حمٓ', items: [{ en: 'Why open with letters?' }, { en: 'Is it its own āyah?' }] }),
    slide('q-a', 8, { term_ar: 'رجاء وخوف', items: [{ en: 'Hope against fear?' }] }),
  ],
  stickies: [
    { sticky_id: 'STK:1', point_key: 'hm', author_ref: 'claude', kind: 'question', text: 'How does the opening hold the sūra?', note: 'براعة الاستهلال', source: 'ابن عاشور' },
    { sticky_id: 'STK:2', point_key: 'hm', author_ref: A, kind: 'idea', text: 'Let حمٓ sit in silence', note: null, source: null },
  ],
  votes: [{ sticky_ref: 'STK:1', user_ref: H }, { sticky_ref: 'STK:1', user_ref: A }],
}), 'CM:STUDY:x', raw, A);

test('a point is a frame, owned by whoever has it in their points deck', async () => {
  const b = (await board())!;
  assert.deepEqual(b.frames.map((f) => [f.key, f.ring, f.title, f.owner?.who ?? null]),
    [['hm', 'A', 'Two letters', 'Hasib'], ['across', null, 'Across the passage', null]]);
  assert.deepEqual(b.frames[0].lines, ['The listener stops.']);
});

test('stickies: the deck questions, then the board, each signed', async () => {
  const b = (await board())!;
  assert.deepEqual(b.frames[0].stickies.map((s) => [s.by.who, s.text]), [
    ['Hasib', 'Why open with letters?'], ['Hasib', 'Is it its own āyah?'],
    ['Claude', 'How does the opening hold the sūra?'], ['Ali', 'Let حمٓ sit in silence']]);
  assert.deepEqual(b.frames[1].stickies.map((s) => s.by.who), ['Ali']);
});

test('dots are counted, yours marked; only your own board sticky is yours to take off', async () => {
  const s = (await board())!.frames[0].stickies;
  assert.deepEqual([s[2].votes, s[2].voted], [2, true]);
  assert.deepEqual(s.map((x) => x.mine), [false, false, false, true]);
});

test('the people on the board, Claude last, with their counts', async () => {
  const b = (await board())!;
  assert.deepEqual(b.people.map((p) => [p.who, p.count]), [['Hasib', 2], ['Ali', 2], ['Claude', 1]]);
});

test('no board without a brainstorm in the study', async () => {
  assert.equal(await buildBoard(fakeDb({}), 'x', {}, H), null);
});
