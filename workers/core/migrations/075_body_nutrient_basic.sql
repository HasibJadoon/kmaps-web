-- The meal label kept to the basics (owner, 2026-10-21: "just basic, not full breakdown, for an average person"):
-- protein, carbs, fibre, sugar, fat, sodium — six rows, none nested. The rest stay in a meal's nutrients_json but are
-- not shown ("hidden" in the row's extra; routes/body.ts skips them).
UPDATE core_app_label SET parent = NULL, extra_json = json_set(COALESCE(extra_json, '{}'), '$.hidden', json('true'))
 WHERE scope = 'body_nutrient' AND key NOT IN ('protein_g', 'carbs_g', 'fibre_g', 'sugar_g', 'fat_g', 'sodium_mg');
UPDATE core_app_label SET parent = NULL, label = CASE key WHEN 'fat_g' THEN 'Fat' WHEN 'carbs_g' THEN 'Carbs' WHEN 'sugar_g' THEN 'Sugar' ELSE label END,
       sort = CASE key WHEN 'protein_g' THEN 1 WHEN 'carbs_g' THEN 2 WHEN 'fibre_g' THEN 3 WHEN 'sugar_g' THEN 4 WHEN 'fat_g' THEN 5 WHEN 'sodium_mg' THEN 6 END
 WHERE scope = 'body_nutrient' AND key IN ('protein_g', 'carbs_g', 'fibre_g', 'sugar_g', 'fat_g', 'sodium_mg');
-- sugar gets a daily guide so its bar fills too (WHO: under 50 g of free sugars a day)
UPDATE core_app_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.dv', 50) WHERE scope = 'body_nutrient' AND key = 'sugar_g';
