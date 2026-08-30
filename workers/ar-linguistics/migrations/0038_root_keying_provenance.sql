ALTER TABLE ar_ling_root_antonyms        ADD COLUMN root_id      TEXT;
ALTER TABLE ar_ling_root_antonyms        ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_antonyms        ADD COLUMN generated_by TEXT;

ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN root_id      TEXT;
ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN generated_by TEXT;

ALTER TABLE ar_ling_root_development_stages ADD COLUMN root_id      TEXT;
ALTER TABLE ar_ling_root_development_stages ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_development_stages ADD COLUMN generated_by TEXT;

UPDATE ar_ling_root_antonyms
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_antonyms.root_norm)
 WHERE root_id IS NULL;
UPDATE ar_ling_root_sense_axes
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_sense_axes.root_norm)
 WHERE root_id IS NULL;
UPDATE ar_ling_root_development_stages
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_development_stages.root_norm)
 WHERE root_id IS NULL;

UPDATE ar_ling_root_dna
   SET root_id = (SELECT id FROM ar_ling_roots r
                   WHERE r.root_text = ar_ling_root_dna.root_norm
                      OR r.root_normalized = ar_ling_root_dna.root_norm)
 WHERE root_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ar_root_antonyms_rid   ON ar_ling_root_antonyms(root_id);
CREATE INDEX IF NOT EXISTS idx_ar_root_sense_axes_rid ON ar_ling_root_sense_axes(root_id);
CREATE INDEX IF NOT EXISTS idx_ar_root_devstages_rid  ON ar_ling_root_development_stages(root_id);
