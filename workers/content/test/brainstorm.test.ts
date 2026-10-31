// The brainstorm board: frames from the points decks, stickies from the questions decks, the board and Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBoard, outlineOf, shelfOf } from '../src/brainstorm';

const H = 'CORE:H', A = 'CORE:A';
const slide = (slug: string, seq: number, graphic: unknown) => ({ slug, seq_order: seq, attrs_json: JSON.stringify({ graphic }) });

function fakeDb(rows: Record<string, unknown[]>): D1Database {
  const pick = (sql: string) => sql.includes('cm_study_point') ? rows.points : sql.includes('cm_study_sticky_place') ? rows.places : sql.includes('cm_study_sticky_link') ? rows.links : sql.includes('cm_study_sticky_vote') ? rows.votes
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
  links: [{ sticky_ref: 'deck:q-h:2:0', open_type: 'essay', open_ref: 'e-hm', open_at: 2, label: 'حمٓ · Read' }],
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

test('any sticky carries its links, a deck question too', async () => {
  const s = (await board())!.frames[0].stickies;
  assert.deepEqual(s[0].links, [{ label: 'حمٓ · Read', open: { type: 'essay', ref: 'e-hm', at: 2 } }]);
  assert.deepEqual(s[2].links, []);
});

test("the shelf: the Library's docs and slides once each, a term's buttons each a line", () => {
  const shelf = shelfOf([
    { title: 'The Book', title_ar: 'ٱلۡكِتَٰبِ', group: 'Key terms', open: { type: 'essay', ref: 'e-k' },
      links: [{ label: 'Read', open: { type: 'essay', ref: 'e-k' } }, { label: 'Story', open: { type: 'deck', ref: 's-k' } }] },
    { title: 'Iḍāfa', title_ar: null, group: 'Slides', open: { type: 'deck', ref: 'idafa' } },
    { title: 'Again', title_ar: null, group: 'Slides', open: { type: 'deck', ref: 'idafa' } },
    { title: 'Path', title_ar: null, group: 'Slides', open: { type: 'path', ref: 'x' } },
  ]);
  assert.deepEqual(shelf.map((g) => [g.group, g.items.map((i) => i.label)]),
    [['Key terms', ['The Book · Read', 'The Book · Story']], ['Slides', ['Iḍāfa']]]);
});

test('an essay\'s outline: its ## sections, counted from 1, fenced blocks skipped', async () => {
  const body = '# T\n\n## :book: I — The root\ntext\n```graphic\n## not a heading\n```\n## :sparkles: II — Every use\n';
  const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ body }] }) }) }) } as unknown as D1Database;
  assert.deepEqual(await outlineOf(db, 'essay', 'e'), [{ label: 'I — The root', at: 1 }, { label: 'II — Every use', at: 2 }]);
});

test('a deck\'s outline: its slides, counted from 0', async () => {
  const rows = [{ attrs_json: JSON.stringify({ lines_en: ['Sent down'] }) }, { attrs_json: JSON.stringify({ graphic: { term: 'Tanzīl' } }) }];
  const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }) } as unknown as D1Database;
  assert.deepEqual(await outlineOf(db, 'deck', 'd'), [{ label: '1 · Sent down', at: 0 }, { label: '2 · Tanzīl', at: 1 }]);
});

test('a dragged sticky sits in the frame and place it was left in; the rest follow in their own order', async () => {
  const b = (await buildBoard(fakeDb({
    slides: [slide('p-h', 2, { term: 'Two letters', items: [] }), slide('q-h', 2, { items: [{ en: 'Q1' }, { en: 'Q2' }] })],
    stickies: [{ sticky_id: 'STK:2', point_key: 'hm', author_ref: A, kind: 'idea', text: 'Idea', note: null, source: null }],
    places: [{ sticky_ref: 'STK:2', point_key: 'hm', seq: 0 }, { sticky_ref: 'deck:q-h:2:1', point_key: 'across', seq: 0 }],
  }), 'CM:STUDY:x', raw, A))!;
  assert.deepEqual(b.frames[0].stickies.map((s) => s.text), ['Idea', 'Q1']);
  assert.deepEqual(b.frames[1].stickies.map((s) => s.text), ['Q2']);
});

test('the points can be dragged into a new order', async () => {
  const b = (await buildBoard(fakeDb({ slides: [], stickies: [], places: [{ sticky_ref: 'point:across', point_key: '__points__', seq: 0 }] }), 'CM:STUDY:x', raw, A))!;
  assert.deepEqual(b.frames.map((f) => f.key), ['across', 'hm']);
});

test('a point added on the board is a frame after the decks\' own, signed, yours to take off', async () => {
  const b = (await buildBoard(fakeDb({ slides: [], stickies: [{ sticky_id: 'S9', point_key: 'PT:1', author_ref: A, kind: 'idea', text: 'x', note: null, source: null }],
    points: [{ point_key: 'PT:1', title: 'The ending', title_ar: null, note: null, author_ref: A }] }), 'CM:STUDY:x', raw, A))!;
  assert.deepEqual(b.frames.map((f) => f.key), ['hm', 'across', 'PT:1']);
  assert.deepEqual([b.frames[2].owner?.who, b.frames[2].mine, b.frames[2].stickies.length], ['Ali', true, 1]);
});
