// Every Qurʾān drill shows its full āyah, the asked words lit, with its reference (owner, 2026-10-24):
// ﴿الأنعام، ١٤٥- 6:145 ﴾ — and a drill built on a sentence is set back in its āyāt whole.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quranRef, widenToAyat } from '../src/routes/practice-kit';

test('the reference: sūra name, Arabic-Indic āyah, then s:a, in ornate brackets', () => {
  assert.equal(quranRef('الأنعام', 6, 128), '﴿الأنعام، ١٢٨- 6:128 ﴾');
  assert.equal(quranRef('البقرة', 2, 36), '﴿البقرة، ٣٦- 2:36 ﴾');
  assert.equal(quranRef('غافر', 40, 2, 3), '﴿غافر، ٢–٣- 40:2–3 ﴾');
});

const ayah = (n: number, from: number, texts: string[]) => ({
  ayah: n, en: `āyah ${n}`,
  ws: texts.map((_, i) => ({ word_index: i + 1 })),
  words: texts.map((t, i) => ({ t, s: from + i, e: from + i + 1 })),
  audio: { url: 'u.mp3', start: from, end: from + texts.length },
});

test('a sentence of 40:3 (لا إله إلا هو) is shown in the whole āyah, its words lit, the blank moved with it', () => {
  const a3 = ayah(3, 10, ['غَافِرِ', 'الذَّنْبِ', 'وَقَابِلِ', 'التَّوْبِ', 'شَدِيدِ', 'الْعِقَابِ', 'ذِي', 'الطَّوْلِ', 'لَا', 'إِلَهَ', 'إِلَّا', 'هُوَ', 'إِلَيْهِ', 'الْمَصِيرُ']);
  const d: Record<string, unknown> = { kind: 'fill', words: a3.words.slice(12), span: [0, 1], blank: 1, audio: { url: 'u.mp3', start: 22, end: 24 } };
  widenToAyat(d, [a3], { ayah: 3, word_index: 13 });
  assert.equal((d.words as unknown[]).length, 14);
  assert.deepEqual(d.span, [12, 13]);
  assert.equal(d.blank, 13);
  assert.deepEqual(d.audio, { url: 'u.mp3', start: 10, end: 24 });
  assert.equal(d.en, 'āyah 3');
});

test('a heard word keeps its clip; the āyāt become its line; a range takes every āyah', () => {
  const a2 = ayah(2, 0, ['تَنْزِيلُ', 'الْكِتَابِ']), a3 = ayah(3, 2, ['غَافِرِ', 'الذَّنْبِ']);
  const d: Record<string, unknown> = { kind: 'hear', words: [a2.words[1], a3.words[0]], target: 1, audio: { url: 'u.mp3', start: 2, end: 3 } };
  widenToAyat(d, [a2, a3], { ayah: 2, word_index: 2 });
  assert.equal(d.target, 2);
  assert.deepEqual(d.audio, { url: 'u.mp3', start: 2, end: 3 });
  assert.deepEqual(d.line, { url: 'u.mp3', start: 0, end: 4 });
  assert.equal(d.en, 'āyah 2 āyah 3');
});
