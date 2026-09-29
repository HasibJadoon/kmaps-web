-- qr_046_atlas.sql
--
-- The Qurʾān as an atlas, the way the Arabic side is laid out: rooms, then surahs
-- grouped as series, then passages as units, each passage opening onto its layers,
-- and every layer drilled and carried into review. Nothing here is new content:
-- the labels say what the existing study data is, and the recitation gives every
-- āyah and word its sound.
--
-- NOTE: km_quran's migration ledger lists several files as unapplied that are live
-- (applied by hand). Do not run `wrangler d1 migrations apply` on km_quran; apply a
-- file with `d1 execute --file` and record it in d1_migrations.

-- Every label the Qurʾān atlas shows, as data — neither the worker's code nor the app
-- holds this text. Scopes:
--   room   the atlas home's rooms
--   layer  what a passage can be studied through (extra: {step} = the study step that serves it)
--   step   a passage unit's path: listen → read → study → drill → check → review
--   skill  the drills (extra: {source})
--   kind   each drill kind's instruction
--   group  how the Surahs room groups the surahs (extra: {source_slug})
CREATE TABLE IF NOT EXISTS qr_study_label (
  scope      TEXT NOT NULL,
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  label_ar   TEXT,
  detail     TEXT,
  icon       TEXT,
  color      TEXT,
  min_value  INTEGER,
  extra_json TEXT,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_study_label_i AFTER INSERT ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_study_label_u AFTER UPDATE ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_study_label_d AFTER DELETE ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, extra_json, sort) VALUES
-- rooms
('room', 'surahs',   'Surahs',               'السُّوَر',              'Surah by surah, passage by passage — every layer, drilled and kept', 'book.pages', '#D8B657', NULL, 0),
('room', 'words',    'Words & Roots',        'الكَلِمَات وَالجُذُور',  'Each word in its āyah: its lemma, its root, the family it belongs to', 'character.book.closed', '#5DA9E9', NULL, 1),
('room', 'lexicon',  'Lexicons & Idioms',    'المَعَاجِم وَالتَّعَابِير', 'Lane, Tāj al-ʿArūs, Lisān al-ʿArab, verbal idioms and key terms', 'books.vertical', '#B388EB', NULL, 2),
('room', 'grammar',  'Grammar Book',         'كِتَابُ النَّحْو',       'Ṣarf, naḥw and balāgha, taught from the Qurʾān''s own lines', 'text.book.closed', '#4FB3A9', NULL, 3),
('room', 'tafsir',   'Tafsīr',               'التَّفْسِير',           'Eight commentaries, āyah by āyah, read and heard', 'text.quote', '#E07A5F', NULL, 4),
('room', 'concepts', 'Concepts',             'المَفَاهِيم',           'Taqwā, iḥsān, īmān … what the Qurʾān means by them, where it says so', 'sparkles', '#81B29A', NULL, 5),
-- layers of a passage (extra.step: the existing study step that serves it)
('layer', 'reading',     'Reading',            'القِرَاءَة',     'The passage, heard and read, with its translation', 'book', '#D8B657', '{"step":"reading"}', 0),
('layer', 'translation', 'Fluent translation', 'التَّرْجَمَة',   'From word-for-word to fluent English, and why each choice', 'text.alignleft', '#F2CC8F', '{"step":"passage_structure"}', 1),
('layer', 'words',       'Words & roots',      'المُفْرَدَات',   'Every word: lemma, root, pattern, meaning here', 'character.book.closed', '#5DA9E9', '{"step":"morphology"}', 2),
('layer', 'sarf',        'Ṣarf',               'الصَّرْف',       'Forms, patterns and derivations', 'square.grid.3x3', '#4FB3A9', '{"step":"morphology"}', 3),
('layer', 'nahw',        'Naḥw & iʿrāb',       'النَّحْو وَالإِعْرَاب', 'Each word''s role, as the iʿrāb books parse it', 'point.3.connected.trianglepath.dotted', '#81B29A', '{"step":"sentence_structure"}', 4),
('layer', 'balagha',     'Balāgha',            'البَلَاغَة',     'The rhetoric: what each device does here', 'wand.and.stars', '#B388EB', '{"step":"sentence_structure"}', 5),
('layer', 'idioms',      'Verbal idioms',      'التَّعَابِير',   'Verb and particle — the sense they make together', 'link', '#F28482', '{"step":"expressions"}', 6),
('layer', 'lexicon',     'Lexicons',           'المَعَاجِم',     'Lane, Tāj, Lisān and the key terms, on this passage''s words', 'books.vertical', '#9C89B8', NULL, 7),
('layer', 'structure',   'Structure',          'النَّظْم',       'How the passage is built, and how it sits in the surah', 'rectangle.split.3x1', '#E9C46A', '{"step":"passage_structure"}', 8),
('layer', 'tafsir',      'Tafsīr',             'التَّفْسِير',    'What the mufassirūn say', 'text.quote', '#E07A5F', '{"step":"scholarship"}', 9),
('layer', 'context',     'Context',            'السِّيَاق',      'When and why — only where the sources say', 'clock', '#6C757D', NULL, 10),
-- a passage unit's path
('step', 'listen', 'Listen', 'اِسْتَمِعْ', 'Hear the passage recited, word by word', 'headphones', '#5DA9E9', NULL, 0),
('step', 'read',   'Read',   'اِقْرَأْ',   'Read it with the translation', 'book', '#D8B657', NULL, 1),
('step', 'study',  'Study',  'تَدَبَّرْ',  'Go through its layers', 'square.stack.3d.up', '#81B29A', NULL, 2),
('step', 'drill',  'Drill',  'تَمَرَّنْ',  'Drills on its words, grammar and meaning', 'target', '#E07A5F', NULL, 3),
('step', 'check',  'Check',  'اِخْتَبِرْ', 'A short check to finish the passage', 'checkmark.seal', '#4FB3A9', NULL, 4),
('step', 'review', 'Review', 'رَاجِعْ',    'What you drilled comes back to you, spaced', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, 5),
-- how the Surahs room groups the surahs
('group', 'islahi', 'Iṣlāḥī''s seven groups', 'مَجْمُوعَاتُ الإِصْلَاحِي', 'Tadabbur-i Qurʾān: seven groups, each a Makkan run closed by Madinan surahs', 'square.stack', '#D8B657', '{"source_slug":"islahi_tadabbur"}', 0);

-- The recitation: each surah's recording and, for every āyah, where it starts and
-- ends and where each of its words is (from Quran.com's segmented recitations —
-- the same data QUL, the Quranic Universal Library, publishes). The audio itself
-- is streamed from its CDN; a drill plays an āyah or a single word by its times.
CREATE TABLE IF NOT EXISTS qr_recitation (
  reciter_id  INTEGER NOT NULL,     -- Quran.com chapter-reciter id (7 = Mishary Rashid al-ʿAfāsī, murattal)
  reciter     TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  audio_url   TEXT NOT NULL,
  file_size   INTEGER,
  PRIMARY KEY (reciter_id, surah)
);
CREATE TABLE IF NOT EXISTS qr_recitation_ayah (
  reciter_id    INTEGER NOT NULL,
  surah         INTEGER NOT NULL,
  ayah          INTEGER NOT NULL,
  start_ms      INTEGER NOT NULL,
  end_ms        INTEGER NOT NULL,
  segments_json TEXT,               -- [[word_position, start_ms, end_ms], …] on the surah recording's clock
  PRIMARY KEY (reciter_id, surah, ayah)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_recitation_i AFTER INSERT ON qr_recitation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_recitation_u AFTER UPDATE ON qr_recitation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_recitation_ayah_i AFTER INSERT ON qr_recitation_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_recitation_ayah_u AFTER UPDATE ON qr_recitation_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
