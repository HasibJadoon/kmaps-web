-- More of km_arabic under cache versions (see kmaps_cache_version.sql).
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_acquisition_ref_i AFTER INSERT ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_acquisition_ref_u AFTER UPDATE ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_acquisition_ref_d AFTER DELETE ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
