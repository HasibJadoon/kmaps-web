-- كتب's hand-authored family stopped at Form VI; Lane's article also has
-- Form X (استكتبهُ). Add it, and give Form I the bāb Lane states (aor. ـُ).

UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json, '$.forms[0].bab', 'GT:form_family:bab_nasara') WHERE id='blk_lane_ktb_fam';
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json, '$.forms[#]', json('{"form_id": "lane_ktb_f8", "roman": "X", "lemma": "استكتبهُ", "root_type": "GT:root_type:sound", "form_tier": "GT:form_family:form_x", "trans": [], "ism_fail_term": null, "ism_maf_term": null, "section_id": "sec_lane_24f6e086d08a6d7b", "block_ids": ["blk_lane_bbedd4e3c2264346", "blk_lane_4d7a1375eb745438"], "origin": "lane_itype", "source_itype": "10"}')) WHERE id='blk_lane_ktb_fam';
