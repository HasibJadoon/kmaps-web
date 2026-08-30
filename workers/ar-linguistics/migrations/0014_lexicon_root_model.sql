CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entries (
  id                  TEXT PRIMARY KEY,

  source_id           TEXT NOT NULL,
  source_slug         TEXT NOT NULL,

  root_id             TEXT,
  root_text           TEXT NOT NULL,
  root_norm           TEXT NOT NULL,

  entry_text_ar       TEXT,
  entry_text_en       TEXT,
  raw_text            TEXT NOT NULL,

  source_chunk_id     TEXT,

  page_start          INTEGER,
  page_end            INTEGER,
  volume_no           INTEGER,

  source_url          TEXT,
  source_path         TEXT,

  source_native_id    TEXT,
  source_native_key   TEXT,

  parser_version      TEXT,
  raw_hash            TEXT,
  import_batch_id     TEXT,

  status              TEXT NOT NULL DEFAULT 'raw',

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (root_id)          REFERENCES ar_ling_roots(id),
  FOREIGN KEY (source_id)        REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),

  UNIQUE(source_slug, root_norm)
);

CREATE INDEX IF NOT EXISTS idx_alre_root_norm
  ON ar_ling_lexicon_root_entries(root_norm);

CREATE INDEX IF NOT EXISTS idx_alre_source_slug
  ON ar_ling_lexicon_root_entries(source_slug);

CREATE INDEX IF NOT EXISTS idx_alre_source_root
  ON ar_ling_lexicon_root_entries(source_slug, root_norm);

CREATE INDEX IF NOT EXISTS idx_alre_status
  ON ar_ling_lexicon_root_entries(status);

CREATE INDEX IF NOT EXISTS idx_alre_import_batch
  ON ar_ling_lexicon_root_entries(import_batch_id);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections (
  id                        TEXT PRIMARY KEY,

  root_entry_id             TEXT NOT NULL,

  source_slug               TEXT NOT NULL,
  root_text                 TEXT NOT NULL,
  root_norm                 TEXT NOT NULL,

  section_seq               INTEGER NOT NULL,

  heading_ar                TEXT,
  heading_norm              TEXT,
  heading_bare              TEXT,

  section_type              TEXT NOT NULL DEFAULT 'definition',

  text_ar                   TEXT,
  text_en                   TEXT,

  raw_xml                   TEXT,
  perseus_xml               TEXT,

  page_no                   INTEGER,
  volume_no                 INTEGER,

  source_native_section_id  TEXT,

  lane_node_id              TEXT,
  lane_node_num             INTEGER,
  lane_itype                TEXT,

  has_gaps                  INTEGER NOT NULL DEFAULT 0,

  parser_notes_json         TEXT CHECK (
    parser_notes_json IS NULL OR json_valid(parser_notes_json)
  ),

  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT,

  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id),

  UNIQUE(root_entry_id, section_seq)
);

CREATE INDEX IF NOT EXISTS idx_ales_root_entry
  ON ar_ling_lexicon_entry_sections(root_entry_id);

CREATE INDEX IF NOT EXISTS idx_ales_root_norm
  ON ar_ling_lexicon_entry_sections(root_norm);

CREATE INDEX IF NOT EXISTS idx_ales_source_root
  ON ar_ling_lexicon_entry_sections(source_slug, root_norm);

CREATE INDEX IF NOT EXISTS idx_ales_heading_norm
  ON ar_ling_lexicon_entry_sections(heading_norm);

CREATE INDEX IF NOT EXISTS idx_ales_page
  ON ar_ling_lexicon_entry_sections(page_no);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entry_sources (
  id                TEXT PRIMARY KEY,

  root_entry_id     TEXT NOT NULL,

  source_kind       TEXT NOT NULL,
  source_slug       TEXT NOT NULL,

  source_native_id  TEXT,
  source_url        TEXT,
  source_path       TEXT,

  checksum          TEXT,
  note_md           TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_alres_root_entry
  ON ar_ling_lexicon_root_entry_sources(root_entry_id);

CREATE INDEX IF NOT EXISTS idx_alres_kind
  ON ar_ling_lexicon_root_entry_sources(source_kind);

CREATE INDEX IF NOT EXISTS idx_alres_slug
  ON ar_ling_lexicon_root_entry_sources(source_slug);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_root_entries_fts USING fts5(
  root_text,
  root_norm,
  source_slug,
  entry_text_ar,
  entry_text_en,
  raw_text,
  content='ar_ling_lexicon_root_entries',
  content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections_fts USING fts5(
  root_text,
  root_norm,
  heading_ar,
  heading_norm,
  heading_bare,
  section_type,
  text_ar,
  text_en,
  content='ar_ling_lexicon_entry_sections',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_ai
AFTER INSERT ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_ad
AFTER DELETE ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    ar_ling_lexicon_root_entries_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_au
AFTER UPDATE ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    ar_ling_lexicon_root_entries_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_ai
AFTER INSERT ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_ad
AFTER DELETE ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    ar_ling_lexicon_entry_sections_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_au
AFTER UPDATE ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    ar_ling_lexicon_entry_sections_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

DELETE FROM ar_ling_lane_quality_index
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lane_patch_log
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_source_lexicon_display_blocks
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_evidence
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_morphology
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_sense_relations
WHERE from_sense_id IN (
  SELECT id FROM ar_ling_senses
  WHERE lexicon_entry_id IN (
    SELECT id FROM ar_ling_lexicon_entries
    WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
  )
) OR to_sense_id IN (
  SELECT id FROM ar_ling_senses
  WHERE lexicon_entry_id IN (
    SELECT id FROM ar_ling_lexicon_entries
    WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
  )
);

DELETE FROM ar_ling_senses
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_token_lexicon_link
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_entries_fts
WHERE rowid IN (
  SELECT rowid FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_entries
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_lexicon_entry_sections
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_lexicon_root_entry_sources
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_lexicon_root_entries
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');
