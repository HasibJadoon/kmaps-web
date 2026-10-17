-- Listen and build for every word: a verb or noun heard alone (cut from its line by its timing) and built from its
-- letters, sound-alike letters among them; an idiom heard alone and built from its words. The existing drills stay.
INSERT INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
  ('ask', 'hear_build_word',   'Listen, then build the word from its letters', 'اِسْمَعْ ثُمَّ ابْنِ الكَلِمَةَ مِنْ حُرُوفِهَا', 0),
  ('ask', 'hear_build_phrase', 'Listen, then build the phrase',                'اِسْمَعْ ثُمَّ ابْنِ العِبَارَة',              0)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;
UPDATE ar_practice_label SET extra_json = '{"take":["vocab","idiom","idiombuild","feature","nuance","lexeme","match","gist"]}',
  label = 'Scene {n} · Phrases', label_ar = 'المَشْهَد {n} · العِبَارَات' WHERE scope = 'scene_part' AND key = 'lines';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
