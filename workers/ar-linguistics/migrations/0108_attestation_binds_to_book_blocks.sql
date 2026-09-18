-- km_arabic_linguistic · 024 · a synthesis claim names the block it rests on
--
-- ar_ling_sense_attestation could already say WHICH BOOK supports a sense or an
-- arc step — source_slug, quote_ar, locator, shamela_ref. What it could not say
-- is WHERE: there was no stable id to name. Every passage now has one
-- (ar_ling_lexicon_block.id), so the citation can be exact.
--
-- Two rules travel with these columns, and they are the point of the layer:
--
--   1. Book's own blocks only. block_id must reference a block with
--      origin = 'book_native'. A derived header block is this pipeline's
--      restatement of a book; a synthesis resting on it would rest on itself.
--      SQLite cannot express that across tables, so the builder and the route
--      enforce it — see the guard query at the bottom.
--
--   2. Family level. A book stores its whole ṣarf family as one block, so the
--      block id alone lands on the family and not on the form inside it.
--      form_id names that form (sih_ktb_f8, jam_ktb_f1), which is the grain the
--      claims are actually made at.

ALTER TABLE ar_ling_sense_attestation ADD COLUMN block_id TEXT
  REFERENCES "ar_ling_lexicon_block"(id);

ALTER TABLE ar_ling_sense_attestation ADD COLUMN form_id TEXT;

-- "which claims rest on this passage" — the backlink, from the other side
CREATE INDEX IF NOT EXISTS ix_sense_attest_block
  ON ar_ling_sense_attestation(block_id, target_type)
  WHERE block_id IS NOT NULL;

-- "what attests this sense / this arc step"
CREATE INDEX IF NOT EXISTS ix_sense_attest_target
  ON ar_ling_sense_attestation(target_type, target_id, status);

-- "which forms of which books carry this claim"
CREATE INDEX IF NOT EXISTS ix_sense_attest_form
  ON ar_ling_sense_attestation(source_slug, form_id)
  WHERE form_id IS NOT NULL;

-- Guard, to run after any attestation load. It must return no rows: an
-- attestation pointing at a derived block is a synthesis citing itself.
--
--   SELECT a.id, a.block_id, b.block_type
--     FROM ar_ling_sense_attestation a
--     JOIN ar_ling_lexicon_block b ON b.id = a.block_id
--    WHERE b.origin = 'derived';
