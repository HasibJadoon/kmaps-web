-- qr_091: Qurʾān word → AL lemma links repaired (audit 2026-10-07) — 1,664 NULLs filled, 119 wrong links fixed, each logged.
-- qr_links: Qurʾān word -> AL lemma links (qr_word_occurrence.gid_lemma), audit of 2026-10-07.
-- Unnumbered body; give it the next qr_NNN number when adopting it.
-- Every UPDATE is guarded on the old value (gid_lemma IS NULL, or = the old wrong id), so a row
-- that was changed since the audit is left alone, and re-running is a no-op.
-- Every change is first logged (old_gid, new_gid, reason) in qr_word_lemma_link_fix, under the same guard.
-- Rows changed: 1783  = null 1664 + off-by-one/two 102 + other mismatch 11 + hamza-hidden 6.
-- The canonical id for a QR lemma+root is the AL id most correctly-matching rows of that lemma+root already use
-- (merged_into resolved); else an AL lemma with the same text and root. Ties and unclear cases are NOT here — see qr_links.md.
-- Fused particle tokens (مِمَّا, عَمَّا, أَلَّا … linked to their second part) are left as they are — see qr_links.md.
-- No qr_word_sense_link row sits on any changed word (checked 2026-10-07).

CREATE TABLE IF NOT EXISTS qr_word_lemma_link_fix (
  surah      INTEGER NOT NULL,
  ayah       INTEGER NOT NULL,
  word_index INTEGER NOT NULL,
  old_gid    TEXT,
  new_gid    TEXT NOT NULL,
  reason     TEXT NOT NULL,
  fixed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, ayah, word_index, new_gid)
);

-- log 1-400
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (2,10,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,20,11,NULL,'AL:085c745bab319aaaed1e48102a','null; canonical=al_text; qr_lemma=أَظْلَمَ'),
  (2,26,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,29,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,33,6,NULL,'AL:e8df9b59d258972b754adcff1a','null; canonical=usage_fine; qr_lemma=أَنۢبَأَ'),
  (2,33,14,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (2,33,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,38,8,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (2,38,11,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (2,41,13,NULL,'AL:4290844d60727ee929934417c7','null; canonical=usage_fine; qr_lemma=اشْتَرَىٰ'),
  (2,41,16,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (2,44,5,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,58,19,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (2,60,2,NULL,'AL:lane_lemma_n20139','null; canonical=al_text; qr_lemma=أسْتَسْقَىـ'),
  (2,60,17,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (2,61,36,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,61,40,NULL,'AL:f7a6b663a31599368aac7cecc9','null; canonical=usage_fine; qr_lemma=مَسْكَنَة'),
  (2,64,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,68,18,NULL,'AL:lane_lemma_n31110','null; canonical=al_text; qr_lemma=عَوَان'),
  (2,74,22,NULL,'AL:a53910ea687f49fc69888971f9','null; canonical=usage_fine; qr_lemma=يَشَّقَّقُ'),
  (2,75,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,75,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,85,23,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,87,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,87,23,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,88,8,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (2,96,10,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (2,102,27,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (2,102,38,NULL,'AL:248aaf7afebdf41449b9d5212e','null; canonical=usage_fine; qr_lemma=فَرَّقُ'),
  (2,102,41,'AL:248aaf7afebdf41449b9d5212e','AL:b51fc55950c8d301d8576746d7','other_mismatch; canonical=usage_fine; qr_lemma=مَرْء'),
  (2,102,48,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (2,102,60,NULL,'AL:4290844d60727ee929934417c7','null; canonical=usage_fine; qr_lemma=اشْتَرَىٰ'),
  (2,103,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,107,15,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (2,108,16,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (2,110,7,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,113,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,114,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,115,4,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (2,117,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,119,7,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,119,9,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (2,120,12,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (2,120,15,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (2,124,3,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (2,125,14,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (2,126,22,NULL,'AL:234a3cb178bdadd4ef08ed97c3','null; canonical=usage_fine; qr_lemma=مَتَّعْ'),
  (2,126,23,'AL:234a3cb178bdadd4ef08ed97c3','AL:51e8f7139b07dbe30bce0b47ae','off_by_-1; canonical=usage_fine; qr_lemma=قَلِيل'),
  (2,126,28,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (2,134,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,135,10,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (2,135,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,137,15,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (2,141,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,142,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,143,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,143,27,NULL,'AL:56c396ecf6cd33b587aeb13dc1','null; canonical=usage_fine; qr_lemma=عَقِب'),
  (2,143,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,143,37,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,144,9,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (2,144,12,NULL,'AL:c32a9340005720d29359c3a4f2','null; canonical=usage_fine; qr_lemma=شَطْر'),
  (2,144,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,144,20,'AL:aadc307e15c6a4ed6cd500b282','AL:c32a9340005720d29359c3a4f2','other_mismatch; canonical=usage_fine; qr_lemma=شَطْر'),
  (2,144,23,'AL:c32a9340005720d29359c3a4f2','AL:f881c23505da1cfeb050a97408','other_mismatch; canonical=usage_fine; qr_lemma=آتَى'),
  (2,147,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,148,7,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (2,148,9,'AL:4778c31b1db630743c03bb480f','AL:aadc307e15c6a4ed6cd500b282','off_by_-2; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,150,14,NULL,'AL:c32a9340005720d29359c3a4f2','null; canonical=usage_fine; qr_lemma=شَطْر'),
  (2,150,25,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (2,165,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,170,20,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,174,19,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (2,177,12,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,177,19,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,177,34,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,177,45,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (2,178,20,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,181,5,'AL:3b4b4f2a6b4c7a6083189fd225','AL:e87b01d6a238b28f50fc8d95c1','other_mismatch; canonical=usage_fine; qr_lemma=إِنّ'),
  (2,181,7,'AL:ae07a3a460b2ba37e4490886cc','AL:69bd0f7ea2abfbecc226c1e6af','off_by_-1; canonical=usage_fine; qr_lemma=عَلَىٰ'),
  (2,181,8,'AL:69bd0f7ea2abfbecc226c1e6af','AL:8975ccd375c9db212ef12916e0','off_by_-1; canonical=usage_fine; qr_lemma=الَّذِى'),
  (2,181,9,'AL:8975ccd375c9db212ef12916e0','AL:f2da9ea55961e731211a2d36ae','off_by_-1; canonical=usage_fine; qr_lemma=بَدَّلَ'),
  (2,181,10,'AL:f2da9ea55961e731211a2d36ae','AL:e87b01d6a238b28f50fc8d95c1','off_by_-1; canonical=usage_fine; qr_lemma=إِنّ'),
  (2,181,11,'AL:e87b01d6a238b28f50fc8d95c1','AL:f00d9788b057deef5788896d2f','off_by_-1; canonical=usage_fine; qr_lemma=اللَّه'),
  (2,181,12,'AL:f00d9788b057deef5788896d2f','AL:f0e4ccf6f2439fc44e34b59ba4','off_by_-1; canonical=usage_fine; qr_lemma=سَمِيع'),
  (2,181,13,'AL:f0e4ccf6f2439fc44e34b59ba4','AL:9ba7ce572be40ce777e0d44853','off_by_-1; canonical=usage_fine; qr_lemma=عَلِيم'),
  (2,182,15,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (2,184,4,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,185,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,186,11,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (2,186,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,187,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,187,19,'AL:aadc307e15c6a4ed6cd500b282','AL:1f8695e4d83d0e66198628b0c4','off_by_-2; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,189,1,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,196,6,NULL,'AL:c62c2f21076ff0e9a7829fdc12','null; canonical=usage; qr_lemma=أُحْصِرُ'),
  (2,196,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,196,62,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,198,13,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,198,18,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,198,22,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,199,11,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (2,200,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,203,1,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,203,14,NULL,'AL:b4069918b8864f902a843a6a30','null; canonical=usage_fine; qr_lemma=تَأَخَّرَ'),
  (2,213,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,213,36,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,214,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,216,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,216,17,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,217,37,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (2,218,15,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (2,219,1,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,219,15,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,220,4,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (2,221,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,221,19,'AL:4f08afc22e70243ab6880ff767','AL:a04a6ff956a9c382bad8739cd9','off_by_-2; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (2,221,26,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (2,221,28,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (2,223,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,223,14,NULL,'AL:a21970e9ca4c5ad1cd73ea3474','null; canonical=usage_fine; qr_lemma=مُلَٰقُوا'),
  (2,225,13,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (2,226,12,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (2,228,7,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (2,228,12,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (2,228,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,229,9,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (2,229,14,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,229,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,229,41,NULL,'AL:f82921cb9e13372e201535dda7','null; canonical=usage_fine; qr_lemma=يَتَعَدَّ'),
  (2,230,20,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (2,231,12,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (2,231,20,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,231,26,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,232,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,232,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,233,19,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,233,53,NULL,'AL:280770cef237cad97838a42274','null; canonical=usage_fine; qr_lemma=سَلَّمَ'),
  (2,233,55,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,234,20,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,235,17,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,235,41,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,236,14,NULL,'AL:234a3cb178bdadd4ef08ed97c3','null; canonical=usage_fine; qr_lemma=مَتَّعْ'),
  (2,239,8,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (2,240,22,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,246,50,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (2,247,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,247,22,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,247,31,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (2,247,37,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,248,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,249,28,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (2,249,34,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,249,45,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (2,249,47,NULL,'AL:a21970e9ca4c5ad1cd73ea3474','null; canonical=usage_fine; qr_lemma=مُلَٰقُوا'),
  (2,249,51,NULL,'AL:762bd83b28e25a96e3cd09b1af','null; canonical=usage_fine; qr_lemma=فِئَة'),
  (2,253,3,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (2,253,14,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,253,39,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,255,35,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,256,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,257,12,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (2,257,20,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (2,257,21,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (2,258,25,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (2,258,36,NULL,'AL:ee2fd99cbb5b06609f24894072','null; canonical=usage_fine; qr_lemma=بُهِتَ'),
  (2,260,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,260,32,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (2,264,31,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,267,20,NULL,'AL:4720cd0d5d79edfa1438fec2cf','null; canonical=usage_fine; qr_lemma=آخِذ'),
  (2,269,6,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,269,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,269,13,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (2,271,8,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (2,272,3,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (2,272,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,272,24,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (2,275,41,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (2,275,42,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (2,281,8,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (2,281,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,282,34,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (2,282,36,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,282,45,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (2,282,50,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (2,282,63,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (2,282,67,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (2,282,77,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (2,282,98,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,283,2,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (2,284,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (2,285,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (2,285,16,NULL,'AL:248aaf7afebdf41449b9d5212e','null; canonical=usage_fine; qr_lemma=فَرَّقُ'),
  (2,285,18,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (3,7,36,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,13,8,NULL,'AL:762bd83b28e25a96e3cd09b1af','null; canonical=usage_fine; qr_lemma=فِئَة'),
  (3,15,19,NULL,'AL:56b9944db1ccd4737ba5867e37','null; canonical=usage_fine; qr_lemma=رِضْوَٰن'),
  (3,19,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,20,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,24,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,28,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,28,24,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,30,23,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,31,13,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (3,33,6,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (3,33,7,'AL:caf91707b517817afdd24b08c1','AL:d6a84cc7ce680802b27c6e8fe7','off_by_-1; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (3,33,8,'AL:d6a84cc7ce680802b27c6e8fe7','AL:caf91707b517817afdd24b08c1','off_by_-1; canonical=usage_fine; qr_lemma=ءَال'),
  (3,41,15,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (3,44,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,44,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,47,13,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (3,49,12,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (3,49,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,52,16,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,59,8,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (3,59,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,68,12,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (3,73,27,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,92,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,93,3,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,93,4,'AL:aadc307e15c6a4ed6cd500b282','AL:e7929ebfad2363c355914dc02b','off_by_-1; canonical=usage_fine; qr_lemma=حِلّ'),
  (3,93,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,95,6,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (3,95,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,97,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,97,16,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (3,103,7,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (3,103,22,NULL,'AL:40e4d0012bd80fb05de2acf7ad','null; canonical=usage_fine; qr_lemma=شَفَا'),
  (3,103,25,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (3,106,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,110,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,110,21,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (3,113,7,NULL,'AL:c05af60cba0cb59e88e03caf06','null; canonical=usage_fine; qr_lemma=قَآئِمَة'),
  (3,116,14,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (3,116,15,'AL:a070659dd628e2372234e97754','AL:49ff52512529e41eff1b9d6785','off_by_-1; canonical=usage_fine; qr_lemma=نَار'),
  (3,117,22,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,120,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,140,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,144,16,NULL,'AL:56c396ecf6cd33b587aeb13dc1','null; canonical=usage_fine; qr_lemma=عَقِب'),
  (3,144,20,NULL,'AL:56c396ecf6cd33b587aeb13dc1','null; canonical=usage_fine; qr_lemma=عَقِب'),
  (3,144,24,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,145,15,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,145,21,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,151,16,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (3,153,6,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (3,153,8,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (3,154,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,154,16,'AL:1f8695e4d83d0e66198628b0c4','AL:c684443a26dd235d51da2508cf','off_by_-1; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (3,154,28,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,154,36,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,154,43,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,154,47,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,154,53,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,161,14,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (3,161,16,'AL:192c7214632530f0baeee207a1','AL:1f8695e4d83d0e66198628b0c4','off_by_-2; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,165,14,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,167,25,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (3,168,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,176,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (3,179,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,179,20,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (3,179,28,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,179,32,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (3,183,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (3,185,6,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (3,185,13,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (3,186,4,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (3,186,8,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (3,186,14,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (3,189,8,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,4,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,4,11,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,6,16,NULL,'AL:e00ef4ba138cbd99e2f9f5ccc6','null; canonical=usage_fine; qr_lemma=إِسْرَاف'),
  (4,6,19,NULL,'AL:b0d876bc7cea8d44e55e5f311c','null; canonical=usage_fine; qr_lemma=كَبُرَ'),
  (4,6,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,6,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,31,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,36,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,44,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,11,46,NULL,'AL:1d4ca183dc13fda8da2be6973b','null; canonical=usage_fine; qr_lemma=إِخْوَةٌ'),
  (4,12,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,12,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,12,32,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,12,51,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,12,66,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,12,71,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (4,15,12,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (4,16,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,17,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,19,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,19,29,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,22,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,22,16,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (4,23,52,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,23,53,'AL:aadc307e15c6a4ed6cd500b282','AL:c111023567bcf13ff855df78f3','off_by_-1; canonical=usage_fine; qr_lemma=غَفُور'),
  (4,24,26,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,25,26,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,25,36,NULL,'AL:0eeca7b603386b24e71ba4123a','null; canonical=usage_fine; qr_lemma=أَحْصَنَتْ'),
  (4,25,49,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (4,28,6,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (4,28,7,'AL:60cfb41b9b6f4d1a704e15594a','AL:e0d8856bacbf8dc523d9191fc3','off_by_-1; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (4,29,18,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,29,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,32,18,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (4,33,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,33,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,34,18,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (4,34,33,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (4,35,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,36,4,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (4,36,6,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,38,17,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (4,39,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,40,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,40,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,43,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,43,28,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (4,43,46,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,45,4,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,45,6,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,45,7,'AL:06be2bdc2f75b2400e0ccfa647','AL:7e7700564e304b6924778e14cb','off_by_-1; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,46,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,46,36,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (4,47,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,48,15,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (4,50,7,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,54,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,54,12,'AL:f881c23505da1cfeb050a97408','AL:caf91707b517817afdd24b08c1','off_by_-1; canonical=usage_fine; qr_lemma=ءَال'),
  (4,54,13,'AL:caf91707b517817afdd24b08c1','AL:d6a84cc7ce680802b27c6e8fe7','off_by_-1; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (4,54,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,55,9,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,56,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,59,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,59,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,59,21,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (4,64,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,66,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,70,5,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,74,19,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,76,14,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,77,41,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (4,79,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,84,10,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,84,15,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (4,85,11,NULL,'AL:dfa47a22e1b0cd57996d3497c3','null; canonical=usage_fine; qr_lemma=شَفَٰعَة'),
  (4,85,15,NULL,'AL:47bb3dbc636fa5e913ca2615b9','null; canonical=usage_fine; qr_lemma=كِفْل'),
  (4,85,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,86,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,86,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,88,5,NULL,'AL:762bd83b28e25a96e3cd09b1af','null; canonical=usage_fine; qr_lemma=فِئَة'),
  (4,89,11,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,91,26,NULL,'AL:50532e48af7b183b1e71d2c3a5','null; canonical=usage; qr_lemma=ثُقِفُ'),
  (4,92,11,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,92,24,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,92,30,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,92,35,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,94,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,94,36,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,95,15,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (4,95,19,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,95,27,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (4,96,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,96,7,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (4,97,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,99,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,100,28,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,101,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,102,44,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,102,50,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,103,18,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,104,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,105,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,106,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,106,6,'AL:aadc307e15c6a4ed6cd500b282','AL:c111023567bcf13ff855df78f3','off_by_-1; canonical=usage_fine; qr_lemma=غَفُور'),
  (4,107,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,108,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,111,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,113,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,113,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,114,21,NULL,'AL:9735e4f0dcbb6455205b87fb45','null; canonical=usage_fine; qr_lemma=مَرْضَات'),
  (4,114,24,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,115,19,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (4,116,15,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (4,116,18,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (4,119,14,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,123,9,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (4,123,18,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,125,16,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (4,126,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,126,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (4,127,18,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,127,27,NULL,'AL:d86a30d0007e1bd5bd36ba4c25','null; canonical=usage_fine; qr_lemma=وَلِيد'),
  (4,127,38,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,128,19,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,128,20,NULL,'AL:c24d21863615e37ab0a3ec57d5','null; canonical=usage_fine; qr_lemma=شُحّ'),
  (4,128,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,129,12,NULL,'AL:6307bb63bf45e4b3a279682ab8','null; canonical=usage_fine; qr_lemma=مَيْل'),
  (4,129,13,'AL:6307bb63bf45e4b3a279682ab8','AL:e42d1c315bdbff04ddb8868072','off_by_-1; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (4,129,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,131,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;

-- log 401-800
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (4,131,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,132,8,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (4,135,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (4,135,11,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (4,135,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,136,26,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (4,140,24,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (4,144,16,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (4,146,14,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,146,16,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,148,5,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (4,148,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,152,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,152,16,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (4,153,11,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (4,153,34,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,155,20,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (4,158,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,159,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,162,19,'AL:ea63852dc22e8bdc37cfa31d5c','AL:a04a6ff956a9c382bad8739cd9','other_mismatch; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (4,162,24,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (4,163,13,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (4,163,17,NULL,'AL:0c3503a5b47900720deec0cfc9','null; canonical=usage_fine; qr_lemma=أَسْبَاط'),
  (4,163,21,NULL,'AL:e4abde5edc15e3c2b7dbff14ed','null; canonical=usage_fine; qr_lemma=هَٰرُون'),
  (4,165,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,170,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,171,26,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (4,172,12,NULL,'AL:0899129fef61a448cea1303485','null; canonical=usage_fine; qr_lemma=اسْتَنكَفُ'),
  (4,173,13,NULL,'AL:0899129fef61a448cea1303485','null; canonical=usage_fine; qr_lemma=اسْتَنكَفُ'),
  (4,173,24,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (4,176,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (4,176,35,NULL,'AL:1d4ca183dc13fda8da2be6973b','null; canonical=usage_fine; qr_lemma=إِخْوَةٌ'),
  (4,176,46,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (5,2,25,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (5,3,38,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (5,3,39,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (5,3,47,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (5,4,20,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (5,4,22,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (5,5,7,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,5,9,NULL,'AL:e7929ebfad2363c355914dc02b','null; canonical=usage_fine; qr_lemma=حِلّ'),
  (5,5,12,NULL,'AL:e7929ebfad2363c355914dc02b','null; canonical=usage_fine; qr_lemma=حِلّ'),
  (5,5,20,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,5,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,6,30,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (5,12,19,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,12,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,13,24,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (5,17,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (5,17,35,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (5,18,16,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (5,19,22,NULL,'AL:4469c8b500721f18b36386a978','null; canonical=usage_fine; qr_lemma=بَشِير'),
  (5,23,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,26,11,NULL,'AL:32c5361771b955d49f2ba20628','null; canonical=usage_fine; qr_lemma=تَأْسَ'),
  (5,27,12,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (5,34,12,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (5,39,13,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (5,40,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (5,41,12,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,41,13,'AL:4f08afc22e70243ab6880ff767','AL:d5a07ea1bd649e9b98d080eddc','off_by_-1; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (5,41,14,'AL:d5a07ea1bd649e9b98d080eddc','AL:b043e355dbf45a61c488a656a9','off_by_-1; canonical=usage_fine; qr_lemma=لَم'),
  (5,41,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,41,34,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,41,50,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (5,42,17,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (5,44,25,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (5,44,29,'AL:ee39c1f013b0b40c60b4021192','AL:4290844d60727ee929934417c7','off_by_-2; canonical=usage_fine; qr_lemma=اشْتَرَىٰ'),
  (5,44,32,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (5,46,13,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,46,16,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (5,46,24,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (5,48,40,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,51,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,51,8,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (5,51,10,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (5,52,27,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (5,54,32,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (5,60,24,NULL,'AL:ddcff3bbd01180dd880b70b7b8','null; canonical=usage_fine; qr_lemma=أَضَلّ'),
  (5,61,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,62,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,64,17,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (5,64,36,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (5,64,38,NULL,'AL:2fe88217414d5b960a7a3ca419','null; canonical=usage_fine; qr_lemma=أَطْفَأَ'),
  (5,66,22,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (5,68,16,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (5,68,27,NULL,'AL:32c5361771b955d49f2ba20628','null; canonical=usage_fine; qr_lemma=تَأْسَ'),
  (5,70,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (5,72,21,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (5,72,29,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (5,74,7,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (5,75,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,78,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,79,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,80,11,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (5,82,6,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,82,9,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (5,82,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,83,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (5,89,17,NULL,'AL:e3b0a40c38b609b1ccd261e316','null; canonical=usage_fine; qr_lemma=أَوْسَط'),
  (5,101,24,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (5,104,22,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (5,105,9,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (5,106,37,NULL,'AL:4290844d60727ee929934417c7','null; canonical=usage_fine; qr_lemma=اشْتَرَىٰ'),
  (5,106,49,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (5,110,28,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (5,115,15,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (5,116,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,116,28,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,116,35,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (5,116,40,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (5,117,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (5,119,17,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (5,119,20,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (5,120,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,5,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,12,11,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,13,3,NULL,'AL:ee9aaac9de746df8e36c968054','null; canonical=usage_fine; qr_lemma=سَكَنَ'),
  (6,14,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,17,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,20,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,24,6,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (6,24,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,25,19,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,26,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,31,11,NULL,'AL:c673312b8dd75090f5760a1232','null; canonical=usage_fine; qr_lemma=بَغْتَة'),
  (6,31,24,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (6,35,24,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,35,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,38,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,48,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,51,13,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (6,52,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,52,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,52,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,54,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,54,18,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (6,56,16,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (6,56,17,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (6,57,18,NULL,'AL:bf36aaded9fdfc6bdd9f254d25','null; canonical=usage_fine; qr_lemma=قَصَّ'),
  (6,59,3,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (6,61,11,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (6,70,14,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,70,22,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (6,71,32,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,71,35,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,73,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,73,19,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (6,73,20,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (6,74,3,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (6,76,11,NULL,'AL:lane_lemma_n965','null; canonical=al_text; qr_lemma=أَفَلَ'),
  (6,77,9,NULL,'AL:lane_lemma_n965','null; canonical=al_text; qr_lemma=أَفَلَ'),
  (6,78,11,NULL,'AL:lane_lemma_n965','null; canonical=al_text; qr_lemma=أَفَلَ'),
  (6,80,12,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (6,80,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,80,22,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,84,18,NULL,'AL:e4abde5edc15e3c2b7dbff14ed','null; canonical=usage_fine; qr_lemma=هَٰرُون'),
  (6,86,6,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (6,88,11,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (6,90,5,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,90,9,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (6,91,24,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,92,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,92,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,93,34,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,93,40,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,94,21,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (6,94,23,NULL,'AL:703fa0881d602ecc13b00cd5f2','null; canonical=usage_fine; qr_lemma=تَقَطَّعَ'),
  (6,94,25,'AL:703fa0881d602ecc13b00cd5f2','AL:dfed207f9c4910a4c8a557cf75','off_by_-2; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (6,101,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,101,11,NULL,'AL:2d41168164f4bb818ec91647d2','null; canonical=usage_fine; qr_lemma=صَٰحِبَة'),
  (6,101,12,'AL:2d41168164f4bb818ec91647d2','AL:60cfb41b9b6f4d1a704e15594a','off_by_-1; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (6,101,14,'AL:60cfb41b9b6f4d1a704e15594a','AL:21397578a8da07f1cdf2ce9bb8','off_by_-2; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,102,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,104,8,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,108,24,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,111,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,111,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,111,15,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,112,21,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (6,114,12,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (6,114,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,120,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,121,15,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (6,122,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,123,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,127,7,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (6,128,11,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (6,128,24,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (6,130,18,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,130,24,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,136,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,136,17,'AL:aadc307e15c6a4ed6cd500b282','AL:040139d846a9a0f3c85ed1ae84','off_by_-1; canonical=usage_fine; qr_lemma=شَرِيك'),
  (6,136,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,136,28,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (6,137,18,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (6,139,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,139,17,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (6,140,17,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (6,140,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,141,11,NULL,'AL:f7409226c8cf7c7f4b90d20974','null; canonical=usage_fine; qr_lemma=أُكُل'),
  (6,141,22,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (6,145,38,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (6,148,22,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (6,150,23,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,151,9,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (6,151,11,'AL:a679a2ae4c5eb7f4fd3409421e','AL:21397578a8da07f1cdf2ce9bb8','off_by_-2; canonical=usage_fine; qr_lemma=شَىْء'),
  (6,151,32,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,152,12,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (6,152,18,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,152,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,152,30,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (6,157,16,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (6,157,31,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (6,158,22,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,158,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,158,26,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (6,159,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (6,164,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (6,165,20,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (7,3,12,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (7,10,9,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (7,12,12,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (7,12,14,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (7,12,15,'AL:49ff52512529e41eff1b9d6785','AL:60cfb41b9b6f4d1a704e15594a','off_by_-1; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (7,27,27,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (7,29,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,30,10,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (7,32,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,37,22,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (7,37,25,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,37,30,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (7,37,34,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (7,38,30,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (7,38,32,'AL:f881c23505da1cfeb050a97408','AL:b6d151fe308ccc3e0fa9f09d73','off_by_-2; canonical=usage_fine; qr_lemma=ضِعْف'),
  (7,38,34,'AL:b6d151fe308ccc3e0fa9f09d73','AL:49ff52512529e41eff1b9d6785','off_by_-2; canonical=usage_fine; qr_lemma=نَار'),
  (7,38,37,NULL,'AL:b6d151fe308ccc3e0fa9f09d73','null; canonical=usage_fine; qr_lemma=ضِعْف'),
  (7,43,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,43,33,NULL,'AL:bc905ddae1a773d46b55804e9f','null; canonical=usage_fine; qr_lemma=أَوْرَثَ'),
  (7,46,10,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (7,47,5,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (7,47,6,'AL:a070659dd628e2372234e97754','AL:49ff52512529e41eff1b9d6785','off_by_-1; canonical=usage_fine; qr_lemma=نَار'),
  (7,51,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,53,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,53,33,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (7,53,34,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (7,64,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,69,11,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (7,69,19,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (7,69,23,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (7,70,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,71,20,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (7,72,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,73,24,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (7,74,18,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (7,82,12,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (7,85,19,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (7,85,25,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (7,86,15,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (7,86,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,86,18,'AL:aadc307e15c6a4ed6cd500b282','AL:51e8f7139b07dbe30bce0b47ae','off_by_-1; canonical=usage_fine; qr_lemma=قَلِيل'),
  (7,86,22,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,88,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,89,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,89,29,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (7,92,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,93,12,NULL,'AL:32c5361771b955d49f2ba20628','null; canonical=usage_fine; qr_lemma=تَأْسَ'),
  (7,101,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,103,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,128,10,NULL,'AL:bc905ddae1a773d46b55804e9f','null; canonical=usage_fine; qr_lemma=أَوْرَثَ'),
  (7,134,16,NULL,'AL:ae140e81eaa5d04334902d96ab','null; canonical=usage_fine; qr_lemma=رِجْز'),
  (7,134,17,'AL:ae140e81eaa5d04334902d96ab','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,142,15,NULL,'AL:e4abde5edc15e3c2b7dbff14ed','null; canonical=usage_fine; qr_lemma=هَٰرُون'),
  (7,143,29,NULL,'AL:7f77fe26d438707d4fe892b868','null; canonical=usage_fine; qr_lemma=دَكّ'),
  (7,146,34,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,147,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,154,10,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (7,155,35,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (7,156,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (7,156,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (7,157,32,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,158,20,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,158,26,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (7,160,10,NULL,'AL:lane_lemma_n20139','null; canonical=al_text; qr_lemma=أسْتَسْقَىـ'),
  (7,160,24,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (7,161,19,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (7,164,15,NULL,'AL:10354c2e0482ede40fc596ab5e','null; canonical=usage_fine; qr_lemma=مَعْذِرَة'),
  (7,169,31,NULL,'AL:b0f1c872480c4eaf2baa0b03ae','null; canonical=usage_fine; qr_lemma=دَرَسُ'),
  (7,171,7,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (7,171,13,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (7,171,15,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (7,176,27,NULL,'AL:bf36aaded9fdfc6bdd9f254d25','null; canonical=usage_fine; qr_lemma=قَصَّ'),
  (7,179,27,NULL,'AL:ddcff3bbd01180dd880b70b7b8','null; canonical=usage_fine; qr_lemma=أَضَلّ'),
  (7,180,6,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (7,186,7,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (7,187,23,NULL,'AL:c673312b8dd75090f5760a1232','null; canonical=usage_fine; qr_lemma=بَغْتَة'),
  (7,187,24,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (7,188,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,188,15,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (7,188,21,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (7,188,26,NULL,'AL:4469c8b500721f18b36386a978','null; canonical=usage_fine; qr_lemma=بَشِير'),
  (7,189,3,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (7,189,5,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (7,189,10,NULL,'AL:ee9aaac9de746df8e36c968054','null; canonical=usage_fine; qr_lemma=سَكَنَ'),
  (7,189,15,NULL,'AL:c038fd17e7a20098b7c9456198','null; canonical=usage_fine; qr_lemma=حَمْل'),
  (7,189,21,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,189,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (7,193,9,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,194,9,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,194,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (7,195,21,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (7,195,22,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (7,203,20,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (8,6,6,'AL:9addf6411b5fe58032c381c3d9','AL:49eabda29351d3262c6ba028a5','other_mismatch; canonical=usage_fine; qr_lemma=كَأَنّ'),
  (8,6,7,'AL:49eabda29351d3262c6ba028a5','AL:a65a3552006f0b1266d233ba25','off_by_-1; canonical=usage_fine; qr_lemma=سِيقَ'),
  (8,6,8,'AL:a65a3552006f0b1266d233ba25','AL:cb79435a4ed07d7e44697fceaf','off_by_-1; canonical=usage_fine; qr_lemma=إِلَىٰ'),
  (8,6,9,'AL:cb79435a4ed07d7e44697fceaf','AL:c10cdce688019b678b71391b78','off_by_-1; canonical=usage_fine; qr_lemma=مَوْت'),
  (8,6,11,NULL,'AL:c2f902b2b26f34f5caeec1759a','null; canonical=usage_fine; qr_lemma=نَظَرَ'),
  (8,17,14,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (8,19,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (8,22,3,NULL,'AL:622332888c9d7284ecc5359140','null; canonical=usage_fine; qr_lemma=دَآبَّة'),
  (8,24,16,NULL,'AL:b51fc55950c8d301d8576746d7','null; canonical=usage_fine; qr_lemma=مَرْء'),
  (8,28,2,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (8,33,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,34,15,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (8,35,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,36,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,41,5,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (8,41,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,41,18,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (8,41,28,NULL,'AL:3b920822a1f06630af858f510b','null; canonical=usage_fine; qr_lemma=جَمْع'),
  (8,43,16,NULL,'AL:280770cef237cad97838a42274','null; canonical=usage_fine; qr_lemma=سَلَّمَ'),
  (8,48,18,NULL,'AL:762bd83b28e25a96e3cd09b1af','null; canonical=usage_fine; qr_lemma=فِئَة'),
  (8,48,21,NULL,'AL:56c396ecf6cd33b587aeb13dc1','null; canonical=usage_fine; qr_lemma=عَقِب'),
  (8,54,13,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (8,60,25,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (8,60,29,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (8,65,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,65,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,66,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,66,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (8,70,23,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (8,72,19,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (8,72,27,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (8,73,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,5,19,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (9,8,12,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (9,9,10,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (9,13,13,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (9,13,17,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (9,17,16,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (9,18,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,19,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,25,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (9,27,11,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (9,30,13,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (9,34,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,34,19,NULL,'AL:db71168bbce2453ac874e081af','null; canonical=usage_fine; qr_lemma=ذَهَب'),
  (9,35,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,35,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,36,25,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,37,6,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (9,37,25,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (9,38,16,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (9,39,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (9,41,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,42,15,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (9,42,19,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,53,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,55,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,61,12,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,61,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,61,15,'AL:4f08afc22e70243ab6880ff767','AL:a04a6ff956a9c382bad8739cd9','off_by_-1; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (9,61,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,65,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,66,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,71,13,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (9,72,17,NULL,'AL:56b9944db1ccd4737ba5867e37','null; canonical=usage_fine; qr_lemma=رِضْوَٰن'),
  (9,74,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,75,6,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (9,75,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,81,21,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (9,83,19,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (9,85,14,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,93,8,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (9,93,10,'AL:ee09dab7ac64e5225fb2b1327a','AL:aadc307e15c6a4ed6cd500b282','off_by_-2; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,94,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,94,24,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (9,94,25,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (9,96,6,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (9,96,11,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (9,101,11,NULL,'AL:e68ead10f43e6fd67a5c4a4c1e','null; canonical=usage_fine; qr_lemma=نِفَاق'),
  (9,102,16,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (9,105,10,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (9,105,11,'AL:9ef37391f7a8253152604c179f','AL:242b961689f674c707584209e1','off_by_-1; canonical=usage_fine; qr_lemma=غَيْب'),
  (9,105,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,111,3,NULL,'AL:4290844d60727ee929934417c7','null; canonical=usage_fine; qr_lemma=اشْتَرَىٰ'),
  (9,111,5,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (9,111,6,'AL:a04a6ff956a9c382bad8739cd9','AL:1f8695e4d83d0e66198628b0c4','off_by_-1; canonical=usage_fine; qr_lemma=نَفْس'),
  (9,111,25,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (9,111,32,NULL,'AL:08ef2c325bc6bcb4d2cdd21dac','null; canonical=usage_fine; qr_lemma=بَايَعْ'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;

-- log 801-1200
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (9,114,20,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (9,115,17,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (9,116,15,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (9,122,2,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (9,122,3,'AL:aadc307e15c6a4ed6cd500b282','AL:a04a6ff956a9c382bad8739cd9','off_by_-1; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (9,124,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (9,124,15,'AL:4f08afc22e70243ab6880ff767','AL:dfb45ea326f67a06fd10bc9265','off_by_-1; canonical=usage_fine; qr_lemma=زَادَ'),
  (10,4,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (10,5,15,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (10,11,11,NULL,'AL:e42d1c315bdbff04ddb8868072','null; canonical=usage_fine; qr_lemma=يَذَرَ'),
  (10,12,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,13,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,13,13,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (10,15,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,15,25,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (10,20,10,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (10,22,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,22,14,NULL,'AL:1e4d5d8e90307a1699cfb80760','null; canonical=usage_fine; qr_lemma=رِيح'),
  (10,22,19,NULL,'AL:1e4d5d8e90307a1699cfb80760','null; canonical=usage_fine; qr_lemma=رِيح'),
  (10,22,22,NULL,'AL:8463222c938e0719566add224e','null; canonical=usage_fine; qr_lemma=مَوْج'),
  (10,22,26,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (10,22,30,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (10,23,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (10,26,12,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (10,27,16,NULL,'AL:cc5001f7ad63f078749ebefc29','null; canonical=usage_fine; qr_lemma=أُغْشِيَتْ'),
  (10,27,23,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (10,27,24,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (10,28,14,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (10,30,12,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (10,36,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (10,38,8,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (10,38,10,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (10,38,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,42,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,43,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,45,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,61,26,NULL,'AL:9b3339b6009ca4d44d53c941e1','null; canonical=usage_fine; qr_lemma=مِثْقَال'),
  (10,66,13,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (10,66,17,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (10,68,18,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (10,71,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,71,11,'AL:aadc307e15c6a4ed6cd500b282','AL:b0d876bc7cea8d44e55e5f311c','off_by_-1; canonical=usage_fine; qr_lemma=كَبُرَ'),
  (10,71,20,NULL,'AL:4521e8e22606fec71f1b919b6d','null; canonical=usage_fine; qr_lemma=أَجْمَعُ'),
  (10,71,22,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (10,72,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,73,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,88,25,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (10,90,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (10,90,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (10,93,22,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,94,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,99,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,104,24,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (10,106,14,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (10,108,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (10,108,15,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (11,4,7,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (11,6,3,NULL,'AL:622332888c9d7284ecc5359140','null; canonical=usage_fine; qr_lemma=دَآبَّة'),
  (11,8,15,NULL,'AL:lane_lemma_n24240','null; canonical=al_text; qr_lemma=مَصْرُوف'),
  (11,8,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,13,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (11,13,12,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (11,13,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,14,5,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (11,17,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (11,17,23,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (11,17,24,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (11,17,27,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,17,29,NULL,'AL:1e30cbb1a0fb6ed8a51c6bd298','null; canonical=usage_fine; qr_lemma=مِرْيَة'),
  (11,18,9,NULL,'AL:714d7a2b4a8fca207e40732648','null; canonical=usage_fine; qr_lemma=عَرَضَ'),
  (11,20,20,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (11,29,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (11,29,17,'AL:4f08afc22e70243ab6880ff767','AL:a21970e9ca4c5ad1cd73ea3474','off_by_-2; canonical=usage_fine; qr_lemma=مُلَٰقُوا'),
  (11,31,27,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (11,31,29,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (11,40,23,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (11,43,20,NULL,'AL:8463222c938e0719566add224e','null; canonical=usage_fine; qr_lemma=مَوْج'),
  (11,43,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,46,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (11,47,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,48,13,NULL,'AL:234a3cb178bdadd4ef08ed97c3','null; canonical=usage_fine; qr_lemma=مَتَّعْ'),
  (11,49,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,51,11,NULL,'AL:614971f9bc836217328ead3400','null; canonical=usage_fine; qr_lemma=فَطَرَ'),
  (11,55,3,NULL,'AL:9fe65f3d738e33f451fe76b5b3','null; canonical=usage_fine; qr_lemma=كِيدُ'),
  (11,56,9,NULL,'AL:622332888c9d7284ecc5359140','null; canonical=usage_fine; qr_lemma=دَآبَّة'),
  (11,56,12,NULL,'AL:4720cd0d5d79edfa1438fec2cf','null; canonical=usage_fine; qr_lemma=آخِذ'),
  (11,57,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (11,62,19,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (11,63,20,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (11,72,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (11,81,9,NULL,'AL:89bc65eb47c3186b4d59ab331b','null; canonical=usage_fine; qr_lemma=أَسْرَىٰ'),
  (11,81,17,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (11,84,2,NULL,'AL:969668ea3d670285e82414bb0e','null; canonical=usage_fine; qr_lemma=مَدْيَن'),
  (11,85,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (11,88,27,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (11,95,7,NULL,'AL:969668ea3d670285e82414bb0e','null; canonical=usage_fine; qr_lemma=مَدْيَن'),
  (11,101,11,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (11,101,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (11,101,22,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (11,116,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (11,119,6,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (12,17,14,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (12,18,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,21,16,NULL,'AL:271527256b867cf92227ed73a8','null; canonical=usage_fine; qr_lemma=مَكَّ'),
  (12,24,4,NULL,'AL:347e5bcae5cdd50fc587fff940','null; canonical=usage_fine; qr_lemma=هَمَّ'),
  (12,24,14,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (12,25,17,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (12,25,20,NULL,'AL:c3340816e90ea3522f84e90e2b','null; canonical=usage_fine; qr_lemma=يُسْجَنَ'),
  (12,29,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (12,30,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,32,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,32,16,NULL,'AL:c3340816e90ea3522f84e90e2b','null; canonical=usage_fine; qr_lemma=يُسْجَنَ'),
  (12,33,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (12,36,6,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (12,37,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (12,38,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (12,38,11,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (12,38,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (12,50,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (12,51,16,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (12,51,26,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,53,3,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,53,5,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,53,7,'AL:1f8695e4d83d0e66198628b0c4','AL:813e2a21aa3cf992958c8b2aba','off_by_-2; canonical=usage_fine; qr_lemma=سُوٓء'),
  (12,59,13,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (12,64,14,NULL,'AL:ca17e86b7f18ec56cd939bbd29','null; canonical=usage_fine; qr_lemma=حَٰفِظ'),
  (12,65,11,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (12,66,17,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (12,67,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (12,76,12,NULL,'AL:9fe65f3d738e33f451fe76b5b3','null; canonical=usage_fine; qr_lemma=كِيدُ'),
  (12,77,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (12,98,8,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (12,100,37,NULL,'AL:1d4ca183dc13fda8da2be6973b','null; canonical=usage_fine; qr_lemma=إِخْوَةٌ'),
  (12,101,3,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (12,101,14,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (12,102,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (12,102,11,NULL,'AL:4521e8e22606fec71f1b919b6d','null; canonical=usage_fine; qr_lemma=أَجْمَعُ'),
  (12,109,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (12,110,16,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (12,111,19,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (12,111,20,'AL:21397578a8da07f1cdf2ce9bb8','AL:e0efc2cd017d79e8eec37f46b2','off_by_-1; canonical=usage_fine; qr_lemma=هُدًى'),
  (13,3,16,NULL,'AL:cc5001f7ad63f078749ebefc29','null; canonical=usage_fine; qr_lemma=أُغْشِيَتْ'),
  (13,5,21,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (13,5,22,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (13,8,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (13,11,21,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (13,11,26,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (13,14,5,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (13,14,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (13,16,12,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (13,16,15,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (13,16,32,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (13,16,33,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (13,17,16,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (13,17,21,NULL,'AL:2a1e41c23c70d58a3e169ecd7a','null; canonical=usage_fine; qr_lemma=زَبَد'),
  (13,17,29,NULL,'AL:2a1e41c23c70d58a3e169ecd7a','null; canonical=usage_fine; qr_lemma=زَبَد'),
  (13,18,22,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (13,19,13,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (13,25,22,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (13,31,22,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (13,31,39,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (13,32,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (13,33,11,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (13,35,10,NULL,'AL:f7409226c8cf7c7f4b90d20974','null; canonical=usage_fine; qr_lemma=أُكُل'),
  (13,36,9,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (13,36,20,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (13,37,10,'AL:862835d5d1a12d42f5a7281aa1','AL:3312dd99c7201accb7bc026a70','other_mismatch; canonical=usage_fine; qr_lemma=مِن'),
  (13,37,11,'AL:3312dd99c7201accb7bc026a70','AL:d52f9082d550bcb180783c11b7','off_by_-1; canonical=usage_fine; qr_lemma=عِلْم'),
  (13,37,12,'AL:d52f9082d550bcb180783c11b7','AL:02fbe91bce9ce90ae0d6d488f2','off_by_-1; canonical=usage_fine; qr_lemma=مَا'),
  (13,37,14,NULL,'AL:3312dd99c7201accb7bc026a70','null; canonical=usage_fine; qr_lemma=مِن'),
  (13,37,15,'AL:3312dd99c7201accb7bc026a70','AL:f00d9788b057deef5788896d2f','off_by_-1; canonical=usage_fine; qr_lemma=اللَّه'),
  (13,37,16,'AL:f00d9788b057deef5788896d2f','AL:3312dd99c7201accb7bc026a70','off_by_-1; canonical=usage_fine; qr_lemma=مِن'),
  (13,37,17,'AL:3312dd99c7201accb7bc026a70','AL:06be2bdc2f75b2400e0ccfa647','off_by_-1; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (13,37,18,NULL,'AL:8303810dfb4be15f22794c1210','null; canonical=usage_fine; qr_lemma=لَا'),
  (13,37,19,'AL:8303810dfb4be15f22794c1210','AL:4aacdab005f2b2dd98f69e492d','off_by_-1; canonical=usage_fine; qr_lemma=وَاق'),
  (13,38,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (13,42,13,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (13,43,7,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (14,9,24,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (14,10,9,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (14,11,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (14,11,22,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (14,18,9,NULL,'AL:1e4d5d8e90307a1699cfb80760','null; canonical=usage_fine; qr_lemma=رِيح'),
  (14,18,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (14,22,18,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (14,22,21,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (14,22,27,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (14,22,37,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (14,34,13,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (14,38,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (14,44,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (15,49,5,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (16,8,6,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (16,18,9,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (16,22,6,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (16,25,13,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (16,27,14,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (16,27,19,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (16,28,12,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (16,32,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,33,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,36,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,43,9,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (16,43,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,56,9,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (16,56,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,59,9,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (16,59,17,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (16,60,9,NULL,'AL:0ca5a4886e812fb61a861cba93','null; canonical=usage_fine; qr_lemma=أَعْلَىٰ'),
  (16,62,15,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (16,64,11,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (16,66,15,NULL,'AL:2904ce798b75136a8803425053','null; canonical=usage_fine; qr_lemma=خَالِص'),
  (16,69,17,NULL,'AL:2f70150e93af5305326707ebcf','null; canonical=usage_fine; qr_lemma=شِفَآء'),
  (16,70,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (16,71,10,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (16,72,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (16,75,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (16,87,6,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (16,87,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,89,20,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (16,89,21,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (16,92,30,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,93,14,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (16,93,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,95,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,111,4,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (16,111,7,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (16,111,8,'AL:1f8695e4d83d0e66198628b0c4','AL:192c7214632530f0baeee207a1','off_by_-1; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (16,111,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (16,115,21,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (16,118,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,118,14,'AL:aadc307e15c6a4ed6cd500b282','AL:1f8695e4d83d0e66198628b0c4','off_by_-1; canonical=usage_fine; qr_lemma=نَفْس'),
  (16,123,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,124,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (16,125,17,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (16,127,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,3,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,7,12,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (17,11,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,11,7,'AL:aadc307e15c6a4ed6cd500b282','AL:e0d8856bacbf8dc523d9191fc3','off_by_-1; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (17,12,17,NULL,'AL:23a0e975e49efb20a8e3a192a0','null; canonical=usage_fine; qr_lemma=عَدَد'),
  (17,12,18,'AL:23a0e975e49efb20a8e3a192a0','AL:cb1c92debd4986369ae6760823','off_by_-1; canonical=usage_fine; qr_lemma=سِنِين'),
  (17,12,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (17,15,7,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (17,15,9,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (17,15,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,17,8,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (17,20,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,23,13,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (17,25,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,27,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,30,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,31,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,32,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,32,7,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (17,33,14,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (17,33,15,'AL:06be2bdc2f75b2400e0ccfa647','AL:38f5a9e884a723fe88cb6956e8','off_by_-1; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (17,34,12,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (17,36,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,44,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (17,44,19,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,46,11,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (17,51,12,NULL,'AL:614971f9bc836217328ead3400','null; canonical=usage_fine; qr_lemma=فَطَرَ'),
  (17,53,14,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (17,55,8,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (17,55,13,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (17,59,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (17,60,22,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (17,65,7,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (17,66,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,67,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,70,12,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (17,70,16,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (17,71,7,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (17,73,11,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (17,76,8,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (17,78,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,81,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,82,10,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (17,83,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,85,10,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (17,87,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,93,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,96,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,97,11,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (17,99,6,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (17,99,12,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (17,100,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (17,100,13,'AL:aadc307e15c6a4ed6cd500b282','AL:e0d8856bacbf8dc523d9191fc3','off_by_-1; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (17,101,7,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (17,101,16,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (17,107,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (17,110,9,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (18,5,8,NULL,'AL:b0d876bc7cea8d44e55e5f311c','null; canonical=usage_fine; qr_lemma=كَبُرَ'),
  (18,5,12,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (18,13,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (18,13,10,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (18,14,18,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (18,15,10,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (18,18,13,NULL,'AL:lane_lemma_n41997','null; canonical=al_text; qr_lemma=وَصِيد'),
  (18,19,22,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (18,22,22,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (18,24,5,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (18,26,7,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (18,26,18,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (18,26,20,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (18,28,28,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (18,29,7,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (18,29,14,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (18,32,6,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (18,45,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (18,45,22,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (18,49,23,NULL,'AL:lane_lemma_n8324','null; canonical=al_text; qr_lemma=حَاضِر'),
  (18,50,18,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (18,51,8,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (18,51,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (18,54,11,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (18,54,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (18,57,24,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (18,57,26,'AL:a4c15707c0a4a825ccb14ebffb','AL:e0efc2cd017d79e8eec37f46b2','off_by_-2; canonical=usage_fine; qr_lemma=هُدًى'),
  (18,71,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (18,75,7,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (18,78,10,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (18,82,33,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (18,96,14,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (18,96,16,'AL:49ff52512529e41eff1b9d6785','AL:f881c23505da1cfeb050a97408','off_by_-2; canonical=usage_fine; qr_lemma=آتَى'),
  (18,98,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (18,110,8,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (18,110,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (18,110,21,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (19,12,5,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (19,13,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,21,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,26,9,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (19,27,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (19,29,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,41,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,44,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,47,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,51,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,51,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,54,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,54,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,56,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,61,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,64,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,71,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (19,79,5,NULL,'AL:ae92d8c62e8afec8c22ab57ba7','null; canonical=usage_fine; qr_lemma=مَدَّ'),
  (19,82,4,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (20,40,19,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (20,40,26,NULL,'AL:cb1c92debd4986369ae6760823','null; canonical=usage_fine; qr_lemma=سِنِين'),
  (20,40,29,'AL:cb1c92debd4986369ae6760823','AL:969668ea3d670285e82414bb0e','other_mismatch; canonical=usage_fine; qr_lemma=مَدْيَن'),
  (20,52,8,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (20,55,2,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (20,81,13,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (20,86,20,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (20,94,9,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (20,94,12,NULL,'AL:248aaf7afebdf41449b9d5212e','null; canonical=usage_fine; qr_lemma=فَرَّقُ'),
  (20,97,25,NULL,'AL:7b3a6841660682d0dac26ff782','null; canonical=usage_fine; qr_lemma=نُسِفَتْ'),
  (20,98,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (20,99,10,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (20,101,3,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (20,114,13,NULL,'AL:797b56f29fb83ef01f065223f3','null; canonical=usage_fine; qr_lemma=وَحْى'),
  (20,123,11,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (20,123,14,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (20,123,16,'AL:e0efc2cd017d79e8eec37f46b2','AL:dfed207f9c4910a4c8a557cf75','off_by_-2; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (20,132,7,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (20,133,12,NULL,'AL:e85d68d4716ff4f467af6aac16','null; canonical=usage_fine; qr_lemma=صُحُف'),
  (20,135,7,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (21,7,8,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (21,7,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,30,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (21,43,8,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (21,43,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (21,47,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,47,12,'AL:aadc307e15c6a4ed6cd500b282','AL:9b3339b6009ca4d44d53c941e1','off_by_-1; canonical=usage_fine; qr_lemma=مِثْقَال'),
  (21,47,18,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (21,51,2,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (21,51,3,'AL:f881c23505da1cfeb050a97408','AL:d6a84cc7ce680802b27c6e8fe7','off_by_-1; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (21,51,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,73,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,74,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,77,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,79,4,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (21,81,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,81,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (21,84,8,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (21,90,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (21,90,14,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (21,102,8,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (21,108,5,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (21,109,11,NULL,'AL:8c4efde24ccc2b042554b750f4','null; canonical=usage_fine; qr_lemma=بَعِيد'),
  (22,1,8,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (22,5,55,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (22,9,11,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (22,17,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (22,18,27,NULL,'AL:d578f9411617d422990d009916','null; canonical=usage_fine; qr_lemma=أَهَٰنَ'),
  (22,19,12,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (22,25,22,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (22,31,7,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;

-- log 1201-1600
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (22,31,18,NULL,'AL:1e4d5d8e90307a1699cfb80760','null; canonical=usage_fine; qr_lemma=رِيح'),
  (22,36,10,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (22,38,6,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (22,40,23,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (22,54,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (22,56,7,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (22,60,9,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (22,66,9,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (22,67,11,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (22,72,23,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (22,73,9,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (22,73,14,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (22,73,22,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (22,78,17,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (22,78,25,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (22,78,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (22,78,35,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (23,53,6,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (23,78,8,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (23,91,11,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (23,91,16,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (24,2,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (24,2,18,'AL:aadc307e15c6a4ed6cd500b282','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (24,21,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (24,21,25,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (24,33,22,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (24,33,27,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (24,33,30,NULL,'AL:74280882aeaedf1b60be5cb11a','null; canonical=usage_fine; qr_lemma=فَتَيَٰت'),
  (24,35,15,NULL,'AL:4db13776dfab79d320d30d13ff','null; canonical=usage_fine; qr_lemma=كَوْكَب'),
  (24,43,35,NULL,'AL:lane_lemma_n20994','null; canonical=al_text; qr_lemma=سَنَا'),
  (24,45,22,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (24,55,29,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (24,55,31,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (24,57,9,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (24,61,61,NULL,'AL:280770cef237cad97838a42274','null; canonical=usage_fine; qr_lemma=سَلَّمَ'),
  (24,61,63,'AL:280770cef237cad97838a42274','AL:1f8695e4d83d0e66198628b0c4','off_by_-2; canonical=usage_fine; qr_lemma=نَفْس'),
  (24,62,22,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (25,6,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,6,11,'AL:aadc307e15c6a4ed6cd500b282','AL:c111023567bcf13ff855df78f3','off_by_-1; canonical=usage_fine; qr_lemma=غَفُور'),
  (25,7,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,15,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,16,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,19,13,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (25,21,16,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (25,26,5,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,29,10,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (25,31,8,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (25,31,10,NULL,'AL:e44bc3fafcabe4e55aa1bf9c2d','null; canonical=usage_fine; qr_lemma=هَادِي'),
  (25,40,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,42,16,NULL,'AL:ddcff3bbd01180dd880b70b7b8','null; canonical=usage_fine; qr_lemma=أَضَلّ'),
  (25,53,3,NULL,'AL:b898f648f6f196a23931fcc8ea','null; canonical=usage_fine; qr_lemma=مَرَجَ'),
  (25,55,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,58,9,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (25,59,15,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (25,65,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,70,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (25,70,15,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (25,77,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,8,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,52,5,NULL,'AL:89bc65eb47c3186b4d59ab331b','null; canonical=usage_fine; qr_lemma=أَسْرَىٰ'),
  (26,63,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,67,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,103,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,111,2,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (26,121,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,139,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,158,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,173,4,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (26,174,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,181,1,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (26,181,4,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (26,190,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,12,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,14,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,15,10,NULL,'AL:85fdf870b1a31f9258e2edc3a3','null; canonical=usage_fine; qr_lemma=فَضَّلَ'),
  (27,16,10,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (27,16,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (27,40,32,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (27,42,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (27,44,22,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (27,56,2,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,56,9,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (27,58,4,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (27,62,14,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (27,81,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (27,82,7,NULL,'AL:622332888c9d7284ecc5359140','null; canonical=usage_fine; qr_lemma=دَآبَّة'),
  (27,82,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,88,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (27,91,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (27,92,8,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (27,92,10,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (28,4,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,8,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,10,15,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,16,12,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (28,19,30,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,25,17,NULL,'AL:bf36aaded9fdfc6bdd9f254d25','null; canonical=usage_fine; qr_lemma=قَصَّ'),
  (28,25,23,NULL,'AL:59b78427651f2179ad2b4f1bd4','null; canonical=usage_fine; qr_lemma=نَجَا'),
  (28,29,11,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (28,29,17,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (28,29,25,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (28,32,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,40,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,45,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,45,12,NULL,'AL:969668ea3d670285e82414bb0e','null; canonical=usage_fine; qr_lemma=مَدْيَن'),
  (28,48,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (28,50,10,NULL,'AL:ddcff3bbd01180dd880b70b7b8','null; canonical=usage_fine; qr_lemma=أَضَلّ'),
  (28,50,11,'AL:ddcff3bbd01180dd880b70b7b8','AL:3312dd99c7201accb7bc026a70','off_by_-1; canonical=usage_fine; qr_lemma=مِن'),
  (28,50,15,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (28,57,10,NULL,'AL:271527256b867cf92227ed73a8','null; canonical=usage_fine; qr_lemma=مَكَّ'),
  (28,57,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (28,58,10,NULL,'AL:ee9aaac9de746df8e36c968054','null; canonical=usage_fine; qr_lemma=سَكَنَ'),
  (28,58,14,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (28,58,15,'AL:51e8f7139b07dbe30bce0b47ae','AL:aadc307e15c6a4ed6cd500b282','off_by_-1; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,76,3,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,76,7,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (28,76,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (28,77,18,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (28,78,23,NULL,'AL:3b920822a1f06630af858f510b','null; canonical=usage_fine; qr_lemma=جَمْع'),
  (28,78,25,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (28,79,11,NULL,'AL:a54284353a0a023f64e8f23b96','null; canonical=usage_fine; qr_lemma=لَيْت'),
  (28,79,15,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (28,84,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,85,14,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (28,86,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,87,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (28,87,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (28,88,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (29,4,8,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (29,8,7,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (29,13,6,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (29,16,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,22,15,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (29,25,23,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (29,26,1,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (29,29,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,31,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,32,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,33,21,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,39,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,40,22,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,40,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (29,41,16,NULL,'AL:35201c41a29d2ca0d37637180e','null; canonical=usage_fine; qr_lemma=عَنكَبُوت'),
  (29,46,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (29,47,6,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (29,47,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (29,47,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (29,48,11,NULL,'AL:59df7acbc422dd421c4966c2e5','null; canonical=usage_fine; qr_lemma=إِذًا'),
  (29,52,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (29,53,9,NULL,'AL:c673312b8dd75090f5760a1232','null; canonical=usage_fine; qr_lemma=بَغْتَة'),
  (29,62,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (29,67,12,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (30,8,6,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (30,9,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (30,25,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (30,27,12,NULL,'AL:0ca5a4886e812fb61a861cba93','null; canonical=usage_fine; qr_lemma=أَعْلَىٰ'),
  (30,28,13,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (30,28,22,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (30,30,8,NULL,'AL:614971f9bc836217328ead3400','null; canonical=usage_fine; qr_lemma=فَطَرَ'),
  (30,32,8,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (30,39,14,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (30,40,12,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (30,40,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (30,44,8,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (30,53,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (30,54,3,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (30,54,19,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (30,55,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (30,55,12,'AL:aadc307e15c6a4ed6cd500b282','AL:d713aea7ecaba0d904490f6a50','off_by_-1; canonical=usage_fine; qr_lemma=أُفِكَ'),
  (30,56,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (31,10,17,NULL,'AL:622332888c9d7284ecc5359140','null; canonical=usage_fine; qr_lemma=دَآبَّة'),
  (31,12,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (31,20,27,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (31,21,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (31,21,18,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (31,34,14,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (31,34,20,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (32,4,20,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (32,7,8,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (32,9,12,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (32,14,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (32,20,17,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (32,23,12,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (32,24,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,1,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,2,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,3,4,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (33,4,22,NULL,'AL:d5a07ea1bd649e9b98d080eddc','null; canonical=usage_fine; qr_lemma=أَفْوَٰه'),
  (33,5,25,'AL:d3e8fa1ddfe535241522aa646e','AL:aadc307e15c6a4ed6cd500b282','off_by_-2; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,6,17,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (33,6,23,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (33,6,25,'AL:06be2bdc2f75b2400e0ccfa647','AL:aadc307e15c6a4ed6cd500b282','off_by_-2; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,15,10,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,17,22,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (33,18,12,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (33,19,22,NULL,'AL:c24d21863615e37ab0a3ec57d5','null; canonical=usage_fine; qr_lemma=شُحّ'),
  (33,19,27,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (33,19,31,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,20,7,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (33,20,14,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (33,20,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,22,15,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (33,24,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,24,15,'AL:aadc307e15c6a4ed6cd500b282','AL:c111023567bcf13ff855df78f3','off_by_-1; canonical=usage_fine; qr_lemma=غَفُور'),
  (33,25,9,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (33,25,11,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (33,25,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,27,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (33,30,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,31,8,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (33,33,11,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (33,34,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,36,22,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (33,37,36,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (33,37,45,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,38,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,39,11,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (33,40,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,40,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (33,43,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,43,12,'AL:aadc307e15c6a4ed6cd500b282','AL:a04a6ff956a9c382bad8739cd9','off_by_-1; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (33,48,10,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (33,49,19,NULL,'AL:234a3cb178bdadd4ef08ed97c3','null; canonical=usage_fine; qr_lemma=مَتَّعْ'),
  (33,50,55,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,50,58,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,51,23,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (33,51,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (33,52,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,52,24,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (33,53,29,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,53,40,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (33,53,42,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (33,53,51,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,56,9,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (33,56,12,NULL,'AL:280770cef237cad97838a42274','null; canonical=usage_fine; qr_lemma=سَلَّمَ'),
  (33,59,18,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,61,3,'AL:4778c31b1db630743c03bb480f','AL:50532e48af7b183b1e71d2c3a5','off_by_-1; canonical=usage; qr_lemma=ثُقِفُ'),
  (33,65,6,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (33,69,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,72,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (33,73,14,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (34,3,11,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (34,3,12,'AL:9ef37391f7a8253152604c179f','AL:242b961689f674c707584209e1','off_by_-1; canonical=usage_fine; qr_lemma=غَيْب'),
  (34,3,16,NULL,'AL:9b3339b6009ca4d44d53c941e1','null; canonical=usage_fine; qr_lemma=مِثْقَال'),
  (34,8,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (34,10,2,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (34,12,24,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (34,13,13,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (34,13,16,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (34,14,20,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (34,14,22,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (34,21,20,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (34,22,10,NULL,'AL:9b3339b6009ca4d44d53c941e1','null; canonical=usage_fine; qr_lemma=مِثْقَال'),
  (34,24,13,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (34,32,14,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (34,39,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (34,41,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (34,45,13,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (34,53,7,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (34,54,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (35,1,14,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (35,2,11,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (35,6,8,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (35,6,9,'AL:a4c15707c0a4a825ccb14ebffb','AL:5578bcd902a7630e21891b3612','off_by_-1; canonical=usage_fine; qr_lemma=حِزْب'),
  (35,6,12,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (35,7,7,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (35,8,18,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (35,13,22,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (35,18,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (35,18,14,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (35,18,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (35,18,22,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (35,18,24,'AL:ee39c1f013b0b40c60b4021192','AL:242b961689f674c707584209e1','off_by_-2; canonical=usage_fine; qr_lemma=غَيْب'),
  (35,18,31,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (35,26,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (35,28,9,NULL,'AL:ee39c1f013b0b40c60b4021192','null; canonical=usage_fine; qr_lemma=خَشِىَ'),
  (35,30,7,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (35,32,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (35,34,10,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (35,37,15,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (35,37,18,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (35,39,12,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (35,39,20,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (35,41,3,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (35,41,11,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (35,41,13,'AL:1e45816be11c2c5a1a4dd52722','AL:3aba40de5f61d2ab8fae05acb4','off_by_-2; canonical=usage_fine; qr_lemma=أَحَد'),
  (35,42,17,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (35,44,17,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (35,44,19,NULL,'AL:2d6726053ea47da9f6b3237f1a','null; canonical=usage_fine; qr_lemma=يُعْجِزَ'),
  (35,44,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (35,44,28,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (35,45,23,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (36,12,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (36,26,5,NULL,'AL:a54284353a0a023f64e8f23b96','null; canonical=usage_fine; qr_lemma=لَيْت'),
  (36,28,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (36,30,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (36,62,7,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (37,11,9,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (37,22,6,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (37,30,8,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (37,113,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (38,5,7,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (38,6,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (38,22,11,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (38,24,12,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (38,24,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (38,24,21,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (38,24,24,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (38,26,20,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (38,42,5,NULL,'AL:94f9f58412ddea4347b18cb77c','null; canonical=usage_fine; qr_lemma=بَارِد'),
  (38,70,5,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (38,75,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (38,76,5,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (38,76,7,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (38,76,8,'AL:49ff52512529e41eff1b9d6785','AL:60cfb41b9b6f4d1a704e15594a','off_by_-1; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (39,3,9,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (39,6,15,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (39,7,8,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (39,7,13,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (39,7,26,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (39,8,3,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (39,8,5,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (39,8,11,NULL,'AL:52a69a4c77814f14b341bdf92b','null; canonical=usage_fine; qr_lemma=خَوَّلَ'),
  (39,8,16,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (39,8,17,'AL:aadc307e15c6a4ed6cd500b282','AL:a4c15707c0a4a825ccb14ebffb','off_by_-1; canonical=usage_fine; qr_lemma=دَعَا'),
  (39,8,30,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (39,9,22,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (39,10,17,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (39,15,11,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (39,23,22,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (39,24,12,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (39,38,12,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (39,41,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (39,41,11,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (39,42,11,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (39,43,9,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (39,43,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (39,45,12,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (39,47,24,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (39,53,6,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (39,62,8,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (40,5,8,NULL,'AL:347e5bcae5cdd50fc587fff940','null; canonical=usage_fine; qr_lemma=هَمَّ'),
  (40,12,9,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (40,12,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (40,13,11,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (40,16,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (40,20,5,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,20,10,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (40,35,9,NULL,'AL:b0d876bc7cea8d44e55e5f311c','null; canonical=usage_fine; qr_lemma=كَبُرَ'),
  (40,35,15,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (40,37,13,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (40,40,16,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (40,41,4,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,41,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,45,7,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (40,45,9,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (40,46,10,NULL,'AL:caf91707b517817afdd24b08c1','null; canonical=usage_fine; qr_lemma=ءَال'),
  (40,50,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,52,9,NULL,'AL:813e2a21aa3cf992958c8b2aba','null; canonical=usage_fine; qr_lemma=سُوٓء'),
  (40,58,11,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (40,66,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,74,5,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (40,74,10,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (40,74,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (41,6,8,'AL:e87b01d6a238b28f50fc8d95c1','AL:5f8c07c39f3fc68a16c3e9bb9f','hamza_hidden_mismatch; canonical=usage_fine; qr_lemma=أَنّ'),
  (41,9,5,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (41,15,18,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (41,21,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (41,21,14,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (41,31,12,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (41,34,16,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (41,37,15,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (41,40,12,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (41,44,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (41,44,15,NULL,'AL:e0efc2cd017d79e8eec37f46b2','null; canonical=usage_fine; qr_lemma=هُدًى'),
  (41,44,16,'AL:4f08afc22e70243ab6880ff767','AL:2f70150e93af5305326707ebcf','off_by_-2; canonical=usage_fine; qr_lemma=شِفَآء'),
  (41,44,19,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (41,47,21,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (41,47,22,NULL,'AL:040139d846a9a0f3c85ed1ae84','null; canonical=usage_fine; qr_lemma=شَرِيك'),
  (41,47,24,'AL:4778c31b1db630743c03bb480f','AL:8cbf84429e16bbe1364a335bcb','other_mismatch; canonical=usage_fine; qr_lemma=ءَاذَن'),
  (41,48,8,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (41,50,29,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (41,53,13,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (41,53,18,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (41,54,11,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (42,8,17,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (42,9,8,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (42,9,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (42,11,7,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (42,11,16,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (42,13,15,NULL,'AL:d6a84cc7ce680802b27c6e8fe7','null; canonical=usage_fine; qr_lemma=إِبْرَاهِيم'),
  (42,13,24,NULL,'AL:b0d876bc7cea8d44e55e5f311c','null; canonical=usage_fine; qr_lemma=كَبُرَ'),
  (42,13,28,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (42,14,23,NULL,'AL:bc905ddae1a773d46b55804e9f','null; canonical=usage_fine; qr_lemma=أَوْرَثَ'),
  (42,15,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (42,18,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (42,20,11,NULL,'AL:aadc307e15c6a4ed6cd500b282','null; canonical=usage_fine; qr_lemma=كَانَ'),
  (42,20,15,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (42,22,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (42,23,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;

-- log 1601-1783
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (42,23,22,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (42,27,6,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (42,28,12,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (42,29,13,NULL,'AL:3b920822a1f06630af858f510b','null; canonical=usage_fine; qr_lemma=جَمْع'),
  (42,31,12,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (42,36,14,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (42,45,13,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (42,45,18,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (42,48,13,NULL,'AL:9302cb729d1e56a7f5af2daa37','null; canonical=usage_fine; qr_lemma=أَذَاقَ'),
  (42,48,14,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (42,49,5,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (42,51,8,NULL,'AL:797b56f29fb83ef01f065223f3','null; canonical=usage_fine; qr_lemma=وَحْى'),
  (43,15,7,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (43,71,10,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (44,19,8,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (44,28,2,NULL,'AL:bc905ddae1a773d46b55804e9f','null; canonical=usage_fine; qr_lemma=أَوْرَثَ'),
  (45,10,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (45,10,16,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (45,11,10,NULL,'AL:ae140e81eaa5d04334902d96ab','null; canonical=usage_fine; qr_lemma=رِجْز'),
  (45,19,11,NULL,'AL:06be2bdc2f75b2400e0ccfa647','null; canonical=usage_fine; qr_lemma=وَلِىّ'),
  (45,21,15,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (45,28,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (46,8,12,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (46,8,18,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (46,15,10,NULL,'AL:c038fd17e7a20098b7c9456198','null; canonical=usage_fine; qr_lemma=حَمْل'),
  (46,15,23,NULL,'AL:ec6bb9b9ebd900d4fbd8ab2e38','null; canonical=usage; qr_lemma=أَوْزِعْ'),
  (46,15,35,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (46,19,5,NULL,'AL:192c7214632530f0baeee207a1','null; canonical=usage_fine; qr_lemma=وَفَّىٰٓ'),
  (46,21,1,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (46,24,15,NULL,'AL:1e4d5d8e90307a1699cfb80760','null; canonical=usage_fine; qr_lemma=رِيح'),
  (46,28,11,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (46,33,21,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (47,12,20,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (47,15,39,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (47,20,11,NULL,'AL:7f7ff77637543cf5e1125c23bb','null; canonical=usage_fine; qr_lemma=ذَكَرَ'),
  (47,20,21,NULL,'AL:lane_lemma_n40045','null; canonical=al_text; qr_lemma=نَظَر'),
  (47,33,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (47,36,7,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (47,36,9,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (47,36,12,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (47,38,16,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (48,10,16,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (48,10,18,NULL,'AL:15c8e4b7b0174bad7041785683','null; canonical=usage_fine; qr_lemma=أَوْفَىٰ'),
  (48,10,23,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (48,11,23,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (48,15,25,NULL,'AL:57de0805b975dc1d0a54b412d7','null; canonical=usage_fine; qr_lemma=حَسَدَ'),
  (48,16,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (48,18,2,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (48,18,5,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (48,18,7,NULL,'AL:08ef2c325bc6bcb4d2cdd21dac','null; canonical=usage_fine; qr_lemma=بَايَعْ'),
  (48,21,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (48,25,15,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (48,26,27,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (48,28,12,NULL,'AL:7e7700564e304b6924778e14cb','null; canonical=usage_fine; qr_lemma=كَفَىٰ'),
  (48,29,18,NULL,'AL:56b9944db1ccd4737ba5867e37','null; canonical=usage_fine; qr_lemma=رِضْوَٰن'),
  (48,29,48,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (49,5,11,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (49,9,9,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (49,9,15,NULL,'AL:3052ee34a30429fe9c0fdad99b','null; canonical=usage_fine; qr_lemma=بَغَىٰ'),
  (49,11,24,NULL,'AL:39e844798adf6d98174aa5108f','null; canonical=usage_fine; qr_lemma=يَلْمِزُ'),
  (49,11,25,'AL:39e844798adf6d98174aa5108f','AL:1f8695e4d83d0e66198628b0c4','off_by_-1; canonical=usage_fine; qr_lemma=نَفْس'),
  (49,12,19,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (49,14,3,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (49,14,6,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (49,14,23,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (49,16,15,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (52,38,8,NULL,'AL:38f5a9e884a723fe88cb6956e8','null; canonical=usage_fine; qr_lemma=سُلْطَٰن'),
  (53,23,20,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (53,26,8,NULL,'AL:dfa47a22e1b0cd57996d3497c3','null; canonical=usage_fine; qr_lemma=شَفَٰعَة'),
  (53,26,9,'AL:dfa47a22e1b0cd57996d3497c3','AL:21397578a8da07f1cdf2ce9bb8','off_by_-1; canonical=usage_fine; qr_lemma=شَىْء'),
  (53,30,10,NULL,'AL:dfed207f9c4910a4c8a557cf75','null; canonical=usage_fine; qr_lemma=ضَلَّ'),
  (53,32,27,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (54,6,4,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (54,6,7,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (57,3,8,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (57,4,26,NULL,'AL:10214878714b4e544a23353fc6','null; canonical=usage_fine; qr_lemma=يَعْرُجُ'),
  (57,4,30,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (57,7,10,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (57,8,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (57,8,8,'AL:a4c15707c0a4a825ccb14ebffb','AL:4f08afc22e70243ab6880ff767','off_by_-1; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (57,10,22,NULL,'AL:44f8d98276e4ef751709b726f7','null; canonical=usage_fine; qr_lemma=أَعْظَم'),
  (57,14,9,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (57,15,11,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (57,16,4,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (57,16,17,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (57,20,22,NULL,'AL:85d97d1c843414bc40bf337b3f','null; canonical=usage_fine; qr_lemma=مُصْفَرّ'),
  (57,20,33,NULL,'AL:56b9944db1ccd4737ba5867e37','null; canonical=usage_fine; qr_lemma=رِضْوَٰن'),
  (57,21,19,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (57,25,15,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (57,25,24,NULL,'AL:242b961689f674c707584209e1','null; canonical=usage_fine; qr_lemma=غَيْب'),
  (57,27,32,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (57,27,34,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (57,28,20,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (57,29,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (58,4,13,NULL,'AL:c2da556b6c6d4e2a1f09bfa1fa','null; canonical=usage; qr_lemma=اسْتَطَاعَ'),
  (58,4,18,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (58,7,19,NULL,'AL:6cbdf98580b4dcd5a51fa803b4','null; canonical=usage_fine; qr_lemma=رَابِع'),
  (58,7,34,NULL,'AL:4778c31b1db630743c03bb480f','null; canonical=usage_fine; qr_lemma=أَيْن'),
  (58,11,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (58,11,24,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (58,13,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (58,15,7,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (58,17,11,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (58,17,12,'AL:a070659dd628e2372234e97754','AL:49ff52512529e41eff1b9d6785','off_by_-1; canonical=usage_fine; qr_lemma=نَار'),
  (58,18,13,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (58,19,8,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (58,19,12,NULL,'AL:5578bcd902a7630e21891b3612','null; canonical=usage_fine; qr_lemma=حِزْب'),
  (58,22,38,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (58,22,44,'AL:ee09dab7ac64e5225fb2b1327a','AL:5578bcd902a7630e21891b3612','other_mismatch; canonical=usage_fine; qr_lemma=حِزْب'),
  (59,2,14,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (59,2,17,NULL,'AL:c684443a26dd235d51da2508cf','null; canonical=usage_fine; qr_lemma=ظَنَّ'),
  (59,6,24,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (59,7,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (59,9,27,NULL,'AL:c24d21863615e37ab0a3ec57d5','null; canonical=usage_fine; qr_lemma=شُحّ'),
  (59,9,28,'AL:c24d21863615e37ab0a3ec57d5','AL:1f8695e4d83d0e66198628b0c4','off_by_-1; canonical=usage_fine; qr_lemma=نَفْس'),
  (59,11,20,NULL,'AL:3aba40de5f61d2ab8fae05acb4','null; canonical=usage_fine; qr_lemma=أَحَد'),
  (59,14,12,NULL,'AL:22d9852ef3869163feb223ff60','null; canonical=usage_fine; qr_lemma=بَأْس'),
  (59,20,7,NULL,'AL:a070659dd628e2372234e97754','null; canonical=usage_fine; qr_lemma=أَصْحَٰب'),
  (59,22,8,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (59,22,9,'AL:9ef37391f7a8253152604c179f','AL:242b961689f674c707584209e1','off_by_-1; canonical=usage_fine; qr_lemma=غَيْب'),
  (60,1,22,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (60,1,32,NULL,'AL:9735e4f0dcbb6455205b87fb45','null; canonical=usage_fine; qr_lemma=مَرْضَات'),
  (60,10,21,NULL,'AL:e7929ebfad2363c355914dc02b','null; canonical=usage_fine; qr_lemma=حِلّ'),
  (60,10,25,NULL,'AL:4b0d4aa3312f176c28a07374a7','null; canonical=usage_fine; qr_lemma=حَلَلْ'),
  (60,10,27,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (60,10,36,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (60,10,39,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (60,10,45,'AL:1e45816be11c2c5a1a4dd52722','AL:8c386d2336f69f510b2bf30d30','other_mismatch; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (60,12,31,NULL,'AL:08ef2c325bc6bcb4d2cdd21dac','null; canonical=usage_fine; qr_lemma=بَايَعْ'),
  (61,14,22,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (61,14,31,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (62,8,12,NULL,'AL:9ef37391f7a8253152604c179f','null; canonical=usage_fine; qr_lemma=عَٰلِم'),
  (62,8,13,'AL:9ef37391f7a8253152604c179f','AL:242b961689f674c707584209e1','off_by_-1; canonical=usage_fine; qr_lemma=غَيْب'),
  (63,2,9,NULL,'AL:915b9dc862fa98c6687896920e','null; canonical=usage_fine; qr_lemma=سَآءَ'),
  (63,8,13,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (64,9,9,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (64,11,9,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (64,14,17,NULL,'AL:c111023567bcf13ff855df78f3','null; canonical=usage_fine; qr_lemma=غَفُور'),
  (64,16,12,NULL,'AL:c24d21863615e37ab0a3ec57d5','null; canonical=usage_fine; qr_lemma=شُحّ'),
  (64,16,13,'AL:c24d21863615e37ab0a3ec57d5','AL:1f8695e4d83d0e66198628b0c4','off_by_-1; canonical=usage_fine; qr_lemma=نَفْس'),
  (65,1,28,NULL,'AL:f82921cb9e13372e201535dda7','null; canonical=usage_fine; qr_lemma=يَتَعَدَّ'),
  (65,1,33,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (65,2,21,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (65,4,20,NULL,'AL:c038fd17e7a20098b7c9456198','null; canonical=usage_fine; qr_lemma=حَمْل'),
  (65,6,14,NULL,'AL:c038fd17e7a20098b7c9456198','null; canonical=usage_fine; qr_lemma=حَمْل'),
  (65,6,19,NULL,'AL:c038fd17e7a20098b7c9456198','null; canonical=usage_fine; qr_lemma=حَمْل'),
  (65,6,23,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (65,7,12,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (65,7,17,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (65,7,20,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (65,10,11,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (65,11,17,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (66,1,10,NULL,'AL:9735e4f0dcbb6455205b87fb45','null; canonical=usage_fine; qr_lemma=مَرْضَات'),
  (66,3,24,NULL,'AL:e8df9b59d258972b754adcff1a','null; canonical=usage_fine; qr_lemma=أَنۢبَأَ'),
  (66,4,17,NULL,'AL:a04a6ff956a9c382bad8739cd9','null; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (66,10,22,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (66,10,25,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (67,8,9,NULL,'AL:8c386d2336f69f510b2bf30d30','null; canonical=usage_fine; qr_lemma=سَأَلَ'),
  (67,19,9,NULL,'AL:1e45816be11c2c5a1a4dd52722','null; canonical=usage_fine; qr_lemma=أَمْسَكَ'),
  (67,23,10,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (68,43,7,NULL,'AL:a4c15707c0a4a825ccb14ebffb','null; canonical=usage_fine; qr_lemma=دَعَا'),
  (69,41,5,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (69,42,4,NULL,'AL:51e8f7139b07dbe30bce0b47ae','null; canonical=usage_fine; qr_lemma=قَلِيل'),
  (70,19,2,NULL,'AL:e0d8856bacbf8dc523d9191fc3','null; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (70,19,3,'AL:e0d8856bacbf8dc523d9191fc3','AL:60cfb41b9b6f4d1a704e15594a','off_by_-1; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (70,39,3,NULL,'AL:60cfb41b9b6f4d1a704e15594a','null; canonical=usage_fine; qr_lemma=خَلَقَ'),
  (71,24,5,NULL,'AL:dfb45ea326f67a06fd10bc9265','null; canonical=usage_fine; qr_lemma=زَادَ'),
  (72,2,7,NULL,'AL:a679a2ae4c5eb7f4fd3409421e','null; canonical=usage_fine; qr_lemma=أَشْرَكَ'),
  (72,13,8,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (72,23,12,NULL,'AL:49ff52512529e41eff1b9d6785','null; canonical=usage_fine; qr_lemma=نَار'),
  (73,20,55,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (73,20,63,NULL,'AL:1f8695e4d83d0e66198628b0c4','null; canonical=usage_fine; qr_lemma=نَفْس'),
  (74,31,16,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (74,31,20,NULL,'AL:4f08afc22e70243ab6880ff767','null; canonical=usage_fine; qr_lemma=ءَامَنَ'),
  (74,31,25,NULL,'AL:f881c23505da1cfeb050a97408','null; canonical=usage_fine; qr_lemma=آتَى'),
  (74,31,27,'AL:f881c23505da1cfeb050a97408','AL:a04a6ff956a9c382bad8739cd9','off_by_-2; canonical=usage_fine; qr_lemma=مُؤْمِن'),
  (76,19,3,NULL,'AL:d86a30d0007e1bd5bd36ba4c25','null; canonical=usage_fine; qr_lemma=وَلِيد'),
  (76,21,6,NULL,'AL:4fc7215fc3be5dea6110addf26','null; canonical=usage_fine; qr_lemma=حُلُّ'),
  (85,9,9,NULL,'AL:21397578a8da07f1cdf2ce9bb8','null; canonical=usage_fine; qr_lemma=شَىْء'),
  (89,23,5,NULL,'AL:d4016da73fe6aaeae71d83ca32','null; canonical=usage_fine; qr_lemma=تَذَكَّرَ'),
  (89,23,6,'AL:d4016da73fe6aaeae71d83ca32','AL:e0d8856bacbf8dc523d9191fc3','off_by_-1; canonical=usage_fine; qr_lemma=إِنسَٰن'),
  (98,8,13,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'),
  (98,8,16,NULL,'AL:ee09dab7ac64e5225fb2b1327a','null; canonical=usage_fine; qr_lemma=رَضِىَ'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;

-- ── updates: NULL -> canonical ──
-- ءَال (اول) -> ءَال AL:caf91707b517817afdd24b08c1 · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:caf91707b517817afdd24b08c1'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,33,6), (8,54,13), (27,56,9), (34,13,13), (40,45,7), (40,46,10));
-- ءَامَنَ (امن) -> ءَامَنَ AL:4f08afc22e70243ab6880ff767 · 113 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4f08afc22e70243ab6880ff767'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,26,14), (2,75,3), (2,85,23), (2,165,13), (2,177,12), (2,186,14), (2,213,36), (2,214,21), (2,221,17), (2,228,18), (2,232,21), (2,249,34), (2,253,39), (2,256,13), (2,260,11), (2,285,10), (3,7,36), (3,52,16), (3,110,14), (3,140,17), (3,179,28), (3,179,32), (4,46,36), (4,135,3), (4,155,20), (4,171,26), (5,12,21), (5,41,12), (5,41,15), (5,51,3), (5,82,6), (5,82,14), (5,83,18), (6,25,19), (6,48,8), (6,92,15), (6,92,17), (6,150,23), (7,32,15), (7,88,10), (7,101,13), (7,157,32), (7,158,20), (7,158,26), (8,72,19), (9,19,8), (9,34,3), (9,61,12), (9,61,14), (9,61,18), (9,94,10), (9,124,14), (10,4,14), (10,88,25), (10,90,15), (10,90,21), (11,17,17), (11,29,15), (11,40,23), (12,37,21), (13,31,22), (16,22,6), (16,72,17), (18,13,8), (18,29,7), (22,38,6), (22,54,18), (22,56,7), (24,21,3), (24,62,22), (26,111,2), (27,81,11), (29,26,1), (29,46,14), (29,47,8), (29,47,13), (29,52,13), (29,67,12), (30,53,11), (33,19,27), (33,56,9), (34,8,11), (35,7,7), (38,24,18), (40,12,11), (40,35,15), (41,44,14), (41,44,19), (42,15,10), (42,18,8), (42,22,10), (42,36,14), (42,45,13), (47,33,3), (47,36,7), (48,29,48), (49,14,3), (49,14,6), (57,7,10), (57,16,4), (57,27,34), (58,4,18), (58,11,21), (60,1,22), (61,14,22), (61,14,31), (64,9,9), (64,11,9), (65,2,21), (65,10,11), (65,11,17), (72,13,8), (74,31,20));
-- أَجْمَعُ (جمع) -> أَجْمَعُ AL:4521e8e22606fec71f1b919b6d · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4521e8e22606fec71f1b919b6d'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (10,71,20), (12,102,11));
-- أَحَد (احد) -> أَحَد AL:3aba40de5f61d2ab8fae05acb4 · 19 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3aba40de5f61d2ab8fae05acb4'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,96,10), (2,102,27), (2,102,48), (2,285,18), (3,153,6), (4,43,28), (5,6,30), (5,27,12), (5,115,15), (6,61,11), (11,81,17), (12,36,6), (17,23,13), (18,19,22), (18,32,6), (19,26,9), (24,21,25), (49,12,19), (59,11,20));
-- أُحْصِرُ (حصر) -> أَحْصَرَ AL:c62c2f21076ff0e9a7829fdc12 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c62c2f21076ff0e9a7829fdc12'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,196,6));
-- أَحْصَنَتْ (حصن) -> أَحْصَنَتْ AL:0eeca7b603386b24e71ba4123a · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:0eeca7b603386b24e71ba4123a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,25,36));
-- أَذَاقَ (ذوق) -> أَذَاقَ AL:9302cb729d1e56a7f5af2daa37 · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9302cb729d1e56a7f5af2daa37'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (22,9,11), (22,25,22), (25,19,13), (34,12,24), (41,50,29), (42,48,13));
-- أَسْبَاط (سبط) -> أَسْبَاط AL:0c3503a5b47900720deec0cfc9 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:0c3503a5b47900720deec0cfc9'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,163,17));
-- أَسْرَىٰ (سري) -> أَسْرَىٰ AL:89bc65eb47c3186b4d59ab331b · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:89bc65eb47c3186b4d59ab331b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,81,9), (26,52,5));
-- أَشْرَكَ (شرك) -> أَشْرَكَ AL:a679a2ae4c5eb7f4fd3409421e · 19 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a679a2ae4c5eb7f4fd3409421e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,186,14), (4,36,4), (4,48,15), (4,116,15), (5,72,21), (5,82,9), (6,80,12), (6,88,11), (6,151,9), (12,38,11), (13,36,20), (14,22,37), (18,26,20), (18,110,21), (22,31,7), (24,55,29), (29,8,7), (40,12,9), (72,2,7));
-- أَصْحَٰب (صحب) -> أَصْحَٰب AL:a070659dd628e2372234e97754 · 13 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a070659dd628e2372234e97754'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,119,9), (2,257,20), (2,275,41), (3,116,14), (7,46,10), (7,47,5), (10,26,12), (10,27,23), (13,5,21), (20,135,7), (35,6,12), (58,17,11), (59,20,7));
-- أَضَلّ (ضلل) -> أَضَلّ AL:ddcff3bbd01180dd880b70b7b8 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ddcff3bbd01180dd880b70b7b8'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,60,24), (7,179,27), (25,42,16), (28,50,10));
-- أَطْفَأَ (طفا) -> أَطْفَأَ AL:2fe88217414d5b960a7a3ca419 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2fe88217414d5b960a7a3ca419'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,64,38));
-- أَظْلَمَ (ظلم) -> أَظْلَمَ AL:085c745bab319aaaed1e48102a · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:085c745bab319aaaed1e48102a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,20,11));
-- أَعْظَم (عظم) -> أَعْظَم AL:44f8d98276e4ef751709b726f7 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:44f8d98276e4ef751709b726f7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (57,10,22));
-- أَعْلَىٰ (علو) -> أَعْلَىٰ AL:0ca5a4886e812fb61a861cba93 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:0ca5a4886e812fb61a861cba93'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (16,60,9), (30,27,12));
-- أَفَلَ (افل) -> أَفَلَ AL:lane_lemma_n965 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n965'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,76,11), (6,77,9), (6,78,11));
-- أَفْوَٰه (فوه) -> أَفْوَٰه AL:d5a07ea1bd649e9b98d080eddc · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d5a07ea1bd649e9b98d080eddc'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,167,25), (9,8,12), (9,30,13), (14,9,24), (18,5,12), (33,4,22));
-- أَمْسَكَ (مسك) -> أَمْسَكَ AL:1e45816be11c2c5a1a4dd52722 · 10 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1e45816be11c2c5a1a4dd52722'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,231,12), (4,15,12), (5,4,20), (16,59,9), (35,2,11), (35,41,3), (35,41,11), (39,42,11), (60,10,39), (67,19,9));
-- أَنۢبَأَ (نبا) -> أَنۢبَأَ AL:e8df9b59d258972b754adcff1a · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e8df9b59d258972b754adcff1a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,33,6), (66,3,24));
-- أَوْرَثَ (ورث) -> أَوْرَثَ AL:bc905ddae1a773d46b55804e9f · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:bc905ddae1a773d46b55804e9f'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,43,33), (7,128,10), (42,14,23), (44,28,2));
-- أَوْزِعْ (وزع) -> أَوْزَعَ AL:ec6bb9b9ebd900d4fbd8ab2e38 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ec6bb9b9ebd900d4fbd8ab2e38'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (46,15,23));
-- أَوْسَط (وسط) -> أَوْسَط AL:e3b0a40c38b609b1ccd261e316 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e3b0a40c38b609b1ccd261e316'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,89,17));
-- أَوْفَىٰ (وفي) -> أَوْفَىٰ AL:15c8e4b7b0174bad7041785683 · 8 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:15c8e4b7b0174bad7041785683'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,152,12), (6,152,30), (7,85,19), (9,111,25), (12,59,13), (17,34,12), (26,181,1), (48,10,18));
-- أَيْن (—) -> أَيْن AL:4778c31b1db630743c03bb480f · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4778c31b1db630743c03bb480f'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,115,4), (2,148,7), (7,37,22), (41,47,21), (57,4,30), (58,7,34));
-- أُغْشِيَتْ (غشو) -> أُغْشِيَتْ AL:cc5001f7ad63f078749ebefc29 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:cc5001f7ad63f078749ebefc29'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (10,27,16), (13,3,16));
-- أُكُل (اكل) -> أُكُل AL:f7409226c8cf7c7f4b90d20974 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f7409226c8cf7c7f4b90d20974'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,141,11), (13,35,10));
-- إِبْرَاهِيم (—) -> إِبْرَاهِيم AL:d6a84cc7ce680802b27c6e8fe7 · 11 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d6a84cc7ce680802b27c6e8fe7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,124,3), (2,125,14), (2,135,10), (2,258,25), (3,95,6), (4,125,16), (4,163,13), (6,74,3), (9,114,20), (22,78,17), (42,13,15));
-- إِخْوَةٌ (اخو) -> إِخْوَةٌ AL:1d4ca183dc13fda8da2be6973b · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1d4ca183dc13fda8da2be6973b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,11,46), (4,176,35), (12,100,37));
-- إِذًا (—) -> إِذًا AL:59df7acbc422dd421c4966c2e5 · 10 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:59df7acbc422dd421c4966c2e5'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,140,24), (5,106,49), (6,56,17), (10,106,14), (11,31,29), (17,73,11), (17,76,8), (18,14,18), (23,91,11), (29,48,11));
-- إِسْرَاف (سرف) -> إِسْرَاف AL:e00ef4ba138cbd99e2f9f5ccc6 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e00ef4ba138cbd99e2f9f5ccc6'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,6,16));
-- إِنسَٰن (انس) -> إِنسَٰن AL:e0d8856bacbf8dc523d9191fc3 · 13 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0d8856bacbf8dc523d9191fc3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,60,17), (7,82,12), (7,160,24), (14,34,13), (17,53,14), (18,54,11), (22,66,9), (25,29,10), (32,7,8), (39,8,3), (42,48,14), (43,15,7), (70,19,2));
-- أسْتَسْقَىـ (سقي) -> استسقى AL:lane_lemma_n20139 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n20139'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,60,2), (7,160,10));
-- اسْتَنكَفُ (نكف) -> اسْتَنكَفُ AL:0899129fef61a448cea1303485 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:0899129fef61a448cea1303485'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,172,12), (4,173,13));
-- اشْتَرَىٰ (شري) -> اشْتَرَىٰ AL:4290844d60727ee929934417c7 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4290844d60727ee929934417c7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,41,13), (2,102,60), (5,106,37), (9,111,3));
-- أَهَٰنَ (هون) -> اهان AL:d578f9411617d422990d009916 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d578f9411617d422990d009916'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (22,18,27));
-- اسْتَطَاعَ (طوع) -> اِسْتَطَاع AL:c2da556b6c6d4e2a1f09bfa1fa · 13 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c2da556b6c6d4e2a1f09bfa1fa'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,217,37), (2,282,45), (3,97,16), (9,42,15), (10,38,10), (11,13,12), (11,20,20), (11,88,27), (18,75,7), (18,78,10), (18,82,33), (21,43,8), (58,4,13));
-- آتَى (اتي) -> آتَى AL:f881c23505da1cfeb050a97408 · 96 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f881c23505da1cfeb050a97408'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,87,9), (2,177,19), (2,177,34), (2,200,16), (2,213,25), (2,229,14), (2,233,55), (2,247,22), (2,247,37), (2,253,14), (2,269,6), (2,269,9), (2,271,8), (3,19,9), (3,20,11), (3,73,27), (3,145,15), (3,145,21), (3,186,8), (4,19,16), (4,24,26), (4,25,26), (4,33,11), (4,40,11), (4,54,11), (4,54,16), (4,74,19), (4,114,24), (4,127,18), (4,131,11), (4,146,14), (4,153,34), (4,162,24), (5,5,7), (5,5,20), (5,5,25), (5,12,19), (5,41,34), (5,46,13), (5,48,40), (5,54,32), (6,114,12), (6,141,22), (7,38,30), (7,156,25), (7,171,13), (7,189,25), (9,5,19), (9,71,13), (9,75,6), (12,66,17), (12,101,3), (16,27,14), (17,55,13), (17,59,11), (17,71,7), (17,85,10), (17,107,9), (19,12,5), (20,99,10), (21,51,2), (21,79,4), (21,84,8), (22,78,35), (24,33,22), (24,33,27), (27,16,10), (27,42,9), (28,48,16), (28,76,9), (28,79,15), (29,47,6), (30,39,14), (33,31,8), (33,33,11), (33,51,25), (34,10,2), (42,20,15), (47,36,9), (48,10,23), (48,16,16), (57,16,17), (57,21,19), (57,27,32), (57,29,16), (58,11,24), (58,13,16), (59,7,25), (60,10,27), (60,10,36), (65,6,23), (65,7,12), (65,7,20), (73,20,55), (74,31,16), (74,31,25));
-- آخِذ (اخذ) -> آخِذ AL:4720cd0d5d79edfa1438fec2cf · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4720cd0d5d79edfa1438fec2cf'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,267,20), (11,56,12));
-- بَأْس (باس) -> بَأْس AL:22d9852ef3869163feb223ff60 · 7 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:22d9852ef3869163feb223ff60'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,177,45), (4,84,15), (6,148,22), (12,110,16), (33,18,12), (57,25,15), (59,14,12));
-- بَارِد (برد) -> بَارِد AL:94f9f58412ddea4347b18cb77c · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:94f9f58412ddea4347b18cb77c'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (38,42,5));
-- بَايَعْ (بيع) -> بَايَعْ AL:08ef2c325bc6bcb4d2cdd21dac · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:08ef2c325bc6bcb4d2cdd21dac'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (9,111,32), (48,18,7), (60,12,31));
-- بَشِير (بشر) -> بَشِير AL:4469c8b500721f18b36386a978 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4469c8b500721f18b36386a978'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,19,22), (7,188,26));
-- بَعِيد (بعد) -> بَعِيد AL:8c4efde24ccc2b042554b750f4 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8c4efde24ccc2b042554b750f4'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (21,109,11));
-- بَغَىٰ (بغي) -> بَغَىٰ AL:3052ee34a30429fe9c0fdad99b · 10 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3052ee34a30429fe9c0fdad99b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,34,33), (12,65,11), (22,60,9), (28,76,7), (28,77,18), (38,22,11), (38,24,12), (42,27,6), (49,9,9), (49,9,15));
-- بَغْتَة (بغت) -> بَغْتَة AL:c673312b8dd75090f5760a1232 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c673312b8dd75090f5760a1232'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,31,11), (7,187,23), (29,53,9));
-- بُهِتَ (بهت) -> بُهِتَ AL:ee2fd99cbb5b06609f24894072 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ee2fd99cbb5b06609f24894072'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,258,36));
-- تَأَخَّرَ (اخر) -> تَأَخَّرَ AL:b4069918b8864f902a843a6a30 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b4069918b8864f902a843a6a30'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,203,14));
-- تَأْسَ (اسو) -> تَأْسَ AL:32c5361771b955d49f2ba20628 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:32c5361771b955d49f2ba20628'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,26,11), (5,68,27), (7,93,12));
-- تَذَكَّرَ (ذكر) -> تَذَكَّرَ AL:d4016da73fe6aaeae71d83ca32 · 7 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d4016da73fe6aaeae71d83ca32'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,269,13), (13,19,13), (35,37,15), (35,37,18), (39,9,22), (40,13,11), (89,23,5));
-- تَقَطَّعَ (قطع) -> تَقَطَّعَ AL:703fa0881d602ecc13b00cd5f2 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:703fa0881d602ecc13b00cd5f2'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,94,23));
-- ثُقِفُ (ثقف) -> ثَقَفَ AL:50532e48af7b183b1e71d2c3a5 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:50532e48af7b183b1e71d2c3a5'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,91,26));
-- جَمْع (جمع) -> جَمْع AL:3b920822a1f06630af858f510b · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3b920822a1f06630af858f510b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (8,41,28), (28,78,23), (42,29,13));
-- حَاضِر (حضر) -> حَاضِرٌ AL:lane_lemma_n8324 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n8324'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (18,49,23));
-- حَسَدَ (حسد) -> حَسَدَ AL:57de0805b975dc1d0a54b412d7 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:57de0805b975dc1d0a54b412d7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (48,15,25));
-- حَلَلْ (حلل) -> حَلَلْ AL:4b0d4aa3312f176c28a07374a7 · 7 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4b0d4aa3312f176c28a07374a7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,228,7), (2,229,9), (5,2,25), (13,31,39), (20,81,13), (20,86,20), (60,10,25));
-- حَمْل (حمل) -> حَمْل AL:c038fd17e7a20098b7c9456198 · 5 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c038fd17e7a20098b7c9456198'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,189,15), (46,15,10), (65,4,20), (65,6,14), (65,6,19));
-- حَٰفِظ (حفظ) -> حَٰفِظ AL:ca17e86b7f18ec56cd939bbd29 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ca17e86b7f18ec56cd939bbd29'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (12,64,14));
-- حُلُّ (حلي) -> حُلُّ AL:4fc7215fc3be5dea6110addf26 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4fc7215fc3be5dea6110addf26'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (76,21,6));
-- حِزْب (حزب) -> حِزْب AL:5578bcd902a7630e21891b3612 · 7 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:5578bcd902a7630e21891b3612'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,17,23), (13,36,9), (23,53,6), (30,32,8), (33,20,7), (58,19,8), (58,19,12));
-- حِلّ (حلل) -> حِلّ AL:e7929ebfad2363c355914dc02b · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e7929ebfad2363c355914dc02b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (5,5,9), (5,5,12), (60,10,21));
-- خَالِص (خلص) -> خَالِص AL:2904ce798b75136a8803425053 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2904ce798b75136a8803425053'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (16,66,15));
-- خَشِىَ (خشي) -> خَشِىَ AL:ee39c1f013b0b40c60b4021192 · 10 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ee39c1f013b0b40c60b4021192'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,150,25), (4,25,49), (5,3,38), (5,3,39), (5,44,25), (9,13,13), (9,13,17), (20,94,9), (35,18,22), (35,28,9));
-- خَلَقَ (خلق) -> خَلَقَ AL:60cfb41b9b6f4d1a704e15594a · 33 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,228,12), (3,47,13), (3,49,12), (3,59,8), (4,28,6), (5,17,35), (5,18,16), (5,110,28), (7,12,12), (7,189,3), (10,5,15), (11,119,6), (13,16,33), (16,8,6), (17,70,16), (17,99,6), (17,99,12), (20,55,2), (22,73,14), (23,91,16), (24,45,22), (30,8,6), (30,54,3), (30,54,19), (37,11,9), (38,76,5), (39,6,15), (41,9,5), (41,15,18), (41,21,14), (41,37,15), (42,49,5), (70,39,3));
-- خَوَّلَ (خول) -> خَوَّلَ AL:52a69a4c77814f14b341bdf92b · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:52a69a4c77814f14b341bdf92b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (39,8,11));
-- دَآبَّة (دبب) -> دَآبَّة AL:622332888c9d7284ecc5359140 · 5 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:622332888c9d7284ecc5359140'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (8,22,3), (11,6,3), (11,56,9), (27,82,7), (31,10,17));
-- دَرَسُ (درس) -> دَرَسُ AL:b0f1c872480c4eaf2baa0b03ae · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b0f1c872480c4eaf2baa0b03ae'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,169,31));
-- دَعَا (دعو) -> دَعَا AL:a4c15707c0a4a825ccb14ebffb · 44 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a4c15707c0a4a825ccb14ebffb'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,186,11), (2,221,26), (2,260,32), (2,282,77), (3,153,8), (7,29,10), (7,37,25), (7,189,21), (7,193,9), (7,194,9), (7,195,21), (10,22,30), (10,38,8), (10,66,13), (11,13,10), (11,62,19), (11,101,11), (13,14,5), (14,10,9), (14,22,21), (17,110,9), (18,57,24), (21,90,14), (22,67,11), (22,73,9), (28,87,10), (30,25,10), (31,21,18), (35,6,8), (35,13,22), (35,18,7), (39,8,5), (39,38,12), (40,20,5), (40,41,4), (40,41,7), (40,50,10), (40,66,7), (40,74,10), (42,13,28), (45,28,7), (54,6,4), (57,8,7), (68,43,7));
-- دَكّ (دكك) -> دَكّ AL:7f77fe26d438707d4fe892b868 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:7f77fe26d438707d4fe892b868'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,143,29));
-- ذَكَرَ (ذكر) -> ذَكَرَ AL:7f7ff77637543cf5e1125c23bb · 21 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:7f7ff77637543cf5e1125c23bb'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,198,13), (2,198,18), (2,203,1), (2,231,26), (2,235,17), (2,239,8), (3,41,15), (3,103,7), (5,4,22), (7,69,11), (7,69,23), (7,74,18), (7,86,15), (7,171,15), (17,46,11), (18,24,5), (22,36,10), (22,40,23), (39,45,12), (46,21,1), (47,20,11));
-- ذَهَب (ذهب) -> ذَهَب AL:db71168bbce2453ac874e081af · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:db71168bbce2453ac874e081af'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (9,34,19));
-- رَابِع (ربع) -> رَابِع AL:6cbdf98580b4dcd5a51fa803b4 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:6cbdf98580b4dcd5a51fa803b4'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (58,7,19));
-- رَضِىَ (رضو) -> رَضِىَ AL:ee09dab7ac64e5225fb2b1327a · 18 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ee09dab7ac64e5225fb2b1327a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,144,9), (2,282,63), (5,3,47), (5,119,17), (5,119,20), (9,38,16), (9,83,19), (9,93,8), (9,96,6), (9,96,11), (33,51,23), (39,7,8), (39,7,13), (46,15,35), (48,18,2), (58,22,38), (98,8,13), (98,8,16));
-- رِجْز (رجز) -> رِجْز AL:ae140e81eaa5d04334902d96ab · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ae140e81eaa5d04334902d96ab'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,134,16), (45,11,10));
-- رِضْوَٰن (رضو) -> رِضْوَٰن AL:56b9944db1ccd4737ba5867e37 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:56b9944db1ccd4737ba5867e37'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,15,19), (9,72,17), (48,29,18), (57,20,33));
-- رِيح (روح) -> رِيح AL:1e4d5d8e90307a1699cfb80760 · 5 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1e4d5d8e90307a1699cfb80760'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (10,22,14), (10,22,19), (14,18,9), (22,31,18), (46,24,15));
-- زَادَ (زيد) -> زَادَ AL:dfb45ea326f67a06fd10bc9265 · 18 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfb45ea326f67a06fd10bc9265'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,58,19), (2,247,31), (5,64,17), (5,68,16), (7,69,19), (7,161,19), (11,63,20), (11,101,22), (17,60,22), (17,82,10), (18,13,10), (33,22,15), (35,1,14), (35,39,12), (35,39,20), (35,42,17), (42,23,22), (71,24,5));
-- زَبَد (زبد) -> زَبَد AL:2a1e41c23c70d58a3e169ecd7a · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2a1e41c23c70d58a3e169ecd7a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (13,17,21), (13,17,29));
-- سَأَلَ (سال) -> سَأَلَ AL:8c386d2336f69f510b2bf30d30 · 29 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8c386d2336f69f510b2bf30d30'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,61,36), (2,119,7), (2,134,12), (2,141,12), (2,189,1), (2,219,1), (2,219,15), (2,220,4), (4,32,18), (4,153,11), (6,90,9), (7,187,24), (11,46,12), (12,50,12), (16,43,9), (16,56,9), (16,93,14), (17,101,7), (20,132,7), (21,7,8), (25,59,15), (28,78,25), (29,13,6), (33,20,14), (33,53,40), (33,53,42), (42,23,12), (47,36,12), (67,8,9));
-- سَآءَ (سوا) -> سَآءَ AL:915b9dc862fa98c6687896920e · 17 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:915b9dc862fa98c6687896920e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,22,16), (4,38,17), (4,115,19), (5,66,22), (6,31,24), (9,9,10), (16,25,13), (16,59,17), (17,7,12), (17,32,7), (20,101,3), (26,173,4), (27,58,4), (29,4,8), (45,21,15), (58,15,7), (63,2,9));
-- سَكَنَ (سكن) -> سَكَنَ AL:ee9aaac9de746df8e36c968054 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ee9aaac9de746df8e36c968054'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,13,3), (7,189,10), (28,58,10));
-- سَلَّمَ (سلم) -> سَلَّمَ AL:280770cef237cad97838a42274 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:280770cef237cad97838a42274'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,233,53), (8,43,16), (24,61,61), (33,56,12));
-- سَنَا (سنو) -> سَنَا AL:lane_lemma_n20994 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n20994'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (24,43,35));
-- سُلْطَٰن (سلط) -> سُلْطَٰن AL:38f5a9e884a723fe88cb6956e8 · 8 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:38f5a9e884a723fe88cb6956e8'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,144,16), (7,71,20), (10,68,18), (14,11,22), (14,22,18), (18,15,10), (44,19,8), (52,38,8));
-- سُوٓء (سوا) -> سُوٓء AL:813e2a21aa3cf992958c8b2aba · 17 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:813e2a21aa3cf992958c8b2aba'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,123,9), (4,148,5), (6,54,18), (6,157,31), (7,188,21), (9,37,25), (12,24,14), (12,25,17), (12,51,16), (13,11,26), (13,18,22), (13,25,22), (16,27,19), (16,28,12), (40,37,13), (40,45,9), (40,52,9));
-- سِنِين (سنو) -> سِنِين AL:cb1c92debd4986369ae6760823 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:cb1c92debd4986369ae6760823'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (20,40,26));
-- شَرِيك (شرك) -> شَرِيك AL:040139d846a9a0f3c85ed1ae84 · 13 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:040139d846a9a0f3c85ed1ae84'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,12,71), (6,94,21), (6,136,28), (6,139,17), (7,195,22), (10,28,14), (10,66,17), (10,71,22), (13,16,32), (13,33,11), (30,28,13), (30,40,12), (41,47,22));
-- شَطْر (شطر) -> شَطْر AL:c32a9340005720d29359c3a4f2 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c32a9340005720d29359c3a4f2'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,144,12), (2,150,14));
-- شَفَا (شفو) -> شَفَا AL:40e4d0012bd80fb05de2acf7ad · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:40e4d0012bd80fb05de2acf7ad'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,103,22));
-- شَفَٰعَة (شفع) -> شَفَٰعَة AL:dfa47a22e1b0cd57996d3497c3 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfa47a22e1b0cd57996d3497c3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,85,11), (53,26,8));
-- شَىْء (شيا) -> شَىْء AL:21397578a8da07f1cdf2ce9bb8 · 118 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:21397578a8da07f1cdf2ce9bb8'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,29,18), (2,170,20), (2,178,20), (2,216,10), (2,216,17), (2,229,15), (2,255,35), (2,264,31), (2,282,34), (3,28,16), (3,92,11), (3,120,16), (3,144,24), (3,154,28), (3,154,47), (3,176,11), (3,189,8), (4,4,9), (4,19,29), (4,36,6), (4,59,14), (4,86,14), (4,113,18), (4,126,11), (5,17,16), (5,40,18), (5,41,50), (5,42,17), (5,104,22), (5,120,10), (6,17,16), (6,38,18), (6,52,15), (6,52,21), (6,80,18), (6,80,22), (6,102,10), (6,111,11), (7,85,25), (7,89,29), (7,156,21), (8,19,18), (8,41,5), (8,60,25), (8,72,27), (9,25,15), (9,39,15), (9,115,17), (10,36,12), (11,4,7), (11,57,15), (11,72,11), (11,85,9), (11,101,16), (12,38,14), (12,67,18), (12,111,19), (13,8,13), (13,14,11), (14,18,18), (14,38,13), (16,70,16), (16,75,9), (16,89,20), (17,12,21), (17,44,10), (18,45,22), (18,54,13), (18,71,14), (19,27,9), (20,98,11), (21,30,15), (21,81,13), (22,1,8), (22,5,55), (22,17,21), (22,73,22), (24,55,31), (27,16,13), (27,88,14), (28,57,18), (28,88,12), (29,62,13), (30,40,18), (33,27,12), (33,40,16), (33,52,24), (34,21,20), (34,39,15), (35,18,14), (35,44,21), (36,12,10), (38,5,7), (38,6,11), (39,43,12), (39,62,8), (40,16,9), (40,20,10), (40,74,13), (41,21,12), (41,53,18), (41,54,11), (42,9,15), (42,11,16), (45,10,9), (46,8,12), (46,33,21), (48,11,23), (48,21,13), (48,26,27), (49,14,23), (49,16,15), (54,6,7), (57,3,8), (58,18,13), (59,6,24), (66,10,22), (85,9,9));
-- شُحّ (شحح) -> شُحّ AL:c24d21863615e37ab0a3ec57d5 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c24d21863615e37ab0a3ec57d5'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,128,20), (33,19,22), (59,9,27), (64,16,12));
-- شِفَآء (شفي) -> شِفَآء AL:2f70150e93af5305326707ebcf · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2f70150e93af5305326707ebcf'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (16,69,17));
-- صَٰحِبَة (صحب) -> صَٰحِبَة AL:2d41168164f4bb818ec91647d2 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2d41168164f4bb818ec91647d2'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,101,11));
-- صُحُف (صحف) -> صُحُف AL:e85d68d4716ff4f467af6aac16 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e85d68d4716ff4f467af6aac16'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (20,133,12));
-- ضَلَّ (ضلل) -> ضَلَّ AL:dfed207f9c4910a4c8a557cf75 · 26 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfed207f9c4910a4c8a557cf75'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,108,16), (2,282,67), (4,116,18), (4,136,26), (4,176,46), (5,105,9), (6,24,6), (6,56,16), (6,140,17), (7,37,30), (7,53,34), (9,37,6), (10,30,12), (10,108,15), (16,87,6), (16,125,17), (17,15,7), (17,15,9), (20,52,8), (27,92,10), (33,36,22), (38,26,20), (39,41,11), (40,74,5), (46,28,11), (53,30,10));
-- ضِعْف (ضعف) -> ضِعْف AL:b6d151fe308ccc3e0fa9f09d73 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b6d151fe308ccc3e0fa9f09d73'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,38,37));
-- ظَنَّ (ظنن) -> ظَنَّ AL:c684443a26dd235d51da2508cf · 9 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c684443a26dd235d51da2508cf'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,230,20), (2,249,45), (7,171,7), (10,22,26), (17,101,16), (38,24,24), (41,48,8), (59,2,14), (59,2,17));
-- عَدَد (عدد) -> عَدَد AL:23a0e975e49efb20a8e3a192a0 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:23a0e975e49efb20a8e3a192a0'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (17,12,17));
-- عَرَضَ (عرض) -> عَرَضَ AL:714d7a2b4a8fca207e40732648 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:714d7a2b4a8fca207e40732648'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,18,9));
-- عَقِب (عقب) -> عَقِب AL:56c396ecf6cd33b587aeb13dc1 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:56c396ecf6cd33b587aeb13dc1'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,143,27), (3,144,16), (3,144,20), (8,48,21));
-- عَنكَبُوت (عنكب) -> عَنكَبُوت AL:35201c41a29d2ca0d37637180e · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:35201c41a29d2ca0d37637180e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (29,41,16));
-- عَوَان (عون) -> عَوَانٌ AL:lane_lemma_n31110 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n31110'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,68,18));
-- عَٰلِم (علم) -> عَٰلِم AL:9ef37391f7a8253152604c179f · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9ef37391f7a8253152604c179f'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,73,19), (9,94,24), (9,105,10), (34,3,11), (59,22,8), (62,8,12));
-- غَفُور (غفر) -> غَفُور AL:c111023567bcf13ff855df78f3 · 29 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c111023567bcf13ff855df78f3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,182,15), (2,199,11), (2,218,15), (2,225,13), (2,226,12), (3,31,13), (4,96,7), (4,152,16), (5,34,12), (5,39,13), (5,74,7), (5,101,24), (6,145,38), (6,165,20), (8,70,23), (9,27,11), (9,102,16), (12,98,8), (15,49,5), (16,18,9), (16,115,21), (25,70,15), (28,16,12), (33,73,14), (35,30,7), (35,34,10), (49,5,11), (57,28,20), (64,14,17));
-- غَيْب (غيب) -> غَيْب AL:242b961689f674c707584209e1 · 12 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:242b961689f674c707584209e1'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,33,14), (3,179,20), (4,34,18), (6,59,3), (6,73,20), (7,188,15), (9,94,25), (10,20,10), (18,26,7), (34,14,22), (34,53,7), (57,25,24));
-- فَتَيَٰت (فتي) -> فَتَيَٰت AL:74280882aeaedf1b60be5cb11a · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:74280882aeaedf1b60be5cb11a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (24,33,30));
-- فَرَّقُ (فرق) -> فَرَّقُ AL:248aaf7afebdf41449b9d5212e · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:248aaf7afebdf41449b9d5212e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,102,38), (2,285,16), (20,94,12));
-- فَضَّلَ (فضل) -> فَضَّلَ AL:85fdf870b1a31f9258e2edc3a3 · 8 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:85fdf870b1a31f9258e2edc3a3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,253,3), (4,95,15), (4,95,27), (6,86,6), (16,71,10), (17,55,8), (17,70,12), (27,15,10));
-- فَطَرَ (فطر) -> فَطَرَ AL:614971f9bc836217328ead3400 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:614971f9bc836217328ead3400'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,51,11), (17,51,12), (30,30,8));
-- فِئَة (فاي) -> فِئَة AL:762bd83b28e25a96e3cd09b1af · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:762bd83b28e25a96e3cd09b1af'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,249,51), (3,13,8), (4,88,5), (8,48,18));
-- قَآئِمَة (قوم) -> قَآئِمَة AL:c05af60cba0cb59e88e03caf06 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c05af60cba0cb59e88e03caf06'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,113,7));
-- قَصَّ (قصص) -> قَصَّ AL:bf36aaded9fdfc6bdd9f254d25 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:bf36aaded9fdfc6bdd9f254d25'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,57,18), (7,176,27), (28,25,17));
-- قَلِيل (قلل) -> قَلِيل AL:51e8f7139b07dbe30bce0b47ae · 21 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:51e8f7139b07dbe30bce0b47ae'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,41,16), (2,88,8), (2,246,50), (2,249,28), (4,77,41), (5,13,24), (5,44,32), (7,3,12), (7,10,9), (18,22,22), (23,78,8), (27,62,14), (28,58,14), (32,9,12), (34,13,16), (38,24,21), (39,8,30), (40,58,11), (67,23,10), (69,41,5), (69,42,4));
-- كَانَ (كون) -> كَانَ AL:aadc307e15c6a4ed6cd500b282 · 352 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,10,11), (2,33,21), (2,64,11), (2,75,6), (2,103,11), (2,113,29), (2,114,16), (2,117,10), (2,135,13), (2,142,10), (2,143,17), (2,143,29), (2,143,37), (2,144,17), (2,147,5), (2,184,4), (2,185,19), (2,187,17), (2,196,19), (2,196,62), (2,198,22), (2,232,19), (2,247,13), (2,248,29), (2,282,36), (2,282,98), (2,283,2), (3,24,14), (3,44,8), (3,44,17), (3,49,20), (3,59,14), (3,93,3), (3,95,9), (3,97,8), (3,106,16), (3,154,43), (3,154,53), (3,179,16), (3,183,27), (4,6,21), (4,6,25), (4,11,10), (4,11,19), (4,11,31), (4,11,36), (4,11,44), (4,12,8), (4,12,12), (4,12,32), (4,12,51), (4,12,66), (4,16,12), (4,17,17), (4,22,13), (4,23,52), (4,29,21), (4,33,15), (4,35,20), (4,39,12), (4,40,8), (4,43,21), (4,43,46), (4,46,27), (4,47,25), (4,56,18), (4,59,20), (4,66,23), (4,85,17), (4,86,11), (4,92,24), (4,92,35), (4,94,27), (4,94,36), (4,96,5), (4,97,17), (4,99,7), (4,100,28), (4,101,20), (4,102,44), (4,102,50), (4,104,19), (4,105,13), (4,106,5), (4,107,12), (4,108,17), (4,111,8), (4,113,27), (4,126,8), (4,127,38), (4,128,26), (4,129,20), (4,131,29), (4,135,16), (4,148,11), (4,152,14), (4,158,5), (4,159,12), (4,165,12), (4,170,20), (4,176,23), (5,23,20), (5,61,15), (5,62,12), (5,75,14), (5,78,16), (5,79,9), (5,116,19), (5,116,28), (5,117,21), (6,5,10), (6,14,17), (6,24,9), (6,35,26), (6,52,23), (6,73,10), (6,93,40), (6,101,9), (6,108,24), (6,111,14), (6,114,21), (6,120,11), (6,122,23), (6,136,16), (6,136,23), (6,139,13), (6,140,19), (6,152,25), (6,158,25), (6,159,18), (7,43,18), (7,51,17), (7,53,29), (7,64,12), (7,70,15), (7,72,12), (7,86,17), (7,86,22), (7,89,16), (7,92,11), (7,103,14), (7,146,34), (7,147,12), (7,188,13), (7,194,13), (8,33,8), (8,35,12), (8,36,12), (8,41,17), (8,65,8), (8,65,15), (8,66,10), (8,66,17), (8,73,8), (9,18,21), (9,35,18), (9,41,14), (9,53,10), (9,65,12), (9,66,15), (9,74,27), (9,75,10), (9,105,15), (9,122,2), (10,12,26), (10,13,12), (10,15,19), (10,22,9), (10,38,15), (10,42,9), (10,43,9), (10,45,19), (10,71,10), (10,72,14), (10,73,15), (10,93,22), (10,94,20), (10,99,14), (10,104,24), (11,8,20), (11,13,17), (11,17,27), (11,43,21), (11,47,17), (11,49,8), (11,116,25), (12,29,8), (12,33,15), (12,38,8), (12,102,8), (12,109,18), (13,32,12), (13,38,11), (14,11,18), (14,44,19), (16,32,11), (16,33,20), (16,36,26), (16,43,13), (16,56,11), (16,87,9), (16,92,30), (16,93,16), (16,95,14), (16,118,13), (16,123,10), (16,124,15), (16,127,10), (17,3,7), (17,11,6), (17,15,17), (17,20,9), (17,25,10), (17,27,6), (17,30,9), (17,31,11), (17,32,5), (17,36,14), (17,44,19), (17,66,12), (17,67,16), (17,78,13), (17,81,8), (17,83,11), (17,87,7), (17,93,23), (17,96,8), (17,100,12), (18,28,28), (18,45,18), (18,51,10), (18,98,12), (18,110,13), (19,13,5), (19,21,13), (19,29,7), (19,41,6), (19,44,7), (19,47,8), (19,51,6), (19,51,8), (19,54,6), (19,54,9), (19,56,6), (19,61,9), (19,64,16), (19,71,5), (19,82,4), (21,7,12), (21,47,11), (21,51,7), (21,73,13), (21,74,13), (21,77,8), (21,81,11), (21,90,10), (22,78,25), (22,78,29), (24,2,17), (25,6,10), (25,7,14), (25,15,10), (25,16,6), (25,26,5), (25,40,13), (25,55,10), (25,65,10), (25,70,13), (25,77,11), (26,8,6), (26,63,9), (26,67,6), (26,103,6), (26,121,6), (26,139,8), (26,158,8), (26,174,6), (26,181,4), (26,190,6), (27,12,17), (27,14,9), (27,56,2), (27,82,13), (27,91,15), (28,4,17), (28,8,12), (28,10,15), (28,19,30), (28,32,23), (28,40,8), (28,45,8), (28,76,3), (28,84,17), (28,86,13), (28,87,14), (29,16,12), (29,29,11), (29,31,14), (29,32,14), (29,33,21), (29,39,12), (29,40,22), (29,40,26), (30,9,26), (30,55,11), (30,56,18), (31,21,16), (32,14,13), (32,24,8), (33,1,11), (33,2,9), (33,15,10), (33,19,31), (33,20,18), (33,24,14), (33,25,13), (33,30,12), (33,34,12), (33,37,45), (33,38,18), (33,40,13), (33,43,11), (33,50,55), (33,50,58), (33,52,20), (33,53,29), (33,53,51), (33,59,18), (33,69,13), (33,72,16), (34,14,20), (34,32,14), (34,41,8), (34,45,13), (34,54,12), (35,18,16), (35,26,6), (35,44,17), (35,44,28), (35,45,23), (36,28,12), (36,30,9), (36,62,7), (37,22,6), (37,30,8), (38,75,12), (39,7,26), (39,8,16), (39,24,12), (39,43,9), (39,47,24), (42,20,11));
-- كَبُرَ (كبر) -> كَبُرَ AL:b0d876bc7cea8d44e55e5f311c · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b0d876bc7cea8d44e55e5f311c'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,6,19), (18,5,8), (40,35,9), (42,13,24));
-- كَفَىٰ (كفي) -> كَفَىٰ AL:7e7700564e304b6924778e14cb · 19 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:7e7700564e304b6924778e14cb'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,137,15), (4,45,4), (4,50,7), (4,55,9), (4,70,5), (4,132,8), (13,43,7), (17,17,8), (17,65,7), (21,47,18), (25,31,8), (25,58,9), (33,3,4), (33,25,9), (33,39,11), (33,48,10), (41,53,13), (46,8,18), (48,28,12));
-- كَوْكَب (كوكب) -> كَوْكَب AL:4db13776dfab79d320d30d13ff · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4db13776dfab79d320d30d13ff'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (24,35,15));
-- كِفْل (كفل) -> كِفْل AL:47bb3dbc636fa5e913ca2615b9 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:47bb3dbc636fa5e913ca2615b9'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,85,15));
-- كِيدُ (كيد) -> كِيدُ AL:9fe65f3d738e33f451fe76b5b3 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9fe65f3d738e33f451fe76b5b3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,55,3), (12,76,12));
-- لَا (—) -> لَا AL:8303810dfb4be15f22794c1210 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8303810dfb4be15f22794c1210'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (13,37,18));
-- لَيْت (—) -> لَيْت AL:a54284353a0a023f64e8f23b96 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a54284353a0a023f64e8f23b96'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (28,79,11), (36,26,5));
-- مَتَّعْ (متع) -> مَتَّعْ AL:234a3cb178bdadd4ef08ed97c3 · 4 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:234a3cb178bdadd4ef08ed97c3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,126,22), (2,236,14), (11,48,13), (33,49,19));
-- مَدَّ (مدد) -> مَدَّ AL:ae92d8c62e8afec8c22ab57ba7 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ae92d8c62e8afec8c22ab57ba7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (19,79,5));
-- مَدْيَن (مدن) -> مَدْيَن AL:969668ea3d670285e82414bb0e · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:969668ea3d670285e82414bb0e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,84,2), (11,95,7), (28,45,12));
-- مَرَجَ (مرج) -> مَرَجَ AL:b898f648f6f196a23931fcc8ea · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b898f648f6f196a23931fcc8ea'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (25,53,3));
-- مَرْء (مرا) -> مَرْء AL:b51fc55950c8d301d8576746d7 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b51fc55950c8d301d8576746d7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (8,24,16));
-- مَرْضَات (رضو) -> مَرْضَات AL:9735e4f0dcbb6455205b87fb45 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9735e4f0dcbb6455205b87fb45'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,114,21), (60,1,32), (66,1,10));
-- مَسْكَنَة (سكن) -> مَسْكَنَة AL:f7a6b663a31599368aac7cecc9 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f7a6b663a31599368aac7cecc9'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,61,40));
-- مَصْرُوف (صرف) -> مَصْرُوفٌ AL:lane_lemma_n24240 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n24240'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,8,15));
-- مَعْذِرَة (عذر) -> مَعْذِرَة AL:10354c2e0482ede40fc596ab5e · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:10354c2e0482ede40fc596ab5e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (7,164,15));
-- مَكَّ (مكن) -> مَكَّ AL:271527256b867cf92227ed73a8 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:271527256b867cf92227ed73a8'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (12,21,16), (28,57,10));
-- مَوْج (موج) -> مَوْج AL:8463222c938e0719566add224e · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8463222c938e0719566add224e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (10,22,22), (11,43,20));
-- مَيْل (ميل) -> مَيْل AL:6307bb63bf45e4b3a279682ab8 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:6307bb63bf45e4b3a279682ab8'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,129,12));
-- مُؤْمِن (امن) -> مُؤْمِن AL:a04a6ff956a9c382bad8739cd9 · 17 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (3,110,21), (4,84,10), (4,92,11), (4,92,30), (4,103,18), (4,146,16), (8,17,14), (9,111,5), (12,17,14), (33,6,17), (33,25,11), (33,37,36), (40,40,16), (48,18,5), (48,25,15), (63,8,13), (66,4,17));
-- مُصْفَرّ (صفر) -> مُصْفَرّ AL:85d97d1c843414bc40bf337b3f · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:85d97d1c843414bc40bf337b3f'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (57,20,22));
-- مُلَٰقُوا (لقي) -> مُلَٰقُوا AL:a21970e9ca4c5ad1cd73ea3474 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a21970e9ca4c5ad1cd73ea3474'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,223,14), (2,249,47));
-- مِثْقَال (ثقل) -> مِثْقَال AL:9b3339b6009ca4d44d53c941e1 · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9b3339b6009ca4d44d53c941e1'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (10,61,26), (34,3,16), (34,22,10));
-- مِرْيَة (مري) -> مِرْيَة AL:1e30cbb1a0fb6ed8a51c6bd298 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1e30cbb1a0fb6ed8a51c6bd298'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (11,17,29));
-- مِن (—) -> مِن AL:3312dd99c7201accb7bc026a70 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3312dd99c7201accb7bc026a70'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (13,37,14));
-- نَار (نور) -> نَار AL:49ff52512529e41eff1b9d6785 · 36 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:49ff52512529e41eff1b9d6785'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,126,28), (2,174,19), (2,221,28), (2,257,21), (2,275,42), (3,103,25), (3,151,16), (3,185,13), (5,64,36), (5,72,29), (6,128,24), (7,12,14), (9,17,16), (9,81,21), (10,27,24), (11,17,24), (13,5,22), (13,17,16), (16,62,15), (18,29,14), (18,96,14), (22,19,12), (22,72,23), (24,57,9), (28,29,11), (28,29,17), (28,29,25), (29,25,23), (32,20,17), (38,76,7), (41,40,12), (47,12,20), (47,15,39), (57,15,11), (66,10,25), (72,23,12));
-- نَجَا (نجو) -> نَجَا AL:59b78427651f2179ad2b4f1bd4 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:59b78427651f2179ad2b4f1bd4'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (28,25,23));
-- نَظَر (نظر) -> نَظَرٌ AL:lane_lemma_n40045 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n40045'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (47,20,21));
-- نَظَرَ (نظر) -> نَظَرَ AL:c2f902b2b26f34f5caeec1759a · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c2f902b2b26f34f5caeec1759a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (8,6,11));
-- نَفْس (نفس) -> نَفْس AL:1f8695e4d83d0e66198628b0c4 · 105 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,44,5), (2,87,23), (2,110,7), (2,223,9), (2,231,20), (2,233,19), (2,234,20), (2,235,41), (2,240,22), (2,272,13), (2,281,10), (2,284,12), (3,28,24), (3,30,23), (3,93,12), (3,117,22), (3,154,15), (3,154,36), (3,165,14), (3,168,12), (3,186,4), (4,4,11), (4,29,18), (4,64,13), (4,79,12), (4,95,19), (4,128,19), (4,135,11), (5,52,27), (5,70,15), (5,80,11), (5,116,35), (5,116,40), (6,12,11), (6,20,10), (6,26,9), (6,54,12), (6,70,14), (6,93,34), (6,104,8), (6,123,13), (6,130,18), (6,130,24), (6,151,32), (6,152,18), (6,158,22), (6,164,13), (7,37,34), (7,53,33), (7,189,5), (9,35,15), (9,36,25), (9,42,19), (9,55,15), (9,85,14), (10,15,25), (10,23,15), (10,108,13), (11,31,27), (12,18,10), (12,30,10), (12,32,9), (12,51,26), (12,53,3), (12,53,5), (12,77,13), (13,11,21), (13,16,15), (13,42,13), (14,22,27), (16,111,4), (16,111,7), (16,111,10), (18,51,8), (20,40,19), (21,43,10), (21,102,8), (25,21,16), (27,40,32), (27,44,22), (27,92,8), (30,28,22), (30,44,8), (31,12,12), (31,34,14), (31,34,20), (35,8,18), (35,18,31), (35,32,10), (37,113,9), (39,15,11), (39,41,9), (39,53,6), (41,31,12), (42,11,7), (42,45,18), (43,71,10), (47,38,16), (48,10,16), (53,23,20), (53,32,27), (57,14,9), (65,1,33), (65,7,17), (73,20,63));
-- نُسِفَتْ (نسف) -> نُسِفَتْ AL:7b3a6841660682d0dac26ff782 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:7b3a6841660682d0dac26ff782'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (20,97,25));
-- نِفَاق (نفق) -> نِفَاق AL:e68ead10f43e6fd67a5c4a4c1e · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e68ead10f43e6fd67a5c4a4c1e'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (9,101,11));
-- هَادِي (هدي) -> هَادِي AL:e44bc3fafcabe4e55aa1bf9c2d · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e44bc3fafcabe4e55aa1bf9c2d'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (25,31,10));
-- هَمَّ (همم) -> هَمَّ AL:347e5bcae5cdd50fc587fff940 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:347e5bcae5cdd50fc587fff940'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (12,24,4), (40,5,8));
-- هَٰرُون (—) -> هَٰرُون AL:e4abde5edc15e3c2b7dbff14ed · 3 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e4abde5edc15e3c2b7dbff14ed'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,163,21), (6,84,18), (7,142,15));
-- هُدًى (هدي) -> هُدًى AL:e0efc2cd017d79e8eec37f46b2 · 26 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0efc2cd017d79e8eec37f46b2'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,38,8), (2,38,11), (2,120,12), (2,120,15), (2,272,3), (5,46,16), (5,46,24), (6,35,24), (6,71,32), (6,71,35), (6,90,5), (6,91,24), (6,157,16), (7,154,10), (7,203,20), (16,64,11), (16,89,21), (20,123,11), (20,123,14), (28,50,15), (28,85,14), (31,20,27), (32,23,12), (34,24,13), (39,23,22), (41,44,15));
-- وَحْى (وحي) -> وَحْى AL:797b56f29fb83ef01f065223f3 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:797b56f29fb83ef01f065223f3'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (20,114,13), (42,51,8));
-- وَصِيد (وصد) -> وَصِيدٌ AL:lane_lemma_n41997 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:lane_lemma_n41997'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (18,18,13));
-- وَفَّىٰٓ (وفي) -> وَفَّىٰٓ AL:192c7214632530f0baeee207a1 · 7 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:192c7214632530f0baeee207a1'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,272,24), (2,281,8), (3,161,14), (3,185,6), (8,60,29), (39,10,17), (46,19,5));
-- وَلِىّ (ولي) -> وَلِىّ AL:06be2bdc2f75b2400e0ccfa647 · 41 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:06be2bdc2f75b2400e0ccfa647'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,107,15), (2,257,12), (2,282,50), (3,68,12), (4,45,6), (4,76,14), (4,89,11), (4,119,14), (4,123,18), (4,173,24), (5,51,8), (5,51,10), (6,51,13), (6,70,22), (6,121,15), (6,127,7), (6,128,11), (7,27,27), (7,30,10), (7,155,35), (8,34,15), (9,116,15), (12,101,14), (13,16,12), (17,33,14), (17,97,11), (18,26,18), (18,50,18), (29,22,15), (32,4,20), (33,6,23), (33,17,22), (33,65,6), (39,3,9), (41,34,16), (42,8,17), (42,9,8), (42,28,12), (42,31,12), (45,10,16), (45,19,11));
-- وَلِيد (ولد) -> وَلِيد AL:d86a30d0007e1bd5bd36ba4c25 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d86a30d0007e1bd5bd36ba4c25'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (4,127,27), (76,19,3));
-- يَذَرَ (وذر) -> يذر AL:e42d1c315bdbff04ddb8868072 · 6 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e42d1c315bdbff04ddb8868072'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (6,112,21), (6,137,18), (7,73,24), (7,180,6), (7,186,7), (10,11,11));
-- يَتَعَدَّ (عدو) -> يَتَعَدَّ AL:f82921cb9e13372e201535dda7 · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f82921cb9e13372e201535dda7'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,229,41), (65,1,28));
-- يَشَّقَّقُ (شقق) -> يَشَّقَّقُ AL:a53910ea687f49fc69888971f9 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a53910ea687f49fc69888971f9'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (2,74,22));
-- يَعْرُجُ (عرج) -> يَعْرُجُ AL:10214878714b4e544a23353fc6 · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:10214878714b4e544a23353fc6'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (57,4,26));
-- يَلْمِزُ (لمز) -> يَلْمِزُ AL:39e844798adf6d98174aa5108f · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:39e844798adf6d98174aa5108f'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (49,11,24));
-- يُسْجَنَ (سجن) -> يُسْجَنَ AL:c3340816e90ea3522f84e90e2b · 2 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c3340816e90ea3522f84e90e2b'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (12,25,20), (12,32,16));
-- يُعْجِزَ (عجز) -> يُعْجِزَ AL:2d6726053ea47da9f6b3237f1a · 1 null
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2d6726053ea47da9f6b3237f1a'
 WHERE gid_lemma IS NULL AND (surah, ayah, word_index) IN (VALUES (35,44,19));
-- ── updates: wrong link -> canonical (old value in the comment and in qr_word_lemma_link_fix) ──
-- ءَاذَن (اذن): was AL:4778c31b1db630743c03bb480f (أَيْن) -> AL:8cbf84429e16bbe1364a335bcb (ءَاذَن) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8cbf84429e16bbe1364a335bcb'
 WHERE gid_lemma = 'AL:4778c31b1db630743c03bb480f' AND (surah, ayah, word_index) IN (VALUES (41,47,24));
-- ءَال (اول): was AL:d6a84cc7ce680802b27c6e8fe7 (إِبْرَاهِيم) -> AL:caf91707b517817afdd24b08c1 (ءَال) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:caf91707b517817afdd24b08c1'
 WHERE gid_lemma = 'AL:d6a84cc7ce680802b27c6e8fe7' AND (surah, ayah, word_index) IN (VALUES (3,33,8));
-- ءَال (اول): was AL:f881c23505da1cfeb050a97408 (آتَى) -> AL:caf91707b517817afdd24b08c1 (ءَال) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:caf91707b517817afdd24b08c1'
 WHERE gid_lemma = 'AL:f881c23505da1cfeb050a97408' AND (surah, ayah, word_index) IN (VALUES (4,54,12));
-- ءَامَنَ (امن): was AL:a4c15707c0a4a825ccb14ebffb (دَعَا) -> AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4f08afc22e70243ab6880ff767'
 WHERE gid_lemma = 'AL:a4c15707c0a4a825ccb14ebffb' AND (surah, ayah, word_index) IN (VALUES (57,8,8));
-- ءَامَنَ (امن): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) · 6 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4f08afc22e70243ab6880ff767'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (4,59,21), (6,111,15), (6,158,26), (8,41,18), (10,13,13), (24,2,18));
-- ءَامَنَ (امن): was AL:ae140e81eaa5d04334902d96ab (رِجْز) -> AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4f08afc22e70243ab6880ff767'
 WHERE gid_lemma = 'AL:ae140e81eaa5d04334902d96ab' AND (surah, ayah, word_index) IN (VALUES (7,134,17));
-- أَحَد (احد): was AL:1e45816be11c2c5a1a4dd52722 (أَمْسَكَ) -> AL:3aba40de5f61d2ab8fae05acb4 (أَحَد) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3aba40de5f61d2ab8fae05acb4'
 WHERE gid_lemma = 'AL:1e45816be11c2c5a1a4dd52722' AND (surah, ayah, word_index) IN (VALUES (35,41,13));
-- أَفْوَٰه (فوه): was AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) -> AL:d5a07ea1bd649e9b98d080eddc (أَفْوَٰه) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d5a07ea1bd649e9b98d080eddc'
 WHERE gid_lemma = 'AL:4f08afc22e70243ab6880ff767' AND (surah, ayah, word_index) IN (VALUES (5,41,13));
-- أَنّ (—): was AL:e87b01d6a238b28f50fc8d95c1 (إِنّ) -> AL:5f8c07c39f3fc68a16c3e9bb9f (أَنّ) · 6 · ok_fine_suspect
UPDATE qr_word_occurrence SET gid_lemma = 'AL:5f8c07c39f3fc68a16c3e9bb9f'
 WHERE gid_lemma = 'AL:e87b01d6a238b28f50fc8d95c1' AND (surah, ayah, word_index) IN (VALUES (8,28,2), (11,14,5), (18,110,8), (21,108,5), (38,70,5), (41,6,8));
-- أُفِكَ (افك): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:d713aea7ecaba0d904490f6a50 (أُفِكَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d713aea7ecaba0d904490f6a50'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (30,55,12));
-- إِبْرَاهِيم (—): was AL:caf91707b517817afdd24b08c1 (ءَال) -> AL:d6a84cc7ce680802b27c6e8fe7 (إِبْرَاهِيم) · 2 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d6a84cc7ce680802b27c6e8fe7'
 WHERE gid_lemma = 'AL:caf91707b517817afdd24b08c1' AND (surah, ayah, word_index) IN (VALUES (3,33,7), (4,54,13));
-- إِبْرَاهِيم (—): was AL:f881c23505da1cfeb050a97408 (آتَى) -> AL:d6a84cc7ce680802b27c6e8fe7 (إِبْرَاهِيم) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d6a84cc7ce680802b27c6e8fe7'
 WHERE gid_lemma = 'AL:f881c23505da1cfeb050a97408' AND (surah, ayah, word_index) IN (VALUES (21,51,3));
-- إِلَىٰ (—): was AL:a65a3552006f0b1266d233ba25 (سِيقَ) -> AL:cb79435a4ed07d7e44697fceaf (إِلَىٰ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:cb79435a4ed07d7e44697fceaf'
 WHERE gid_lemma = 'AL:a65a3552006f0b1266d233ba25' AND (surah, ayah, word_index) IN (VALUES (8,6,8));
-- إِنسَٰن (انس): was AL:60cfb41b9b6f4d1a704e15594a (خَلَقَ) -> AL:e0d8856bacbf8dc523d9191fc3 (إِنسَٰن) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0d8856bacbf8dc523d9191fc3'
 WHERE gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a' AND (surah, ayah, word_index) IN (VALUES (4,28,7));
-- إِنسَٰن (انس): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:e0d8856bacbf8dc523d9191fc3 (إِنسَٰن) · 2 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0d8856bacbf8dc523d9191fc3'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (17,11,7), (17,100,13));
-- إِنسَٰن (انس): was AL:d4016da73fe6aaeae71d83ca32 (تَذَكَّرَ) -> AL:e0d8856bacbf8dc523d9191fc3 (إِنسَٰن) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0d8856bacbf8dc523d9191fc3'
 WHERE gid_lemma = 'AL:d4016da73fe6aaeae71d83ca32' AND (surah, ayah, word_index) IN (VALUES (89,23,6));
-- إِنّ (—): was AL:3b4b4f2a6b4c7a6083189fd225 (سَمِعَ) -> AL:e87b01d6a238b28f50fc8d95c1 (إِنّ) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e87b01d6a238b28f50fc8d95c1'
 WHERE gid_lemma = 'AL:3b4b4f2a6b4c7a6083189fd225' AND (surah, ayah, word_index) IN (VALUES (2,181,5));
-- إِنّ (—): was AL:f2da9ea55961e731211a2d36ae (بَدَّلَ) -> AL:e87b01d6a238b28f50fc8d95c1 (إِنّ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e87b01d6a238b28f50fc8d95c1'
 WHERE gid_lemma = 'AL:f2da9ea55961e731211a2d36ae' AND (surah, ayah, word_index) IN (VALUES (2,181,10));
-- اشْتَرَىٰ (شري): was AL:ee39c1f013b0b40c60b4021192 (خَشِىَ) -> AL:4290844d60727ee929934417c7 (اشْتَرَىٰ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4290844d60727ee929934417c7'
 WHERE gid_lemma = 'AL:ee39c1f013b0b40c60b4021192' AND (surah, ayah, word_index) IN (VALUES (5,44,29));
-- اللَّه (اله): was AL:3312dd99c7201accb7bc026a70 (مِن) -> AL:f00d9788b057deef5788896d2f (اللَّه) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f00d9788b057deef5788896d2f'
 WHERE gid_lemma = 'AL:3312dd99c7201accb7bc026a70' AND (surah, ayah, word_index) IN (VALUES (13,37,15));
-- اللَّه (اله): was AL:e87b01d6a238b28f50fc8d95c1 (إِنّ) -> AL:f00d9788b057deef5788896d2f (اللَّه) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f00d9788b057deef5788896d2f'
 WHERE gid_lemma = 'AL:e87b01d6a238b28f50fc8d95c1' AND (surah, ayah, word_index) IN (VALUES (2,181,11));
-- الَّذِى (—): was AL:69bd0f7ea2abfbecc226c1e6af (عَلَىٰ) -> AL:8975ccd375c9db212ef12916e0 (الَّذِى) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8975ccd375c9db212ef12916e0'
 WHERE gid_lemma = 'AL:69bd0f7ea2abfbecc226c1e6af' AND (surah, ayah, word_index) IN (VALUES (2,181,8));
-- آتَى (اتي): was AL:49ff52512529e41eff1b9d6785 (نَار) -> AL:f881c23505da1cfeb050a97408 (آتَى) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f881c23505da1cfeb050a97408'
 WHERE gid_lemma = 'AL:49ff52512529e41eff1b9d6785' AND (surah, ayah, word_index) IN (VALUES (18,96,16));
-- آتَى (اتي): was AL:c32a9340005720d29359c3a4f2 (شَطْر) -> AL:f881c23505da1cfeb050a97408 (آتَى) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f881c23505da1cfeb050a97408'
 WHERE gid_lemma = 'AL:c32a9340005720d29359c3a4f2' AND (surah, ayah, word_index) IN (VALUES (2,144,23));
-- بَدَّلَ (بدل): was AL:8975ccd375c9db212ef12916e0 (الَّذِى) -> AL:f2da9ea55961e731211a2d36ae (بَدَّلَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f2da9ea55961e731211a2d36ae'
 WHERE gid_lemma = 'AL:8975ccd375c9db212ef12916e0' AND (surah, ayah, word_index) IN (VALUES (2,181,9));
-- ثُقِفُ (ثقف): was AL:4778c31b1db630743c03bb480f (أَيْن) -> AL:50532e48af7b183b1e71d2c3a5 (ثَقَفَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:50532e48af7b183b1e71d2c3a5'
 WHERE gid_lemma = 'AL:4778c31b1db630743c03bb480f' AND (surah, ayah, word_index) IN (VALUES (33,61,3));
-- حِزْب (حزب): was AL:a4c15707c0a4a825ccb14ebffb (دَعَا) -> AL:5578bcd902a7630e21891b3612 (حِزْب) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:5578bcd902a7630e21891b3612'
 WHERE gid_lemma = 'AL:a4c15707c0a4a825ccb14ebffb' AND (surah, ayah, word_index) IN (VALUES (35,6,9));
-- حِزْب (حزب): was AL:ee09dab7ac64e5225fb2b1327a (رَضِىَ) -> AL:5578bcd902a7630e21891b3612 (حِزْب) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:5578bcd902a7630e21891b3612'
 WHERE gid_lemma = 'AL:ee09dab7ac64e5225fb2b1327a' AND (surah, ayah, word_index) IN (VALUES (58,22,44));
-- حِلّ (حلل): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:e7929ebfad2363c355914dc02b (حِلّ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e7929ebfad2363c355914dc02b'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (3,93,4));
-- خَلَقَ (خلق): was AL:2d41168164f4bb818ec91647d2 (صَٰحِبَة) -> AL:60cfb41b9b6f4d1a704e15594a (خَلَقَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a'
 WHERE gid_lemma = 'AL:2d41168164f4bb818ec91647d2' AND (surah, ayah, word_index) IN (VALUES (6,101,12));
-- خَلَقَ (خلق): was AL:49ff52512529e41eff1b9d6785 (نَار) -> AL:60cfb41b9b6f4d1a704e15594a (خَلَقَ) · 2 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a'
 WHERE gid_lemma = 'AL:49ff52512529e41eff1b9d6785' AND (surah, ayah, word_index) IN (VALUES (7,12,15), (38,76,8));
-- خَلَقَ (خلق): was AL:e0d8856bacbf8dc523d9191fc3 (إِنسَٰن) -> AL:60cfb41b9b6f4d1a704e15594a (خَلَقَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a'
 WHERE gid_lemma = 'AL:e0d8856bacbf8dc523d9191fc3' AND (surah, ayah, word_index) IN (VALUES (70,19,3));
-- دَعَا (دعو): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:a4c15707c0a4a825ccb14ebffb (دَعَا) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a4c15707c0a4a825ccb14ebffb'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (39,8,17));
-- زَادَ (زيد): was AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) -> AL:dfb45ea326f67a06fd10bc9265 (زَادَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfb45ea326f67a06fd10bc9265'
 WHERE gid_lemma = 'AL:4f08afc22e70243ab6880ff767' AND (surah, ayah, word_index) IN (VALUES (9,124,15));
-- سَأَلَ (سال): was AL:1e45816be11c2c5a1a4dd52722 (أَمْسَكَ) -> AL:8c386d2336f69f510b2bf30d30 (سَأَلَ) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8c386d2336f69f510b2bf30d30'
 WHERE gid_lemma = 'AL:1e45816be11c2c5a1a4dd52722' AND (surah, ayah, word_index) IN (VALUES (60,10,45));
-- سَمِيع (سمع): was AL:f00d9788b057deef5788896d2f (اللَّه) -> AL:f0e4ccf6f2439fc44e34b59ba4 (سَمِيع) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:f0e4ccf6f2439fc44e34b59ba4'
 WHERE gid_lemma = 'AL:f00d9788b057deef5788896d2f' AND (surah, ayah, word_index) IN (VALUES (2,181,12));
-- سُلْطَٰن (سلط): was AL:06be2bdc2f75b2400e0ccfa647 (وَلِىّ) -> AL:38f5a9e884a723fe88cb6956e8 (سُلْطَٰن) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:38f5a9e884a723fe88cb6956e8'
 WHERE gid_lemma = 'AL:06be2bdc2f75b2400e0ccfa647' AND (surah, ayah, word_index) IN (VALUES (17,33,15));
-- سُوٓء (سوا): was AL:1f8695e4d83d0e66198628b0c4 (نَفْس) -> AL:813e2a21aa3cf992958c8b2aba (سُوٓء) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:813e2a21aa3cf992958c8b2aba'
 WHERE gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4' AND (surah, ayah, word_index) IN (VALUES (12,53,7));
-- سِنِين (سنو): was AL:23a0e975e49efb20a8e3a192a0 (عَدَد) -> AL:cb1c92debd4986369ae6760823 (سِنِين) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:cb1c92debd4986369ae6760823'
 WHERE gid_lemma = 'AL:23a0e975e49efb20a8e3a192a0' AND (surah, ayah, word_index) IN (VALUES (17,12,18));
-- سِيقَ (سوق): was AL:49eabda29351d3262c6ba028a5 (كَأَنّ) -> AL:a65a3552006f0b1266d233ba25 (سِيقَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a65a3552006f0b1266d233ba25'
 WHERE gid_lemma = 'AL:49eabda29351d3262c6ba028a5' AND (surah, ayah, word_index) IN (VALUES (8,6,7));
-- شَرِيك (شرك): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:040139d846a9a0f3c85ed1ae84 (شَرِيك) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:040139d846a9a0f3c85ed1ae84'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (6,136,17));
-- شَطْر (شطر): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:c32a9340005720d29359c3a4f2 (شَطْر) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c32a9340005720d29359c3a4f2'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (2,144,20));
-- شَىْء (شيا): was AL:60cfb41b9b6f4d1a704e15594a (خَلَقَ) -> AL:21397578a8da07f1cdf2ce9bb8 (شَىْء) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:21397578a8da07f1cdf2ce9bb8'
 WHERE gid_lemma = 'AL:60cfb41b9b6f4d1a704e15594a' AND (surah, ayah, word_index) IN (VALUES (6,101,14));
-- شَىْء (شيا): was AL:a679a2ae4c5eb7f4fd3409421e (أَشْرَكَ) -> AL:21397578a8da07f1cdf2ce9bb8 (شَىْء) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:21397578a8da07f1cdf2ce9bb8'
 WHERE gid_lemma = 'AL:a679a2ae4c5eb7f4fd3409421e' AND (surah, ayah, word_index) IN (VALUES (6,151,11));
-- شَىْء (شيا): was AL:dfa47a22e1b0cd57996d3497c3 (شَفَٰعَة) -> AL:21397578a8da07f1cdf2ce9bb8 (شَىْء) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:21397578a8da07f1cdf2ce9bb8'
 WHERE gid_lemma = 'AL:dfa47a22e1b0cd57996d3497c3' AND (surah, ayah, word_index) IN (VALUES (53,26,9));
-- شِفَآء (شفي): was AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) -> AL:2f70150e93af5305326707ebcf (شِفَآء) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:2f70150e93af5305326707ebcf'
 WHERE gid_lemma = 'AL:4f08afc22e70243ab6880ff767' AND (surah, ayah, word_index) IN (VALUES (41,44,16));
-- ضَلَّ (ضلل): was AL:703fa0881d602ecc13b00cd5f2 (تَقَطَّعَ) -> AL:dfed207f9c4910a4c8a557cf75 (ضَلَّ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfed207f9c4910a4c8a557cf75'
 WHERE gid_lemma = 'AL:703fa0881d602ecc13b00cd5f2' AND (surah, ayah, word_index) IN (VALUES (6,94,25));
-- ضَلَّ (ضلل): was AL:e0efc2cd017d79e8eec37f46b2 (هُدًى) -> AL:dfed207f9c4910a4c8a557cf75 (ضَلَّ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:dfed207f9c4910a4c8a557cf75'
 WHERE gid_lemma = 'AL:e0efc2cd017d79e8eec37f46b2' AND (surah, ayah, word_index) IN (VALUES (20,123,16));
-- ضِعْف (ضعف): was AL:f881c23505da1cfeb050a97408 (آتَى) -> AL:b6d151fe308ccc3e0fa9f09d73 (ضِعْف) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b6d151fe308ccc3e0fa9f09d73'
 WHERE gid_lemma = 'AL:f881c23505da1cfeb050a97408' AND (surah, ayah, word_index) IN (VALUES (7,38,32));
-- ظَنَّ (ظنن): was AL:1f8695e4d83d0e66198628b0c4 (نَفْس) -> AL:c684443a26dd235d51da2508cf (ظَنَّ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c684443a26dd235d51da2508cf'
 WHERE gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4' AND (surah, ayah, word_index) IN (VALUES (3,154,16));
-- عَلَىٰ (—): was AL:ae07a3a460b2ba37e4490886cc (إِثْم) -> AL:69bd0f7ea2abfbecc226c1e6af (عَلَىٰ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:69bd0f7ea2abfbecc226c1e6af'
 WHERE gid_lemma = 'AL:ae07a3a460b2ba37e4490886cc' AND (surah, ayah, word_index) IN (VALUES (2,181,7));
-- عَلِيم (علم): was AL:f0e4ccf6f2439fc44e34b59ba4 (سَمِيع) -> AL:9ba7ce572be40ce777e0d44853 (عَلِيم) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9ba7ce572be40ce777e0d44853'
 WHERE gid_lemma = 'AL:f0e4ccf6f2439fc44e34b59ba4' AND (surah, ayah, word_index) IN (VALUES (2,181,13));
-- عِلْم (علم): was AL:3312dd99c7201accb7bc026a70 (مِن) -> AL:d52f9082d550bcb180783c11b7 (عِلْم) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:d52f9082d550bcb180783c11b7'
 WHERE gid_lemma = 'AL:3312dd99c7201accb7bc026a70' AND (surah, ayah, word_index) IN (VALUES (13,37,11));
-- غَفُور (غفر): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:c111023567bcf13ff855df78f3 (غَفُور) · 4 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c111023567bcf13ff855df78f3'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (4,23,53), (4,106,6), (25,6,11), (33,24,15));
-- غَيْب (غيب): was AL:9ef37391f7a8253152604c179f (عَٰلِم) -> AL:242b961689f674c707584209e1 (غَيْب) · 4 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:242b961689f674c707584209e1'
 WHERE gid_lemma = 'AL:9ef37391f7a8253152604c179f' AND (surah, ayah, word_index) IN (VALUES (9,105,11), (34,3,12), (59,22,9), (62,8,13));
-- غَيْب (غيب): was AL:ee39c1f013b0b40c60b4021192 (خَشِىَ) -> AL:242b961689f674c707584209e1 (غَيْب) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:242b961689f674c707584209e1'
 WHERE gid_lemma = 'AL:ee39c1f013b0b40c60b4021192' AND (surah, ayah, word_index) IN (VALUES (35,18,24));
-- قَلِيل (قلل): was AL:234a3cb178bdadd4ef08ed97c3 (مَتَّعْ) -> AL:51e8f7139b07dbe30bce0b47ae (قَلِيل) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:51e8f7139b07dbe30bce0b47ae'
 WHERE gid_lemma = 'AL:234a3cb178bdadd4ef08ed97c3' AND (surah, ayah, word_index) IN (VALUES (2,126,23));
-- قَلِيل (قلل): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:51e8f7139b07dbe30bce0b47ae (قَلِيل) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:51e8f7139b07dbe30bce0b47ae'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (7,86,18));
-- كَأَنّ (—): was AL:9addf6411b5fe58032c381c3d9 (تَبَيَّنَ) -> AL:49eabda29351d3262c6ba028a5 (كَأَنّ) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:49eabda29351d3262c6ba028a5'
 WHERE gid_lemma = 'AL:9addf6411b5fe58032c381c3d9' AND (surah, ayah, word_index) IN (VALUES (8,6,6));
-- كَانَ (كون): was AL:06be2bdc2f75b2400e0ccfa647 (وَلِىّ) -> AL:aadc307e15c6a4ed6cd500b282 (كَانَ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma = 'AL:06be2bdc2f75b2400e0ccfa647' AND (surah, ayah, word_index) IN (VALUES (33,6,25));
-- كَانَ (كون): was AL:4778c31b1db630743c03bb480f (أَيْن) -> AL:aadc307e15c6a4ed6cd500b282 (كَانَ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma = 'AL:4778c31b1db630743c03bb480f' AND (surah, ayah, word_index) IN (VALUES (2,148,9));
-- كَانَ (كون): was AL:51e8f7139b07dbe30bce0b47ae (قَلِيل) -> AL:aadc307e15c6a4ed6cd500b282 (كَانَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma = 'AL:51e8f7139b07dbe30bce0b47ae' AND (surah, ayah, word_index) IN (VALUES (28,58,15));
-- كَانَ (كون): was AL:d3e8fa1ddfe535241522aa646e (تَعَمَّدَتْ) -> AL:aadc307e15c6a4ed6cd500b282 (كَانَ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma = 'AL:d3e8fa1ddfe535241522aa646e' AND (surah, ayah, word_index) IN (VALUES (33,5,25));
-- كَانَ (كون): was AL:ee09dab7ac64e5225fb2b1327a (رَضِىَ) -> AL:aadc307e15c6a4ed6cd500b282 (كَانَ) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282'
 WHERE gid_lemma = 'AL:ee09dab7ac64e5225fb2b1327a' AND (surah, ayah, word_index) IN (VALUES (9,93,10));
-- كَبُرَ (كبر): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:b0d876bc7cea8d44e55e5f311c (كَبُرَ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b0d876bc7cea8d44e55e5f311c'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (10,71,11));
-- كَفَىٰ (كفي): was AL:06be2bdc2f75b2400e0ccfa647 (وَلِىّ) -> AL:7e7700564e304b6924778e14cb (كَفَىٰ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:7e7700564e304b6924778e14cb'
 WHERE gid_lemma = 'AL:06be2bdc2f75b2400e0ccfa647' AND (surah, ayah, word_index) IN (VALUES (4,45,7));
-- لَم (—): was AL:d5a07ea1bd649e9b98d080eddc (أَفْوَٰه) -> AL:b043e355dbf45a61c488a656a9 (لَم) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b043e355dbf45a61c488a656a9'
 WHERE gid_lemma = 'AL:d5a07ea1bd649e9b98d080eddc' AND (surah, ayah, word_index) IN (VALUES (5,41,14));
-- مَا (—): was AL:d52f9082d550bcb180783c11b7 (عِلْم) -> AL:02fbe91bce9ce90ae0d6d488f2 (مَا) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:d52f9082d550bcb180783c11b7' AND (surah, ayah, word_index) IN (VALUES (13,37,12));
-- مَدْيَن (مدن): was AL:cb1c92debd4986369ae6760823 (سِنِين) -> AL:969668ea3d670285e82414bb0e (مَدْيَن) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:969668ea3d670285e82414bb0e'
 WHERE gid_lemma = 'AL:cb1c92debd4986369ae6760823' AND (surah, ayah, word_index) IN (VALUES (20,40,29));
-- مَرْء (مرا): was AL:248aaf7afebdf41449b9d5212e (فَرَّقُ) -> AL:b51fc55950c8d301d8576746d7 (مَرْء) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:b51fc55950c8d301d8576746d7'
 WHERE gid_lemma = 'AL:248aaf7afebdf41449b9d5212e' AND (surah, ayah, word_index) IN (VALUES (2,102,41));
-- مَوْت (موت): was AL:cb79435a4ed07d7e44697fceaf (إِلَىٰ) -> AL:c10cdce688019b678b71391b78 (مَوْت) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:c10cdce688019b678b71391b78'
 WHERE gid_lemma = 'AL:cb79435a4ed07d7e44697fceaf' AND (surah, ayah, word_index) IN (VALUES (8,6,9));
-- مُؤْمِن (امن): was AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) -> AL:a04a6ff956a9c382bad8739cd9 (مُؤْمِن) · 2 · offby-1,offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9'
 WHERE gid_lemma = 'AL:4f08afc22e70243ab6880ff767' AND (surah, ayah, word_index) IN (VALUES (2,221,19), (9,61,15));
-- مُؤْمِن (امن): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:a04a6ff956a9c382bad8739cd9 (مُؤْمِن) · 2 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (9,122,3), (33,43,12));
-- مُؤْمِن (امن): was AL:ea63852dc22e8bdc37cfa31d5c (مُؤْتُون) -> AL:a04a6ff956a9c382bad8739cd9 (مُؤْمِن) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9'
 WHERE gid_lemma = 'AL:ea63852dc22e8bdc37cfa31d5c' AND (surah, ayah, word_index) IN (VALUES (4,162,19));
-- مُؤْمِن (امن): was AL:f881c23505da1cfeb050a97408 (آتَى) -> AL:a04a6ff956a9c382bad8739cd9 (مُؤْمِن) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9'
 WHERE gid_lemma = 'AL:f881c23505da1cfeb050a97408' AND (surah, ayah, word_index) IN (VALUES (74,31,27));
-- مُلَٰقُوا (لقي): was AL:4f08afc22e70243ab6880ff767 (ءَامَنَ) -> AL:a21970e9ca4c5ad1cd73ea3474 (مُلَٰقُوا) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:a21970e9ca4c5ad1cd73ea3474'
 WHERE gid_lemma = 'AL:4f08afc22e70243ab6880ff767' AND (surah, ayah, word_index) IN (VALUES (11,29,17));
-- مِثْقَال (ثقل): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:9b3339b6009ca4d44d53c941e1 (مِثْقَال) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:9b3339b6009ca4d44d53c941e1'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (21,47,12));
-- مِن (—): was AL:862835d5d1a12d42f5a7281aa1 (جَآءَ) -> AL:3312dd99c7201accb7bc026a70 (مِن) · 1 · other_wrong
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3312dd99c7201accb7bc026a70'
 WHERE gid_lemma = 'AL:862835d5d1a12d42f5a7281aa1' AND (surah, ayah, word_index) IN (VALUES (13,37,10));
-- مِن (—): was AL:ddcff3bbd01180dd880b70b7b8 (أَضَلّ) -> AL:3312dd99c7201accb7bc026a70 (مِن) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3312dd99c7201accb7bc026a70'
 WHERE gid_lemma = 'AL:ddcff3bbd01180dd880b70b7b8' AND (surah, ayah, word_index) IN (VALUES (28,50,11));
-- مِن (—): was AL:f00d9788b057deef5788896d2f (اللَّه) -> AL:3312dd99c7201accb7bc026a70 (مِن) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3312dd99c7201accb7bc026a70'
 WHERE gid_lemma = 'AL:f00d9788b057deef5788896d2f' AND (surah, ayah, word_index) IN (VALUES (13,37,16));
-- نَار (نور): was AL:a070659dd628e2372234e97754 (أَصْحَٰب) -> AL:49ff52512529e41eff1b9d6785 (نَار) · 3 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:49ff52512529e41eff1b9d6785'
 WHERE gid_lemma = 'AL:a070659dd628e2372234e97754' AND (surah, ayah, word_index) IN (VALUES (3,116,15), (7,47,6), (58,17,12));
-- نَار (نور): was AL:b6d151fe308ccc3e0fa9f09d73 (ضِعْف) -> AL:49ff52512529e41eff1b9d6785 (نَار) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:49ff52512529e41eff1b9d6785'
 WHERE gid_lemma = 'AL:b6d151fe308ccc3e0fa9f09d73' AND (surah, ayah, word_index) IN (VALUES (7,38,34));
-- نَفْس (نفس): was AL:192c7214632530f0baeee207a1 (وَفَّىٰٓ) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:192c7214632530f0baeee207a1' AND (surah, ayah, word_index) IN (VALUES (3,161,16));
-- نَفْس (نفس): was AL:280770cef237cad97838a42274 (سَلَّمَ) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:280770cef237cad97838a42274' AND (surah, ayah, word_index) IN (VALUES (24,61,63));
-- نَفْس (نفس): was AL:39e844798adf6d98174aa5108f (يَلْمِزُ) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:39e844798adf6d98174aa5108f' AND (surah, ayah, word_index) IN (VALUES (49,11,25));
-- نَفْس (نفس): was AL:a04a6ff956a9c382bad8739cd9 (مُؤْمِن) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:a04a6ff956a9c382bad8739cd9' AND (surah, ayah, word_index) IN (VALUES (9,111,6));
-- نَفْس (نفس): was AL:aadc307e15c6a4ed6cd500b282 (كَانَ) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 2 · offby-1,offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:aadc307e15c6a4ed6cd500b282' AND (surah, ayah, word_index) IN (VALUES (2,187,19), (16,118,14));
-- نَفْس (نفس): was AL:c24d21863615e37ab0a3ec57d5 (شُحّ) -> AL:1f8695e4d83d0e66198628b0c4 (نَفْس) · 2 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4'
 WHERE gid_lemma = 'AL:c24d21863615e37ab0a3ec57d5' AND (surah, ayah, word_index) IN (VALUES (59,9,28), (64,16,13));
-- هُدًى (هدي): was AL:21397578a8da07f1cdf2ce9bb8 (شَىْء) -> AL:e0efc2cd017d79e8eec37f46b2 (هُدًى) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0efc2cd017d79e8eec37f46b2'
 WHERE gid_lemma = 'AL:21397578a8da07f1cdf2ce9bb8' AND (surah, ayah, word_index) IN (VALUES (12,111,20));
-- هُدًى (هدي): was AL:a4c15707c0a4a825ccb14ebffb (دَعَا) -> AL:e0efc2cd017d79e8eec37f46b2 (هُدًى) · 1 · offby-2
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e0efc2cd017d79e8eec37f46b2'
 WHERE gid_lemma = 'AL:a4c15707c0a4a825ccb14ebffb' AND (surah, ayah, word_index) IN (VALUES (18,57,26));
-- وَاق (وقي): was AL:8303810dfb4be15f22794c1210 (لَا) -> AL:4aacdab005f2b2dd98f69e492d (وَاق) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4aacdab005f2b2dd98f69e492d'
 WHERE gid_lemma = 'AL:8303810dfb4be15f22794c1210' AND (surah, ayah, word_index) IN (VALUES (13,37,19));
-- وَفَّىٰٓ (وفي): was AL:1f8695e4d83d0e66198628b0c4 (نَفْس) -> AL:192c7214632530f0baeee207a1 (وَفَّىٰٓ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:192c7214632530f0baeee207a1'
 WHERE gid_lemma = 'AL:1f8695e4d83d0e66198628b0c4' AND (surah, ayah, word_index) IN (VALUES (16,111,8));
-- وَلِىّ (ولي): was AL:3312dd99c7201accb7bc026a70 (مِن) -> AL:06be2bdc2f75b2400e0ccfa647 (وَلِىّ) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:06be2bdc2f75b2400e0ccfa647'
 WHERE gid_lemma = 'AL:3312dd99c7201accb7bc026a70' AND (surah, ayah, word_index) IN (VALUES (13,37,17));
-- يَذَرَ (وذر): was AL:6307bb63bf45e4b3a279682ab8 (مَيْل) -> AL:e42d1c315bdbff04ddb8868072 (يذر) · 1 · offby-1
UPDATE qr_word_occurrence SET gid_lemma = 'AL:e42d1c315bdbff04ddb8868072'
 WHERE gid_lemma = 'AL:6307bb63bf45e4b3a279682ab8' AND (surah, ayah, word_index) IN (VALUES (4,129,13));
