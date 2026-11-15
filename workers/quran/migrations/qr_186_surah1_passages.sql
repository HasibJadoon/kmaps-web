-- qr_186: al-Fātiḥa's study passage (kmaps-passage-builder, 2026-11-11). The sūra had none, so the Qurʾān day-by-day
-- Day 1 (Q 1:1–7) could not link to a passage study. Evidence (qr_tafsir_book_display_block, surah 1, 8 works, 793 blocks):
--   al-Ālūsī groups 2–7 as one unit (TAFSIR_BLK_463a097b2dddb010 …);
--   Ibn ʿĀshūr reads the whole sūra as ONE munājāt — praise, worship and help sought from Him alone, the request for
--     guidance (TAFSIR_BLK_d25555742964520e on 1:2: «فالفاتِحَةُ تَضَمَّنَتْ مُناجاةً لِلْخالِقِ جامِعَةً …»);
--   al-Rāzī and al-Zamakhsharī group 2–3, Abū Ḥayyān groups 6–7 — inner groupings inside the one movement (recorded as dissent).
-- Rule 5 (prefer the wider grouping): one passage, 1–7. The whole sūra is covered, so it is live.
INSERT OR REPLACE INTO qr_surah_study_passage
  (id, surah, passage_no, ayah_from, ayah_to, public_unit_id, public_surah_unit_id, label, title_en, title_ar, subtitle, theme,
   summary_md, start_ref, end_ref, meta_json, status, created_at, updated_at)
VALUES
  ('QR:SP:1:1-7', 1, 1, 1, 7, 'U:C:QURAN:1:1-7', 'U:C:QURAN:1', 'Passage 1',
   'The Servant''s Converse with His Lord', 'مُنَاجَاةُ الْعَبْدِ رَبَّهُ',
   'Praise of the Lord of the worlds, worship and help sought from Him alone, then the request for the straight path',
   'munajat_praise_worship_guidance',
   'The whole sūra is one converse with the Creator: praise and His names, the Master of the Day of Judgment, worship and help sought from Him alone, then the request for guidance on the path of those He favoured. Ibn ʿĀshūr: the request for guidance is itself an admission of the need for knowledge.',
   '1:1', '1:7',
   '{"source":"tafsir-boundaries","order_index":1,"boundary_evidence":"alusi 2-7 (TAFSIR_BLK_463a097b2dddb010) AND ibn_ashur: the Fātiḥa as one munājāt (TAFSIR_BLK_d25555742964520e on 1:2); dissent: razi 2-3, zamakhshari 2-3, abu_hayyan 6-7 (inner groupings). wider grouping kept (rule 5).","coverage_note":"whole sūra covered (1-7)","cut_by":"kmaps-passage-builder","cut_at":"2026-11-11"}',
   'live', datetime('now'), datetime('now'));
