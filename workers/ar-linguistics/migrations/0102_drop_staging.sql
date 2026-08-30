DELETE FROM ar_ling_reg_table_map WHERE table_name LIKE 'ar_ling_stg%';
DROP VIEW IF EXISTS ar_ling_stg_claim_display;
DROP TABLE IF EXISTS ar_ling_stg_claim;
