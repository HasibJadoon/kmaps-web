-- 0137: a lemma's plural is a LEMMA fact (كِتَاب → كُتُب), the same in every verse. AL had only the
-- lexicons' raw plural facts (ar_ling_lexicon_fact fact_kind='plural', per book, tied to no lemma or
-- verse). ar_ling_root_lemma_jam is the lemma-level layer: one row per singular lemma × plural, its
-- kind (GT), pattern (wazn), the Qurʾān verse that uses it, and the lexicon facts + Lane that state it.
-- Registered with the lemma pattern table (0132) under 200-LEM.

INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, name_ur, short_ar, short_en, short_ur,
  badge_color, version, status, discipline, is_default_when_absent, uid, name_bare, band_key, badge_color_dark, badge_color_light)
SELECT 'GT:noun_process:jam_mudhakkar_salim', category_key, 'jam_mudhakkar_salim', NULL, term_order + 1, 'جمع المذكر السالم', 'sound masculine plural', 'جمع مذکر سالم',
  'جمع مذكر سالم', 'sound m. pl.', 'جمع مذکر سالم', badge_color, 1, 'live', discipline, 0, 'e77a48793e2a508dba88e0f825', 'جمع المذكر السالم', band_key, badge_color_dark, badge_color_light
FROM ar_ling_gram_term WHERE id = 'GT:noun_process:jam_taksir';
INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, name_ur, short_ar, short_en, short_ur,
  badge_color, version, status, discipline, is_default_when_absent, uid, name_bare, band_key, badge_color_dark, badge_color_light)
SELECT 'GT:noun_process:jam_muannath_salim', category_key, 'jam_muannath_salim', NULL, term_order + 2, 'جمع المؤنث السالم', 'sound feminine plural', 'جمع مؤنث سالم',
  'جمع مؤنث سالم', 'sound f. pl.', 'جمع مؤنث سالم', badge_color, 1, 'live', discipline, 0, 'e4b0090561cb1be5c9e6af481a', 'جمع المؤنث السالم', band_key, badge_color_dark, badge_color_light
FROM ar_ling_gram_term WHERE id = 'GT:noun_process:jam_taksir';

CREATE TABLE IF NOT EXISTS ar_ling_root_lemma_jam (
  id              TEXT PRIMARY KEY,                      -- JAM:<singular lemma id>:<plural bare>
  lemma_id        TEXT NOT NULL REFERENCES ar_ling_root_lemma(id),   -- the singular
  plural_ar       TEXT NOT NULL,
  plural_bare     TEXT NOT NULL,
  kind_ref        TEXT NOT NULL REFERENCES ar_ling_gram_term(id),    -- جمع التكسير / المذكر السالم / المؤنث السالم
  wazn_id         TEXT REFERENCES ar_ling_sarf_wazn(id),             -- broken plurals: فُعُل، أَفْعِلَة …
  plural_lemma_id TEXT REFERENCES ar_ling_root_lemma(id),            -- when QAC files the plural as its own lemma
  in_quran        INTEGER NOT NULL DEFAULT 0,
  surah           INTEGER, ayah INTEGER, word_index INTEGER,
  needle          TEXT,                                  -- bare words the muṣḥaf quote is cut by
  lexicon_fact_ids_json TEXT,                            -- ar_ling_lexicon_fact ids (fact_kind='plural') that state it
  lane_ref        TEXT,                                  -- lane_lexicon block_id + page
  lane_quote_en   TEXT,
  note_en         TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, plural_bare)
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_root_lemma_jam_lemma ON ar_ling_root_lemma_jam(lemma_id);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_ling_root_lemma_jam_i AFTER INSERT ON ar_ling_root_lemma_jam BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_ling_root_lemma_jam_u AFTER UPDATE ON ar_ling_root_lemma_jam BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_ling_root_lemma_jam_d AFTER DELETE ON ar_ling_root_lemma_jam BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

UPDATE ar_ling_reg_sub_layer SET tables_json = '["ar_ling_root_lemma","ar_ling_root_lemma_wazn","ar_ling_root_lemma_jam"]' WHERE sub_code = '200-LEM';
INSERT OR IGNORE INTO ar_ling_reg_table_map (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline, provenance_role, sensor_class, scope_types_json, root_bind, root_bind_col, root_bind_note)
VALUES ('km_arabic_linguistic', 'ar_ling_root_lemma_wazn', 'morph', '200', 'carrier', '200-LEM', 'P', 'AL:200-LEM:SF:00-CORE:P', 'SF', 'canonical', 'measured', '[]', 'via', 'lemma_id', 'lemma fact: pattern, derivation, مشتق/جامد, لازم/متعدٍّ (0132–0135)'),
       ('km_arabic_linguistic', 'ar_ling_root_lemma_jam',  'morph', '200', 'carrier', '200-LEM', 'P', 'AL:200-LEM:SF:00-CORE:P', 'SF', 'canonical', 'measured', '[]', 'via', 'lemma_id', 'lemma fact: plural, its kind, pattern, Qurʾān verse, lexicon + Lane backing (0137)');
