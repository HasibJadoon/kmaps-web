-- قبل: plain, easy English (owner, 2026-10-15)
UPDATE ar_ling_root_form_paradigm SET paradigm_json = json_set(paradigm_json, '$.note',
  'The one who accepts is قَابِل. God is «قَابِلِ ٱلتَّوْبِ» (40:3): He accepts repentance.')
 WHERE id = 'PAR:قبل:I';
UPDATE ar_ling_root_form_paradigm SET paradigm_json = json_set(paradigm_json, '$.meaning', 'to accept kindly (an offering, a prayer)')
 WHERE id = 'PAR:قبل:V';
UPDATE ar_ling_root_form_paradigm SET paradigm_json = json_set(paradigm_json, '$.meaning', 'to face towards, to head for')
 WHERE id = 'PAR:قبل:X';
UPDATE ar_ling_root_dna SET picture_en = 'Facing: two things meeting face to face. To accept is to take what comes towards you.'
 WHERE root_norm = 'قبل';
