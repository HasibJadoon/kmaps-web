ALTER TABLE qr_morph_display_roots ADD COLUMN al_root_ref TEXT;
ALTER TABLE qr_morph_display_roots ADD COLUMN content_source TEXT NOT NULL DEFAULT 'al_projection';

ALTER TABLE qr_morph_display_roots ADD COLUMN content_synced_at TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_mdr_al_ref ON qr_morph_display_roots(al_root_ref);
