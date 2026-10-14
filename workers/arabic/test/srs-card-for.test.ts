// Every drill the AR practice deals files to review when answered: srsCardFor gives each kind a card that carries the
// drill to replay. The ṣarf drills (Word forms) were dealt and never filed — null for their kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { srsCardFor } from '../src/lib/labels';

test('ṣarf drills file to review, each carrying its drill', () => {
  const drills = [
    { id: 'sarf_mudari:كتب', kind: 'sarf_mudari', interaction: 'choose', prompt: 'كَتَبَ', answer: 'يَكْتُبُ', heard: 'كَتَبُوا', options: ['يَكْتُبُ', 'يَذْهَبُ'] },
    { id: 'sarf_jam:كتاب', kind: 'sarf_jam', interaction: 'choose', prompt: 'كِتَاب', answer: 'كُتُب', options: ['كُتُب', 'أَقْلَام'] },
    { id: 'sarf_lemma:الكتب', kind: 'sarf_lemma', interaction: 'choose', prompt: 'الكُتُبُ', answer: 'كِتَاب', options: ['كِتَاب', 'قَلَم'] },
    { id: 'sarf_pairs:a', kind: 'sarf_pairs', interaction: 'pairs', pairs: [['كَتَبَ', 'يَكْتُبُ'], ['ذَهَبَ', 'يَذْهَبُ'], ['جَلَسَ', 'يَجْلِسُ']] },
  ];
  for (const d of drills) {
    const card = srsCardFor(d, { skill: 'sarf' });
    assert.ok(card, `${d.kind} files a card`);
    assert.equal((card.extra as { drill: { id: string } }).drill.id, d.id);
    assert.ok(String(card.front_text) && String(card.back_text));
  }
  assert.equal(srsCardFor(drills[0])!.front_text, 'كَتَبَ\nكَتَبُوا');
  assert.equal(srsCardFor(drills[3])!.back_text, 'يَكْتُبُ\nيَذْهَبُ\nيَجْلِسُ');
});
