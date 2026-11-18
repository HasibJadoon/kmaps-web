// A root's page lists its words as small tiles holding only the word (owner, 2026-11-18: "6 cards, tiny, word only");
// the form, pattern and count live on each word's own page.
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
    '::word[جِدَال](com.kmaps.app://reader/qr/reader/lemma/L1)',
    '::word[جَدَل](com.kmaps.app://reader/qr/reader/lemma/L2)',
  ]);
  assert.ok(!doc.body.includes('in the Qurʾān'));
});
