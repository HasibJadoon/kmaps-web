-- Each level of Ghāfir 40:1–3's ring (qr_passage_section chiastic_structure) names the words of the āyah it is
-- about, as [ayah, first word, last word], so a class can show the Arabic on the level instead of English alone.
-- Owner, 2026-10-28: the Burhan class ends on the full passage structure.
UPDATE qr_passage_section
   SET data_json = json_set(data_json,
         '$.levels[0].span', json('[1, 1, 1]'),
         '$.levels[1].span', json('[2, 1, 4]'),
         '$.levels[2].span', json('[2, 5, 6]'),
         '$.levels[3].span', json('[3, 1, 4]'),
         '$.levels[4].span', json('[3, 5, 8]'),
         '$.levels[5].span', json('[3, 9, 12]'),
         '$.levels[6].span', json('[3, 13, 14]'))
 WHERE passage_id = 'QR:SP:40:1-3' AND section_key = 'chiastic_structure';
