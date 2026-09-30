-- qr_057_surah_atlas_layers.sql
--
-- Every surah's study layers and passages for the Qurʾān atlas.
--
--   qr_surah_passage_proposal  a surah without live curated passages, cut where the mufassirūn and the
--                              iʿrāb books agree: a boundary stands where at least two of al-Rāzī,
--                              al-Ālūsī, Ibn ʿĀshūr, al-Zamakhsharī, al-Daʿʿās, al-Jadwal and Darwīsh
--                              start a group (one of them a mufassir), never where al-Daʿʿās and
--                              al-Jadwal both run across it (mid-sentence). basis_json names, for the
--                              passage's opening, the books that agree, the corroborating four
--                              (al-Ṭabarī, Ibn Kathīr, Ibn ʿAṭiyya, Abū Ḥayyān), the groups that run
--                              across it (dissent) and Ibn ʿĀshūr's own word on the āyah where he gives
--                              one (انتقال، استئناف ابتدائي …, verbatim); and each book's groups inside
--                              the passage. status is always 'derived' — these never enter
--                              qr_surah_study_passage, whose curated rows stay as they are.
--   qr_surah_layer             a surah's ṣarf, naḥw, balāgha, themes and structure, one JSON payload
--                              each; every item names its source (a book slug, 'qac', 'ss', 'maududi')
--                              and every grammatical label is a GT: term (qr_gram_term_ref).
--
-- Both are built by kmaps-resources scripts/quran/atlas_layers.py and read by
-- workers/quran/src/routes/atlas-layers.ts (/qr/atlas/surah/:s/{sarf,nahw,balagha,themes,structure};
-- /qr/atlas/surah/:s and /qr/atlas/passage/:s/:p fall back to the proposals where a surah has no
-- curated passages).
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_surah_passage_proposal (
  id               TEXT PRIMARY KEY,               -- QR:SPP:{surah}:{from}-{to}
  surah            INTEGER NOT NULL,
  passage_no       INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  title_en         TEXT,                           -- only a source's own title; else «Āyāt a–b»
  title_ar         TEXT,
  words            INTEGER NOT NULL DEFAULT 0,
  opening_score    REAL,                           -- NULL for a surah's first passage
  opening_support  INTEGER NOT NULL DEFAULT 0,     -- spine + iʿrāb books that start a group here
  basis_json       TEXT NOT NULL CHECK (json_valid(basis_json)),
  method           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'derived',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, passage_no),
  UNIQUE (surah, ayah_from, ayah_to)
);

CREATE TABLE IF NOT EXISTS qr_surah_layer (
  surah         INTEGER NOT NULL,
  layer         TEXT NOT NULL,                     -- sarf | nahw | balagha | themes | structure
  payload_json  TEXT NOT NULL CHECK (json_valid(payload_json)),
  sources_json  TEXT,
  method        TEXT NOT NULL,
  built_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (surah, layer)
);

CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_passage_proposal_i AFTER INSERT ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_passage_proposal_u AFTER UPDATE ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_passage_proposal_d AFTER DELETE ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_layer_i AFTER INSERT ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_layer_u AFTER UPDATE ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_layer_d AFTER DELETE ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

-- Labels (qr_study_label, qr_046). Scopes:
--   surah_layer     a surah's own layers (extra.route: the slice that serves it)
--   layer_section   the sections inside a surah layer's payload, keyed '{layer}.{field}'
--   passage_basis   how a passage came to be cut (a derived passage's opening rule)
--   atlas_source    sources that are not books in the tafsīr/iʿrāb source tables
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('surah_layer', 'themes',    'Themes & aims',      'المَقَاصِد',         'What the surah is about — Ibn ʿĀshūr''s aims (aghrāḍ), its place and time, Maududi''s introduction, and where Ibn ʿĀshūr says the discourse turns', 'sparkles', '#E07A5F', '{"route":"themes"}', 0),
('surah_layer', 'structure', 'Structure (naẓm)',   'النَّظْم',           'How the surah is divided — its passages and why each starts where it does, how every mufassir and iʿrāb book groups its āyāt, and its naẓm group', 'rectangle.split.3x1', '#E9C46A', '{"route":"structure"}', 1),
('surah_layer', 'sarf',      'Ṣarf',               'الصَّرْف',           'The surah''s verb forms (I–X) and derived nouns (ism fāʿil, mafʿūl, maṣdar), its characteristic roots, the words found in it alone', 'square.grid.3x3', '#4FB3A9', '{"route":"sarf"}', 2),
('surah_layer', 'nahw',      'Naḥw & iʿrāb',       'النَّحْو وَالإِعْرَاب', 'The roles its words play as the iʿrāb books parse them, where the books part ways, its particles and constructions', 'point.3.connected.trianglepath.dotted', '#81B29A', '{"route":"nahw"}', 3),
('surah_layer', 'balagha',   'Balāgha',            'البَلَاغَة',         'The rhetorical devices the books name in this surah, each with its āyah and their own words', 'wand.and.stars', '#B388EB', '{"route":"balagha"}', 4),

('layer_section', 'sarf.verbForms',            'Verb forms',                    'أَبْوَابُ الفِعْل',     'Each verb form (Form I–XII) the surah uses, with its most frequent verbs', NULL, NULL, NULL, 0),
('layer_section', 'sarf.derivations',          'Derived nouns',                 'المُشْتَقَّات',        'Active and passive participles (ism fāʿil, ism mafʿūl), verbal nouns (maṣdar) and the rest', NULL, NULL, NULL, 1),
('layer_section', 'sarf.aspect',               'Tense, voice and mood',         'الزَّمَن وَالبِنَاء',   'Perfect, imperfect and imperative; the passive; the jussive and subjunctive', NULL, NULL, NULL, 2),
('layer_section', 'sarf.onlyHere',             'Found only in this surah',      'مَا انْفَرَدَتْ بِهِ',   'Nouns and verbs whose lemma occurs nowhere else in the Qurʾān', NULL, NULL, NULL, 3),
('layer_section', 'sarf.topRoots',             'Most frequent roots',           'أَكْثَرُ الجُذُور',     NULL, NULL, NULL, NULL, 4),
('layer_section', 'sarf.characteristicRoots',  'Characteristic roots',          'جُذُورٌ مُمَيِّزَة',     'Roots this surah uses far more often than the Qurʾān as a whole (ratio = its rate here ÷ its rate overall)', NULL, NULL, NULL, 5),
('layer_section', 'sarf.notes',                'Ṣarf notes (al-Jadwal)',        'فَوَائِدُ صَرْفِيَّة',   'al-Jadwal''s notes on a word''s pattern (wazn) and formation, in its own words', NULL, NULL, NULL, 6),
('layer_section', 'nahw.roles',                'Roles in the sentence',         'المَوَاقِعُ الإِعْرَابِيَّة', 'Each word''s role as the iʿrāb books parse it (the role most of them give first)', NULL, NULL, NULL, 0),
('layer_section', 'nahw.disputed',             'Where the books part ways',     'مَوَاضِعُ الخِلَاف',    'Words the iʿrāb books parse differently, each book in its own words', NULL, NULL, NULL, 1),
('layer_section', 'nahw.particles',            'Particles by function',         'حُرُوفُ المَعَانِي',    'Negation, condition, restriction, emphasis … as the corpus tags them', NULL, NULL, NULL, 2),
('layer_section', 'nahw.constructions',        'Constructions',                 'التَّرَاكِيب',          'Clauses as the iʿrāb books tag them: apodoses of condition and oath, relative clauses, clauses with and without a case position', NULL, NULL, NULL, 3),
('layer_section', 'nahw.sentences',            'Sentence types',                'أَنْوَاعُ الجُمَل',     'Where the sentence structure has been built', NULL, NULL, NULL, 4),
('layer_section', 'nahw.fawaid',               'Grammatical notes (fawāʾid)',   'فَوَائِد',             'Darwīsh''s and al-Jadwal''s notes on the āyāt, in their own words', NULL, NULL, NULL, 5),
('layer_section', 'balagha.devices',           'Devices in this surah',         'الأَسَالِيبُ البَلَاغِيَّة', 'Each device the iʿrāb books and the sentence-structure study name, with its āyāt', NULL, NULL, NULL, 0),
('layer_section', 'balagha.items',             'The books on each device',      'نُصُوصُ الكُتُب',       'Darwīsh''s and al-Jadwal''s balāgha sections, item by item, verbatim', NULL, NULL, NULL, 1),
('layer_section', 'balagha.tafsir',            'Named in the tafsīr',           'فِي التَّفْسِير',       'Where Ibn ʿĀshūr and al-Zamakhsharī name a device, with the passage in their words', NULL, NULL, NULL, 2),
('layer_section', 'themes.aims',               'Aims (aghrāḍ)',                 'أَغْرَاضُ السُّورَة',    'Ibn ʿĀshūr''s account of what the surah sets out to do', NULL, NULL, NULL, 0),
('layer_section', 'themes.place',              'Place of revelation',           'مَكَانُ النُّزُول',      'As Ibn ʿĀshūr reports it', NULL, NULL, NULL, 1),
('layer_section', 'themes.maududi',            'Introduction (Maududi)',        'مُقَدِّمَةُ المَوْدُودِي', 'Period of revelation, subject matter and theme, from Tafhīm al-Qurʾān', NULL, NULL, NULL, 2),
('layer_section', 'themes.turns',              'Where the discourse turns',     'مَوَاضِعُ الانْتِقَال',  'Ibn ʿĀshūr''s own word where a new movement begins (intiqāl, istiʾnāf ibtidāʾī, iftitāḥ …)', NULL, NULL, NULL, 3),
('layer_section', 'themes.tafsirThemes',       'Themes the tafsīr names',       'مَوْضُوعَاتُ التَّفْسِير', NULL, NULL, NULL, NULL, 4),
('layer_section', 'structure.passages',        'Passages',                      'المَقَاطِع',           'The study passages — curated, or cut where the books agree', NULL, NULL, NULL, 0),
('layer_section', 'structure.division',        'How each book divides it',      'تَقْسِيمُ الكُتُب',     'The āyāt each mufassir and iʿrāb book treats together', NULL, NULL, NULL, 1),
('layer_section', 'structure.groups',          'Naẓm groups',                   'المَجْمُوعَات',        'The group of surahs this one belongs to (Iṣlāḥī, the ʿUthmānī groupings …)', NULL, NULL, NULL, 2),
('layer_section', 'structure.units',           'Structural units',              'الوَحَدَات',           'Where a surah analysis has been authored', NULL, NULL, NULL, 3),

('passage_basis', 'derived',      'Cut from the books',        'مِنَ الكُتُب',   'Not curated: its boundaries are where the mufassirūn and the iʿrāb books group the āyāt alike', NULL, NULL, NULL, 0),
('passage_basis', 'consensus',    'The books agree here',      'اتِّفَاق',        'Most of the books that group āyāt start a new group at this āyah', NULL, NULL, NULL, 1),
('passage_basis', 'length_split', 'A long run divided',        'تَقْسِيمُ طَوِيل', 'The books agree only weakly here; the cut divides a long run at the next place at least two of them allow', NULL, NULL, NULL, 2),
('passage_basis', 'surah_start',  'The surah opens',           'مَطْلَعُ السُّورَة', NULL, NULL, NULL, NULL, 3),
('passage_basis', 'whole_surah',  'The surah whole',           'السُّورَةُ كَامِلَة', 'Short enough to study as one passage', NULL, NULL, NULL, 4),

('atlas_source', 'qac',     'Quranic Arabic Corpus',        'المُدَوَّنَةُ القُرْآنِيَّة',  'Word-by-word morphology (lemma, root, form, derivation)', NULL, NULL, NULL, 0),
('atlas_source', 'ss',      'K-Maps sentence structure',    'بِنْيَةُ الجُمْلَة',        'The authored sentence-structure study (where built)', NULL, NULL, NULL, 1),
('atlas_source', 'maududi', 'Maududi, Tafhīm al-Qurʾān',    'تَفْهِيمُ القُرْآن',        'Sayyid Abul Aʿlā Maududi''s introduction to the surah', NULL, NULL, NULL, 2);
