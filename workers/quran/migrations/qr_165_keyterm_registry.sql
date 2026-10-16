-- qr_165 — the Qurʾān's key terms as a registry, and where each passage meets them (owner, 2026-10-16).
-- One row per term (Sinai's Key Terms entry), its global concept where one is named (CORE core_concept, gc_concept here),
-- and each passage's terms extracted from the word anchors. A term's drills (its meaning, its story) carry the term's
-- own ids, so every passage that meets it deals the same drills and review files each once.
CREATE TABLE IF NOT EXISTS qr_keyterm (
  id        TEXT PRIMARY KEY,     -- KT:<sinai entry>
  grp       TEXT NOT NULL UNIQUE, -- qr_drill_anchor.grp
  head_ar   TEXT,
  translit  TEXT,
  gloss_en  TEXT,
  gc_ref    TEXT,                 -- GC:… the concept it names
  source    TEXT NOT NULL DEFAULT 'sinai_key_terms',
  status    TEXT NOT NULL DEFAULT 'live'
);
CREATE TABLE IF NOT EXISTS qr_passage_keyterm (
  passage_id TEXT NOT NULL,
  keyterm_id TEXT NOT NULL,
  ayah       INTEGER NOT NULL,
  word_index INTEGER NOT NULL,
  PRIMARY KEY (passage_id, keyterm_id, ayah, word_index)
);
CREATE INDEX IF NOT EXISTS idx_qr_passage_keyterm_term ON qr_passage_keyterm (keyterm_id);

-- every entry, named by its key-term row (its head, transliteration and gloss), else by its citing note's
INSERT OR REPLACE INTO qr_keyterm (id, grp, head_ar, translit, gloss_en, gc_ref, source)
SELECT 'KT:' || a.grp, a.grp,
       COALESCE(MAX(CASE WHEN a.source = 'sinai_key_terms' THEN a.head_ar END), MAX(a.head_ar)),
       COALESCE(MAX(CASE WHEN a.source = 'sinai_key_terms' THEN a.note END), MAX(a.note)),
       MAX(CASE WHEN a.source = 'sinai_key_terms' AND a.label_en NOT LIKE '%~%' AND length(a.label_en) >= 3 THEN a.label_en END),
       (SELECT s.gc_ref FROM qr_keyterm_story s WHERE s.term_grp = a.grp LIMIT 1),
       CASE WHEN SUM(a.source = 'sinai_key_terms') > 0 THEN 'sinai_key_terms' ELSE 'sinai_cite' END
  FROM qr_drill_anchor a
 WHERE a.family = 'keyterm' AND a.source IN ('sinai_key_terms', 'sinai_cite')
 GROUP BY a.grp;

-- each live passage's terms, word by word
INSERT OR IGNORE INTO qr_passage_keyterm (passage_id, keyterm_id, ayah, word_index)
SELECT p.id, 'KT:' || a.grp, a.ayah, a.word_index
  FROM qr_drill_anchor a
  JOIN qr_surah_study_passage p ON p.surah = a.surah AND a.ayah BETWEEN p.ayah_from AND p.ayah_to AND p.status = 'live'
 WHERE a.family = 'keyterm' AND a.source IN ('sinai_key_terms', 'sinai_cite') AND a.word_index IS NOT NULL;

-- Read & listen drawn again (its key terms now carry their stories and only their own notes): a new definition
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.rev', 2) WHERE scope = 'class_node' AND key = 'read';
