-- Drill audit of 40:1–3 (2026-10-16), first pass.
-- Retired (never dealt): kinds that test a translator or a book, or give their answer away —
--   ss_why (why a translator rendered it so), kt_point (which point a scholar's article makes), kt_form (the term named
--   in transliteration, then asked), vocab_lemma / vocab_family (the answer is the prompt word without ال and its ending).
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.retired', 1)
 WHERE scope = 'kind' AND key IN ('ss_why', 'kt_point', 'kt_form', 'vocab_lemma', 'vocab_family');
-- The class steps hold only the kinds that test the text: al-Rāghib-framed sense drills (vocab_range / vocab_same, raw
-- dictionary fragments as options) leave Forms & words; the ṣarf range drill covers a word's senses.
UPDATE qr_study_label
   SET extra_json = json_set(extra_json,
         '$.only.vocab', json('["vocab_root","vocab_form","vocab_kin"]'),
         '$.only.keyterm', json('["kt_gloss","kt_word"]'))
 WHERE scope = 'class_node' AND key = 'words';
UPDATE qr_study_label
   SET extra_json = json_set(extra_json, '$.only.ss',
         json('["ss_order","ss_fill","ss_hear","ss_shadow","ss_kind","ss_mahall","ss_role","ss_ellipsis","ss_tree"]'))
 WHERE scope = 'class_node' AND key = 'sentences';
-- The verb's every meaning in the Qurʾān, asked choose-all (practice-sarf.ts family_all); the family drill asks one.
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('kind', 'sf_family_all', 'Choose every meaning this verb has in the Qurʾān', 'اخْتَرْ كُلَّ مَعَانِي الفِعْلِ فِي القُرْآن', 215),
  ('class_style', 'sarf:family_all', 'Every meaning', 'كُلُّ المَعَانِي', 25)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;
UPDATE qr_study_label SET label = 'What does this verb mean here?', label_ar = 'مَا مَعْنَى هَذَا الفِعْلِ هُنَا؟'
 WHERE scope = 'kind' AND key = 'sf_family';
