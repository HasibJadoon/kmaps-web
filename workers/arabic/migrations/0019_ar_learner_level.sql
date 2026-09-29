-- A level a learner has placed into by passing its placement check, without finishing the level before.
CREATE TABLE IF NOT EXISTS ar_learner_level (
  user_id TEXT NOT NULL, band TEXT NOT NULL, score INTEGER NOT NULL, placed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, band)
);
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, sort) VALUES
 ('path', 'placement', 'Place into this level', 'اِخْتِبَارُ تَحْدِيدِ المُسْتَوَى', 'Already at this level? Pass a mixed test from its units and it opens now', 'arrow.up.forward.circle', '#2A9D8F', NULL, 9),
 ('setting', 'placement_size', 'Drills in a placement check', NULL, NULL, NULL, NULL, 15, 6);
