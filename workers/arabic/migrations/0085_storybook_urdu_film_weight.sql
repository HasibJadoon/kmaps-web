-- 0085_storybook_urdu_film_weight.sql
--
-- The Urdu telling's words in Nastaliq Bold, as the films set them (kalila_film.py FONT NotoNastaliqUrdu-Bold); the
-- app's Nastaliq is now the variable font (wght 400–700, same PostScript name). Owner, 2026-11-06: "yes urdu also".
-- Idempotent.

UPDATE ar_practice_label
   SET extra_json = '{"dir":"rtl","font":"NotoNastaliqUrdu-Regular","size":25,"weight":700,"lineHeight":2.1,"titleFont":"NotoNastaliqUrdu-Regular","lineSize":15}'
 WHERE scope = 'storybook_lang' AND key = 'ur';
