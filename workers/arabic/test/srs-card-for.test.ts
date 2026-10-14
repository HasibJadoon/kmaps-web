// Every drill the AR practice deals files to review when answered: srsCardFor gives each kind a card that carries the
// drill to replay. The ṣarf drills (Word forms) were dealt and never filed — null for their kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { srsCardFor, dropEmpty } from '../src/lib/labels';

test('ṣarf drills file to review, each carrying its drill', () => {
  const drills = [
    { id: 'sarf_mudari:كتب', kind: 'sarf_mudari', interaction: 'choose', prompt: 'كَتَبَ', answer: 'يَكْتُبُ', heard: 'كَتَبُوا', options: ['يَكْتُبُ', 'يَذْهَبُ'] },
    { id: 'sarf_jam:كتاب', kind: 'sarf_jam', interaction: 'choose', prompt: 'كِتَاب', answer: 'كُتُب', options: ['كُتُب', 'أَقْلَام'] },
    { id: 'sarf_lemma:الكتب', kind: 'sarf_lemma', interaction: 'choose', prompt: 'الكُتُبُ', answer: 'كِتَاب', options: ['كِتَاب', 'قَلَم'] },
    { id: 'sarf_pairs:a', kind: 'sarf_pairs', interaction: 'pairs', pairs: [['كَتَبَ', 'يَكْتُبُ'], ['ذَهَبَ', 'يَذْهَبُ'], ['جَلَسَ', 'يَجْلِسُ']] },
  ];
  for (const d of drills) {
    const card = srsCardFor(d, { skill: 'sarf' })!;
    assert.ok(card, `${d.kind} files a card`);
    assert.equal((card.extra as { drill: { id: string } }).drill.id, d.id);
    assert.ok(String(card.front_text) && String(card.back_text));
  }
  assert.equal(srsCardFor(drills[0])!.front_text, 'كَتَبَ\nكَتَبُوا');
  assert.equal(srsCardFor(drills[3])!.back_text, 'يَكْتُبُ\nيَذْهَبُ\nيَجْلِسُ');
});

test('a new drill kind still files; an empty drill is dropped, never filed', () => {
  const unknown = { id: 'brand_new:1', kind: 'brand_new_kind', interaction: 'choose', prompt: 'أَيُّهَا؟', answer: 'هٰذا', options: ['هٰذا', 'ذٰلك'] };
  const c = srsCardFor(unknown, { skill: 'future' })!;
  assert.equal(c.front_text, 'أَيُّهَا؟');
  assert.equal(c.back_text, 'هٰذا');
  assert.equal((c.extra as { drill: { id: string } }).drill.id, 'brand_new:1');
  assert.equal(c.card_template, 'brand_new_kind');

  // a known kind with no prompt or answer of its own but something to order: still filed, named by what it holds
  const bare = { id: 'meaning:x', kind: 'meaning', interaction: 'order_units', units: ['ب', 'أ', 'ج'] };
  const b = srsCardFor(bare)!;
  assert.ok(b.front_text && b.back_text);
  assert.equal(b.back_text, 'ب → أ → ج');

  // an empty drill — nothing asked, nothing to answer — is not filed: it is dropped, never dealt
  assert.equal(srsCardFor({ id: 'z:1', kind: 'z' }), null);
  assert.equal(srsCardFor({ id: 'z:2', kind: 'meaning', prompt: '  ' }), null);
  const kept = dropEmpty([{ id: 'a', srs: { front_text: 'x' } }, { id: 'b', srs: null }]);
  assert.deepEqual(kept.map((x) => x.id), ['a']);
});
