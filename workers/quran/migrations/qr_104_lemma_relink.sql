-- The words of five lemmas AL merged (0200) move to the lemma they inflect, each move logged; QR's copy of six lemma
-- texts follows AL's (the Form I verb عَلَا was filed under تَعَالَى's text).

INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT surah, ayah, word_index, gid_lemma, 'AL:534c1618cd3473bfa2e1125a64', 'مُهْلِكِي → مُهْلِك: the construct plural (28:59) of the same participle' FROM qr_word_occurrence WHERE gid_lemma = 'AL:07729dc05fe0767047250e6d58';
UPDATE qr_word_occurrence SET gid_lemma = 'AL:534c1618cd3473bfa2e1125a64' WHERE gid_lemma = 'AL:07729dc05fe0767047250e6d58';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT surah, ayah, word_index, gid_lemma, 'AL:2761e2599559543f4b43d552a3', 'رَادِّي → رَادّ: the construct plural (16:71) of the same participle' FROM qr_word_occurrence WHERE gid_lemma = 'AL:279db04b07ba9d45cf1f470125';
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2761e2599559543f4b43d552a3' WHERE gid_lemma = 'AL:279db04b07ba9d45cf1f470125';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT surah, ayah, word_index, gid_lemma, 'AL:c8085e46a4f621a7d334333251', 'هَادِي → هَاد: the same participle with its final yāʾ written (7:186, 25:31)' FROM qr_word_occurrence WHERE gid_lemma = 'AL:e44bc3fafcabe4e55aa1bf9c2d';
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c8085e46a4f621a7d334333251' WHERE gid_lemma = 'AL:e44bc3fafcabe4e55aa1bf9c2d';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT surah, ayah, word_index, gid_lemma, 'AL:a246ccc1274f52db9d009a643b', 'وَادِي → وَاد: the same noun with its final yāʾ written (9:121)' FROM qr_word_occurrence WHERE gid_lemma = 'AL:8457d408aa1ae07bc1389a0928';
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a246ccc1274f52db9d009a643b' WHERE gid_lemma = 'AL:8457d408aa1ae07bc1389a0928';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT surah, ayah, word_index, gid_lemma, 'AL:26ec9894256ccd2fcb77820470', 'كِتَابِي → كِتَاب: «my letter» (27:28) — the noun with a pronoun' FROM qr_word_occurrence WHERE gid_lemma = 'AL:f7d49beda3472aa24f41881f16';
UPDATE qr_word_occurrence SET gid_lemma = 'AL:26ec9894256ccd2fcb77820470' WHERE gid_lemma = 'AL:f7d49beda3472aa24f41881f16';
UPDATE qr_word_occurrence SET lemma = 'عَلَا' WHERE gid_lemma = 'AL:20829333d9c52c4a792c8c4f77';
UPDATE qr_word_occurrence SET lemma = 'صَابَرَ' WHERE gid_lemma = 'AL:41eb148782573dfc1cc84e21cf';
UPDATE qr_word_occurrence SET lemma = 'كَاتَبَ' WHERE gid_lemma = 'AL:5cac1c2bc3a27471902f5bb788';
UPDATE qr_word_occurrence SET lemma = 'سَابَقَ' WHERE gid_lemma = 'AL:988dd58f2da1f13d606dcb6fc2';
UPDATE qr_word_occurrence SET lemma = 'كَفّ' WHERE gid_lemma = 'AL:c924e7a9f80e444addbb6675e0';
