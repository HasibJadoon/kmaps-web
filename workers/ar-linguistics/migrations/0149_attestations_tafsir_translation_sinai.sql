-- 0149: the 19 non-lexicon attestations of the 13 roots linked to their exact source passage, by global typed ref (chunk_ref):
--   translations → QR:TR:<qr_translation row>; tafsīr → QR:TE:<qr_tafsir_entry row>; Sinai → AL:<lexicon block>
--   (or AL:<entry> for the علم index record, which has no prose). Sinai's كتب rows also get their AL block_id.
-- Quotes fixed to the source's own words: Ibn ʿAṭiyya without the editor's tag; Sinai's prose instead of index glosses
-- and editorial wording. The two empty تَنزِيل rows mined: al-Ṭabarī at 40:2 (his «يما» kept as stored) and Ibn ʿĀshūr
-- at 39:1 — at 40:2 he refers back to the opening of al-Zumar (alt.: QR:TE:a94069bb482c23febe4cc269).
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:6035cb5554e4b2a8709dcc7b' WHERE id = 'ATT:S:SNS:اله:allah_name:trans_en_sahih';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:97d13f64c94b4494c5a6c823' WHERE id = 'ATT:S:SNS:اله:allah_name:trans_en_haleem';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:407b90ee79fc2cecee08cb50' WHERE id = 'ATT:S:SNS:اله:allah_name:trans_en_asad';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:6fee7e7af09eec148e91fcff' WHERE id = 'ATT:S:SNS:اله:deity:tabari';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:9157aa81fc1bd79c71021006' WHERE id = 'ATT:S:SNS:اله:deity:trans_en_sahih';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:88aa4bbcbbde14411c326a3e' WHERE id = 'ATT:S:SNS:اله:deity:trans_en_haleem';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:5560810463f6ea7c323bee3c' WHERE id = 'ATT:S:SNS:اله:deity:trans_en_asad';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'AL:re_skt_a246d284e54e2cef', quote_en = 'ʿalīm: "knowing, knowledgeable"' WHERE id = 'ATT:S:SNS:علم:knowledge:sinai_key_terms';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'AL:re_skt_a246d284e54e2cef', quote_en = 'ʿallama: "teach (v.)"' WHERE id = 'ATT:S:SNS:علم:teaching:sinai_key_terms';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'AL:blk_skt_ktb_p5', block_id = 'blk_skt_ktb_p5', quote_en = 'conveying that God has imposed a certain behavioural prescription' WHERE id = 'ATT:S:SNS:كتب:decree:sinai_key_terms';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'AL:blk_skt_ktb_p1', block_id = 'blk_skt_ktb_p1', quote_en = 'the Qur’an employs the noun kitāb to denote the concept of revealed scripture' WHERE id = 'ATT:S:SNS:كتب:scripture:sinai_key_terms';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:e64100e3416307b3c1e16768' WHERE id = 'ATT:S:SNS:كتب:scripture:zamakhshari';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:4fbb8f2094f360d48e173431' WHERE id = 'ATT:S:SNS:كتب:scripture:tabari';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:0f3e5e5bc8d84cd062511ca4', quote_ar = 'ونَزَلَ القُرْآنُ في آخِرِهِ في لَيْلَةِ القَدْرِ' WHERE id = 'ATT:S:SNS:كتب:scripture:ibn_atiyya';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:0d214ee3dc8fdb659d8dbd48' WHERE id = 'ATT:S:SNS:كتب:scripture:trans_en_haleem';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:9d542e9c8a705535bb68621f' WHERE id = 'ATT:S:SNS:كتب:scripture:trans_en_asad';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TR:c0a578e235bf32678e98bd13' WHERE id = 'ATT:S:SNS:كتب:scripture:trans_en_sahih';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:d8b43215b782261f7c9e9a22', locator = '40:2', quote_ar = 'من الله العزيز في انتقامه من أعدائه، العليم يما يعملون من الأعمال وغيرها تنزيل هذا الكتاب' WHERE id = 'ATT:S:SNS:نزل:tanzil:tabari';
UPDATE ar_ling_sense_attestation SET chunk_ref = 'QR:TE:83c511f2ca0e4216af55485e', locator = '39:1', quote_ar = 'وتَنْزِيلُ: مَصْدَرُ ”نَزَّلَ“ المُضاعَفِ وهو مُشْعِرٌ بِأنَّهُ أنْزَلَهُ مُنَجَّمًا' WHERE id = 'ATT:S:SNS:نزل:tanzil:ibn_ashur';
