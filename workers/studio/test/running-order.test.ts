// The scene list: chapters with their card folded in, and every scene's look
// from the one table of the stage's builders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapters, sceneFacts, splitHeading } from '../src/running-order';

const scene = (id: string, heading: string, kind: string, group: string | null, label: string | null) =>
  ({ id, heading, overlay_kind: null, group_key: group, group_label: label,
     points: [{ overlay_json: JSON.stringify({ kind }) }] });

const burhan = [
  scene('s10', 'السؤال — the hook', 'bookend', 'q', 'The question'),
  scene('s20', 'التلاوة — Reading', 'transition', 'r', 'Reading'),
  scene('s30', 'التلاوة — reading the passage', 'ayah', 'r', 'Reading'),
  scene('s60', 'الكلمات — The words', 'transition', 'w', 'The words'),
  scene('s70', 'تَنزِيلُ — A sending down', 'keyterm', 'w', 'The words'),
  scene('s80', 'ٱلۡكِتَٰبِ — The Book', 'keyterm', 'w', 'The words'),
];

test('a chapter card opens its chapter and is not listed as a scene', () => {
  const ch = chapters(burhan);
  assert.deepEqual(ch.map((c) => [c.title, c.opener, c.scenes]), [
    ['The question', null, ['s10']],
    ['Reading', 's20', ['s30']],
    ['The words', 's60', ['s70', 's80']],
  ]);
  assert.equal(ch[1].title_ar, 'التلاوة');
});

test('a scene knows its kind and look from its payload', () => {
  const f = sceneFacts(burhan[4], false);
  assert.equal(f.kind, 'keyterm');
  assert.equal(f.look.name, 'Full frame');
  assert.deepEqual([f.title, f.title_ar], ['A sending down', 'تَنزِيلُ']);
  assert.equal(f.note, null);
  assert.equal(sceneFacts(burhan[0], true).note, '1 talking point');
  assert.equal(sceneFacts({ ...burhan[0], points: [{ overlay_json: '{"kind":"nope"}' }] }, false).look.builder, false);
});

test('headings split either way round', () => {
  assert.deepEqual(splitHeading('the hook — السؤال'), { en: 'The hook', ar: 'السؤال' });
  assert.deepEqual(splitHeading('الآية 2 — 40:2–3'), { en: '40:2–3', ar: 'الآية 2' });
});
