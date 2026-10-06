-- qr_089: two sections of the الصرف word screen, served from AL (/al/sarf/sheet): how the root's words are used (the
-- construction arcs, each with a worked verse) and the root's opposites as the books state them.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('sarf_section', 'constructions', 'How it is used', 'التَّرَاكِيب', 'What the word means with each preposition or object that follows it — every use in the Qurʾān counted, with a verse.', NULL, NULL, NULL, NULL, 4),
 ('sarf_section', 'opposites', 'Opposites', 'الأَضْدَاد', 'Words the books set against it — and words that carry both meanings at once.', NULL, NULL, NULL, NULL, 7);
UPDATE qr_study_label SET sort = 5 WHERE scope = 'sarf_section' AND key = 'ranges';
UPDATE qr_study_label SET sort = 6 WHERE scope = 'sarf_section' AND key = 'near';
