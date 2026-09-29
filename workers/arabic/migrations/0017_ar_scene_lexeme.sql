-- Where a scene's line uses a verbal idiom, a verb with its particle, or a key term of
-- the Qurʾān — by typed reference into km_arabic_linguistic (AL:VI:<verb>|<particle>,
-- AL:TD:<id>, AL:SK:<entry id>) — and the contexts found for each in the rest of the
-- corpus: passages from the classical books and stories, and stretches of the
-- recordings. Built by kmaps-resources scripts/arabic-episodes/scene_lexemes.py.
CREATE TABLE IF NOT EXISTS ar_scene_lexeme (
  unit_id TEXT NOT NULL, scene_no INTEGER NOT NULL, line INTEGER NOT NULL,
  span_from INTEGER NOT NULL, span_to INTEGER NOT NULL, ref TEXT NOT NULL, kind TEXT NOT NULL,
  PRIMARY KEY (unit_id, scene_no, line, span_from, ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_scene_lexeme_ref ON ar_scene_lexeme(ref);
CREATE TABLE IF NOT EXISTS ar_lexeme_passage (
  ref TEXT NOT NULL, rank INTEGER NOT NULL, kind TEXT NOT NULL,      -- text | audio
  work_id TEXT, unit_id TEXT, title TEXT, level TEXT, text_ar TEXT NOT NULL,
  hit_from INTEGER, hit_to INTEGER,                                    -- the lexeme's words in text_ar
  object_key TEXT, start_sec REAL, end_sec REAL,                       -- audio: the stretch to play
  PRIMARY KEY (ref, rank)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_scene_lexeme_i AFTER INSERT ON ar_scene_lexeme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_lexeme_passage_i AFTER INSERT ON ar_lexeme_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, color, sort) VALUES
  ('bucket', 'verbal_idiom', 'Verbal idiom', 'تَعْبِيرٌ فِعْلِيّ', '#E76F51', 12),
  ('bucket', 'keyterm', 'Qurʾān key term', 'مُصْطَلَحٌ قُرْآنِيّ', '#2A9D8F', 13),
  ('kind', 'passages', 'Read it in context', 'اِقْرَأْهُ فِي سِيَاقِه', NULL, 20);
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
('context','meanings','Its range of meanings, in the Qurʾān','مَعَانِيهِ فِي القُرْآن',0),
('context','lane','Lane’s Lexicon','مُعْجَمُ لِين',1),
('context','sinai','Key Terms of the Qur’an','مُصْطَلَحَاتُ القُرْآن',2),
('context','passages','Read it in context — books and recordings','فِي سِيَاقِهِ مِنَ الكُتُبِ وَالتَّسْجِيلَات',3);
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, color, sort) VALUES ('bucket','near_synonym','Near-synonym','فُرُوق','#9B5DE5',14),('kind','nuance','Listen — which of these words was said?','اِسْمَعْ — أَيُّ هَذِهِ الأَلْفَاظِ قِيلَت؟',NULL,21),('context','synonyms','How the lexica tell them apart — Lisān, Tāj al-ʿArūs, Lane','الفُرُوقُ فِي لِسَانِ العَرَبِ وَتَاجِ العَرُوسِ وَلِين',NULL,4);
