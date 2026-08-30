ALTER TABLE ar_ling_source_display_blocks
  RENAME TO ar_ling_source_lexicon_display_blocks;

CREATE TABLE IF NOT EXISTS ar_ling_source_iraab_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  iraab_entry_id    TEXT,

  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,

  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,

  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_idb_source
  ON ar_ling_source_iraab_display_blocks(source_id);

CREATE INDEX IF NOT EXISTS idx_arl_idb_chunk
  ON ar_ling_source_iraab_display_blocks(source_chunk_id, block_seq);

CREATE INDEX IF NOT EXISTS idx_arl_idb_entry
  ON ar_ling_source_iraab_display_blocks(iraab_entry_id);

CREATE INDEX IF NOT EXISTS idx_arl_idb_type
  ON ar_ling_source_iraab_display_blocks(block_type);

CREATE TABLE IF NOT EXISTS ar_ling_source_tafsir_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  tafsir_entry_id   TEXT,

  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,

  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,

  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_tdb_source
  ON ar_ling_source_tafsir_display_blocks(source_id);

CREATE INDEX IF NOT EXISTS idx_arl_tdb_chunk
  ON ar_ling_source_tafsir_display_blocks(source_chunk_id, block_seq);

CREATE INDEX IF NOT EXISTS idx_arl_tdb_entry
  ON ar_ling_source_tafsir_display_blocks(tafsir_entry_id);

CREATE INDEX IF NOT EXISTS idx_arl_tdb_type
  ON ar_ling_source_tafsir_display_blocks(block_type);
