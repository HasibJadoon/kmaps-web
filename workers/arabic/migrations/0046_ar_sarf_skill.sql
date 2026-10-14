-- 0046_ar_sarf_skill.sql
--
-- The ṣarf skill: drills drawn from the words of the scenes (0045 ar_scene_word) — a verb's past matched to
-- its present, a noun's plural, a word's dictionary form — as matching and choosing, never front/back cards.
-- Only what the analyser generates with confidence is drilled; مشتق / جامد waits for the authored wazn.

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('skill', 'sarf', 'Word forms', 'الصَّرْف', 'The words of the scenes: past and present, singular and plural, the dictionary form', 'textformat.alt', '#81B29A', NULL, '{"source":"scene_words"}', 7),
 ('kind', 'sarf_pairs',  'Match each past to its present', 'طَابِقْ كُلَّ مَاضٍ بِمُضَارِعِه', NULL, NULL, NULL, NULL, NULL, 41),
 ('kind', 'sarf_mudari', 'What is its present?',          'مَا مُضَارِعُه؟',              NULL, NULL, NULL, NULL, NULL, 42),
 ('kind', 'sarf_jam',    'What is its plural?',           'مَا جَمْعُه؟',                 NULL, NULL, NULL, NULL, NULL, 43),
 ('kind', 'sarf_lemma',  'Which is its dictionary form?', 'مَا أَصْلُهَا فِي المُعْجَم؟',     NULL, NULL, NULL, NULL, NULL, 44);
