-- qr_047_irab_drill.sql
--
-- The words of the Qurʾān whose iʿrāb can be drilled: one row per word, its role as
-- an iʿrāb book states it first ("مفعول به …", "نائب فاعل", "بدل من ربك"), placed on
-- the word it parses. Built by kmaps-resources scripts/quran/irab_drills.py from
-- qr_irab_book_entry (al-Daʿʿās parses word by word; an entry is filed under the first
-- āyah of its group, so it is placed by walking the group's words in order).
--
-- The role is read from the book's own words, not from qr_irab_book_entry's
-- grammar_concept_ref: that tag was matched anywhere in the text, so a verb whose
-- parse mentions «فاعله» was tagged فاعل. A word only enters when its parse opens
-- with a role and names that one word.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
CREATE TABLE IF NOT EXISTS qr_irab_drill_item (
  id          TEXT PRIMARY KEY,     -- <source_slug>:<surah>:<ayah>:<word_index>
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_word_occurrence.word_index (1-based)
  word_text   TEXT NOT NULL,        -- the word as the muṣḥaf has it
  role_gt     TEXT NOT NULL,        -- GT:irab_role:*
  irab_ar     TEXT NOT NULL,        -- the book's parse of the word, verbatim
  source_slug TEXT NOT NULL,
  entry_id    TEXT NOT NULL         -- qr_irab_book_entry.id
);
CREATE INDEX IF NOT EXISTS idx_qr_irab_drill_ayah ON qr_irab_drill_item(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qr_irab_drill_role ON qr_irab_drill_item(role_gt);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_irab_drill_item_i AFTER INSERT ON qr_irab_drill_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_irab_drill_item_d AFTER DELETE ON qr_irab_drill_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

-- the drill skills and kinds, as data
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('skill', 'irab', 'Iʿrāb', 'الإِعْرَاب', 'Hear the āyah — what is the role of the marked word?', 'point.3.connected.trianglepath.dotted', '#81B29A', '{"source":"irab"}', 0),
('kind', 'irab', 'Listen — what is the iʿrāb of the marked word?', 'اِسْتَمِعْ — مَا إِعْرَابُ الكَلِمَةِ المُعَلَّمَة؟', NULL, NULL, NULL, NULL, 0),
('prompt', 'irab', 'What is its role in the sentence?', 'مَا مَوْقِعُهَا مِنَ الإِعْرَاب؟', NULL, NULL, NULL, NULL, 0),
('path', 'srs_deck', 'Qurʾān — practice', 'القُرْآن — تَمَارِين', 'Drills from the Qurʾān, spaced', NULL, NULL, NULL, 0);
