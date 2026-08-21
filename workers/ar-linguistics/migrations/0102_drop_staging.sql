-- Retire staging, part 4: the staging table stops being a carrier, then goes.
--
-- What was carried over first, so this is a record and not a claim:
--   14-SENSE  458 claims / 229 roots → ar_ling_root_sense   (all 458)
--   12-ASL    248 claims            → ar_ling_root_asl      (67 new; 181 already there)
--   52-SCHOL   34 claims            → ar_ling_root_scholarship (29; 5 had no
--                                     registered source and were not given a
--                                     fabricated one)
--
-- What is dropped, with nowhere in the schema to land — 190 claims over 12
-- sub-codes, the largest being 22-BAB (66 / 6 roots) and 72-MEM (43 / 6, whose
-- projected memlets live in ar_ling_learn_memlet already). 22-BAB and 32-FIELD
-- have no carrier declared at all.
--
-- The rule this serves: everything on screen comes from a real table. A staging
-- row is a proposal, and the app was reading proposals as facts.
DELETE FROM ar_ling_reg_table_map WHERE table_name LIKE 'ar_ling_stg%';
DROP VIEW IF EXISTS ar_ling_stg_claim_display;
DROP TABLE IF EXISTS ar_ling_stg_claim;
