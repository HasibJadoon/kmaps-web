-- qr_192 — the owner's progress on each core tafsīr-language item, filled automatically by every logged practice sentence
-- (owner 2026-11-25: "that auto fills when practising"). A core item met in a sentence and translated right = hit; one the
-- correction flags = miss. status: learning → known (≥3 hits, hits > 2×misses) · weak (missed and not yet won back).
CREATE TABLE IF NOT EXISTS qr_tafsir_lang_core_progress (
  user_ref      TEXT NOT NULL,
  core_id       TEXT NOT NULL,                      -- qr_tafsir_lang_core.id
  seen_n        INTEGER NOT NULL DEFAULT 0,
  hit_n         INTEGER NOT NULL DEFAULT 0,
  miss_n        INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','weak','known')),
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT,
  last_attempt  TEXT,                               -- qr_tafsir_practice_attempt.id
  PRIMARY KEY (user_ref, core_id)
);
