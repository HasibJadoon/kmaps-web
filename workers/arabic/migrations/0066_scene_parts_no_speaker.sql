-- The scene path is for the language: "who said it" asks about the story, not the Arabic, so no part takes it (a drill
-- no part takes is left off the path, its review and its check). Meaning names what it takes instead of '*'.
UPDATE ar_practice_label SET extra_json = '{"take":["dictation","fill","word","dialogue"]}' WHERE scope = 'scene_part' AND key = 'listen';
UPDATE ar_practice_label SET extra_json = '{"take":["vocab","idiom","feature","nuance","lexeme","match","gist"]}' WHERE scope = 'scene_part' AND key = 'lines';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
