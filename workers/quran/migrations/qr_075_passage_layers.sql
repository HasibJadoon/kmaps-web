-- The passage page's layers after Words and Expressions became one step (الصرف): one الصرف layer
-- (its forms, prepositions, family and meanings in the Qurʾān) in place of "Words & roots", "Verbal
-- idioms" and the lexicon list; every label plain English, the Arabic term beside it, no
-- transliteration. The app's passage study opens step 'sarf' at its الصرف tab.

DELETE FROM qr_study_label WHERE scope = 'layer' AND key IN ('words', 'idioms', 'lexicon', 'context');

UPDATE qr_study_label SET label = 'Reading', label_ar = 'القِرَاءَة', detail = 'The passage, heard and read, with its translation', sort = 0
 WHERE scope = 'layer' AND key = 'reading';
UPDATE qr_study_label SET label = 'Translation', label_ar = 'التَّرْجَمَة', detail = 'From word for word to fluent English, and why each choice', sort = 1
 WHERE scope = 'layer' AND key = 'translation';
UPDATE qr_study_label SET label = 'Forms & words', label_ar = 'الصَّرْف',
       detail = 'Each word’s forms, its prepositions, its family and its meanings in the Qurʾān', extra_json = '{"step":"sarf"}', sort = 2
 WHERE scope = 'layer' AND key = 'sarf';
UPDATE qr_study_label SET label = 'Grammar', label_ar = 'النَّحْو وَالإِعْرَاب', detail = 'What each word does in its sentence', sort = 3
 WHERE scope = 'layer' AND key = 'nahw';
UPDATE qr_study_label SET label = 'Rhetoric', label_ar = 'البَلَاغَة', detail = 'How the wording carries its meaning and its beauty', sort = 4
 WHERE scope = 'layer' AND key = 'balagha';
UPDATE qr_study_label SET label = 'Structure', label_ar = 'النَّظْم', detail = 'How the passage is built, and where it sits in the chapter', sort = 5
 WHERE scope = 'layer' AND key = 'structure';
UPDATE qr_study_label SET label = 'Commentary', label_ar = 'التَّفْسِير', detail = 'What the commentators say, line by line', sort = 6
 WHERE scope = 'layer' AND key = 'tafsir';

-- ── the class path, one structure with the layers: same names, icons and colours ──────────────
UPDATE qr_study_label SET label = 'Forms & words', label_ar = 'الصَّرْف', icon = 'square.grid.3x3', color = '#D8B657',
       detail = 'Each word’s forms, its prepositions, its family and its meanings in the Qurʾān'
 WHERE scope = 'class_node' AND key = 'words';
UPDATE qr_study_label SET label = 'Sentences', label_ar = 'الجُمَل', icon = 'text.alignright', color = '#81B29A',
       detail = 'What each part of the sentence does, and its fluent English'
 WHERE scope = 'class_node' AND key = 'sentences';
UPDATE qr_study_label SET label = 'Structure', label_ar = 'النَّظْم', icon = 'rectangle.split.3x1', color = '#9C89B8',
       detail = 'How the passage is built, and where it sits in the chapter'
 WHERE scope = 'class_node' AND key = 'structure';
UPDATE qr_study_label SET detail = 'What the passage says, asked of its own words'
 WHERE scope = 'class_node' AND key = 'questions';
UPDATE qr_study_label SET label = 'Hear the commentary', label_ar = 'اسْتَمِعْ إِلَى التَّفْسِير', icon = 'headphones', color = '#4FB3A9',
       detail = 'Four commentaries on the passage, read aloud — tap any word you miss'
 WHERE scope = 'class_node' AND key = 'listen';
UPDATE qr_study_label SET label = 'Commentary', label_ar = 'التَّفْسِير', icon = 'text.quote', color = '#4FB3A9',
       detail = 'Read and hear the commentators until you understand them without a translation'
 WHERE scope = 'class_node' AND key = 'tafsir';

-- the layers wear their step's icon and colour
UPDATE qr_study_label SET icon = 'headphones',        color = '#5DA9E9' WHERE scope = 'layer' AND key = 'reading';
UPDATE qr_study_label SET icon = 'text.alignleft',    color = '#81B29A' WHERE scope = 'layer' AND key = 'translation';
UPDATE qr_study_label SET icon = 'square.grid.3x3',   color = '#D8B657' WHERE scope = 'layer' AND key = 'sarf';
UPDATE qr_study_label SET icon = 'text.alignright',   color = '#81B29A' WHERE scope = 'layer' AND key = 'nahw';
UPDATE qr_study_label SET icon = 'wand.and.stars',    color = '#81B29A' WHERE scope = 'layer' AND key = 'balagha';
UPDATE qr_study_label SET icon = 'rectangle.split.3x1', color = '#9C89B8' WHERE scope = 'layer' AND key = 'structure';
UPDATE qr_study_label SET icon = 'text.quote',        color = '#4FB3A9' WHERE scope = 'layer' AND key = 'tafsir';
