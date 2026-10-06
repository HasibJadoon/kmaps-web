-- qr_093: fused tokens link to the part that carries the meaning — ما kāffa/zāʾida → its head (إِنّ، أَنّ، أَيْن، إِن …);
-- ما as a noun (relative / interrogative / maṣdariyya) → مَا; أَن/إِن + لَا → لَا; praise/blame verb + ما → the verb.
-- Decided per occurrence from the QAC segments (morphology_tag_json), checked against the iʿrāb books (6 cases follow
-- the books over QAC). 62 links change, each guarded on its old value and logged in qr_word_lemma_link_fix.
-- Left: مِمَّن / أَمَّن (47) wait for an AL lemma مَن — all 824 standalone مَن rows are on مِن the preposition.

-- fused_qr: lemma links (qr_word_occurrence.gid_lemma) of FUSED Qurʾān tokens, 2026-10-07.
-- Unnumbered body; give it the next qr_NNN number when adopting it. Runs after qr_links (already applied: 1,783 log rows).
-- THE RULE: a fused token links to the part that carries the meaning.
--   K  ما الكافة / الزائدة (إِنَّمَا، أَنَّمَا، كَأَنَّمَا، رُبَمَا، إِمَّا = إن+ما، أَيْنَمَا الشرطية، مِمَّا خطيئاتهم، عَمَّا قليل) → the head word.
--   N  ما as a noun (relative / interrogative / maṣdariyya) after a preposition, adverb, أَم, or إِنّ/أَنّ when ما is their ism → مَا.
--   L  أَلَّا, لِئَلَّا (and لِكَيْلَا by the same build) → لَا; أَلَّن → لَن, أَلَّوِ → لَو (already so).
--   Compound AL lemmas («بَعْدَ مَا», «كُلَّمَا», «مَهْمَا», «إِلَّم») are kept.
-- Per occurrence: the QAC 0.4 segmentation in qr_word_occurrence.morphology_tag_json (2nd STEM tag PREV/SUP = kāffa/zāʾida,
-- REL/INTG/SUB = noun); overridden where the iʿrāb books in qr_irab_book_entry say otherwise (6 rows, noted inline).
-- Every UPDATE is guarded on the old value, so a row changed since 2026-10-07 is left alone and re-running is a no-op.
-- Each change is first logged in qr_word_lemma_link_fix (reason 'fused token: <rule>') under the same guard.
-- Only gid_lemma changes; lemma, lemma_ref, gid_root, root_uid are untouched. No qr_word_sense_link row sits on a changed word.
-- Rows changed: 55. Left (blocked / unclear) are listed in fused.md, not here.

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

-- ── fused token: kāffa/zāʾida ما → head word: مَا → مِن · 1 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (71,25,1,'AL:02fbe91bce9ce90ae0d6d488f2','AL:3312dd99c7201accb7bc026a70','fused token: kāffa/zāʾida ما → head word · مِمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:3312dd99c7201accb7bc026a70'
 WHERE gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2' AND (surah, ayah, word_index) IN (VALUES (71,25,1));

-- ── fused token: kāffa/zāʾida ما → head word: مَا → إِن · 6 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (6,68,14,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · وَإِمَّا'),
  (7,35,3,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · إِمَّا'),
  (7,200,1,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · وَإِمَّا'),
  (8,57,1,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · فَإِمَّا'),
  (8,58,1,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · وَإِمَّا'),
  (20,123,8,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4582a8ae1a0654d088e826f72f','fused token: kāffa/zāʾida ما → head word · فَإِمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4582a8ae1a0654d088e826f72f'
 WHERE gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2' AND (surah, ayah, word_index) IN (VALUES (6,68,14), (7,35,3), (7,200,1), (8,57,1), (8,58,1), (20,123,8));

-- ── fused token: kāffa/zāʾida ما → head word: مَا → أَيْن · 1 rows ──
--   33:61:2 أَيْنَمَا: QAC REL; Muyassar: أينما اسم شرط جازم; ʿUkbarī: «أين» شرط
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (33,61,2,'AL:02fbe91bce9ce90ae0d6d488f2','AL:4778c31b1db630743c03bb480f','fused token: kāffa/zāʾida ما → head word · أَيْنَمَا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:4778c31b1db630743c03bb480f'
 WHERE gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2' AND (surah, ayah, word_index) IN (VALUES (33,61,2));

-- ── fused token: kāffa/zāʾida ما → head word: مَا → أَنّ · 1 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (5,49,22,'AL:02fbe91bce9ce90ae0d6d488f2','AL:5f8c07c39f3fc68a16c3e9bb9f','fused token: kāffa/zāʾida ما → head word · أَنَّمَا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:5f8c07c39f3fc68a16c3e9bb9f'
 WHERE gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2' AND (surah, ayah, word_index) IN (VALUES (5,49,22));

-- ── fused token: kāffa/zāʾida ما → head word: مَا → عَن · 1 rows ──
--   23:40:2 عَمَّا: QAC REL; ʿUkbarī, Jadwal: «ما» زائدة (Daʿʿās: موصول)
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (23,40,2,'AL:02fbe91bce9ce90ae0d6d488f2','AL:ad8b03d6d6ba67f7ab57a56282','fused token: kāffa/zāʾida ما → head word · عَمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ad8b03d6d6ba67f7ab57a56282'
 WHERE gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2' AND (surah, ayah, word_index) IN (VALUES (23,40,2));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: أَم → مَا · 1 rows ──
--   27:59:11 أَمَّا: Daʿʿās, Muyassar, Darwīsh: ما اسم موصول
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (27,59,11,'AL:0c952fc6f197bdb6e7d3f3b55d','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · أَمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:0c952fc6f197bdb6e7d3f3b55d' AND (surah, ayah, word_index) IN (VALUES (27,59,11));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: فِى → مَا · 26 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (2,113,28,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (2,213,17,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (2,229,32,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (2,234,17,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (2,235,4,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (3,55,27,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (3,66,4,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (3,66,10,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (4,24,32,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (4,65,7,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (4,97,8,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَ'),
  (5,93,8,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (7,190,7,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (8,68,7,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (10,19,15,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (10,93,21,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (16,124,14,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (22,69,6,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (23,100,4,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (28,77,2,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (32,25,8,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (33,5,18,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (33,38,7,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (45,17,21,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (46,26,3,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَا'),
  (79,43,1,'AL:14cc044e1508cc4793592fb4fc','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · فِيمَ'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:14cc044e1508cc4793592fb4fc' AND (surah, ayah, word_index) IN (VALUES (2,113,28), (2,213,17), (2,229,32), (2,234,17), (2,235,4), (3,55,27), (3,66,4), (3,66,10), (4,24,32), (4,65,7), (4,97,8), (5,93,8), (7,190,7), (8,68,7), (10,19,15), (10,93,21), (16,124,14), (22,69,6), (23,100,4), (28,77,2), (32,25,8), (33,5,18), (33,38,7), (45,17,21), (46,26,3), (79,43,1));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: مِن → مَا · 1 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (10,41,10,'AL:3312dd99c7201accb7bc026a70','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · مِمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:3312dd99c7201accb7bc026a70' AND (surah, ayah, word_index) IN (VALUES (10,41,10));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: أَنّ → مَا · 4 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (3,178,5,'AL:5f8c07c39f3fc68a16c3e9bb9f','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · أَنَّمَا'),
  (23,55,2,'AL:5f8c07c39f3fc68a16c3e9bb9f','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · أَنَّمَا'),
  (31,27,2,'AL:5f8c07c39f3fc68a16c3e9bb9f','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · أَنَّمَا'),
  (40,43,3,'AL:5f8c07c39f3fc68a16c3e9bb9f','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · أَنَّمَا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:5f8c07c39f3fc68a16c3e9bb9f' AND (surah, ayah, word_index) IN (VALUES (3,178,5), (23,55,2), (31,27,2), (40,43,3));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: عَن → مَا · 6 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (10,78,4,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'),
  (17,43,3,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'),
  (27,63,19,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'),
  (34,25,8,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'),
  (34,43,14,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'),
  (52,43,8,'AL:ad8b03d6d6ba67f7ab57a56282','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · عَمَّا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:ad8b03d6d6ba67f7ab57a56282' AND (surah, ayah, word_index) IN (VALUES (10,78,4), (17,43,3), (27,63,19), (34,25,8), (34,43,14), (52,43,8));

-- ── fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما: إِنّ → مَا · 3 rows ──
--   51:5:1 إِنَّمَا: QAC PREV; Muyassar: ما اسم موصول اسم إنّ (lām in the khabar)
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (20,69,8,'AL:e87b01d6a238b28f50fc8d95c1','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · إِنَّمَا'),
  (51,5,1,'AL:e87b01d6a238b28f50fc8d95c1','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · إِنَّمَا'),
  (77,7,1,'AL:e87b01d6a238b28f50fc8d95c1','AL:02fbe91bce9ce90ae0d6d488f2','fused token: ما as a noun (relative/interrogative/maṣdariyya) → ما · إِنَّمَا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:02fbe91bce9ce90ae0d6d488f2'
 WHERE gid_lemma = 'AL:e87b01d6a238b28f50fc8d95c1' AND (surah, ayah, word_index) IN (VALUES (20,69,8), (51,5,1), (77,7,1));

-- ═══ SEPARABLE: لِكَيْلَا is not named in the decided rule; it is linked to لَا by the same build as لِئَلَّا
-- (لِ + كَي maṣdariyya + لا). Daʿʿās: «لا زائدة نافية لا عمل لها»; Muyassar: «لا صلة». Drop this batch to keep it on كَى. ═══
-- ── fused token: لِكَيْلَا (لِ+كَي+لا) → لَا, as أَلَّا/لِئَلَّا: كَى → لَا · 4 rows ──
WITH v(surah, ayah, word_index, old_gid, new_gid, reason) AS (VALUES
  (3,153,14,'AL:91ec1ac8f92b39267fd07dd042','AL:8303810dfb4be15f22794c1210','fused token: لِكَيْلَا (لِ+كَي+لا) → لَا, as أَلَّا/لِئَلَّا · لِكَيْلَا'),
  (22,5,50,'AL:91ec1ac8f92b39267fd07dd042','AL:8303810dfb4be15f22794c1210','fused token: لِكَيْلَا (لِ+كَي+لا) → لَا, as أَلَّا/لِئَلَّا · لِكَيْلَا'),
  (33,50,54,'AL:91ec1ac8f92b39267fd07dd042','AL:8303810dfb4be15f22794c1210','fused token: لِكَيْلَا (لِ+كَي+لا) → لَا, as أَلَّا/لِئَلَّا · لِكَيْلَا'),
  (57,23,1,'AL:91ec1ac8f92b39267fd07dd042','AL:8303810dfb4be15f22794c1210','fused token: لِكَيْلَا (لِ+كَي+لا) → لَا, as أَلَّا/لِئَلَّا · لِكَيْلَا'))
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason)
SELECT v.surah, v.ayah, v.word_index, v.old_gid, v.new_gid, v.reason
  FROM v JOIN qr_word_occurrence w
    ON w.surah = v.surah AND w.ayah = v.ayah AND w.word_index = v.word_index
 WHERE w.gid_lemma IS v.old_gid;
UPDATE qr_word_occurrence SET gid_lemma = 'AL:8303810dfb4be15f22794c1210'
 WHERE gid_lemma = 'AL:91ec1ac8f92b39267fd07dd042' AND (surah, ayah, word_index) IN (VALUES (3,153,14), (22,5,50), (33,50,54), (57,23,1));

-- decided in the main session: conditional إِلَّا, 13:19 أَنَّمَا, 7:150 بِئْسَمَا
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 8, 73, 6, gid_lemma, 'AL:8303810dfb4be15f22794c1210', 'fused token: conditional إِلَّا = إِن + لَا → لَا (as أَلَّا)' FROM qr_word_occurrence WHERE surah=8 AND ayah=73 AND word_index=6 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
UPDATE qr_word_occurrence SET gid_lemma='AL:8303810dfb4be15f22794c1210' WHERE surah=8 AND ayah=73 AND word_index=6 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 9, 39, 1, gid_lemma, 'AL:8303810dfb4be15f22794c1210', 'fused token: conditional إِلَّا = إِن + لَا → لَا (as أَلَّا)' FROM qr_word_occurrence WHERE surah=9 AND ayah=39 AND word_index=1 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
UPDATE qr_word_occurrence SET gid_lemma='AL:8303810dfb4be15f22794c1210' WHERE surah=9 AND ayah=39 AND word_index=1 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 9, 40, 1, gid_lemma, 'AL:8303810dfb4be15f22794c1210', 'fused token: conditional إِلَّا = إِن + لَا → لَا (as أَلَّا)' FROM qr_word_occurrence WHERE surah=9 AND ayah=40 AND word_index=1 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
UPDATE qr_word_occurrence SET gid_lemma='AL:8303810dfb4be15f22794c1210' WHERE surah=9 AND ayah=40 AND word_index=1 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 11, 47, 13, gid_lemma, 'AL:8303810dfb4be15f22794c1210', 'fused token: conditional إِلَّا = إِن + لَا → لَا (as أَلَّا)' FROM qr_word_occurrence WHERE surah=11 AND ayah=47 AND word_index=13 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
UPDATE qr_word_occurrence SET gid_lemma='AL:8303810dfb4be15f22794c1210' WHERE surah=11 AND ayah=47 AND word_index=13 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 12, 33, 9, gid_lemma, 'AL:8303810dfb4be15f22794c1210', 'fused token: conditional إِلَّا = إِن + لَا → لَا (as أَلَّا)' FROM qr_word_occurrence WHERE surah=12 AND ayah=33 AND word_index=9 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
UPDATE qr_word_occurrence SET gid_lemma='AL:8303810dfb4be15f22794c1210' WHERE surah=12 AND ayah=33 AND word_index=9 AND gid_lemma='AL:a35862e0e8eaf3557ad82f6abc';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 13, 19, 3, gid_lemma, 'AL:5f8c07c39f3fc68a16c3e9bb9f', 'fused token: أَنَّمَا was on إِنّ → أَنّ' FROM qr_word_occurrence WHERE surah=13 AND ayah=19 AND word_index=3 AND gid_lemma='AL:e87b01d6a238b28f50fc8d95c1';
UPDATE qr_word_occurrence SET gid_lemma='AL:5f8c07c39f3fc68a16c3e9bb9f' WHERE surah=13 AND ayah=19 AND word_index=3 AND gid_lemma='AL:e87b01d6a238b28f50fc8d95c1';
INSERT OR IGNORE INTO qr_word_lemma_link_fix (surah, ayah, word_index, old_gid, new_gid, reason) SELECT 7, 150, 9, gid_lemma, 'AL:e9e1efc5389a07ae0c831597c7', 'fused token: بِئْسَمَا → بِئْسَ (the verb of blame carries the sense)' FROM qr_word_occurrence WHERE surah=7 AND ayah=150 AND word_index=9 AND gid_lemma='AL:02fbe91bce9ce90ae0d6d488f2';
UPDATE qr_word_occurrence SET gid_lemma='AL:e9e1efc5389a07ae0c831597c7' WHERE surah=7 AND ayah=150 AND word_index=9 AND gid_lemma='AL:02fbe91bce9ce90ae0d6d488f2';
