ALTER TABLE ar_ling_sources ADD COLUMN slug              TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN origin            TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN bilingual         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_ling_sources ADD COLUMN footnote_source   TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN quran_block_shape TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN source_order      INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_ling_sources_slug
  ON ar_ling_sources(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_ling_sources_origin
  ON ar_ling_sources(origin);

CREATE INDEX IF NOT EXISTS idx_ar_ling_sources_source_order
  ON ar_ling_sources(source_order) WHERE source_order IS NOT NULL;
