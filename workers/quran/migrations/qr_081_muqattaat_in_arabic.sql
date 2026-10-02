-- The opening letters are recited, not translated, and never transliterated: the ladder shows
-- them as the muṣḥaf writes them, حمٓ, on both rungs (40:1, 44:1).
UPDATE qr_ss_translation_unit
   SET structural_literal_en = 'حمٓ', fluent_en = 'حمٓ',
       gloss_json = CASE WHEN gloss_json IS NULL THEN NULL
                         ELSE json_set(gloss_json, '$.structural.en', 'حمٓ', '$.fluent.en', 'حمٓ') END,
       updated_at = datetime('now')
 WHERE id IN ('QR:TL:40:1:s1', 'QR:TL:44:1:s1');
