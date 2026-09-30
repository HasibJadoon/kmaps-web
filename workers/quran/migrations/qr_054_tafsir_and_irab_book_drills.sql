-- qr_054_tafsir_and_irab_book_drills.sql
--
-- Two Qurʾān drill skills built from the books themselves, three levels each (the worker reads
-- skill.extra_json.levels; nothing is hard-coded):
--
--   tafsir     L1 the English commentaries' point on an āyah range (its own heading or first
--                 sentence) · Maududi's surah introductions (which surah?)
--              L2 which of the eight mufassirūn wrote this sentence · which āyah it is about
--              L3 whose position on a point of doctrine (a school speaking: أصحابنا، أهل العدل،
--                 المعتزلة …) · the curated readings (34, 40, 44): whose thesis, which step
--   irabbooks  L1 al-Iʿrāb al-Muyassar's parse of a marked word
--              L2 the books part ways on a word — which book gives this parse
--              L3 the readings a book also allows (Jadwal's alternative, al-ʿUkbarī's وجهان،
--                 al-Daʿʿās's «ويجوز»): which it allows · which book allows it
--
-- The items are built from the books by kmaps-resources scripts/quran/tafsir_drills.py and
-- irab_book_drills.py (every excerpt verbatim, ≤ 280 letters, cited to its book).
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_tafsir_drill_item (
  id          TEXT PRIMARY KEY,     -- <kind>:<block / piece / section id>
  ask         TEXT NOT NULL,        -- tafsir_point | surah_intro | tafsir_who | tafsir_where | tafsir_school | tafsir_reading | tafsir_section
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER,
  ayah_to     INTEGER,
  ayah        INTEGER,              -- the āyah heard with it
  source_slug TEXT,                 -- the book (qr_tafsir_book_display_source.source_slug, or qr_tafsir_en.source_code, or 'maududi')
  source_name TEXT,
  text        TEXT NOT NULL,        -- what is shown: the excerpt or the point, verbatim
  answer      TEXT,                 -- the book's slug, the āyah key, the surah, the section heading, or the point itself
  context     TEXT,                 -- more of the source, for after the answer
  tag         TEXT,                 -- the doctrine or school named, the word of the āyah named, the passage
  ref         TEXT,                 -- the row it was cut from
  page        TEXT,
  others_json TEXT                  -- the wrong answers that sit beside it: books, āyāt, surahs, points, headings
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_drill_ask ON qr_tafsir_drill_item (ask, surah, ayah_from);

CREATE TABLE IF NOT EXISTS qr_irab_book_word (
  id             TEXT PRIMARY KEY,  -- <source_slug>:<surah>:<ayah>:<word_index>
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  word_index     INTEGER NOT NULL,  -- qr_word_occurrence.word_index
  word_text      TEXT NOT NULL,
  source_slug    TEXT NOT NULL,     -- qul_irab_muyassar | qul_jadwal_irab_quran | qul_irab_darwish | tibyan_ukbari_irab | qul_irab_quran_daas
  role_gt        TEXT,              -- the role the parse opens with (GT:irab_role:*), if it opens with one
  alt_roles_json TEXT,              -- the other roles the book allows the word
  named_json     TEXT,              -- every role the parse names at all (never a wrong answer)
  parse_ar       TEXT NOT NULL,     -- the book's words, verbatim
  alt_ar         TEXT,              -- where it gives the other readings, verbatim
  entry_id       TEXT NOT NULL,     -- qr_irab_book_entry.id (al-Daʿʿās: the same, via qr_irab_drill_item)
  n_books        INTEGER NOT NULL DEFAULT 1,   -- how many books parse this word
  n_roles        INTEGER NOT NULL DEFAULT 1    -- how many first roles they give between them (2+ = they part ways)
);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_word_word ON qr_irab_book_word (surah, ayah, word_index);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_word_book ON qr_irab_book_word (source_slug, surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_word_split ON qr_irab_book_word (n_roles, surah);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_word_alt ON qr_irab_book_word (surah, ayah) WHERE alt_roles_json IS NOT NULL;

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'tafsir', 'Tafsīr', 'التَّفْسِير', 'The mufassirūn in their own words — whose, on which āyah, from which school', 'books.vertical', '#9C6644', NULL,
 '{"source":"tafsir","levels":{"basic":{"asks":["tafsir_point","surah_intro"]},"middle":{"asks":["tafsir_who","tafsir_where"]},"advanced":{"asks":["tafsir_school","tafsir_reading","tafsir_section"]}}}', 9),
('skill', 'irabbooks', 'The iʿrāb books', 'كُتُبُ الإِعْرَاب', 'Five books of iʿrāb side by side — how each parses the word, and where they part', 'text.magnifyingglass', '#6D9DC5', NULL,
 '{"source":"irabbooks","books":{"qul_irab_muyassar":{"en":"al-Iʿrāb al-Muyassar","ar":"الإعراب الميسر"},"qul_jadwal_irab_quran":{"en":"Maḥmūd Ṣāfī, al-Jadwal fī Iʿrāb al-Qurʾān","ar":"الجدول في إعراب القرآن"},"qul_irab_darwish":{"en":"Muḥyī al-Dīn al-Darwīsh, Iʿrāb al-Qurʾān wa-Bayānuh","ar":"إعراب القرآن وبيانه"},"tibyan_ukbari_irab":{"en":"al-ʿUkbarī, al-Tibyān fī Iʿrāb al-Qurʾān","ar":"التبيان في إعراب القرآن"},"qul_irab_quran_daas":{"en":"al-Daʿʿās, Iʿrāb al-Qurʾān","ar":"إعراب القرآن الكريم"}},"roles":["mubtada","khabar","fail","naib_fail","maful_bih","maful_mutlaq","maful_liajlih","maful_maah","mudaf_ilayh","naat","hal","tamyiz","badal","munada","tawkid","mustathna","zarf","maatuf"],"levels":{"basic":{"asks":["irab_muyassar"]},"middle":{"asks":["irab_which_book"]},"advanced":{"asks":["irab_allowed","irab_who_allows"]}}}', 10),

('kind', 'tafsir_point', 'Listen — which point does the commentary make on these āyāt?', 'اِسْمَعْ — مَا الَّذِي يُقَرِّرُهُ التَّفْسِيرُ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 10),
('kind', 'surah_intro', 'From its introduction — which surah is this?', 'مِنْ مُقَدِّمَتِهَا — أَيُّ سُورَةٍ هَذِهِ؟', NULL, NULL, NULL, NULL, NULL, 11),
('kind', 'tafsir_who', 'Read the excerpt — which mufassir wrote it?', 'اِقْرَأْ — مَنْ قَالَ هَذَا مِنَ المُفَسِّرِين؟', NULL, NULL, NULL, NULL, NULL, 12),
('kind', 'tafsir_where', 'Read the comment — which āyah is it about?', 'اِقْرَأْ — فِي أَيِّ آيَةٍ قِيلَ هَذَا؟', NULL, NULL, NULL, NULL, NULL, 13),
('kind', 'tafsir_school', 'A position on a point of doctrine — whose is it?', 'مَوْقِفٌ فِي مَسْأَلَةٍ عَقَدِيَّة — لِمَنْ هُوَ؟', NULL, NULL, NULL, NULL, NULL, 14),
('kind', 'tafsir_reading', 'Whose reading of the passage is this?', 'قِرَاءَةُ مَنْ هَذِهِ لِلْمَقْطَع؟', NULL, NULL, NULL, NULL, NULL, 15),
('kind', 'tafsir_section', 'His own words — which step of his argument are they?', 'بِلَفْظِهِ — مِنْ أَيِّ مَرَاحِلِ تَفْسِيرِهِ هَذَا؟', NULL, NULL, NULL, NULL, NULL, 16),
('kind', 'irab_muyassar', 'Listen — how does al-Iʿrāb al-Muyassar parse the marked word?', 'اِسْمَعْ — كَيْفَ أَعْرَبَ «الإِعْرَابُ المُيَسَّرُ» الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 17),
('kind', 'irab_which_book', 'The books part ways on the marked word — which one parses it so?', 'اِخْتَلَفَتِ الكُتُبُ فِي الكَلِمَة — أَيُّهَا أَعْرَبَهَا هَكَذَا؟', NULL, NULL, NULL, NULL, NULL, 18),
('kind', 'irab_allowed', 'Which reading does the book allow the marked word?', 'أَيَّ وَجْهٍ أَجَازَهُ الكِتَابُ فِي الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 19),
('kind', 'irab_who_allows', 'Which book allows the marked word this reading?', 'أَيُّ الكُتُبِ أَجَازَ فِي الكَلِمَةِ هَذَا الوَجْه؟', NULL, NULL, NULL, NULL, NULL, 20),

('kalam', 'mutazili', 'Muʿtazilī', 'مُعْتَزِلِيّ', NULL, NULL, NULL, NULL, NULL, 0),
('kalam', 'ashari', 'Ashʿarī', 'أَشْعَرِيّ', NULL, NULL, NULL, NULL, NULL, 1),
('kalam', 'athari', 'Atharī', 'أَثَرِيّ', NULL, NULL, NULL, NULL, NULL, 2),
('kalam', 'maliki', 'Mālikī', 'مَالِكِيّ', NULL, NULL, NULL, NULL, NULL, 3),
('kalam', 'sunni', 'Sunnī', 'سُنِّيّ', NULL, NULL, NULL, NULL, NULL, 4),

('doctrine', 'القدر', 'Divine decree (al-qadar)', 'القَدَر', NULL, NULL, NULL, NULL, NULL, 0),
('doctrine', 'الرؤية', 'Seeing God (al-ruʾya)', 'الرُّؤْيَة', NULL, NULL, NULL, NULL, NULL, 1),
('doctrine', 'الصفات', 'The divine attributes (al-ṣifāt)', 'الصِّفَات', NULL, NULL, NULL, NULL, NULL, 2),
('doctrine', 'الشفاعة', 'Intercession (al-shafāʿa)', 'الشَّفَاعَة', NULL, NULL, NULL, NULL, NULL, 3),
('doctrine', 'العدل', 'Divine justice (al-ʿadl)', 'العَدْل', NULL, NULL, NULL, NULL, NULL, 4),
('doctrine', 'الجبر', 'Compulsion (al-jabr)', 'الجَبْر', NULL, NULL, NULL, NULL, NULL, 5),
('doctrine', 'الاختيار', 'Free choice (al-ikhtiyār)', 'الاخْتِيَار', NULL, NULL, NULL, NULL, NULL, 6),
('doctrine', 'التوحيد', 'Divine oneness (al-tawḥīd)', 'التَّوْحِيد', NULL, NULL, NULL, NULL, NULL, 7),
('doctrine', 'اصحابنا', '“Our colleagues” — the school speaking (aṣḥābunā)', 'أَصْحَابُنَا', NULL, NULL, NULL, NULL, NULL, 8),
('doctrine', 'اهل السنة', 'The Sunnīs (ahl al-sunna)', 'أَهْلُ السُّنَّة', NULL, NULL, NULL, NULL, NULL, 9),
('doctrine', 'المعتزلة', 'The Muʿtazila', 'المُعْتَزِلَة', NULL, NULL, NULL, NULL, NULL, 10),
('doctrine', 'الاشاعرة', 'The Ashʿarīs (al-ashāʿira)', 'الأَشَاعِرَة', NULL, NULL, NULL, NULL, NULL, 11),
('doctrine', 'اهل العدل', 'The people of justice (ahl al-ʿadl) — the Muʿtazila', 'أَهْلُ العَدْل', NULL, NULL, NULL, NULL, NULL, 12),
('doctrine', 'القدرية', 'The Qadariyya', 'القَدَرِيَّة', NULL, NULL, NULL, NULL, NULL, 13),
('doctrine', 'المجبرة', 'The Mujbira (compulsionists)', 'المُجْبِرَة', NULL, NULL, NULL, NULL, NULL, 14),
('doctrine', 'الجبرية', 'The Jabriyya', 'الجَبْرِيَّة', NULL, NULL, NULL, NULL, NULL, 15),
('doctrine', 'اهل الحق', 'The people of truth (ahl al-ḥaqq)', 'أَهْلُ الحَقّ', NULL, NULL, NULL, NULL, NULL, 16),
('doctrine', 'الجهمية', 'The Jahmiyya', 'الجَهْمِيَّة', NULL, NULL, NULL, NULL, NULL, 17),
('doctrine', 'الخوارج', 'The Khawārij', 'الخَوَارِج', NULL, NULL, NULL, NULL, NULL, 18),
('doctrine', 'المرجئة', 'The Murjiʾa', 'المُرْجِئَة', NULL, NULL, NULL, NULL, NULL, 19),
('doctrine', 'الكرامية', 'The Karrāmiyya', 'الكَرَّامِيَّة', NULL, NULL, NULL, NULL, NULL, 20);
