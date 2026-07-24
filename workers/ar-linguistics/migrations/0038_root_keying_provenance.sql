-- 0038 — Normalize root keying + provenance parity (AL domain, layer 100).
-- Closes the last two Root-layer gaps from the audit:
--   (5) STRINGLY-TYPED JOINS — antonyms / sense_axes / development_stages keyed
--       only on root_norm TEXT. Add a root_id FK column (parity with syn_root,
--       root_vocab, root_dna) and backfill from ar_ling_roots.root_text
--       (verified 17/17, 6/6, 4/4 exact matches — no orphans).
--   (6) UNEVEN PROVENANCE — those same interpretive tables carried only a
--       status flag. Add confidence + generated_by so AI/scholar-synthesized
--       rows are trust-distinguishable, matching root_dna / root_senses.
-- All ALTERs are additive. SQLite can't add a FK via ALTER, so the FK intent is
-- documented here and enforced by the writer; the column + index make joins on
-- root_id first-class.

-- ── ar_ling_root_antonyms ───────────────────────────────────────────────────
ALTER TABLE ar_ling_root_antonyms        ADD COLUMN root_id      TEXT;   -- → ar_ling_roots.id
ALTER TABLE ar_ling_root_antonyms        ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_antonyms        ADD COLUMN generated_by TEXT;

-- ── ar_ling_root_sense_axes ─────────────────────────────────────────────────
ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN root_id      TEXT;   -- → ar_ling_roots.id
ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_sense_axes      ADD COLUMN generated_by TEXT;

-- ── ar_ling_root_development_stages ─────────────────────────────────────────
ALTER TABLE ar_ling_root_development_stages ADD COLUMN root_id      TEXT; -- → ar_ling_roots.id
ALTER TABLE ar_ling_root_development_stages ADD COLUMN confidence   REAL DEFAULT 0.8;
ALTER TABLE ar_ling_root_development_stages ADD COLUMN generated_by TEXT;

-- ── Backfill root_id from the canonical root identity ───────────────────────
UPDATE ar_ling_root_antonyms
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_antonyms.root_norm)
 WHERE root_id IS NULL;
UPDATE ar_ling_root_sense_axes
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_sense_axes.root_norm)
 WHERE root_id IS NULL;
UPDATE ar_ling_root_development_stages
   SET root_id = (SELECT id FROM ar_ling_roots r WHERE r.root_text = ar_ling_root_development_stages.root_norm)
 WHERE root_id IS NULL;
-- also repair the one root_dna row with a null root_id (try text then normalized)
UPDATE ar_ling_root_dna
   SET root_id = (SELECT id FROM ar_ling_roots r
                   WHERE r.root_text = ar_ling_root_dna.root_norm
                      OR r.root_normalized = ar_ling_root_dna.root_norm)
 WHERE root_id IS NULL;

-- ── Indexes on the new FK column ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_root_antonyms_rid   ON ar_ling_root_antonyms(root_id);
CREATE INDEX IF NOT EXISTS idx_ar_root_sense_axes_rid ON ar_ling_root_sense_axes(root_id);
CREATE INDEX IF NOT EXISTS idx_ar_root_devstages_rid  ON ar_ling_root_development_stages(root_id);
