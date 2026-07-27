-- 0067 - key the abw and awl sarf_family blocks to al-Raghib's own root_norm.
--
-- /al/lex/v2/entry/:source_slug/:root_norm and /al/lex/v2/roots/:root_norm both
-- select blocks by (source_slug, root_norm) string equality - there is no root
-- alias layer - so a block whose root_norm does not match its entry's root_norm
-- is unreachable from either route.
--
-- 0065 wrote these two with the canonical roots abw and awl. al-Raghib files the
-- words under the printed headings 'aba' (p.57) and inside the 'al' article
-- (pp.99-101), and the ingest keyed his entries accordingly, so the blocks were
-- orphaned. Re-key them to the entry they belong to.
--
-- Same for rbb and smw, where the ingest keyed al-Raghib under 'rb' and 'sma'.
--
-- This is NOT a corpus-wide fix. The split is pre-existing and real, and cuts
-- across every source - no source is internally consistent either (khalil files
-- BOTH rb and rbb):
--   father: aba <- lisan, sihah, raghib, taj  | abw <- khalil, lane, maqayis, qamus, sinai
--   first:  al  <- raghib, lane, maqayis, qamus | awl <- lisan, sihah, khalil, lane, sinai
--   lord:   rb  <- raghib, lane, khalil, maqayis, qamus
--           rbb <- misbah, sihah, lisan, taj, sinai, khalil, jamhara
--   sky:    sma <- raghib, sihah, qamus, lisan | smw <- lane, misbah, maqayis, taj, sinai, khalil
-- Unifying that needs either a root-alias table or a re-key of the entry rows
-- across sources, and is a separate decision.

UPDATE ar_ling_lexicon_block SET root_norm = 'ابا' WHERE id = 'blk_mfr_abw_fam';
UPDATE ar_ling_lexicon_block SET root_norm = 'ال'  WHERE id = 'blk_mfr_awl_fam';
UPDATE ar_ling_lexicon_block SET root_norm = 'رب'  WHERE id = 'blk_mfr_rbb_fam';
UPDATE ar_ling_lexicon_block SET root_norm = 'سما' WHERE id = 'blk_mfr_smw_fam';

-- Guard: both must now agree with their entry's root_norm.
--   SELECT b.id, b.root_norm AS block_root, e.root_norm AS entry_root
--   FROM ar_ling_lexicon_block b
--   JOIN ar_ling_lexicon_entry e ON e.id = b.root_entry_id
--   WHERE b.block_type = 'sarf_family' AND b.source_slug = 'raghib_mufradat'
--     AND b.root_norm <> e.root_norm;
