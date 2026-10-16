-- A scene on the path is its video, then its drills in parts — listening, its verbs, its nouns, its lines — each part
-- opening the next and the last opening the next scene (routes/practice-class.ts). What each part takes is
-- extra.take: the drill id prefixes, or '*' for what is left; extra.bucket narrows by the drill's bucket.
INSERT INTO ar_practice_label (scope, key, label, label_ar, icon, extra_json, sort) VALUES
  ('scene_part', 'listen', 'Scene {n} · Listen',  'المَشْهَد {n} · اِسْتَمِعْ', 'ear',             '{"take":["dictation","fill","word","speaker","dialogue"]}', 1),
  ('scene_part', 'verbs',  'Scene {n} · Verbs',   'المَشْهَد {n} · الأَفْعَال', 'bolt',            '{"take":["sarf"],"bucket":"verb"}', 2),
  ('scene_part', 'nouns',  'Scene {n} · Nouns',   'المَشْهَد {n} · الأَسْمَاء', 'cube',            '{"take":["sarf"],"bucket":"noun"}', 3),
  ('scene_part', 'lines',  'Scene {n} · Meaning', 'المَشْهَد {n} · المَعْنَى',  'text.quote',      '{"take":"*"}', 4)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, icon = excluded.icon,
  extra_json = excluded.extra_json, sort = excluded.sort;

-- Each scene's drills, built once and kept: the path reads its node counts from here in one query, a node reads its part.
-- def names what built it (the pool's code version and size); a row of another def is rebuilt on its next read.
CREATE TABLE IF NOT EXISTS ar_class_pool (
  unit_id     TEXT NOT NULL,
  scene_no    INTEGER NOT NULL,
  def         TEXT NOT NULL,
  items_json  TEXT NOT NULL,
  counts_json TEXT NOT NULL DEFAULT '{}',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (unit_id, scene_no)
);

UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
