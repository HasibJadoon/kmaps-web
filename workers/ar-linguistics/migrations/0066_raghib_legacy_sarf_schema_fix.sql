-- 0066 - bring the three legacy raghib_mufradat sarf_family blocks up to the v2
-- schema, so the whole source passes the same audit the 0065 blocks pass.
--
-- Found by auditing all raghib sarf_family forms after 0065 landed: every gap
-- was in the three pre-existing blocks (byn/brk/ktb, seeded by 0063/0064), none
-- in the seventeen new ones.
--
--   * ism_maf_term missing on 13 forms  - the v2 schema requires the key to be
--     present on every form, value null when unused.
--   * ism_fail_term missing on 2 forms  - same rule.
--   * mfr_brk_f1 has neither bab nor form_tier - it is Form I baraka/yabruku of
--     the camel kneeling, which is bab nasara.
--
-- Purely structural: no gloss, sense, shahid or attribution is touched, and no
-- existing non-null value is overwritten (json_set only writes the named paths,
-- and each path below is currently absent).

-- byn: six forms, all missing ism_maf_term
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_maf_term', json('null'),
  '$.forms[3].ism_maf_term', json('null'),
  '$.forms[4].ism_maf_term', json('null'),
  '$.forms[5].ism_maf_term', json('null')
) WHERE id = 'blk_mfr2_fam';

-- brk: f1 needs its bab; f1/f2/f4 need ism_maf_term; f3 needs ism_fail_term
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].bab', 'GT:form_family:bab_nasara',
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_fail_term', json('null'),
  '$.forms[3].ism_maf_term', json('null')
) WHERE id = 'blk_mfr_brk_fam';

-- ktb: f1/f2/f4/f5 need ism_maf_term; f3 needs ism_fail_term
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_fail_term', json('null'),
  '$.forms[3].ism_maf_term', json('null'),
  '$.forms[4].ism_maf_term', json('null')
) WHERE id = 'blk_mfr_ktb_fam';

-- Guard, run after applying - all four counters must be 0:
--   SELECT SUM(json_extract(j.value,'$.bab') IS NULL
--              AND json_extract(j.value,'$.form_tier') IS NULL) AS no_tier,
--          SUM(json_type(j.value,'$.ism_fail_term') IS NULL)    AS no_if,
--          SUM(json_type(j.value,'$.ism_maf_term')  IS NULL)    AS no_im,
--          SUM(json_valid(b.data_json) = 0)                     AS bad_json
--   FROM ar_ling_lexicon_block b,
--        json_each(json_extract(b.data_json,'$.forms')) j
--   WHERE b.block_type = 'sarf_family' AND b.source_slug = 'raghib_mufradat';
