-- What a scene has been read for: its hard words, each with its meaning in that
-- line and three wrong meanings to set beside it, and one question on the gist
-- of what happened. Written from the scene's own Arabic and English (the
-- script); the practice round (/ar/scenes/:unit/:no/practice) draws on it.
CREATE TABLE IF NOT EXISTS ar_scene_vocab (
  unit_id    TEXT NOT NULL,
  scene_no   INTEGER NOT NULL,
  vocab_json TEXT,          -- [{line, word, lemma, gloss, distractors:[3], note}]
  gist_json  TEXT,          -- {q, options:[4], answer}
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (unit_id, scene_no)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_scene_vocab_i AFTER INSERT ON ar_scene_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_scene_vocab_u AFTER UPDATE ON ar_scene_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
