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

test("a root's expressions follow its words, all of them, each verse a link to the āyah", () => {
  const xs = Array.from({ length: 13 }, (_, i) => ({ ar: `تعبير ${i}`, en: `saying ${i}`, typeName: 'Idiom', typeKey: 'idiom',
    source: 'Lane', explanation: null, refs: i === 0 ? ['40:35', '40:56'] : [] }));
  const doc = rootReaderDoc({ root: 'جدل', lemmas: [{ id: 'L1', lemma: 'جِدَال', count: 2 }], expressions: xs }, []);
  const body = doc.body;
  assert.ok(body.indexOf('{#words}') < body.indexOf('{#expressions}'));
  const json = body.split('```expressions\n')[1]!.split('\n```')[0]!;
  const items = JSON.parse(json);
  assert.equal(items.length, 13);
  assert.deepEqual(items[0].refs, [{ label: '40:35', url: 'com.kmaps.app://quran/40/35' }, { label: '40:56', url: 'com.kmaps.app://quran/40/56' }]);
});
