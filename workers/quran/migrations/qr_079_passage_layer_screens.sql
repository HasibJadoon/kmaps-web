-- A passage's layers are its screens: each opens on its own. Two rows used to open the same
-- content, so they become one screen each with a real part to show.
--
-- Grammar and rhetoric: one screen. Rhetoric has no content apart from the sentence — the
-- figures are marked on the same parse — so its row goes and the grammar row names both.
DELETE FROM qr_study_label WHERE scope = 'layer' AND key = 'balagha';
UPDATE qr_study_label
   SET label = 'Grammar & rhetoric', label_ar = 'النَّحْو وَالبَلَاغَة',
       detail = 'What each word does in its sentence, and how the wording carries its meaning'
 WHERE scope = 'layer' AND key = 'nahw';

-- Translation and structure share the passage step: translation shows only its ladder (word for
-- word to fluent English), structure everything else the step holds.
UPDATE qr_study_label SET extra_json = '{"step":"passage_structure","lenses":["ladder"]}'
 WHERE scope = 'layer' AND key = 'translation';
UPDATE qr_study_label SET extra_json = '{"step":"passage_structure","hide":["ladder"]}'
 WHERE scope = 'layer' AND key = 'structure';

-- the step numbers follow
UPDATE qr_study_label SET sort = 4 WHERE scope = 'layer' AND key = 'structure';
UPDATE qr_study_label SET sort = 5 WHERE scope = 'layer' AND key = 'tafsir';

-- The الصرف screen, laid out as its sheet is read: the focus words, one الصرف الصغير table per
-- focus verb, each root's family, the prepositions, the meaning ranges, the near-synonyms. The
-- heads and their one-line ledes are rows here, not words in the app.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, sort) VALUES
  ('sarf_section', 'words',    'The focus words', 'الكَلِمَات',
   'What each word means here, the picture behind its root, its form, and its plurals in the Qurʾān.', 0),
  ('sarf_section', 'tables',   'The verb tables', 'الصَّرْفُ الصَّغِير',
   'One table per focus verb, in your textbook''s order. Where one set of letters has two أبواب with two meanings, both are shown.', 1),
  ('sarf_section', 'families', 'Same root in the Qurʾān', 'الأُسْرَة',
   'Only the verbs the Qurʾān uses, as family lines (ماض مضارع مصدر — meaning).', 2),
  ('sarf_section', 'preps',    'Prepositions — what each one does', 'حُرُوفُ الجَرّ',
   'Each preposition the verb takes in the Qurʾān, and how it changes the meaning.', 3),
  ('sarf_section', 'ranges',   'Meaning range in the Qurʾān', 'المَعَانِي فِي القُرْآن',
   'Every sense the word carries in the Qurʾān. The sense in this passage is marked.', 4),
  ('sarf_section', 'near',     'Near-synonyms', 'الفُرُوق',
   'Words close in meaning, and what sets each one apart.', 5);
