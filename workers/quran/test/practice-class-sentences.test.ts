// The Sentences step split by sentence: a sentence is a span of words, over one āyah or several,
// and one āyah may hold several sentences. Each drill goes where its first marked word stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeBySentence, splitKey, sentenceKey, type Sentence } from '../src/routes/practice-class';

// 40:1–3 as km_quran holds it: 40:2:s1 runs from 40:2 word 1 to 40:3 word 8; 40:3 holds two more
const S: Sentence[] = [
  { id: 'QR:SS:40:1:s1', ayah_from: 1, ayah_to: 1, ws: 1, we: 1 },
  { id: 'QR:SS:40:2:s1', ayah_from: 2, ayah_to: 3, ws: 1, we: 8 },
  { id: 'QR:SS:40:3:s1', ayah_from: 3, ayah_to: 3, ws: 9, we: 12 },
  { id: 'QR:SS:40:3:s2', ayah_from: 3, ayah_to: 3, ws: 13, we: 14 },
];
const at = (id: string, ayah: number, word: number | null) => ({ id, at: { ayah, word } });
const ids = (m: Map<string, Array<Record<string, unknown>>>, s: string) => (m.get(s) ?? []).map((d) => d.id);

test('one āyah, several sentences: each drill goes to the sentence holding its word', () => {
  const m = placeBySentence([at('a', 3, 10), at('b', 3, 14), at('c', 3, 2)], S);
  assert.deepEqual(ids(m, 'QR:SS:40:3:s1'), ['a']);
  assert.deepEqual(ids(m, 'QR:SS:40:3:s2'), ['b']);
  // 40:3 word 2 lies inside the sentence that began in 40:2
  assert.deepEqual(ids(m, 'QR:SS:40:2:s1'), ['c']);
});

test('one sentence over several āyāt holds the drills of each', () => {
  const m = placeBySentence([at('x', 2, 4), at('y', 3, 8)], S);
  assert.deepEqual(ids(m, 'QR:SS:40:2:s1'), ['x', 'y']);
});

test('a drill naming only its āyah goes to the first sentence touching it; one with none is left out', () => {
  const card = { id: 'z', srs: { extra: { group: { work: '40:3' } } } };
  const m = placeBySentence([at('w', 1, null), card, { id: 'nowhere' }], S);
  assert.deepEqual(ids(m, 'QR:SS:40:1:s1'), ['w']);
  assert.deepEqual(ids(m, 'QR:SS:40:2:s1'), ['z']);
  assert.equal([...m.values()].flat().length, 2);
});

test('a sentence node names its step and its sentence, and splits back', () => {
  const k = sentenceKey('sentences', 'QR:SS:40:3:s1');
  assert.deepEqual(splitKey(k), { step: 'sentences', sentence: 'QR:SS:40:3:s1' });
  assert.deepEqual(splitKey('words'), { step: 'words', sentence: null });
});
