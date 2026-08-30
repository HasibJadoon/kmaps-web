UPDATE ar_ling_lexicon_block SET title_ar = 'البائن: أحد الحالبَيْن'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a1');
UPDATE ar_ling_lexicon_block SET title_ar = 'شاهد الكميت'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a2');
UPDATE ar_ling_lexicon_block SET title_ar = 'البانُ: شَجَر · البَينونةُ: مصدر القَطْع · البَيْنُ: الفُرْقةُ والوَصْل (أضداد)'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a3');
UPDATE ar_ling_lexicon_block SET title_ar = 'قوسٌ بائن · البيان معروف · بان أبان تبيَّن استبان · البَيِّن: الفصيح'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a4');
UPDATE ar_ling_lexicon_block SET title_ar = 'ناب (تقليب): النّاب سِنّاً وناقةً · النّائبة: النّازلة · أناب: رجع إلى الطاعة'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a5');
UPDATE ar_ling_lexicon_block SET title_ar = 'شاهد تناوُب المنيّة'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a6');
UPDATE ar_ling_lexicon_block SET title_ar = 'انتاب القومَ: أتاهم مرّةً بعد مرّة'
  WHERE id IN (SELECT id FROM ar_ling_lexicon_block WHERE source_slug='khalil_kitab_ayn' AND root_norm='بين' AND block_path='e1.a7');
