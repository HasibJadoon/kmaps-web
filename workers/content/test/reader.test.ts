// The one reader's documents: typed content blocks written out as the reader markdown the app draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocksToMarkdown, kindLabel, passageOf, readerDocument, sourceName } from '../src/reader';

const b = (block_type: string, content_text: string | null, content_ar: string | null = null, attrs: object = {}) =>
  ({ block_type, content_text, content_ar, attrs_json: JSON.stringify(attrs) });

test('headings: level 2 opens a section band, its Arabic the subtitle line under it', () => {
  assert.equal(blocksToMarkdown([b('heading', 'The root', 'الجذر')]), '## The root\nالجذر');
  assert.equal(blocksToMarkdown([b('heading', 'Title', null, { level: 1 })]), '# Title');
  assert.equal(blocksToMarkdown([b('heading', null, 'العنوان', { level: 3 })]), '### العنوان');
});

test('a verse quotation is a panel in the muṣḥaf brackets, with its English and its cite', () => {
  const md = blocksToMarkdown([b('quote', 'The Book.', 'ٱلْكِتَٰبِ', { role: 'verse', ref: '44:2' })]);
  assert.equal(md, '> ﴿ٱلْكِتَٰبِ﴾\n> *The Book.*\n> **44:2**');
});

test('a grammarian quoted names his book from its slug', () => {
  const md = blocksToMarkdown([b('quote', null, 'قال', { source: 'sibawayh_kitab', locator: '1/23' })]);
  assert.equal(md, '> قال\n> **الكتاب · 1/23**');
  assert.equal(sourceName('QR:razi'), 'razi');
});

test('callouts, steps, list items, rules', () => {
  assert.equal(blocksToMarkdown([b('callout', 'Note this.', null, { label: 'Gap' })]), '> **GAP**\n> Note this.');
  assert.equal(blocksToMarkdown([b('step', 'Join it.', 'جمع', { n: 2 })]), '2. جمع\n\nJoin it.');
  assert.equal(blocksToMarkdown([b('listItem', 'one'), b('horizontalRule', null)]), '- one\n\n---');
});

test('a table from its columns and rows, or from its text', () => {
  assert.equal(blocksToMarkdown([b('table', null, null, { columns: ['A', 'B'], rows: [['1', '2']] })]), '| A | B |\n| 1 | 2 |');
  assert.equal(blocksToMarkdown([b('table', 'a | b || c | d')]), '| a | b |\n| c | d |');
});

test('a markdown doc reads as it is; the head carries kind, passage, minutes and tags', () => {
  const doc = readerDocument({
    doc_id: 'D', doc_type: 'teaching_note', slug: null, title: 'T', title_ar: null, reading_time_min: null,
    tags_json: '["root","كتب"]', meta_json: '{}', surah: 40, ayah_from: 1, ayah_to: 3, passage_ref: null,
  }, [b('markdown', '## A\n\nSome words.')]);
  assert.equal(doc.body, '## A\n\nSome words.');
  assert.equal(doc.kicker, 'Teaching note');
  assert.equal(doc.badge, '40:1–3');
  assert.deepEqual(doc.facts, ['1 min read']);
  assert.deepEqual(doc.tags, ['root', 'كتب']);
  assert.equal(kindLabel('deck_outline'), 'Deck Outline');
  assert.equal(passageOf({ passage_ref: null, surah: 2, ayah_from: 5, ayah_to: 5 }), '2:5');
});

test('a first heading that repeats the title (any case) is left to the head', () => {
  const row = { doc_id: 'D', doc_type: 'reference', slug: null, title: 'كتب — The Root That Joins', title_ar: null,
    reading_time_min: 3, tags_json: '[]', meta_json: '{}', surah: null, ayah_from: null, ayah_to: null, passage_ref: null };
  const doc = readerDocument(row, [b('heading', 'كتب — the root that joins', 'الجذر'), b('paragraph', 'Words.')]);
  assert.equal(doc.body, 'Words.');
  assert.equal(doc.titleAr, 'الجذر');
});
