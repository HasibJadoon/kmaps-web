-- "a verbal noun with مـ" put a lone joined letter inside English, which the app laid out on the wrong side of its
-- brackets; the notes now say "with an added م".
UPDATE ar_ling_root_form_paradigm SET paradigm_json = json_set(paradigm_json, '$.note',
  'The word مَصِير is two things: a verbal noun with an added م (مَصْدَر مِيمِيّ), “the returning”, and a noun of place (ظَرْف), “the place of return”.')
 WHERE id = 'PAR:صير:I';
UPDATE ar_ling_root_form_paradigm SET paradigm_json = json_set(paradigm_json, '$.note',
  'Its tool-noun مِغْفَر is the helmet that covers the head — the picture behind the root: to cover. مَغْفِرَة is a verbal noun with an added م (مَصْدَر مِيمِيّ).')
 WHERE id = 'PAR:غفر:I';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family IN ('rest','books');
