-- 0084_storybook_arabic_film_face.sql
--
-- The Arabic telling's words in the films' own face: Baloo Bhaijaan 2 at 800, rounded and heavy (kalila_film.py
-- FONT), in place of Amiri (owner, 2026-11-06: "aesthetic fonts … Baloo Bhaijaan yes"). Idempotent.

UPDATE ar_practice_label
   SET extra_json = '{"dir":"rtl","font":"BalooBhaijaan2-Regular","size":30,"weight":800,"lineHeight":1.6,"titleFont":"BalooBhaijaan2-Regular","lineSize":18}'
 WHERE scope = 'storybook_lang' AND key = 'ar';
