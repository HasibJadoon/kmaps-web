-- qr_160 — a class node's counts, kept per passage, so the path never opens a pool.
--
-- The class path (/qr/practice/class/path) shows, for every node, how many drills it holds and the
-- pills under it (each drill style, its total). Counting those meant parsing every step's whole pool
-- (qr_class_pool.items_json, hundreds of drills each), timing every recording of every listen work,
-- and drawing a full round, on each build: 6–8 s cold. Now each node's counts are written once, when
-- first needed, and the path reads them in one query.
--
--   node_key    a class_node key, or '@round' for the unit's full round
--   definition  what the counts were made from (the node's extra; a sentence step adds its sentence
--               ids): a changed node or new sentences count again, on the next read
--   drills      drills the node holds (a step), works recorded over the passage (a listen gate),
--               drills the round deals (@round)
--   styles_json [{key,total}] — the pills; titles come from class_style at read time
--   sentences_json  a step run per sentence: [{id,drills,styles}] for each sentence with drills
--
-- A redrawn pool (qr_class_pool written) deletes its step's row, so the counts follow the drills.
CREATE TABLE IF NOT EXISTS qr_class_node_stat (
  passage_id     TEXT NOT NULL,
  node_key       TEXT NOT NULL,
  definition     TEXT NOT NULL,
  drills         INTEGER NOT NULL DEFAULT 0,
  styles_json    TEXT NOT NULL DEFAULT '[]',
  sentences_json TEXT,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (passage_id, node_key)
);

-- A class step's lesson slides, kept per node and style (the drills' own subjects, grouped and worded): made once
-- from the kept pool, served as is; dropped with the pool's counts when the pool is drawn again. The commentaries'
-- reading session (made from the books) is made again after a day.
CREATE TABLE IF NOT EXISTS qr_class_lesson (
  passage_id TEXT NOT NULL,
  step_key   TEXT NOT NULL,
  node_key   TEXT NOT NULL,
  style      TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL,
  body_json  TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (passage_id, node_key, style)
);
CREATE INDEX IF NOT EXISTS idx_qr_class_lesson_step ON qr_class_lesson (passage_id, step_key);

-- Indexes the class's reads were scanning without (checked against the live database, 2026-10-16)
CREATE INDEX IF NOT EXISTS idx_qr_ss_tree_sentence ON qr_ss_tree (sentence_id);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_sentence_span ON qr_tafsir_sentence (surah, status, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qr_surah_tafsir_reading_span ON qr_surah_tafsir_reading (surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qr_scholar_passage_reading_surah ON qr_scholar_passage_reading (surah, status);
