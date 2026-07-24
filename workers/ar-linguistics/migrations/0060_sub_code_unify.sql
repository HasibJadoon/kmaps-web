-- 0060 — Unify sub_code numbering (naming convention v2, phase 3 close-out).
--
-- CORRECTION TO THE AUDIT. The v2 plan claimed "three band-numbering schemes
-- coexist", citing 2-digit sub_codes, 3-digit sub_codes, and the '150-FORM' form
-- inside ar_ling_root_letter.layer_code. Checked against live data, that was
-- wrong on the third count: '150-FORM' is the LAYER segment of a code_full
-- string (AL:150-FORM:SF:28-PHON:P), not a sub_code. Layer codes are 3-digit
-- (010/100/150/200/300/…) and sub_codes are 2-digit (nn-TOKEN); they are
-- different fields and each is already internally consistent. The 1,720
-- layer_code literals on ar_ling_root_form_masmu are correct as they stand and
-- are deliberately left alone.
--
-- The real inconsistency is two rows. 25 of 27 sub_layers use {band}-{TOKEN}
-- with the number matching the `band` column. Two do not:
--
--     400-KIN   band 80   → 80-KIN
--     500-EXPR  band 82   → 82-EXPR
--
-- Their numbers look like layer codes, which is exactly the confusion that
-- produced the wrong reading above.
--
-- 19 ar_ling_stg_claim ids embed a sub_code (SYN:STG:{root}:{sub}:{src}:{n}), so
-- they are regenerated in the same statement batch — the id is a primary key,
-- not a label, and leaving it quoting a retired code is the defect this whole
-- refactor exists to remove.

-- ── The two sub-layer rows ─────────────────────────────────────────────────
UPDATE ar_ling_reg_sub_layer SET sub_code = '80-KIN'  WHERE sub_code = '400-KIN';
UPDATE ar_ling_reg_sub_layer SET sub_code = '82-EXPR' WHERE sub_code = '500-EXPR';

-- ── Anything in the table map that pointed at them ─────────────────────────
UPDATE ar_ling_reg_table_map
   SET sub_code  = '80-KIN',
       code_full = REPLACE(code_full, '400-KIN', '80-KIN')
 WHERE sub_code = '400-KIN';
UPDATE ar_ling_reg_table_map
   SET sub_code  = '82-EXPR',
       code_full = REPLACE(code_full, '500-EXPR', '82-EXPR')
 WHERE sub_code = '500-EXPR';

-- ── Staging claims: column and the id that embeds it ───────────────────────
UPDATE ar_ling_stg_claim
   SET id       = REPLACE(id, '400-KIN', '80-KIN'),
       sub_code = CASE WHEN sub_code = '400-KIN' THEN '80-KIN' ELSE sub_code END,
       updated_at = datetime('now')
 WHERE id LIKE '%400-KIN%' OR sub_code = '400-KIN';

UPDATE ar_ling_stg_claim
   SET id       = REPLACE(id, '500-EXPR', '82-EXPR'),
       sub_code = CASE WHEN sub_code = '500-EXPR' THEN '82-EXPR' ELSE sub_code END,
       updated_at = datetime('now')
 WHERE id LIKE '%500-EXPR%' OR sub_code = '500-EXPR';
