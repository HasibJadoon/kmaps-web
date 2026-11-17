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

import { lexEntryMarkdown } from '../src/reader';

test('a dictionary article: bands per section with page and anchor, lanes, footnotes, shawāhid, Qurʾān refs', () => {
  const r = lexEntryMarkdown({
    meta: { slug: 'lisan' }, entry: { root_text: 'غفر', root_norm: 'غفر' },
    sections: [
      { id: 's1', heading_ar: 'غفر', page_no: 25, lang: 'ar', body: { paragraphs: ['الغفر الستر.'] } },
      { id: 's2', heading_ar: 'المغفرة', page_no: 26, lang: 'ar', text_en: 'Forgiveness.', body: { paragraphs: ['المغفرة\nالستر.'] } },
    ],
    blocks: [
      { id: 'b1', section_id: 's2', block_type: 'definition', title_ar: null, text_plain: 'x', data_json: '{"ur":"مغفرت"}', printed_page: 26 },
      { id: 'b2', section_id: null, block_type: 'poetry_quote', title_ar: null, text_plain: 'بيت', data_json: '{"poet":"الأعشى"}', printed_page: 26 },
    ],
    quran_refs: [{ surah: 71, ayah: 10, context_snippet: 'استغفروا' }],
    footnotes: [{ num: 1, text: 'في نسخة', section_id: 's2' }],
  });
  assert.deepEqual(r.lanes.sort(), ['en', 'ur']);
  assert.equal(r.body, [
    '::folio[ص ٢٥] {#s1}', 'الغفر الستر.',
    '## المغفرة · ص ٢٦ {#s2}', 'المغفرة الستر.', '@en Forgiveness.', '@ur مغفرت', '[^1]: في نسخة',
    '## :music.note.list: الشواهد', '> بيت\n> **الأعشى**',
    '## :book.closed: Qurʾān in this entry', '- **71:10** — استغفروا',
  ].join('\n\n'));
});
