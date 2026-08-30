CREATE TABLE IF NOT EXISTS ar_ling_root_letter_slot (
  id          TEXT PRIMARY KEY,
  root_id     TEXT,
  root_norm   TEXT NOT NULL,
  slot_index  INTEGER NOT NULL,
  slot_role   TEXT NOT NULL,
  letter_ar   TEXT NOT NULL,
  is_weak     INTEGER NOT NULL DEFAULT 0,
  is_hamza    INTEGER NOT NULL DEFAULT 0,
  derived_by  TEXT NOT NULL DEFAULT 'computed',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, slot_index)
);

CREATE INDEX IF NOT EXISTS ix_root_letter_slot_root  ON ar_ling_root_letter_slot (root_norm, slot_index);
CREATE INDEX IF NOT EXISTS ix_root_letter_slot_letter ON ar_ling_root_letter_slot (letter_ar, slot_role);

CREATE TABLE IF NOT EXISTS ar_ling_root_naw_sawti (
  root_norm     TEXT PRIMARY KEY,
  root_id       TEXT,
  radical_count INTEGER NOT NULL,
  soundness     TEXT NOT NULL,
  category      TEXT NOT NULL,

  hamza_slot    TEXT,
  weak_letter   TEXT,
  legacy_weak_pattern TEXT,
  agrees_with_legacy  INTEGER,
  derived_by    TEXT NOT NULL DEFAULT 'computed',
  confidence    REAL NOT NULL DEFAULT 0.9,
  note_en       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_root_naw_sawti_cat   ON ar_ling_root_naw_sawti (category, soundness);
CREATE INDEX IF NOT EXISTS ix_root_naw_sawti_agree ON ar_ling_root_naw_sawti (agrees_with_legacy);

UPDATE ar_ling_roots SET root_type = 'quadrilateral', updated_at = datetime('now')
 WHERE root_type = 'quadriliteral';

UPDATE ar_ling_roots SET weak_pattern = 'mudaaf', updated_at = datetime('now')
 WHERE weak_pattern = 'mudha_af';

INSERT OR REPLACE INTO ar_ling_reg_sub_layer
  (sub_code, band, band_key, band_name_ar, band_name_en, name_ar, name_en, name_ur,
   scope_level, discipline, default_card, display_order, tables_json, produced_by, carrier_state)
VALUES
  ('03-ASWAT', 0, 'CORE', 'الأصل', 'Core identity', 'قائمة الأصوات', 'Sound inventory',
   'آوازوں کی فہرست', 'root', 'sarf', 'P', 3,
   json('["ar_ling_root_letter_slot"]'), 'derived', 'table_only'),
  ('04-NAWS', 0, 'CORE', 'الأصل', 'Core identity', 'النوع الصوتي', 'Phonetic type',
   'صوتی قسم', 'root', 'sarf', 'P', 4,
   json('["ar_ling_root_naw_sawti"]'), 'derived', 'table_only');

INSERT OR REPLACE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline) VALUES
  ('km_arabic_linguistic', 'ar_ling_root_letter_slot', 'root', '100', 'derived', '03-ASWAT', 'P', 'AL:100-ROOT:--:03-ASWAT:P', 'sarf'),
  ('km_arabic_linguistic', 'ar_ling_root_naw_sawti',   'root', '100', 'derived', '04-NAWS',  'P', 'AL:100-ROOT:--:04-NAWS:P',  'sarf');
