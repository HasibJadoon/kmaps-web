// A root's page lists its words as small tiles (owner, 2026-11-18: six a row, tiny): the word and a small caption of its
// count and form.
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
});

