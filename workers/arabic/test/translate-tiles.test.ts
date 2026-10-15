// The Arabic Phase 1.3 additions: translation built from tiles in both directions, dealt from a pool line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateTiles } from '../src/routes/practice';

const line = { id: 'L1', text_ar: 'ذهب الولد إلى المدرسة', text_en: 'The boy went to school.' };
const others = [{ id: 'L2', text_en: 'She reads a long book' }, { id: 'L3', text_en: 'They played football outside' }];
const pool = ['ذهبت', 'البنت', 'المكتبة', 'السوق', 'جلس', 'الرجل'];

test("into English: the line's English words build the answer, decoys among them", () => {
  const d = translateTiles('to_en', line, { audio: { url: 'x' } }, others, pool)!;
  assert.equal(d.interaction, 'tiles'); assert.equal(d.lang, 'en');
  const tokens = d.tokens as string[]; const sol = d.solution as number[];
  assert.deepEqual(sol.map((i) => tokens[i]), ['The', 'boy', 'went', 'to', 'school']);
  assert.ok(tokens.length > sol.length, 'decoys are dealt');
});

test('into Arabic: the English is the prompt, the Arabic built from tiles, no recording before the answer', () => {
  const d = translateTiles('to_ar', line, { audio: { url: 'x' } }, others, pool)!;
  assert.equal(d.prompt, 'The boy went to school.'); assert.equal(d.audio, null); assert.deepEqual(d.line, { url: 'x' });
  const tokens = d.tokens as string[]; const sol = d.solution as number[];
  assert.deepEqual(sol.map((i) => tokens[i]), ['ذهب', 'الولد', 'إلى', 'المدرسة']);
});

test('a line with no English gives no drill', () => {
  assert.equal(translateTiles('to_en', { ...line, text_en: null }, {}, others, pool), null);
});
