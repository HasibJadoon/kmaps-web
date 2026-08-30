UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_maf_term', json('null'),
  '$.forms[3].ism_maf_term', json('null'),
  '$.forms[4].ism_maf_term', json('null'),
  '$.forms[5].ism_maf_term', json('null')
) WHERE id = 'blk_mfr2_fam';

UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].bab', 'GT:form_family:bab_nasara',
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_fail_term', json('null'),
  '$.forms[3].ism_maf_term', json('null')
) WHERE id = 'blk_mfr_brk_fam';

UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
  '$.forms[0].ism_maf_term', json('null'),
  '$.forms[1].ism_maf_term', json('null'),
  '$.forms[2].ism_fail_term', json('null'),
  '$.forms[3].ism_maf_term', json('null'),
  '$.forms[4].ism_maf_term', json('null')
) WHERE id = 'blk_mfr_ktb_fam';
