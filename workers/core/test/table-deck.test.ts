// The Table dealt from what was studied: each passage, latest first, with its pack prompts and its
// own reflections, one prompt kept once; a passage with nothing to talk over is left out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tableDeck } from '../src/table/deck';

const passage = { title: 'Tanzīl and the Four Attributes', titleAr: null, label: '40:1–3', surah: 40 };

test('a passage\'s deck: its pack prompts, then its reflections; a prompt met in both kept once', () => {
  const deck = tableDeck(
    [{ scope: 'QR:SP:40:4-5', status: 'in_progress', lastAt: '2026-10-15' }, { scope: 'QR:SP:40:1-3', status: 'studied', lastAt: '2026-10-10' }],
    [{ id: 'B1', promptEn: 'Why does the passage name the Sender six ways instead of arguing?', passageRef: 'QR:SP:40:1-3' },
     { id: 'B2', promptEn: 'Elsewhere', passageRef: 'QR:SP:40:9-9' }],
    new Map([['QR:SP:40:1-3', { passage, prompts: [
      { id: 'Q1', en: 'The passage names God six times before making any argument. What does that teach?', ar: null, kind: 'reflection', from: 1, to: 3 },
      { id: 'Q2', en: 'why does the passage name the Sender six ways instead of arguing?', ar: null, kind: 'reflection', from: 1, to: 3 },
    ] }]]));
  assert.equal(deck.length, 1, 'a passage with nothing to talk over is not dealt');
  assert.equal(deck[0].scope, 'QR:SP:40:1-3');
  assert.equal(deck[0].title, 'Tanzīl and the Four Attributes');
  assert.equal(deck[0].range, '40:1–3');
  assert.deepEqual(deck[0].cards.map((c) => c.id), ['B1', 'Q1']);
  const q = deck[0].cards[1];
  assert.equal(q.scoring, 'none');
  assert.equal(q.interaction, 'open_prompt');
  assert.equal(q.ayahFrom, 1);
});

test('nothing studied, nothing dealt', () => {
  assert.deepEqual(tableDeck([], [], new Map()), []);
});
