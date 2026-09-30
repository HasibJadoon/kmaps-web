-- A grammar sentence's bāb by name and place, so a drill can ask which bāb of its book cites it
-- (the options are the bābs around it) — for the books whose bābs name no registry term.
ALTER TABLE ar_grammar_sentence ADD COLUMN bab_title_ar TEXT;
ALTER TABLE ar_grammar_sentence ADD COLUMN bab_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_ar_grammar_sentence_bab ON ar_grammar_sentence(source_slug, bab_order);

UPDATE ar_practice_label SET extra_json = '{"depth":[1,1,2,3],"words":[8,14],"poetry":2,"advanced_track":2,"per_lesson":24,"per_bab":16,"per_page":6,"per_bab_any":3}'
 WHERE scope = 'grammar_level' AND key = 'rules';

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'gs_bab', 'This shāhid — under which bāb of the book is it cited?', 'تَحْتَ أَيِّ بَابٍ مِنَ الكِتَابِ جَاءَ هَذَا الشَّاهِد؟', NULL, NULL, NULL, NULL, NULL, 53);
