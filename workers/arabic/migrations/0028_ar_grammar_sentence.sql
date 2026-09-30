-- Grammar drilled in sentences, at three levels, and harder sentences higher up.
--
-- ar_grammar_sentence: every example a grammar lesson or a grammar book gives for a rule — a
-- Qurʾānic āyah it quotes (﴿…﴾, heard in the recitation: qr_ref), a line of poetry (the two
-- halves «… ... …»), or the author's own example («نحو: …», «مثل: …», «كقولك: …») — with the
-- GT term it is cited for, the lesson whose text (or classical reading) cites it, the book, bāb,
-- volume and page. Mined from the books' pages in AL (ar_ling_gram_chunk) by kmaps-resources
-- scripts/grammar/mine_examples.py (pull → build → apply), which also queues the non-Qurʾān ones
-- for a SILMA voice (ar_tts_request). Its level is data: the book's register (scope
-- 'grammar_book'), the term's depth, the sentence's length and kind (scope 'grammar_level').
CREATE TABLE IF NOT EXISTS ar_grammar_sentence (
  id          TEXT PRIMARY KEY,     -- GS:<sha1 of source|page|text>
  kind        TEXT NOT NULL,        -- quran | poetry | example
  text_ar     TEXT NOT NULL,        -- as the book prints it (for quran: the words it quotes)
  qr_ref      TEXT,                 -- s:a, kind = quran
  term_id     TEXT,                 -- GT:… the rule it is cited for (null: the lesson's, unnamed)
  lesson_id   TEXT,                 -- LSN:… the lesson whose own text or classical reading cites it
  origin      TEXT NOT NULL,        -- lesson (its own text) | reading (a bāb it points to) | toc | page | curated | title
  source_slug TEXT,                 -- AL book (ar_ling_source.slug)
  chunk_id    TEXT,                 -- AL page (ar_ling_gram_chunk.id)
  bab_id      TEXT,
  volume_no   INTEGER,
  page_no     INTEGER,
  word_count  INTEGER NOT NULL,
  depth       INTEGER,              -- the term's depth in the registry
  level       INTEGER NOT NULL,     -- 1 | 2 | 3: Level 1 (basic) … Level 3 (advanced)
  rnd         INTEGER NOT NULL      -- a fixed random key, to draw by
);
CREATE INDEX IF NOT EXISTS idx_ar_grammar_sentence_level ON ar_grammar_sentence(level, rnd);
CREATE INDEX IF NOT EXISTS idx_ar_grammar_sentence_term ON ar_grammar_sentence(term_id, level);
CREATE INDEX IF NOT EXISTS idx_ar_grammar_sentence_lesson ON ar_grammar_sentence(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ar_grammar_sentence_page ON ar_grammar_sentence(source_slug, volume_no, page_no);

-- The classical sentences graded: 1 plain … 3 hard, by length and by how rare their words are in
-- the Shamela library (kmaps-resources scripts/arabic-episodes/drill_words.py grade). Level 2
-- reads the plainer ones, Level 3 the harder — and hears the voiced ones as listening lines.
ALTER TABLE ar_read_pool ADD COLUMN grade INTEGER;
CREATE INDEX IF NOT EXISTS idx_ar_read_pool_grade ON ar_read_pool(grade, object_key);
CREATE INDEX IF NOT EXISTS idx_ar_practice_pool_band_wc ON ar_practice_pool(band, word_count, rnd);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'grammar', 'Grammar', 'النَّحْو', 'Rules from the lessons and the books — each met in a sentence', 'text.book.closed', '#4FB3A9', NULL, '{"source":"grammar"}', 7),

-- how hard a sentence is, by what it is (the miner reads these): the term's depth (0, 1, 2, 3+ →
-- level), the words it runs to (up to the first number: level 1, the second: level 2, beyond: 3),
-- a poetry line at least level 2, a lesson of an advanced track at least level 2
('grammar_level', 'rules', 'How a grammar sentence is levelled', NULL, NULL, NULL, NULL, NULL,
 '{"depth":[1,1,2,3],"words":[8,14],"poetry":2,"advanced_track":2,"per_lesson":24,"per_bab":16,"per_page":6}', 0),

-- each grammar book's register: the level its sentences start at (min_value)
('grammar_book', 'ghalayini_jami_durus', 'al-Ghalāyīnī, Jāmiʿ al-durūs', 'جامع الدروس العربية', NULL, NULL, NULL, 1, NULL, 0),
('grammar_book', 'hamalawi_shadha_arf', 'al-Ḥamalāwī, Shadhā al-ʿarf', 'شذا العرف في فن الصرف', NULL, NULL, NULL, 2, NULL, 1),
('grammar_book', 'ibn_hisham_qatr', 'Ibn Hishām, Sharḥ Qaṭr al-nadā', 'شرح قطر الندى', NULL, NULL, NULL, 2, NULL, 2),
('grammar_book', 'ibn_hisham_shudhur', 'Ibn Hishām, Shudhūr al-dhahab', 'شذور الذهب', NULL, NULL, NULL, 2, NULL, 3),
('grammar_book', 'ibn_malik_ijaz_tareef', 'Ibn Mālik, Ījāz al-taʿrīf', 'إيجاز التعريف في علم التصريف', NULL, NULL, NULL, 2, NULL, 4),
('grammar_book', 'ibn_malik_lamiyyat_afal', 'Ibn Mālik, Lāmiyyat al-afʿāl', 'لامية الأفعال', NULL, NULL, NULL, 2, NULL, 5),
('grammar_book', 'saidi_fath_mutaal', 'al-Ṣaʿīdī, Fatḥ al-mutaʿāl', 'فتح المتعال', NULL, NULL, NULL, 2, NULL, 6),
('grammar_book', 'bahraq_fath_aqfal', 'Baḥraq, Fatḥ al-aqfāl', 'فتح الأقفال', NULL, NULL, NULL, 2, NULL, 7),
('grammar_book', 'adima_dirasat', 'ʿUḍayma, Dirāsāt li-uslūb al-Qurʾān', 'دراسات لأسلوب القرآن الكريم', NULL, NULL, NULL, 2, NULL, 8),
('grammar_book', 'jurjani_miftah_sarf', 'al-Jurjānī, al-Miftāḥ fī al-ṣarf', 'المفتاح في الصرف', NULL, NULL, NULL, 2, NULL, 9),
('grammar_book', 'ibn_qatta_abniya', 'Ibn al-Qaṭṭāʿ, Abniyat al-asmāʾ', 'أبنية الأسماء والأفعال والمصادر', NULL, NULL, NULL, 2, NULL, 10),
('grammar_book', 'thamanini_sharh_tasrif', 'al-Thamānīnī, Sharḥ al-taṣrīf', 'شرح التصريف', NULL, NULL, NULL, 2, NULL, 11),
('grammar_book', 'ibn_iyaz_sharh_tareef', 'Ibn Iyāz, Sharḥ al-taʿrīf', 'شرح التعريف بضروري التصريف', NULL, NULL, NULL, 2, NULL, 12),
('grammar_book', 'dinkoz_sharh_marah', 'Dinkūz, Sharḥ Marāḥ al-arwāḥ', 'شرحان على مراح الأرواح', NULL, NULL, NULL, 2, NULL, 13),
('grammar_book', 'abu_fida_kunnash', 'Abū al-Fidāʾ, al-Kunnāsh', 'الكناش في فني النحو والصرف', NULL, NULL, NULL, 2, NULL, 14),
('grammar_book', 'sibawayh_kitab', 'Sībawayh, al-Kitāb', 'الكتاب', NULL, NULL, NULL, 3, NULL, 20),
('grammar_book', 'farra_maani_quran', 'al-Farrāʾ, Maʿānī al-Qurʾān', 'معاني القرآن', NULL, NULL, NULL, 3, NULL, 21),
('grammar_book', 'mubarrad_muqtadab', 'al-Mubarrad, al-Muqtaḍab', 'المقتضب', NULL, NULL, NULL, 3, NULL, 22),
('grammar_book', 'thalab_majalis', 'Thaʿlab, al-Majālis', 'مجالس ثعلب', NULL, NULL, NULL, 3, NULL, 23),
('grammar_book', 'ibn_wallad_maqsur', 'Ibn Wallād, al-Maqṣūr wa-l-mamdūd', 'المقصور والممدود لابن ولاد', NULL, NULL, NULL, 3, NULL, 24),
('grammar_book', 'qali_maqsur_mamdud', 'al-Qālī, al-Maqṣūr wa-l-mamdūd', 'المقصور والممدود للقالي', NULL, NULL, NULL, 3, NULL, 25),
('grammar_book', 'ibn_jinni_khasais', 'Ibn Jinnī, al-Khaṣāʾiṣ', 'الخصائص', NULL, NULL, NULL, 3, NULL, 26),
('grammar_book', 'ibn_jinni_munsif', 'Ibn Jinnī, al-Munṣif', 'المنصف', NULL, NULL, NULL, 3, NULL, 27),
('grammar_book', 'ibn_jinni_sirr_sinaat', 'Ibn Jinnī, Sirr ṣināʿat al-iʿrāb', 'سر صناعة الإعراب', NULL, NULL, NULL, 3, NULL, 28),
('grammar_book', 'jurjani_asrar_balagha', 'al-Jurjānī, Asrār al-balāgha', 'أسرار البلاغة', NULL, NULL, NULL, 3, NULL, 29),
('grammar_book', 'jurjani_dalail_ijaz', 'al-Jurjānī, Dalāʾil al-iʿjāz', 'دلائل الإعجاز', NULL, NULL, NULL, 3, NULL, 30),
('grammar_book', 'ibn_anbari_insaf', 'Ibn al-Anbārī, al-Inṣāf', 'الإنصاف في مسائل الخلاف', NULL, NULL, NULL, 3, NULL, 31),
('grammar_book', 'sakkaki_miftah_ulum', 'al-Sakkākī, Miftāḥ al-ʿulūm', 'مفتاح العلوم', NULL, NULL, NULL, 3, NULL, 32),
('grammar_book', 'ibn_athir_mathal_sair', 'Ibn al-Athīr, al-Mathal al-sāʾir', 'المثل السائر', NULL, NULL, NULL, 3, NULL, 33),
('grammar_book', 'ibn_yaish_sharh_mufassal', 'Ibn Yaʿīsh, Sharḥ al-Mufaṣṣal', 'شرح المفصل', NULL, NULL, NULL, 3, NULL, 34),
('grammar_book', 'ibn_hajib_shafiya', 'Ibn al-Ḥājib, al-Shāfiya', 'الشافية في علم التصريف', NULL, NULL, NULL, 3, NULL, 35),
('grammar_book', 'ibn_asfur_mumti', 'Ibn ʿUṣfūr, al-Mumtiʿ', 'الممتع الكبير في التصريف', NULL, NULL, NULL, 3, NULL, 36),
('grammar_book', 'radi_sharh_shafiya', 'al-Raḍī, Sharḥ al-Shāfiya', 'شرح شافية ابن الحاجب', NULL, NULL, NULL, 3, NULL, 37),
('grammar_book', 'rukn_din_sharh_shafiya', 'Rukn al-Dīn, Sharḥ al-Shāfiya', 'شرح شافية ابن الحاجب — ركن الدين', NULL, NULL, NULL, 3, NULL, 38),
('grammar_book', 'qazwini_idah', 'al-Qazwīnī, al-Īḍāḥ', 'الإيضاح في علوم البلاغة', NULL, NULL, NULL, 3, NULL, 39),
('grammar_book', 'alawi_tiraz', 'al-ʿAlawī, al-Ṭirāz', 'الطراز', NULL, NULL, NULL, 3, NULL, 40),
('grammar_book', 'ibn_hisham_mughni', 'Ibn Hishām, Mughnī al-labīb', 'مغني اللبيب', NULL, NULL, NULL, 3, NULL, 41),
('grammar_book', 'suyuti_hamn_hawami', 'al-Suyūṭī, Hamʿ al-hawāmiʿ', 'همع الهوامع', NULL, NULL, NULL, 3, NULL, 42),

-- the practice home's Grammar skill, per level: which sources, which of their three asks, the
-- registry depths, and each one's share of a session. lesson / books = ar_grammar_sentence (the
-- lessons' own examples, the books' shawāhid) at these levels; scene = the scene questions mapped
-- to GT terms; exercise = ar_exercises' grammar questions at these CEFR levels; example =
-- ar_grammar_example (iḍāfa, analysed); the rest are AL's /al/drill/grammar/:source
('grammar_drill', 'practice', 'Practice', NULL, NULL, NULL, NULL, NULL,
 '{"basic":[{"source":"lesson","ask":"gs_term","levels":[1],"share":3},{"source":"lesson","ask":"gs_lesson","levels":[1],"share":1},{"source":"shahid","ask":"gt_shahid","maxDepth":0,"share":2},{"source":"define","ask":"gt_define_term","maxDepth":0,"share":1},{"source":"tree","ask":"gt_category","maxDepth":0,"share":1},{"source":"scene","maxDepth":1,"share":2},{"source":"example","share":1},{"source":"exercise","levels":["A1","A2","B1"],"share":1}],"middle":[{"source":"lesson","ask":"gs_term","levels":[2],"share":2},{"source":"books","ask":"gs_term","levels":[2],"share":2},{"source":"tree","ask":"gt_parent","minDepth":1,"maxDepth":1,"share":1},{"source":"define","ask":"gt_define_def","minDepth":1,"maxDepth":2,"share":1},{"source":"shahid","ask":"gt_shahid","minDepth":1,"share":1},{"source":"wazn","ask":"gt_wazn_term","share":1},{"source":"wazn","ask":"gt_wazn_pattern","share":1},{"source":"contrast","ask":"gt_pair","share":1},{"source":"contrast","ask":"gt_pair_which","share":1},{"source":"adima","ask":"adima_pattern","share":1},{"source":"adima","ask":"adima_meaning","share":1},{"source":"scene","minDepth":1,"share":1},{"source":"example","share":1},{"source":"exercise","levels":["B2"],"share":1}],"advanced":[{"source":"books","ask":"gs_term","levels":[3],"share":4},{"source":"tree","ask":"gt_sibling","minDepth":2,"share":1},{"source":"define","ask":"gt_define_ar","minDepth":2,"share":1},{"source":"khilaf","ask":"gt_khilaf_whose","share":1},{"source":"khilaf","ask":"gt_khilaf_basra","share":1},{"source":"khilaf","ask":"gt_khilaf_which","share":1},{"source":"book","ask":"gt_book","share":1},{"source":"book","ask":"gt_bab","share":1},{"source":"book","ask":"gt_page","share":1},{"source":"adima","ask":"adima_note","share":1},{"source":"adima","ask":"adima_heading","share":1},{"source":"contrast","ask":"gt_contested","share":1},{"source":"define","ask":"gt_define_term","discipline":"BL","share":1},{"source":"shahid","ask":"gt_shahid","discipline":"BL","share":1},{"source":"exercise","levels":["C1","C2"],"share":1}]}', 2),

-- a lesson's own round (the grammar path, and /ar/practice/session?skill=grammar&lesson=…):
-- its own examples first, then the books' at the level above
('setting', 'grammar_lesson_share', 'In a lesson''s round, at most this many of its own examples', NULL, NULL, NULL, NULL, 4, NULL, 16),

-- the sentences each level drills on (fill, hear, order, shadow, read, words): the word counts of
-- its recorded lines, the upper band a share of a session is drawn from, the classical sentences
-- (ar_read_pool grades; voiced ones as listening lines at a share), and which blanks it prefers
-- (common → rare, by the word's frequency in the Shamela library, blanks_json .f)
('sentence_band', 'basic', 'Level 1 sentences', NULL, NULL, NULL, NULL, NULL,
 '{"lines":{"min":4,"max":9},"blank":"common"}', 0),
('sentence_band', 'middle', 'Level 2 sentences', NULL, NULL, NULL, NULL, NULL,
 '{"lines":{"min":5,"max":14},"upper":{"min":9,"share":0.5},"read":{"grades":[1,2]},"blank":"mid"}', 1),
('sentence_band', 'advanced', 'Level 3 sentences', NULL, NULL, NULL, NULL, NULL,
 '{"lines":{"min":7,"max":30},"upper":{"min":9,"share":0.4},"book":{"grades":[2,3],"share":0.4},"read":{"grades":[2,3]},"blank":"rare","words":{"vocab":0.8}}', 2),

-- the asks of the sentence drills
('kind', 'gs_term', 'Which rule is this example cited for?', 'عَلَامَ يَشْهَدُ هَذَا المِثَال؟', NULL, NULL, NULL, NULL, NULL, 50),
('kind', 'gs_lesson', 'This example — which lesson cites it?', 'فِي أَيِّ دَرْسٍ جَاءَ هَذَا المِثَال؟', NULL, NULL, NULL, NULL, NULL, 51),
('kind', 'gs_idafa', 'Which kind of iḍāfa is the marked phrase?', 'مَا نَوْعُ الإِضَافَةِ فِي المُعَلَّم؟', NULL, NULL, NULL, NULL, NULL, 52);
