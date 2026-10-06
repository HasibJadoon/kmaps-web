-- 0142: what the passage screen still read from QR, into AL — so the quran worker reads the language from AL only.
--   root picture   ar_ling_root_dna.picture_en / picture_ar: the one-line beginner picture of the root (from QR
--                  qr_vocab_root_core, source kmaps_root_dna — the copy the card used). Roots with no DNA row get one
--                  (status draft; the full synthesis is still to be built).
--   prepositions   the five older government rows (VG:*) matched to QR's checked rows: display_json gets the QR ref
--                  (keeps the drill ids) and the plain English (meaning_en, as ingested, is kept).
--   near-synonyms  the six sets get the plain titles of QR's sets as canonical_en (set_name keeps the source's).
ALTER TABLE ar_ling_root_dna ADD COLUMN picture_en TEXT;
ALTER TABLE ar_ling_root_dna ADD COLUMN picture_ar TEXT;
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'اله', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'اله';
UPDATE ar_ling_root_dna SET picture_en = 'The one turned to in worship and for refuge.', picture_ar = 'التَّعَبُّدُ: أَلَهَ إِلَاهَةً أَيْ عَبَدَ' WHERE root_norm = 'اله';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'توب', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'توب';
UPDATE ar_ling_root_dna SET picture_en = 'Returning — coming back.', picture_ar = 'الرُّجُوعُ' WHERE root_norm = 'توب';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'ذنب', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'ذنب';
UPDATE ar_ling_root_dna SET picture_en = 'The tail — what comes at the end; a sin is a deed whose consequence follows behind it.', picture_ar = 'مُؤَخَّرُ الشَّيْءِ، وَمِنْهُ الذَّنَبُ' WHERE root_norm = 'ذنب';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'شدد', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'شدد';
UPDATE ar_ling_root_dna SET picture_en = 'Tightness and strength — binding a thing firmly.', picture_ar = 'قُوَّةٌ فِي الشَّيْءِ' WHERE root_norm = 'شدد';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'صير', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'صير';
UPDATE ar_ling_root_dna SET picture_en = 'Coming to an end-state — where a thing ends up and returns.', picture_ar = 'المَآلُ وَالمَرْجِعُ' WHERE root_norm = 'صير';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'طول', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'طول';
UPDATE ar_ling_root_dna SET picture_en = 'Stretching far — length, and a bounty that reaches others.', picture_ar = 'فَضْلٌ وَامْتِدَادٌ فِي الشَّيْءِ' WHERE root_norm = 'طول';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'عزز', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'عزز';
UPDATE ar_ling_root_dna SET picture_en = 'Hard strength that cannot be broken or overcome — like hard, solid ground.', picture_ar = 'الشِّدَّةُ وَالقُوَّةُ وَالامْتِنَاعُ؛ وَالأَرْضُ العَزَازُ: الصُّلْبَةُ' WHERE root_norm = 'عزز';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'عقب', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'عقب';
UPDATE ar_ling_root_dna SET picture_en = 'Coming after — the heel, what follows behind.', picture_ar = 'تَأْخِيرُ شَيْءٍ وَإِتْيَانُهُ بَعْدَ غَيْرِهِ' WHERE root_norm = 'عقب';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'علم', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'علم';
UPDATE ar_ling_root_dna SET picture_en = 'A mark by which a thing is known and told apart.', picture_ar = 'أَثَرٌ بِالشَّيْءِ يَتَمَيَّزُ بِهِ عَنْ غَيْرِهِ' WHERE root_norm = 'علم';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'غفر', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'غفر';
UPDATE ar_ling_root_dna SET picture_en = 'Covering and shielding — like the helmet (مِغْفَر) that covers the head.', picture_ar = 'السَّتْرُ وَالتَّغْطِيَةُ' WHERE root_norm = 'غفر';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'قبل', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'قبل';
UPDATE ar_ling_root_dna SET picture_en = 'Facing — one thing meeting another face to face; to accept is to receive what comes to you.', picture_ar = 'مُوَاجَهَةُ الشَّيْءِ لِلشَّيْءِ' WHERE root_norm = 'قبل';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'كتب', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'كتب';
UPDATE ar_ling_root_dna SET picture_en = 'Joining one thing to another — letters joined into writing; what is written is fixed and binding.', picture_ar = 'جَمْعُ شَيْءٍ إِلَى شَيْءٍ، ثُمَّ إِثْبَاتُهُ' WHERE root_norm = 'كتب';
INSERT OR IGNORE INTO ar_ling_root_dna (root_norm, root_id, status, provenance_json) SELECT 'نزل', id, 'draft', '{"from":"0142: picture only; synthesis to build"}' FROM ar_ling_roots WHERE root_normalized = 'نزل';
UPDATE ar_ling_root_dna SET picture_en = 'Coming down from a height and settling in a place.', picture_ar = 'هُبُوطُ الشَّيْءِ مِنْ عُلْوٍ وَحُلُولُهُ بِمَكَانٍ' WHERE root_norm = 'نزل';
UPDATE ar_ling_root_lemma_tadiya SET frame_ar = coalesce(frame_ar, 'كَتَبَ عَلَى'), display_json = json_set(coalesce(display_json, '{}'), '$.qr_ref', 'SP:SV:كتب:I:3', '$.plain_en', 'to make binding on, to prescribe for') WHERE id = 'VG:كتب:I:على';
UPDATE ar_ling_root_lemma_tadiya SET frame_ar = coalesce(frame_ar, 'كَتَبَ لِ'), display_json = json_set(coalesce(display_json, '{}'), '$.qr_ref', 'SP:SV:كتب:I:4', '$.plain_en', 'to decree for someone, as their share') WHERE id = 'VG:كتب:I:لـ';
UPDATE ar_ling_root_lemma_tadiya SET frame_ar = coalesce(frame_ar, 'كَتَبَ فِي'), display_json = json_set(coalesce(display_json, '{}'), '$.qr_ref', 'SP:SV:كتب:I:5', '$.plain_en', 'to write firmly into (the heart)') WHERE id = 'VG:كتب:I:في';
UPDATE ar_ling_root_lemma_tadiya SET frame_ar = coalesce(frame_ar, 'كَتَبَ مَعَ'), display_json = json_set(coalesce(display_json, '{}'), '$.qr_ref', 'SP:SV:كتب:I:6', '$.plain_en', 'to count among, to list with') WHERE id = 'VG:كتب:I:مع';
UPDATE ar_ling_root_lemma_tadiya SET frame_ar = coalesce(frame_ar, 'نَزَّلَ عَلَى'), display_json = json_set(coalesce(display_json, '{}'), '$.qr_ref', 'SP:SV:نزل:II:0', '$.plain_en', 'to send down upon — the one who receives it') WHERE id = 'VG:نزل:II';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Words for sin', updated_at = datetime('now') WHERE id = 'NS:SIN:SIN';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Words for punishment', updated_at = datetime('now') WHERE id = 'NS:PUNISHMENT:PUNISHMENT';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Forgiving', updated_at = datetime('now') WHERE id = 'NS:TO:TO_FORGIVE_PARDON';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Turning back', updated_at = datetime('now') WHERE id = 'NS:TO:TO_RETURN';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Bounty and means', updated_at = datetime('now') WHERE id = 'NS:SUFFICIENT:SUFFICIENT';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Sending down: نَزَّلَ and أَنْزَلَ', updated_at = datetime('now') WHERE id = 'NS:TO:TO_DESCEND_TO_REVEAL_COME_DOWN';
