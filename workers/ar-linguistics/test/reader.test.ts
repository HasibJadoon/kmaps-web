// The one reader's AL documents: a grammar book's printed pages as reader markdown.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arabicNum, folio, footnoteLines, gramPagesMarkdown } from '../src/reader';

test('folios: volume and page in Arabic digits; a book with no volumes gives the page alone', () => {
  assert.equal(folio(1, 5), 'ج١ · ص ٥');
  assert.equal(folio(null, 261), 'ص ٢٦١');
  assert.equal(folio(2, 10, 'السفر الثاني'), 'السفر الثاني · ص ١٠');
  assert.equal(arabicNum(2025), '٢٠٢٥');
  assert.equal(folio(null, 3, '1'), 'ج١ · ص ٣');
});

test('an edition\'s numbered footnotes become reader footnotes; an unnumbered one keeps a mark', () => {
  assert.deepEqual(footnoteLines('(1) انظر الكتاب\n٢- في نسخة: كذا\nحاشية بلا رقم'),
    ['[^1]: انظر الكتاب', '[^٢]: في نسخة: كذا', '[^*]: حاشية بلا رقم']);
  assert.deepEqual(footnoteLines(null), []);
});

test('each page opens with its folio anchored to the chunk, then its paragraphs, then its footnotes', () => {
  const md = gramPagesMarkdown([{ id: 'c1', volume_no: 1, part_label: null, page_no: 7, text_ar: 'باب الفاعل\rهو الاسم', footnotes_ar: '(1) شرح' }]);
  assert.equal(md, '::folio[ج١ · ص ٧] {#c1}\n\nباب الفاعل\n\nهو الاسم\n\n---\n\n[^1]: شرح');
});
