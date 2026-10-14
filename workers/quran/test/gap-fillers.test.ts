// A gap's wrong choices are near-misses (owner, 2026-10-14): the same root first, then the same pattern — always in
// the gap's own shape, so the form gives nothing away; the sūra's other words only when those run out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gapFillers } from '../src/routes/practice';

const W = (word_text: string, lemma: string, root: string, more: Record<string, unknown> = {}) => ({
  word_text, lemma, root, pos: 'N', gt_case: 'GT:case:accusative', has_det_prefix: 0, prefix_count: 0, gt_number: 'GT:number:plural',
  gt_derivation_type: 'GT:derivation_type:active_participle', form_roman: null, gt_tense: null, gt_person: null, ...more });

test('مُنْذِرِينَ: near-misses of its root and its pattern, in its own shape — never a stray word of the sūra', () => {
  const target = W('مُنْذِرِينَ', 'مُنذِر', 'نذر');
  const kin = [
    W('مُنْذَرِينَ', 'مُنذَر', 'نذر', { gt_derivation_type: 'GT:derivation_type:passive_participle' }),   // same root, same shape
    W('نُذُرًا', 'نُذُر', 'نذر', { gt_derivation_type: null }),                                           // same root, same shape
    W('النَّذِيرُ', 'نَذِير', 'نذر', { has_det_prefix: 1, gt_case: 'GT:case:nominative', gt_number: 'GT:number:singular' }), // wrong shape
    W('أَنْذَرْتَهُمْ', 'أَنذَرَ', 'نذر', { pos: 'V' }),                                                     // a verb: wrong shape
  ];
  const pool = [
    W('مُرْسِلِينَ', 'مُرْسِل', 'رسل'), W('مُؤْمِنِينَ', 'مُؤْمِن', 'امن'),                                       // same pattern
    W('شَيْئًا', 'شَيْء', 'شيا', { gt_derivation_type: null, gt_number: 'GT:number:singular' }),               // a stray word
  ];
  for (let run = 0; run < 20; run++) {
    const got = gapFillers(target, pool, false, kin);
    assert.equal(got.length, 3);
    assert.ok(!got.includes('مُنْذِرِينَ'), 'never the answer');
    assert.ok(!got.includes('النَّذِيرُ') && !got.includes('أَنْذَرْتَهُمْ'), 'never a form that gives it away');
    assert.ok(!got.includes('شَيْئًا'), 'no stray word while near-misses remain');
    assert.equal(got.filter((w) => ['مُنْذَرِينَ', 'نُذُرًا'].includes(w)).length, 2, 'two of its root');
    assert.ok(got.some((w) => ['مُرْسِلِينَ', 'مُؤْمِنِينَ'].includes(w)), 'and its pattern');
  }
});
