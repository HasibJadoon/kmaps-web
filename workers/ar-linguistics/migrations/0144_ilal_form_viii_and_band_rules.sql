-- 0144: housekeeping.
-- 1. iʿlāl: the four Form VIII rules (ilal_locus_bind/v1) were bound to EVERY Form VIII lemma (98) with no check of the
--    first root letter — so اِكْتَتَبَ "had" ت→ط, ت→د, و→ت and a merger it cannot have. Each rule holds only for its
--    letters (rule_ar): ت→ط after ص ض ط ظ (IR:ibdal:16); ت→د after د ذ ز (IR:ibdal:17); و/ي → ت (IR:ibdal:18; also
--    the hamza of أخذ → اتّخذ); ت merged into د ذ (IR:idgham:23). Rows that fail their condition → status 'rejected'
--    (kept, with the reason). The other rules are gated by root type and stand.
UPDATE ar_ling_root_lemma_ilal_apply SET status = 'rejected',
       note_en = 'Rejected (0144): the first root letter is not one this Form VIII rule applies to.'
 WHERE status = 'live' AND rule_id IN ('IR:ibdal:16','IR:ibdal:17','IR:ibdal:18','IR:idgham:23')
   AND NOT EXISTS (
     SELECT 1 FROM ar_ling_root_lemma l JOIN ar_ling_roots r ON r.id = l.root_id
      WHERE l.id = ar_ling_root_lemma_ilal_apply.lemma_id
        AND CASE ar_ling_root_lemma_ilal_apply.rule_id
              WHEN 'IR:ibdal:16'  THEN substr(r.root_normalized, 1, 1) IN ('ص','ض','ط','ظ')
              WHEN 'IR:ibdal:17'  THEN substr(r.root_normalized, 1, 1) IN ('د','ذ','ز')
              WHEN 'IR:ibdal:18'  THEN substr(r.root_normalized, 1, 1) IN ('و','ي') OR r.root_normalized IN ('اخذ','أخذ')
              WHEN 'IR:idgham:23' THEN substr(r.root_normalized, 1, 1) IN ('د','ذ')
            END);

-- 2. band rules that counted the wrong thing:
--    22-BAB counted lexicon blocks of type sarf_family, not the verb tables the band holds;
--    30-KIN counted rejected opposites too.
UPDATE ar_ling_reg_band_fill_rule SET carrier = 'ar_ling_root_form_paradigm', root_key = 'root_id -> roots.id',
       fill_sql = 'SELECT rr.root_text k, COUNT(*) n FROM ar_ling_root_form_paradigm p JOIN ar_ling_roots rr ON rr.id=p.root_id WHERE p.paradigm_type=''verb_form'' AND p.status=''live'' GROUP BY rr.root_text',
       na_reason = 'live verb tables (root × form × bāb); templates have no root', updated_at = datetime('now')
 WHERE band_code = '22-BAB';
UPDATE ar_ling_reg_band_fill_rule SET fill_sql = 'SELECT root_norm k, COUNT(*) n FROM ar_ling_root_didd WHERE status=''live'' GROUP BY root_norm', updated_at = datetime('now')
 WHERE band_code = '30-KIN';
