-- صَارَ's note opened on an Arabic word, so the app laid the whole line out right to left and the English came out
-- jumbled (owner, 2026-10-16). It now opens in English, the Arabic words inside it.
UPDATE ar_ling_root_form_paradigm
   SET paradigm_json = json_set(paradigm_json, '$.note',
       'The word مَصِير is two things: its verbal noun with مـ (مَصْدَر مِيمِيّ), “the returning”, and its noun of place (ظَرْف), “the place of return”.')
 WHERE id = 'PAR:صير:I';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family IN ('rest','books');
