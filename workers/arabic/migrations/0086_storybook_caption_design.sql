-- 0086_storybook_caption_design.sql
--
-- The film captions designed like bold title cards (owner, 2026-11-06: "captions better designed"): bigger, heavy,
-- words set close together, English letters tracked tight; the app draws key words gold with a glow, the rest white
-- with a deep soft shadow. Idempotent.

UPDATE ar_practice_label SET extra_json = '{"dir":"rtl","font":"BalooBhaijaan2-Regular","size":34,"weight":800,"lineHeight":1.5,"tracking":0,"wordGap":0.2,"titleFont":"BalooBhaijaan2-Regular","lineSize":18}'
 WHERE scope = 'storybook_lang' AND key = 'ar';
UPDATE ar_practice_label SET extra_json = '{"dir":"ltr","font":"Baloo2-Regular","size":34,"weight":800,"lineHeight":1.1,"tracking":-0.035,"wordGap":0.2,"titleFont":"Baloo2-Regular","lineSize":16}'
 WHERE scope = 'storybook_lang' AND key = 'en';
UPDATE ar_practice_label SET extra_json = '{"dir":"rtl","font":"NotoNastaliqUrdu-Regular","size":27,"weight":700,"lineHeight":2.0,"tracking":0,"wordGap":0.22,"titleFont":"NotoNastaliqUrdu-Regular","lineSize":15}'
 WHERE scope = 'storybook_lang' AND key = 'ur';
