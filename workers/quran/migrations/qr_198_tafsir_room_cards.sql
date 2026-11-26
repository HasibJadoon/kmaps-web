-- qr_198 — owner 2026-11-27: the Qurʾān home's Tafsīr room opens two cards — the commentaries read and heard, and
-- the tafsīr practice (its own path). The app maps each card's key to its screen; every word on the card is here.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('tafsir_room', 'read', 'Commentaries', 'التَّفَاسِير', 'Eight commentaries, āyah by āyah, read and heard', 'headphones', '#E8A87C', NULL, NULL, 10),
('tafsir_room', 'practice', 'Practice', 'التَّدْرِيب', 'Read a mufassir sentence by sentence, translate, drill — passage by passage', 'character.book.closed', '#D8B657', NULL, NULL, 20),
('tafsir_room_head', 'head', 'Tafsīr', 'التَّفْسِير', 'The commentaries, and your practice in them', NULL, NULL, NULL, NULL, 0);
