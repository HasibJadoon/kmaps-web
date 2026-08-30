ALTER TABLE ar_ling_source_chunks ADD COLUMN surah_no   INTEGER;
ALTER TABLE ar_ling_source_chunks ADD COLUMN ayah_start INTEGER;
ALTER TABLE ar_ling_source_chunks ADD COLUMN ayah_end   INTEGER;

CREATE INDEX IF NOT EXISTS idx_arl_sc_surah
  ON ar_ling_source_chunks(surah_no, ayah_start);

CREATE TABLE IF NOT EXISTS ar_ling_vector_records (
  id                  TEXT PRIMARY KEY,

  target_db           TEXT NOT NULL,

  target_table        TEXT NOT NULL,

  target_id           TEXT NOT NULL,

  qdrant_id           TEXT NOT NULL,

  qdrant_collection   TEXT NOT NULL DEFAULT 'km_source_chunks_v1',
  model_name          TEXT NOT NULL,
  embedding_profile   TEXT,
  surah_no            INTEGER,
  ayah_start          INTEGER,
  ayah_end            INTEGER,
  work_id             TEXT,

  scholar_id          TEXT,

  chunk_kind          TEXT,

  source_slug         TEXT,

  text_hash           TEXT,
  embedded_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alvr_qdrant
  ON ar_ling_vector_records(qdrant_id);

CREATE INDEX IF NOT EXISTS idx_alvr_target
  ON ar_ling_vector_records(target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_alvr_surah
  ON ar_ling_vector_records(surah_no, ayah_start);

CREATE INDEX IF NOT EXISTS idx_alvr_work
  ON ar_ling_vector_records(work_id);
