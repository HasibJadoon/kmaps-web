-- A meal's full nutrition (owner, 2026-10-21: a dark, animated meal screen — photo, servings, calories, the macro
-- donut, a nutrient table with % daily value; "Claude will fill"). Claude estimates the plate from its photo and writes
-- nutrients_json: {"sat_fat_g":…, "trans_fat_g":…, "cholesterol_mg":…, "sodium_mg":…, "sugar_g":…, "added_sugar_g":…,
-- "potassium_mg":…, "calcium_mg":…, "iron_mg":…, "vit_d_mcg":…, "vit_c_mg":…}. The table's rows, their order,
-- indentation and daily values (FDA 2020 label) are below; the worker shapes them, the app only draws.

ALTER TABLE core_body_meal ADD COLUMN servings REAL NOT NULL DEFAULT 1;
ALTER TABLE core_body_meal ADD COLUMN nutrients_json TEXT;

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_nutrient', 'fat_g',          NULL,     'Total fat',      'الدهون',          NULL, NULL, '#E8B04B', '{"unit":"g","dv":78}', 1),
('body_nutrient', 'sat_fat_g',      'fat_g',  'Saturated fat',  'دهون مشبعة',      NULL, NULL, '#E8B04B', '{"unit":"g","dv":20}', 2),
('body_nutrient', 'trans_fat_g',    'fat_g',  'Trans fat',      'دهون متحولة',     NULL, NULL, '#E07A5F', '{"unit":"g"}', 3),
('body_nutrient', 'cholesterol_mg', NULL,     'Cholesterol',    'الكوليسترول',     NULL, NULL, '#B49AA6', '{"unit":"mg","dv":300}', 4),
('body_nutrient', 'sodium_mg',      NULL,     'Sodium',         'الصوديوم',        NULL, NULL, '#7EAAB0', '{"unit":"mg","dv":2300}', 5),
('body_nutrient', 'carbs_g',        NULL,     'Total carbs',    'الكربوهيدرات',    NULL, NULL, '#D9BC8C', '{"unit":"g","dv":275}', 6),
('body_nutrient', 'fibre_g',        'carbs_g','Fibre',          'الألياف',         NULL, NULL, '#9DB89A', '{"unit":"g","dv":28}', 7),
('body_nutrient', 'sugar_g',        'carbs_g','Sugars',         'السكريات',        NULL, NULL, '#D9BC8C', '{"unit":"g"}', 8),
('body_nutrient', 'added_sugar_g',  'sugar_g','Added sugars',   'سكر مضاف',        NULL, NULL, '#E07A5F', '{"unit":"g","dv":50}', 9),
('body_nutrient', 'protein_g',      NULL,     'Protein',        'البروتين',        NULL, NULL, '#8A88B4', '{"unit":"g","dv":50}', 10),
('body_nutrient', 'potassium_mg',   NULL,     'Potassium',      'البوتاسيوم',      NULL, NULL, '#7EAAB0', '{"unit":"mg","dv":4700}', 11),
('body_nutrient', 'calcium_mg',     NULL,     'Calcium',        'الكالسيوم',       NULL, NULL, '#F4EFE4', '{"unit":"mg","dv":1300}', 12),
('body_nutrient', 'iron_mg',        NULL,     'Iron',           'الحديد',          NULL, NULL, '#C8643F', '{"unit":"mg","dv":18}', 13),
('body_nutrient', 'vit_d_mcg',      NULL,     'Vitamin D',      'فيتامين د',       NULL, NULL, '#F2CC8F', '{"unit":"mcg","dv":20}', 14),
('body_nutrient', 'vit_c_mg',       NULL,     'Vitamin C',      'فيتامين ج',       NULL, NULL, '#E8B04B', '{"unit":"mg","dv":90}', 15),
('body_macro', 'protein', NULL, 'Protein', 'بروتين', NULL, 'bolt.heart.fill', '#8A88B4', '{"kcal_per_g":4}', 1),
('body_macro', 'carbs',   NULL, 'Carbs',   'كربوهيدرات', NULL, 'leaf.fill',   '#9DB89A', '{"kcal_per_g":4}', 2),
('body_macro', 'fat',     NULL, 'Fat',     'دهون',    NULL, 'drop.fill',       '#E8B04B', '{"kcal_per_g":9}', 3);
