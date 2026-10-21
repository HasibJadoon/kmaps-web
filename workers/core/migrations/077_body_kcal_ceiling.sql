-- The daily calories are a CEILING (owner, 2026-10-21: "so my daily always stay below"): the dashboard says how much
-- is left under it, when it is crossed, and when an OMAD day has been too little by the evening. The words and the
-- thresholds live here; routes/body.ts fills the {placeholders}. Tones are palette names.
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_ui', 'kcal_limit',   NULL, 'Daily limit {target} kcal · protein {protein} g+', NULL, 'Stay below the limit every day; reach the protein', 'gauge.with.dots.needle.33percent', NULL,
 '{"tone":"sage","too_low_pct":55,"evening_hour":18}', 20),
('body_ui', 'kcal_under',   NULL, '{left} kcal left of {target}',            NULL, NULL, 'checkmark.circle.fill',         NULL, '{"tone":"sage"}', 21),
('body_ui', 'kcal_over',    NULL, '+{over} over {target}',                   NULL, NULL, 'exclamationmark.triangle.fill', NULL, '{"tone":"rust"}', 22),
('body_ui', 'kcal_too_low', NULL, 'Too little today — eat enough protein',   NULL, NULL, 'leaf.fill',                     NULL, '{"tone":"sand"}', 23),
('body_ui', 'protein_goal', NULL, '{target} g goal',                         NULL, '{left} g to go', 'bolt.heart.fill',       NULL, '{"tone":"plum"}', 24);
