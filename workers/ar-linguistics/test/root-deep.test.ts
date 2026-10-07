// A root, deeper: the aṣl the books share as primary, then each book's own words oldest first, each a back-link to
// its block; the root-scope arcs as layers; nothing from a lemma's arc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepRoot, type AslRow } from '../src/routes/arcs';

const asl = (source: string, death: number | null, primary = 0, page: string | null = '10'): AslRow =>
  ({ id: `ASL:${source}`, source_slug: source, statement_ar: `قول ${source}`, statement_en: `says ${source}`, page_ref: page,
     block_id: `blk_${source}`, death_hijri: death, is_primary: primary, confidence: 'high' });

const hand = {
  origin: 'hand-built',
  arcs: [
    { id: 'ARC:كتب:main', scope: 'root', scopeKey: 'كتب', title: 'stitch → joined', titleAr: 'خرز ← ضم', primary: true, status: 'live',
      steps: [{ n: 1, labelEn: 'the stitch', labelAr: null, glossEn: 'a stitch', glossAr: 'الكتبة', note: null }] },
    { id: 'ARC:كتب:book', scope: 'lemma', scopeKey: 'L1', title: 'book', titleAr: null, primary: true, status: 'live', steps: [] },
  ],
  dna: { coreAr: 'جمع', coreEn: 'joining', headlineEn: 'what is gathered is fixed', headlineAr: null, poles: [], status: 'live' },
  tatawwur: [{ n: 1, ar: 'الخرز', en: 'stitching', note: null, sourceRef: null }],
  lemmaArcs: [],
} as never;

test('the primary aṣl first, then every book oldest first, each a back-link to its block', () => {
  const d = deepRoot('كتب', [asl('raghib_mufradat', 502), asl('ibn_durayd_jamharat_lugha', 321, 1, '255'), asl('khalil_kitab_ayn', 170),
                             asl('lane_lexicon', null, 0, null)], hand);
  assert.equal(d.asl!.primary!.source!.book, 'Jamhara');
  assert.deepEqual(d.asl!.primary!.source, { book: 'Jamhara', page: 255, source: 'ibn_durayd_jamharat_lugha', root: 'كتب', block: 'blk_ibn_durayd_jamharat_lugha' });
  assert.deepEqual(d.asl!.books.map((b) => b.source!.source), ['khalil_kitab_ayn', 'raghib_mufradat', 'lane_lexicon']);
  assert.equal(d.asl!.books[2].source!.page, null);
});

test('the layers are the root\'s own arcs, not a lemma\'s; the core and the stages come with them', () => {
  const d = deepRoot('كتب', [], hand);
  assert.equal(d.asl, null);
  assert.deepEqual(d.layers.map((l) => l.id), ['ARC:كتب:main']);
  assert.deepEqual(d.layers[0].steps[0], { n: 1, en: 'the stitch', ar: null, glossEn: 'a stitch', glossAr: 'الكتبة' });
  assert.equal(d.core!.en, 'joining');
  assert.equal(d.stages.length, 1);
});
