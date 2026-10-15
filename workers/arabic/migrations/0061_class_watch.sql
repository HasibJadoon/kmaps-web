-- 0061 · The Arabic class linked with its video (drill-engine plan 4.3): each scene node plays its scene;
-- the unit page (key words, scenes, check) is reached from the class's toolbar.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('class_ui', 'watch_scene', 'Watch the scene',          'شاهد المشهد',          NULL, 'play.rectangle', NULL, NULL, NULL, 75),
 ('class_ui', 'unit_page',   'Key words and scenes',     'الكلمات والمشاهد',      NULL, 'list.bullet.rectangle', NULL, NULL, NULL, 76);
