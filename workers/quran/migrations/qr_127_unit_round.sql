-- qr_127 · One full round per unit (owner, 2026-10-14): every style once over the passage's āyāt, in the Arabic
-- practice's order — Listen & fill · Build · Catch the word · Shadow · Words · Word forms · Grammar · Read.
-- A row per style: key = the QR skill, extra.n = how many of its drills the round deals, sort = the order.
-- Styles with nothing over the passage are left out of the round. And the unit check now passes at 90 %, as
-- Arabic's does.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('unit_round', 'fill',        'Listen & fill',      'اِسْمَعْ وَأَكْمِلْ', NULL, 'ear',                   '#5DA9E9', NULL, '{"n":2}', 1),
('unit_round', 'order',       'Build the āyah',     'رَتِّبِ الآيَة',      NULL, 'square.stack.3d.up',    '#81B29A', NULL, '{"n":2}', 2),
('unit_round', 'hear',        'Catch the word',     'اِلْتَقِطِ الكَلِمَة', NULL, 'waveform',              '#E07A5F', NULL, '{"n":2}', 3),
('unit_round', 'shadow',      'Shadow',             'رَدِّدْ',             NULL, 'mic',                   '#B388EB', NULL, '{"n":1}', 4),
('unit_round', 'vocab',       'Words',              'المَعَانِي',          NULL, 'character.book.closed', '#D8B657', NULL, '{"n":2}', 5),
('unit_round', 'sarf',        'Word forms',         'الصَّرْف',            NULL, 'textformat.alt',        '#81B29A', NULL, '{"n":2}', 6),
('unit_round', 'grammar',     'Grammar',            'النَّحْو',            NULL, 'text.book.closed',      '#4FB3A9', NULL, '{"n":1}', 7),
('unit_round', 'balagha',     'Balāgha',            'البَلَاغَة',          NULL, 'wand.and.stars',        '#F2CC8F', NULL, '{"n":1}', 8),
('unit_round', 'tafsir_read', 'Read the commentary','اِقْرَأ التَّفْسِير',  NULL, 'book.pages',            '#C9A227', NULL, '{"n":2}', 9),
('class_ui', 'full_round', 'One full round', 'جَوْلَةٌ كَامِلَة', 'Listen & fill · Build · Catch the word · Shadow · Words · Word forms · Grammar · Read', 'circle.hexagongrid', '#D8B657', NULL, NULL, 90);
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.pass', 90) WHERE scope = 'class_node' AND key = 'check';
