-- The Everyday places (ar_map_node) and their readings (ar_daily_reading) are now kept by the worker's
-- stale-while-revalidate cache like the rooms (/ar/map/:id, /ar/vocab/:domain, /ar/daily/readings/…): any write to
-- either moves the 'content' version, so the next read rebuilds instead of serving a stale place.
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_map_node_i AFTER INSERT ON ar_map_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_map_node_u AFTER UPDATE ON ar_map_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_map_node_d AFTER DELETE ON ar_map_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_daily_reading_i AFTER INSERT ON ar_daily_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_daily_reading_u AFTER UPDATE ON ar_daily_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_daily_reading_d AFTER DELETE ON ar_daily_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
