-- qr_065_ss_jadwal_layer.sql
--
-- The sentence-structure layer for every āyah, derived from al-Jadwal fī iʿrāb al-Qurʾān wa-ṣarfihi
-- wa-bayānih (Maḥmūd Ṣāfī) by kmaps-resources scripts/quran/ss_clause_drills.py, and the `ss`
-- (sentence structure) practice skill that drills it.
--
-- Derived rows go into the existing qr_ss_* tables marked source_basis = 'derived:jadwal', their ids
-- carrying ':jadwal:' (QR:SS:{s}:{a}:jadwal:s{w}, QR:CL:…:jadwal:c{w}, QR:PH:…:jadwal:p{w},
-- QR:EL:…, QR:NU:…, QR:LK:…). Curated rows outrank them: the builder writes no derived sentence,
-- clause or phrase on an āyah a curated sentence covers, and never touches a curated row.
--
-- Two tables are new:
--   qr_ss_clause_reading  every iʿrāb book's statement on a clause — al-Jadwal's (is_backbone = 1)
--                         and al-Muyassar's, al-Daʿʿās's, al-Darwīsh's, al-ʿUkbarī's set against it
--                         (agrees: same role, after equivalents) — the evidence of the level-3 drills
--   qr_ss_book_note       al-Jadwal's ṣarf, balāgha and fawāʾid sections, item by item, verbatim,
--                         on the word / clause / āyah each concerns (gt_ref: the balāgha figure's GT term)
--
-- Apply with `d1 execute --file` (do not `migrations apply` km_quran), then record it in d1_migrations.

ALTER TABLE qr_ss_ellipsis_event ADD COLUMN source_basis TEXT;
ALTER TABLE qr_ss_ellipsis_event ADD COLUMN source_ref TEXT;
ALTER TABLE qr_ss_scope_nuance ADD COLUMN source_basis TEXT;
ALTER TABLE qr_ss_scope_nuance ADD COLUMN source_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_ss_sentence_basis ON qr_ss_occ_sentence (source_basis, surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_qr_ss_clause_basis ON qr_ss_occ_clause (source_basis, surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_qr_ss_clause_sentence ON qr_ss_occ_clause (sentence_id);
CREATE INDEX IF NOT EXISTS idx_qr_ss_phrase_clause ON qr_ss_occ_phrase (clause_id);
CREATE INDEX IF NOT EXISTS idx_qr_ss_ellipsis_scope ON qr_ss_ellipsis_event (scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_qr_ss_nuance_scope ON qr_ss_scope_nuance (scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_qr_ss_link_from ON qr_ss_scope_link (from_scope_type, from_scope_id);

CREATE TABLE IF NOT EXISTS qr_ss_clause_reading (
  id             TEXT PRIMARY KEY,   -- QR:CR:{s}:{a}:{book}:…
  clause_id      TEXT,               -- the derived qr_ss_occ_clause (NULL on an āyah the curated layer covers)
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  word_start     INTEGER NOT NULL,   -- qr_word_occurrence.word_index: the clause's quoted opening words
  word_end       INTEGER NOT NULL,
  quote_ar       TEXT,               -- the words the book quotes (al-Jadwal) or names
  source_slug    TEXT NOT NULL,      -- qul_jadwal_irab_quran | qul_irab_muyassar | qul_irab_quran_daas | qul_irab_darwish | tibyan_ukbari_irab
  entry_id       TEXT,               -- qr_irab_book_entry.id / qr_irab_source_chunk.id
  role_key       TEXT,               -- ss_role label key: istinafiyya, sila, khabar, hal, naat, maqul_qawl, maatufa …
  role_gt        TEXT,               -- GT:sentence_role:*
  mahall         TEXT,               -- none | raf | nasb | jarr | jazm
  alt_roles_json TEXT,               -- the other readings the book allows
  statement_ar   TEXT NOT NULL,      -- the book's words, verbatim
  is_backbone    INTEGER NOT NULL DEFAULT 0,
  agrees         INTEGER,            -- other books: 1 same role as al-Jadwal, 2 one allows the other's reading, 0 they part; al-Jadwal: 0 when any book parts outright
  kind           TEXT,               -- ismiyya | filiyya | shartiyya (al-Jadwal rows; read from the opening words' morphology)
  kind_head      TEXT,               -- the word that decides the kind
  kind_head_pos  TEXT,               -- its stem tag (V, N, PRON, DEM, REL, PN …)
  truncated      INTEGER NOT NULL DEFAULT 0   -- the quote runs on («… ...»): the span is the clause's opening
);
CREATE INDEX IF NOT EXISTS idx_qr_ss_clause_reading_ayah ON qr_ss_clause_reading (surah, ayah, word_start);
CREATE INDEX IF NOT EXISTS idx_qr_ss_clause_reading_clause ON qr_ss_clause_reading (clause_id);
CREATE INDEX IF NOT EXISTS idx_qr_ss_clause_reading_backbone ON qr_ss_clause_reading (is_backbone, surah, role_key);

CREATE TABLE IF NOT EXISTS qr_ss_book_note (
  id           TEXT PRIMARY KEY,     -- QR:BN:{s}:{a}:jadwal:{section}:{chunk}:{item}
  surah        INTEGER NOT NULL,
  ayah         INTEGER NOT NULL,
  scope_type   TEXT NOT NULL,        -- word | clause | ayah
  scope_id     TEXT NOT NULL,        -- qr_word_occurrence.id | qr_ss_occ_clause.id | QR:{s}:{a}
  word_start   INTEGER,
  word_end     INTEGER,
  source_slug  TEXT NOT NULL,
  section_kind TEXT NOT NULL,        -- sarf | balagha | fawaid
  item_no      INTEGER NOT NULL DEFAULT 1,
  head_ar      TEXT,                 -- the word (ṣarf) or the figure (balāgha) the item opens with
  gt_ref       TEXT,                 -- the balāgha figure's GT term, where it is one
  text_ar      TEXT NOT NULL,        -- verbatim
  chunk_id     TEXT                  -- qr_irab_source_chunk.id
);
CREATE INDEX IF NOT EXISTS idx_qr_ss_book_note_ayah ON qr_ss_book_note (surah, ayah, section_kind);
CREATE INDEX IF NOT EXISTS idx_qr_ss_book_note_scope ON qr_ss_book_note (scope_type, scope_id);

CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_ss_clause_reading_i AFTER INSERT ON qr_ss_clause_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_ss_clause_reading_d AFTER DELETE ON qr_ss_clause_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_ss_book_note_i AFTER INSERT ON qr_ss_book_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_ss_book_note_d AFTER DELETE ON qr_ss_book_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

-- ── the `ss` skill: three levels (the worker reads skill.extra_json.levels) ─────────────────────────
--   L1 ss_kind     the marked clause: nominal or verbal sentence?            (al-Jadwal's clause, its opening words' morphology)
--      ss_mahall   has it a place in iʿrāb (maḥall) — and which?             (al-Jadwal's statement)
--   L2 ss_role     its role, set among sibling roles                          (al-Jadwal's statement)
--   L3 ss_books    where the iʿrāb books part on a clause: how does book B read it?   (qr_ss_clause_reading, agrees = 0)
--      ss_ellipsis what is elided here                                        (qr_ss_ellipsis_event: al-Jadwal + the curated layer)
--      ss_nuance   the figure / discourse force at work                       (qr_ss_scope_nuance: al-Jadwal's balāgha + curated)
--      ss_buildup  order the translation's build-up, literal to fluent        (qr_ss_translation_buildup, curated)
--      ss_why      why was it rendered so                                     (qr_ss_translation_decision, curated)
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'ss', 'Sentence structure', 'بِنَاءُ الجُمْلَة', 'How each clause is built and where it stands — nominal or verbal, its place in iʿrāb, its role, and where the books part', 'text.alignright', '#8AB17D', NULL,
 '{"source":"ss","books":{"qul_jadwal_irab_quran":{"en":"Maḥmūd Ṣāfī, al-Jadwal fī Iʿrāb al-Qurʾān","ar":"الجدول في إعراب القرآن"},"qul_irab_muyassar":{"en":"al-Iʿrāb al-Muyassar","ar":"الإعراب الميسر"},"qul_irab_darwish":{"en":"Muḥyī al-Dīn al-Darwīsh, Iʿrāb al-Qurʾān wa-Bayānuh","ar":"إعراب القرآن وبيانه"},"tibyan_ukbari_irab":{"en":"al-ʿUkbarī, al-Tibyān fī Iʿrāb al-Qurʾān","ar":"التبيان في إعراب القرآن"},"qul_irab_quran_daas":{"en":"al-Daʿʿās, Iʿrāb al-Qurʾān","ar":"إعراب القرآن الكريم"}},"curated":{"en":"the K-Maps sentence-structure layer","ar":"طبقة بناء الجملة"},"levels":{"basic":{"asks":["ss_kind","ss_mahall"]},"middle":{"asks":["ss_role"]},"advanced":{"asks":["ss_books","ss_ellipsis","ss_nuance","ss_buildup","ss_why"]}}}', 11),

('kind', 'ss_kind', 'Listen — is the marked clause a nominal or a verbal sentence?', 'اِسْمَعْ — أَجُمْلَةٌ اسْمِيَّةٌ هِيَ أَمْ فِعْلِيَّة؟', NULL, NULL, NULL, NULL, NULL, 120),
('kind', 'ss_mahall', 'Has the marked clause a place in iʿrāb (maḥall) — and which?', 'أَلِلْجُمْلَةِ مَحَلٌّ مِنَ الإِعْرَاب؟', NULL, NULL, NULL, NULL, NULL, 121),
('kind', 'ss_role', 'What role does the marked clause play?', 'مَا مَوْقِعُ الجُمْلَةِ مِنَ الإِعْرَاب؟', NULL, NULL, NULL, NULL, NULL, 122),
('kind', 'ss_books', 'The iʿrāb books part on the marked clause — how does this one read it?', 'اِخْتَلَفَتْ كُتُبُ الإِعْرَابِ فِي الجُمْلَة — كَيْفَ أَعْرَبَهَا هَذَا؟', NULL, NULL, NULL, NULL, NULL, 123),
('kind', 'ss_ellipsis', 'Something is left unsaid in the marked words — what is elided?', 'مَا المَحْذُوفُ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 124),
('kind', 'ss_nuance', 'What is at work in the marked words?', 'مَا النُّكْتَةُ فِي هَذَا التَّرْكِيب؟', NULL, NULL, NULL, NULL, NULL, 125),
('kind', 'ss_buildup', 'Build the translation — from the first step to the fluent whole', 'اِبْنِ التَّرْجَمَةَ خُطْوَةً خُطْوَة', NULL, NULL, NULL, NULL, NULL, 126),
('kind', 'ss_why', 'Why was it rendered this way?', 'لِمَاذَا تُرْجِمَ هَكَذَا؟', NULL, NULL, NULL, NULL, NULL, 127),

-- the sentence kinds (L1 options)
('ss_kind', 'ismiyya', 'Nominal sentence (jumla ismiyya)', 'جُمْلَةٌ اسْمِيَّة', 'It opens with a noun', NULL, NULL, NULL, '{"gt":"GT:sentence_class:ismiyya"}', 0),
('ss_kind', 'filiyya', 'Verbal sentence (jumla fiʿliyya)', 'جُمْلَةٌ فِعْلِيَّة', 'It opens with a verb', NULL, NULL, NULL, '{"gt":"GT:sentence_class:filiyya"}', 1),
('ss_kind', 'shibh', 'Quasi-sentence (shibh jumla) — a prepositional or adverbial phrase', 'شِبْهُ جُمْلَة', NULL, NULL, NULL, NULL, NULL, 2),

-- a clause's place in iʿrāb (L1 options)
('ss_mahall', 'none', 'No place in iʿrāb (lā maḥall lahā)', 'لَا مَحَلَّ لَهَا مِنَ الإِعْرَاب', NULL, NULL, NULL, NULL, '{"gt":"GT:sentence_role:la_mahall"}', 0),
('ss_mahall', 'raf', 'A nominative place (fī maḥall rafʿ)', 'فِي مَحَلِّ رَفْع', NULL, NULL, NULL, NULL, '{"gt":"GT:sentence_role:laha_mahall"}', 1),
('ss_mahall', 'nasb', 'An accusative place (fī maḥall naṣb)', 'فِي مَحَلِّ نَصْب', NULL, NULL, NULL, NULL, '{"gt":"GT:sentence_role:laha_mahall"}', 2),
('ss_mahall', 'jarr', 'A genitive place (fī maḥall jarr)', 'فِي مَحَلِّ جَرّ', NULL, NULL, NULL, NULL, '{"gt":"GT:sentence_role:laha_mahall"}', 3),
('ss_mahall', 'jazm', 'A jussive place (fī maḥall jazm)', 'فِي مَحَلِّ جَزْم', NULL, NULL, NULL, NULL, '{"gt":"GT:sentence_role:laha_mahall"}', 4),

-- a clause's role (L2 options; family: the siblings it is set among)
('ss_role', 'ibtidaiyya', 'Opening clause (ibtidāʾiyya)', 'ابْتِدَائِيَّة', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:ibtidaiyya"}', 0),
('ss_role', 'istinafiyya', 'Resumptive — a fresh start (istiʾnāfiyya)', 'اسْتِئْنَافِيَّة', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:istinafiyya"}', 1),
('ss_role', 'istinaf_bayani', 'Clarifying resumption — it answers an implied question (istiʾnāf bayānī)', 'اسْتِئْنَافٌ بَيَانِيّ', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:istinafiyya"}', 2),
('ss_role', 'talil', 'Causal — it gives the reason (taʿlīliyya)', 'تَعْلِيلِيَّة', NULL, NULL, NULL, NULL, '{"family":"free"}', 3),
('ss_role', 'itiradiyya', 'Parenthetical — set between two linked parts (iʿtirāḍiyya)', 'اعْتِرَاضِيَّة', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:itiradiyya"}', 4),
('ss_role', 'tafsiriyya', 'Explanatory — it spells out what came before (tafsīriyya)', 'تَفْسِيرِيَّة', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:tafsiriyya"}', 5),
('ss_role', 'sila', 'Relative clause of a relative noun (ṣilat al-mawṣūl)', 'صِلَةُ المَوْصُول', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:silat_mawsul"}', 6),
('ss_role', 'sila_harfi', 'Clause of a verbal-noun particle — an, mā (ṣila of a ḥarf maṣdarī)', 'صِلَةُ المَوْصُولِ الحَرْفِيّ', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:silat_mawsul"}', 7),
('ss_role', 'jawab_qasam', 'Answer to an oath (jawāb al-qasam)', 'جَوَابُ القَسَم', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:jawab_qasam"}', 8),
('ss_role', 'jawab_shart', 'Answer of a non-jussive condition (jawāb sharṭ ghayr jāzim)', 'جَوَابُ شَرْطٍ غَيْرِ جَازِم', NULL, NULL, NULL, NULL, '{"family":"free","gt":"GT:sentence_role:jawab_shart_ghayr_jazim"}', 9),
('ss_role', 'jawab_nida', 'Answer to a vocative — what the address says (jawāb al-nidāʾ)', 'جَوَابُ النِّدَاء', NULL, NULL, NULL, NULL, '{"family":"free"}', 10),
('ss_role', 'jawab_talab', 'Answer to a request (jawāb al-ṭalab)', 'جَوَابُ الطَّلَب', NULL, NULL, NULL, NULL, '{"family":"free"}', 11),
('ss_role', 'khabar', 'Predicate (khabar)', 'خَبَر', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:khabar"}', 20),
('ss_role', 'hal', 'Circumstantial clause (ḥāl)', 'حَال', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:hal"}', 21),
('ss_role', 'naat', 'Attributive clause — it describes a noun (naʿt)', 'نَعْت', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:naat"}', 22),
('ss_role', 'maqul_qawl', 'What is said — object of a verb of saying (maqūl al-qawl)', 'مَقُولُ القَوْل', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:maful_bihi"}', 23),
('ss_role', 'maful_bih', 'Direct object (mafʿūl bihi)', 'مَفْعُولٌ بِه', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:maful_bihi"}', 24),
('ss_role', 'mudaf_ilayh', 'Genitive complement — after idh, idhā, ḥīna … (muḍāf ilayhi)', 'مُضَافٌ إِلَيْه', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:mudaf_ilayh"}', 25),
('ss_role', 'jawab_shart_jazim', 'Answer of a jussive condition (jawāb sharṭ jāzim)', 'جَوَابُ شَرْطٍ جَازِم', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:jawab_shart_jazim"}', 26),
('ss_role', 'naib_fail', 'Deputy agent of a passive verb (nāʾib al-fāʿil)', 'نَائِبُ الفَاعِل', NULL, NULL, NULL, NULL, '{"family":"placed"}', 27),
('ss_role', 'badal', 'Substitute for what came before (badal)', 'بَدَل', NULL, NULL, NULL, NULL, '{"family":"placed","gt":"GT:sentence_role:tabia_li_mufrad"}', 28),
('ss_role', 'shart', 'The condition itself (fiʿl al-sharṭ)', 'فِعْلُ الشَّرْط', NULL, NULL, NULL, NULL, '{"family":"placed"}', 29),
('ss_role', 'maatufa', 'Coordinated onto another clause (maʿṭūfa)', 'مَعْطُوفَة', NULL, NULL, NULL, NULL, '{"family":"follower","gt":"GT:sentence_role:tabia_li_jumla"}', 40),

-- what decides a clause's kind (L1 explanation)
('ss_pos', 'V', 'a verb (fiʿl)', 'فِعْل', NULL, NULL, NULL, NULL, NULL, 0),
('ss_pos', 'N', 'a noun (ism)', 'اسْم', NULL, NULL, NULL, NULL, NULL, 1),
('ss_pos', 'PN', 'a proper noun (ism ʿalam)', 'اسْمُ عَلَم', NULL, NULL, NULL, NULL, NULL, 2),
('ss_pos', 'PRON', 'a pronoun (ḍamīr)', 'ضَمِير', NULL, NULL, NULL, NULL, NULL, 3),
('ss_pos', 'DEM', 'a demonstrative (ism ishāra)', 'اسْمُ إِشَارَة', NULL, NULL, NULL, NULL, NULL, 4),
('ss_pos', 'REL', 'a relative noun (ism mawṣūl)', 'اسْمٌ مَوْصُول', NULL, NULL, NULL, NULL, NULL, 5),
('ss_pos', 'ADJ', 'an adjective (ṣifa)', 'صِفَة', NULL, NULL, NULL, NULL, NULL, 6),
('ss_pos', 'IMPN', 'a verbal noun of command (ism fiʿl)', 'اسْمُ فِعْل', NULL, NULL, NULL, NULL, NULL, 7),

-- what is elided (L3 ss_ellipsis options; aliases: the curated layer's own type names)
('ss_ellipsis', 'hadhf_mubtada', 'The subject (mubtadaʾ)', 'المُبْتَدَأ', NULL, NULL, NULL, NULL, '{"aliases":["elided_subject","mubtada"]}', 0),
('ss_ellipsis', 'hadhf_khabar', 'The predicate (khabar)', 'الخَبَر', NULL, NULL, NULL, NULL, '{"aliases":["elided_predicate","hadhf_khabar_inna","hadhf_khabar_la","hadhf_khabar_muqaddam","khabar_la","hadhf_musnad"]}', 1),
('ss_ellipsis', 'hadhf_fil', 'The verb (fiʿl)', 'الفِعْل', NULL, NULL, NULL, NULL, '{"aliases":["fiil_qasam","hadhf_amil"]}', 2),
('ss_ellipsis', 'hadhf_maful', 'The object (mafʿūl bihi)', 'المَفْعُولُ بِه', NULL, NULL, NULL, NULL, NULL, 3),
('ss_ellipsis', 'hadhf_jawab_shart', 'The answer of the condition (jawāb al-sharṭ)', 'جَوَابُ الشَّرْط', NULL, NULL, NULL, NULL, '{"aliases":["jawab_shart"]}', 4),
('ss_ellipsis', 'hadhf_jawab_qasam', 'The answer of the oath (jawāb al-qasam)', 'جَوَابُ القَسَم', NULL, NULL, NULL, NULL, NULL, 5),
('ss_ellipsis', 'hadhf_mawsuf', 'The noun described (mawṣūf)', 'المَوْصُوف', NULL, NULL, NULL, NULL, NULL, 6),
('ss_ellipsis', 'hadhf_mudaf', 'The first term of a genitive (muḍāf)', 'المُضَاف', NULL, NULL, NULL, NULL, NULL, 7),
('ss_ellipsis', 'hadhf_harf_nida', 'The vocative particle (ḥarf al-nidāʾ)', 'حَرْفُ النِّدَاء', NULL, NULL, NULL, NULL, NULL, 8),

-- why a rendering (L3 ss_why options: qr_ss_translation_decision.driver_kind)
('ss_driver', 'balagha', 'A figure of rhetoric (balāgha)', 'بَلَاغَة', NULL, NULL, NULL, NULL, NULL, 0),
('ss_driver', 'grammar', 'The grammar (naḥw)', 'نَحْو', NULL, NULL, NULL, NULL, NULL, 1),
('ss_driver', 'reading', 'An iʿrāb reading the books give', 'وَجْهٌ إِعْرَابِيّ', NULL, NULL, NULL, NULL, '{"aliases":["irab_reading"]}', 2),
('ss_driver', 'nuance', 'A discourse nuance (nukta)', 'نُكْتَة', NULL, NULL, NULL, NULL, NULL, 3),
('ss_driver', 'discourse', 'The flow of the discourse (siyāq)', 'سِيَاق', NULL, NULL, NULL, NULL, NULL, 4),
('ss_driver', 'lexical', 'The word''s own meaning (lexis)', 'دَلَالَةُ اللَّفْظ', NULL, NULL, NULL, NULL, '{"aliases":["lexis"]}', 5);
