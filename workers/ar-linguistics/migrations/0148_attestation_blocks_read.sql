-- 0148: the last 20 lexicon attestations of كتب / نزل linked to the block in their book that states the sense (read one by one;
-- 19 high, Lane 'relinquish' medium: Lane has no نزل عن headword, تنازل عن is the nearest). Two stored quotes were not the
-- book's words — al-Rāghib 'contract' carried Lisān's line, al-Qāmūs 'scripture' a paraphrase — replaced by the book's own text.
UPDATE ar_ling_sense_attestation SET block_id = 'blk_taj_0e5fe8ad626b5c35' WHERE id = 'ATT:S:SNS:كتب:animal_ring:zabidi_taj_arus' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lsn_6fff96cac26579d1' WHERE id = 'ATT:S:SNS:كتب:contract:ibn_manzur_lisan_arab' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_mfr_dc46129375a3abb1' WHERE id = 'ATT:S:SNS:كتب:contract:raghib_mufradat' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_qms_ktb_p3' WHERE id = 'ATT:S:SNS:كتب:scripture:qamus_muhit' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_da53f96abbcf8204' WHERE id = 'ATT:S:SNS:كتب:writing:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_42178e76e6b1bbbf' WHERE id = 'ATT:S:SNS:نزل:alighting:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_sih_e3b06a4eae589f60' WHERE id = 'ATT:S:SNS:نزل:alighting:jawhari_sihah' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_kay_0848af975b5b2236' WHERE id = 'ATT:S:SNS:نزل:combat:khalil_kitab_ayn' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lsn_f7225aaec97b73eb' WHERE id = 'ATT:S:SNS:نزل:combat:ibn_manzur_lisan_arab' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_mqy_10f03d4ad9a42f6d' WHERE id = 'ATT:S:SNS:نزل:descent:maqayis_lugha' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_mfr_79c3b2acfeb750c2' WHERE id = 'ATT:S:SNS:نزل:descent:raghib_mufradat' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_7cfad31a816cd4e4' WHERE id = 'ATT:S:SNS:نزل:milk:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_msb_771aa2f4e8b4a265' WHERE id = 'ATT:S:SNS:نزل:provision:fayyumi_misbah_munir' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lsn_46d854b272798d4b' WHERE id = 'ATT:S:SNS:نزل:provision:ibn_manzur_lisan_arab' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_sih_c379b046375881c2' WHERE id = 'ATT:S:SNS:نزل:rank:jawhari_sihah' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_e139f0f9ed342029' WHERE id = 'ATT:S:SNS:نزل:rank:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lsn_f7225aaec97b73eb' WHERE id = 'ATT:S:SNS:نزل:relinquish:ibn_manzur_lisan_arab' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_3b313b3af9c01999' WHERE id = 'ATT:S:SNS:نزل:relinquish:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_mfr_c58dde854b5fd680' WHERE id = 'ATT:S:SNS:نزل:tanzil:raghib_mufradat' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_msb_2fdc52ef3494b4a9' WHERE id = 'ATT:S:SNS:نزل:yield:fayyumi_misbah_munir' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET quote_ar = 'وكتابة العبد: ابتياع نفسه من سيده بما يؤديه من كسبه' WHERE id = 'ATT:S:SNS:كتب:contract:raghib_mufradat';
UPDATE ar_ling_sense_attestation SET quote_ar = 'والكتاب: ما يكتب فيه، والدواة، والتوراة، والصحيفة' WHERE id = 'ATT:S:SNS:كتب:scripture:qamus_muhit';
