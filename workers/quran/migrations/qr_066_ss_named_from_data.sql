-- qr_066_ss_named_from_data.sql
--
-- The sentence tab names nothing itself. A word's function, case and sign are shown as the
-- registry term they resolve to (its name_ar, its badge_color); every other word the tab
-- shows is a row here.
--
--   ar_ling_gram_term_alias  the registry's spellings of its terms, mirrored from
--                            km_arabic_linguistic like ar_ling_gram_term (written only by
--                            scripts/project-gram-terms.mjs). AL 0121 adds every spelling the
--                            scope tables use, so qr_ss_scope_morph_link resolves by lookup.
--   ss_slot      which registry categories a slot is resolved in, first to last
--                (extra_json.categories): function, position, sign — and prose, the
--                categories whose Latin spellings in English text are shown in Arabic
--   ss_lens      the sentence tab's lenses, in order
--   ss_layer     the strips under a tree node
--   ss_keynote   the kinds of key note (label_ar = the band; detail = the line under it)
--   ss_ui        the tab's own words: the Sources switch, the whole-sentence heading, more / less
--   source_name  how the prose names a book or a scholar (label = English, label_ar = Arabic):
--                with Sources off, a parenthesis naming one, or a "Name:" before a claim, is
--                left out; with them on the prose is shown as written
--
-- Applied by hand when the ledger is out of step: d1 execute --file, then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('qr_066_ss_named_from_data.sql');

CREATE TABLE IF NOT EXISTS ar_ling_gram_term_alias (
  alias_bare   TEXT NOT NULL,
  term_id      TEXT NOT NULL,
  category_key TEXT NOT NULL,
  alias_raw    TEXT NOT NULL,
  alias_lang   TEXT NOT NULL DEFAULT 'ar',
  alias_kind   TEXT NOT NULL DEFAULT 'variant',
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (alias_bare, category_key)
);
CREATE INDEX IF NOT EXISTS idx_gram_alias_bare ON ar_ling_gram_term_alias (alias_bare);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('ss_slot', 'function', 'Function', 'الموقع', NULL, NULL, NULL, NULL,
 '{"categories":["irab_role","nawasikh","harf_maani","pos","mahall","case","balagha_maani"]}', 1),
('ss_slot', 'position', 'Case', 'الإعراب', NULL, NULL, NULL, NULL,
 '{"categories":["mahall","case","mood","irab_sign"]}', 2),
('ss_slot', 'sign', 'Sign', 'العلامة', NULL, NULL, NULL, NULL,
 '{"categories":["irab_sign"]}', 3),
('ss_slot', 'prose', 'Terms in English prose', 'المصطلح في النص الإنجليزي', NULL, NULL, NULL, NULL,
 '{"categories":["irab_role","derivation_type","balagha_maani","balagha_bayan"]}', 4),

('ss_lens', 'keynotes', 'Key notes', 'النقاط', NULL, NULL, NULL, NULL, NULL, 1),
('ss_lens', 'document', 'Text', 'النص', NULL, NULL, NULL, NULL, NULL, 2),
('ss_lens', 'board', 'Board', 'المخطط', NULL, NULL, NULL, NULL, NULL, 3),
('ss_lens', 'ladder', 'Ladder', 'السلّم', NULL, NULL, NULL, NULL, NULL, 4),
('ss_lens', 'readings', 'Readings', 'الأقوال', NULL, NULL, NULL, NULL, NULL, 5),

('ss_layer', 'irab', 'Iʿrāb', 'الإعراب', NULL, NULL, NULL, NULL, NULL, 1),
('ss_layer', 'nahw', 'Grammar', 'النحو', NULL, NULL, NULL, NULL, NULL, 2),
('ss_layer', 'balagha', 'Balāgha', 'البلاغة', NULL, NULL, NULL, NULL, NULL, 3),
('ss_layer', 'hadhf', 'Ellipsis', 'الحذف', NULL, NULL, NULL, NULL, NULL, 4),

('ss_keynote', 'elided', 'Left unsaid', 'محذوف', 'لا تتمّ الجملة إلا بتقديره', NULL, NULL, NULL, NULL, 1),
('ss_keynote', 'divergence', 'Fluent and literal', 'بين الحرفي والفصيح', NULL, NULL, NULL, NULL, NULL, 2),
('ss_keynote', 'finding', 'The finding', 'الخلاصة', 'ما انتهت إليه الأقوال', NULL, NULL, NULL, NULL, 3),
('ss_keynote', 'contested', 'The books split', 'خلاف', NULL, NULL, NULL, 1, NULL, 4),
('ss_keynote', 'disputed', 'Disputed iʿrāb', 'إعراب مختلف فيه', NULL, NULL, NULL, 1, NULL, 5),
('ss_keynote', 'discussed', 'Most written about', 'أكثر ما قيل فيه', NULL, NULL, NULL, 1, NULL, 6),

('ss_ui', 'sources', 'Sources', 'المصادر', NULL, 'books.vertical', NULL, NULL, NULL, 1),
('ss_ui', 'whole_sentence', 'On the sentence', 'ما قيل في الجملة', NULL, NULL, NULL, NULL, NULL, 2),
('ss_ui', 'more', 'More', 'المزيد', NULL, NULL, NULL, NULL, NULL, 3),
('ss_ui', 'less', 'Less', 'أقل', NULL, NULL, NULL, NULL, NULL, 4),
('ss_ui', 'disputed', 'Disputed', 'مختلف فيه', NULL, NULL, NULL, NULL, NULL, 5),

('source_name', 'jadwal', 'al-Jadwal', 'الجدول', NULL, NULL, NULL, NULL, NULL, 1),
('source_name', 'razi', 'al-Rāzī', 'الرازي', NULL, NULL, NULL, NULL, '{"also":["Razi","al-Razi","Rāzī"]}', 2),
('source_name', 'alusi', 'al-Ālūsī', 'الآلوسي', NULL, NULL, NULL, NULL, '{"also":["Alusi","al-Alusi","الألوسي","الالوسي"]}', 3),
('source_name', 'ibn_ashur', 'Ibn ʿĀshūr', 'ابن عاشور', NULL, NULL, NULL, NULL, '{"also":["Ibn Ashur"]}', 4),
('source_name', 'zamakhshari', 'al-Zamakhsharī', 'الزمخشري', NULL, NULL, NULL, NULL, '{"also":["Zamakhshari","al-Zamakhshari","الكشاف","Kashshaf"]}', 5),
('source_name', 'ukbari', 'al-ʿUkbarī', 'العكبري', NULL, NULL, NULL, NULL, '{"also":["Ukbari","al-Ukbari","التبيان"]}', 6),
('source_name', 'muyassar', 'al-Muyassar', 'الميسر', NULL, NULL, NULL, NULL, '{"also":["Muyassar"]}', 7),
('source_name', 'darwish', 'Darwīsh', 'درويش', NULL, NULL, NULL, NULL, '{"also":["Darwish","al-Darwish"]}', 8),
('source_name', 'daas', 'al-Daʿʿās', 'الدعاس', NULL, NULL, NULL, NULL, '{"also":["Daas","دعاس"]}', 9),
('source_name', 'abu_hayyan', 'Abū Ḥayyān', 'أبو حيان', NULL, NULL, NULL, NULL, '{"also":["Abu Hayyan","ابو حيان"]}', 10),
('source_name', 'ibn_atiyya', 'Ibn ʿAṭiyya', 'ابن عطية', NULL, NULL, NULL, NULL, '{"also":["Ibn Atiyya"]}', 11),
('source_name', 'tabari', 'al-Ṭabarī', 'الطبري', NULL, NULL, NULL, NULL, '{"also":["Tabari","al-Tabari"]}', 12),
('source_name', 'ibn_kathir', 'Ibn Kathīr', 'ابن كثير', NULL, NULL, NULL, NULL, '{"also":["Ibn Kathir"]}', 13),
('source_name', 'sibawayh', 'Sībawayh', 'سيبويه', NULL, NULL, NULL, NULL, '{"also":["Sibawayh"]}', 14),
('source_name', 'farra', 'al-Farrāʾ', 'الفراء', NULL, NULL, NULL, NULL, '{"also":["Farra","al-Farra"]}', 15),
('source_name', 'zajjaj', 'al-Zajjāj', 'الزجاج', NULL, NULL, NULL, NULL, '{"also":["Zajjaj","al-Zajjaj"]}', 16);
