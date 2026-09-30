-- qr_059_atlas_grammar_books.sql
--
-- The grammar books in a surah's ṣarf, naḥw and balāgha layers (qr_surah_layer, built by kmaps-resources
-- scripts/quran/atlas_layers.py v2): ʿUḍayma's Dirāsāt (AL ar_ling_adima_entry / _note), the Qurʾān
-- quotations mined from 38 grammar books (km_arabic ar_grammar_sentence, filed by the discipline of the page
-- they are read from, AL ar_ling_gram_chunk), and the term registry's Qurʾānic shawāhid (AL
-- ar_ling_gram_term_example). Each payload holds the top of each list and its counts; the whole list, paged
-- and optionally cut to an āyah range, is /qr/atlas/surah/:s/:layer/citations?set=adima|books|shawahid.
-- Only labels here. Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('layer_section', 'sarf.adima',          'ʿUḍayma on this surah',          'عُضَيْمَة فِي هَذِهِ السُّورَة', 'The patterns and meanings Muḥammad ʿAbd al-Khāliq ʿUḍayma files this surah''s words under in his Dirāsāt li-uslūb al-Qurʾān, with volume and page, and his observations under those headings', NULL, NULL, '{"set":"adima"}', 7),
('layer_section', 'sarf.grammarBooks',   'In the ṣarf books',              'فِي كُتُبِ الصَّرْف',          'Where the books of morphology quote this surah: the rule it illustrates, the book, volume and page, and the book''s own words around it', NULL, NULL, '{"set":"books"}', 8),
('layer_section', 'sarf.shawahid',       'Evidence for a term (shawāhid)', 'الشَّوَاهِد',                'Āyāt of this surah the term registry cites as evidence for a morphological term', NULL, NULL, '{"set":"shawahid"}', 9),
('layer_section', 'nahw.adima',          'ʿUḍayma''s naḥw headings',       'عُضَيْمَة: أَبْوَابُ النَّحْو',  'The studies and headings ʿUḍayma lists this surah''s āyāt under (the particles, the verbs of ẓanna, the passive …), with volume and page', NULL, NULL, '{"set":"adima"}', 6),
('layer_section', 'nahw.grammarBooks',   'In the grammar books',           'فِي كُتُبِ النَّحْو',          'Each place a book of naḥw quotes an āyah of this surah: the term or rule it illustrates, the book, volume and page, and the book''s words around it', NULL, NULL, '{"set":"books"}', 7),
('layer_section', 'nahw.shawahid',       'Evidence for a term (shawāhid)', 'الشَّوَاهِد',                'Āyāt of this surah the term registry cites as evidence for a grammatical term', NULL, NULL, '{"set":"shawahid"}', 8),
('layer_section', 'balagha.grammarBooks','In the balāgha books',           'فِي كُتُبِ البَلَاغَة',        'Where al-Qazwīnī''s Īḍāḥ, Ibn al-Athīr''s al-Mathal al-sāʾir, al-Sakkākī''s Miftāḥ, al-Jurjānī''s Dalāʾil and Asrār, al-ʿAlawī''s Ṭirāz and the balāgha pages of the other books quote this surah', NULL, NULL, '{"set":"books"}', 3),
('layer_section', 'balagha.shawahid',    'Evidence for a device (shawāhid)', 'الشَّوَاهِد',              'Āyāt of this surah the term registry cites as evidence for a rhetorical device', NULL, NULL, '{"set":"shawahid"}', 4);
