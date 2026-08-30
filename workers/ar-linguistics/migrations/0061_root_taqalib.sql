CREATE TABLE IF NOT EXISTS ar_ling_root_taqalib (
  id            TEXT PRIMARY KEY,
  group_key     TEXT NOT NULL,
  permutation   TEXT NOT NULL,
  perm_index    INTEGER NOT NULL,
  is_used       INTEGER NOT NULL DEFAULT 0,
  used_root_id  TEXT,
  family_size   INTEGER NOT NULL,
  derived_by    TEXT NOT NULL DEFAULT 'computed',
  note_en       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_key, perm_index)
);

CREATE INDEX IF NOT EXISTS ix_root_taqalib_group ON ar_ling_root_taqalib (group_key, perm_index);
CREATE INDEX IF NOT EXISTS ix_root_taqalib_perm  ON ar_ling_root_taqalib (permutation);
CREATE INDEX IF NOT EXISTS ix_root_taqalib_used  ON ar_ling_root_taqalib (is_used, family_size);

INSERT OR REPLACE INTO ar_ling_reg_sub_layer
  (sub_code, band, band_key, band_name_ar, band_name_en, name_ar, name_en, name_ur,
   scope_level, discipline, default_card, display_order, tables_json, produced_by, carrier_state)
VALUES
  ('06-TAQL', 0, 'CORE', 'الأصل', 'Core identity', 'جدول التقاليب', 'Permutation table',
   'تقلیب کی فہرست', 'root', 'sarf', 'P', 6,
   json('["ar_ling_root_taqalib"]'), 'derived', 'table_only');

INSERT OR REPLACE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline)
VALUES
  ('km_arabic_linguistic', 'ar_ling_root_taqalib', 'root', '100', 'derived',
   '06-TAQL', 'P', 'AL:100-ROOT:SF:06-TAQL:P', 'sarf');
