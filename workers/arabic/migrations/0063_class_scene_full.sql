-- a class scene node acquires the whole scene (every verb and noun heard, every line built, every idiom): room for it
UPDATE ar_practice_label SET extra_json = json_set(extra_json, '$.max', 80) WHERE scope = 'class_node' AND key = 'scenes';
-- the class responses are kept as content: move the family so every episode's class is rebuilt with the full scenes
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
