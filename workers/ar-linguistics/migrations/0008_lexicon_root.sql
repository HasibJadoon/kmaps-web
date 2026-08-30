ALTER TABLE ar_ling_source_chunks ADD COLUMN root_id     TEXT;
ALTER TABLE ar_ling_source_chunks ADD COLUMN source_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_arl_sc_heading
  ON ar_ling_source_chunks(heading_norm);

CREATE INDEX IF NOT EXISTS idx_arl_sc_slug
  ON ar_ling_source_chunks(source_slug);

CREATE INDEX IF NOT EXISTS idx_arl_sc_root_id
  ON ar_ling_source_chunks(root_id);

CREATE INDEX IF NOT EXISTS idx_arl_sc_root_source
  ON ar_ling_source_chunks(heading_norm, source_slug);
