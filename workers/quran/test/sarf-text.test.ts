import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitArabic, bidiEn, stripRefs, sourcesOf } from '../src/routes/practice-sarf';

test('a quote with its verse leaves the verse in the English; the Arabic goes to its own list', () => {
  const r = splitArabic('With «عَلَى» it keeps its verb sense: «كِتَٰبَ ٱللَّهِ عَلَيۡكُمۡ» (4:24).');
  assert.equal(r.en, 'With عَلَى it keeps its verb sense (4:24).');
  assert.deepEqual(r.ar, [{ ar: 'كِتَٰبَ ٱللَّهِ عَلَيۡكُمۡ', ref: '4:24', n: null }]);
});

test("after 'on' the verse reads as a plain reference", () => {
  assert.equal(splitArabic('Al-Zamakhsharī on «كِتَٰبَ ٱللَّهِ عَلَيۡكُمۡ» (4:24): God wrote it.').en, 'Al-Zamakhsharī on 4:24: God wrote it.');
});

test('a longer quote with no verse is numbered; a one-word quote stays inline', () => {
  const r = splitArabic('al-Ṭabarī: «الإصرار، الإقامة على الذنب عامدا». The word «ذَنْب» here.');
  assert.equal(r.en, 'al-Ṭabarī: [1]. The word ذَنْب here.');
  assert.equal(r.ar[0].n, 1);
});

test('English lines holding Arabic are marked left-to-right with the Arabic isolated', () => {
  const s = bidiEn('the particle عَلَى here.');
  assert.ok(s.startsWith('‎'));
  assert.ok(s.includes('⁧عَلَى⁩'));
  assert.equal(bidiEn('plain English'), 'plain English');
});

test('the "— al-Rāghib pp. …" tail is cut (the books come as links)', () => {
  assert.equal(stripRefs('كَتَبَ joins letters into words. — al-Rāghib pp. 699, 286; Lane pp. 2590, 759'), 'كَتَبَ joins letters into words.');
  assert.equal(stripRefs('no tail here'), 'no tail here');
});

test('sources get a book name, keep their page, root and block, and are deduplicated', () => {
  const s = sourcesOf([
    { source_slug: 'raghib_mufradat', page: 699, root_norm: 'كتب', block_id: 'blk_mfr_1' },
    { source_slug: 'raghib_mufradat', page: 699, root_norm: 'كتب', block_id: 'blk_mfr_1' },
    { source_slug: 'lane_lexicon', page: 2590, root_norm: 'كتب', block_id: 'blk_lane_1' },
  ]);
  assert.deepEqual(s.map((x) => `${x.book} ${x.page} ${x.root} ${x.block}`), ['al-Rāghib 699 كتب blk_mfr_1', 'Lane 2590 كتب blk_lane_1']);
});
