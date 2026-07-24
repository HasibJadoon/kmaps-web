-- 0061 — Root permutation table, التقاليب (layer doc §1.3).
--
-- Unlike §1.2, this one really is greenfield: nothing in the database records
-- which permutations of a root's radicals are مستعمل (in use) and which are
-- مهمل (neglected). The v1 ledger was right to list it as a CREATE.
--
-- It is also derivable rather than authored. The six permutations of a trilateral
-- root are fixed, and whether each is used is answerable by membership in
-- ar_ling_roots — the corpus already knows. So this is populated by computation
-- and marked derived_by='computed', the same contract as ar_ling_root_naw_sawti.
--
-- group_key is the radicals sorted into a canonical order, so every member of one
-- تقليب family shares it. That is the organising principle behind Kitāb al-ʿAyn —
-- al-Khalīl grouped entries by permutation family rather than alphabetically —
-- so the column is what lets that arrangement be reconstructed and compared
-- against how the printed ʿAyn actually orders its material.
--
-- Scope: trilateral roots only. Quadriliterals have 24 permutations and the
-- classical تقاليب discussion is overwhelmingly about the triliteral set;
-- extending it later is a matter of widening the generator, not changing this
-- schema.

CREATE TABLE IF NOT EXISTS ar_ling_root_taqalib (
  id            TEXT PRIMARY KEY,          -- {group_key}:{perm_index}
  group_key     TEXT NOT NULL,             -- radicals in canonical sorted order
  permutation   TEXT NOT NULL,             -- the permuted root string
  perm_index    INTEGER NOT NULL,          -- 0..5, stable ordering within a family
  is_used       INTEGER NOT NULL DEFAULT 0,-- مستعمل when it exists in ar_ling_roots
  used_root_id  TEXT,                      -- → ar_ling_roots.id when is_used = 1
  family_size   INTEGER NOT NULL,          -- how many of the 6 are attested
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

-- Populated by scripts/root_taqalib.py — see 0059 for why bulk fills do not run
-- inside a migration on D1.
