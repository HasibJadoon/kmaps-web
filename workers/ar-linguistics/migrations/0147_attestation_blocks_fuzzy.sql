-- 0147: 8 more old sense attestations linked to the lexicon block they rest on: 5 by their quote's words (word overlap ≥ 0.7, a
-- paraphrase of the block), 3 quote-less ones by their sense's own Arabic gloss (a single clear best block in that book).
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_e2c3b8821a7a5083' WHERE id = 'ATT:S:SNS:اله:bewilderment:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_b8821100e19ef6c5' WHERE id = 'ATT:S:SNS:اله:deity:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_sih_7abc6ca1530e113c' WHERE id = 'ATT:S:SNS:كتب:gathering:jawhari_sihah' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_qms_ktb_p4' WHERE id = 'ATT:S:SNS:كتب:gathering:qamus_muhit' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lane_1d411c7fce3b0ae4' WHERE id = 'ATT:S:SNS:اله:worship:lane_lexicon' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_kay_c5f74478c6f8dd02' WHERE id = 'ATT:S:SNS:نزل:calamity:khalil_kitab_ayn' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_msb_045f52a76d789329' WHERE id = 'ATT:S:SNS:نزل:calamity:fayyumi_misbah_munir' AND block_id IS NULL;
UPDATE ar_ling_sense_attestation SET block_id = 'blk_lsn_9b6ffc858e131894' WHERE id = 'ATT:S:SNS:نزل:yield:ibn_manzur_lisan_arab' AND block_id IS NULL;
