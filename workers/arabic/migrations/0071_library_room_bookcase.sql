-- The Classical Library room opens the bookcase (/ar/text/bookcase): one shelf of covers per kind of work, in place
-- of the century-by-century list. An app that does not know the layout falls back to its list of entries.
UPDATE ar_room SET layout = 'bookcase' WHERE id = 'library';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
