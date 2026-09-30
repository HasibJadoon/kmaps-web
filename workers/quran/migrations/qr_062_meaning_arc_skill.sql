-- qr_062_meaning_arc_skill.sql
--
-- Meaning arcs (skill 'meaning_arc', source 'arc2'; practice-arc2.ts): every Qurʾānic root's DERIVED arc
-- (AL 0114 — each source's own arc read by its own markers, and the combined arc aligning them), drilled
-- at three grains: the root's core, the arc's order and its lemmas, and the words and links. The
-- hand-built arcs keep the skill 'arc'. Every drill stands in the āyah where the root is (recited) or
-- the source's own statement, and files its review card (module QR, kind 'meaning_arc').
--
--   L1 the root's core    arc_core (Ibn Fāris's aṣl among other roots' cores) · arc_first (the first rung)
--   L2 the arc's order    arc_order (a source's rungs back into its order) · arc_lemma (which word carries
--                         Lane's sense)
--   L3 words and links    arc_word (the marked word's rung in its āyah) · arc_link (the formula between two
--                         rungs) · arc_disagree (which source places X before Y)
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'meaning_arc', 'Meaning arcs', 'سُلَّمُ المَعْنَى', 'How each root''s meaning unfolds, in the sources'' own order — Ibn Fāris''s aṣl and branches, Lane''s senses, al-Rāghib''s Qurʾānic senses — and where each word of the Qurʾān stands on it', 'arrow.triangle.branch', '#B388EB', NULL,
 '{"source":"arc2","levels":{"basic":{"band":"basic","asks":["arc_core","arc_first"]},"middle":{"band":"middle","asks":["arc_order","arc_lemma"]},"advanced":{"band":"advanced","asks":["arc_word","arc_link","arc_disagree"]}}}', 32),
('kind', 'arc2_core', 'What is the root''s core — its first image?', 'مَا أَصْلُ الجَذْر؟', NULL, NULL, NULL, NULL, NULL, 70),
('kind', 'arc2_first', 'Where does the root''s meaning start?', 'مِنْ أَيْنَ يَبْدَأُ المَعْنَى؟', NULL, NULL, NULL, NULL, NULL, 71),
('kind', 'arc2_order', 'Put the source''s statements back in its order', 'رَتِّبْ أَقْوَالَ المَصْدَرِ كَمَا رَتَّبَهَا', NULL, NULL, NULL, NULL, NULL, 72),
('kind', 'arc2_lemma', 'Which word of the root carries this sense?', 'أَيُّ كَلِمَاتِ الجَذْرِ تَحْمِلُ هٰذَا المَعْنَى؟', NULL, NULL, NULL, NULL, NULL, 73),
('kind', 'arc2_word', 'Listen — which rung does the marked word stand on here?', 'اِسْمَعْ — عَلَى أَيِّ دَرَجَةٍ تَقِفُ الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 74),
('kind', 'arc2_link', 'What does the source write between the two rungs?', 'بِأَيِّ عِبَارَةٍ يَنْتَقِلُ المَصْدَر؟', NULL, NULL, NULL, NULL, NULL, 75),
('kind', 'arc2_disagree', 'The sources disagree — which one gives this order?', 'اِخْتَلَفَتِ المَصَادِر — أَيُّهَا يُرَتِّبُ هٰكَذَا؟', NULL, NULL, NULL, NULL, NULL, 76);
