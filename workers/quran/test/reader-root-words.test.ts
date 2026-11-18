// A root's page lists its words as small tiles (owner, 2026-11-18: six a row, tiny): the word and a small caption of its
// count and form; and every expression of the root after them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rootReaderDoc } from '../src/reader-lexicon';

test("a root's words are word-only tiles that open each word's page", () => {
  const doc = rootReaderDoc({ root: 'جدل', lemmas: [
    { id: 'L1', lemma: 'جِدَال', form: 'اِسْم', count: 2 },
    { id: 'L2', lemma: '‏جَدَل', form: 'اِسْم', count: 2 },
  ] }, []);
  const tiles = doc.body.split('\n').filter((l) => l.startsWith('::word['));
  assert.deepEqual(tiles, [
    '::word[جِدَال | 2× · اِسْم](com.kmaps.app://reader/qr/reader/lemma/L1)',
    '::word[جَدَل | 2× · اِسْم](com.kmaps.app://reader/qr/reader/lemma/L2)',
  ]);
  assert.ok(!doc.body.includes('expressions'), 'no expressions section when the root has none');
});

test("a root's expressions follow its words, grouped by family I → X, all of them, each verse a link to the āyah", () => {
  const x = (ar: string, family: string, refs: string[] = []) => ({ ar, en: `${ar} en`, typeName: 'Idiom', source: 'Lane', explanation: null,
    refs, family, familyName: { i: 'مُجَرَّد', ii: 'تَفْعِيل', iii: 'مُفَاعَلَة', vii: 'اِنْفِعَال' }[family], familyEn: `Form ${family.toUpperCase()}` });
  const xs = [x('أ', 'iii', ['40:35', '40:56']), x('ب', 'i'), x('ج', 'vii'), x('د', 'ii'), x('ه', 'i'), x('و', 'iii')];
  const doc = rootReaderDoc({ root: 'جدل', lemmas: [{ id: 'L1', lemma: 'جِدَال', count: 2 }], expressions: xs }, []);
  const body = doc.body;
  assert.ok(body.indexOf('{#words}') < body.indexOf('{#expressions}'));
  const groups = JSON.parse(body.split('```expressions\n')[1]!.split('\n```')[0]!);
  assert.deepEqual(groups.map((g: any) => [g.family, g.name, g.items.length]),
    [['i', 'مُجَرَّد', 2], ['ii', 'تَفْعِيل', 1], ['iii', 'مُفَاعَلَة', 2], ['vii', 'اِنْفِعَال', 1]]);
  assert.deepEqual(groups[2].items[0].refs, [{ label: '40:35', url: 'com.kmaps.app://quran/40/35' }, { label: '40:56', url: 'com.kmaps.app://quran/40/56' }]);
});
