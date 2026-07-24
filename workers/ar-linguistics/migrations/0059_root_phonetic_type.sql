-- 0059 — Root sound inventory and phonetic type (layer doc §1.1 and §1.2).
--
-- The v1 ledger listed ar_ling_root_nawsawti as a CREATE, as though §1.2 had no
-- carrier. It does: ar_ling_roots.root_type and .weak_pattern have been holding
-- this all along, and holding it wrong. Measured against the live table:
--
--   • root_type carries BOTH 'quadriliteral' (5,317 rows) and 'quadrilateral'
--     (4,192) — one value, two spellings.
--   • root_type also mixes a second axis into the same column:
--     'lexical_headword', 'particle_or_letter', 'unknown' are not letter counts.
--   • weak_pattern has NO value for لفيف مقرون or لفيف مفروق. 118 roots are
--     lafīf and none of them can say so.
--   • weak_pattern has no 'mahmuz_fa' either, though 261 roots are مهموز الفاء.
--     Only mahmuz_ain and mahmuz_lam exist, 15 rows between them.
--   • 'mudha_af' and 'mudaaf' (inside 'rubai_mudaaf') are two transliterations
--     of مضعّف in one column.
--   • The صحيح/معتلّ split the doc asks for at §1.2.1/§1.2.2 is not represented
--     at all — 'sound' conflates سالم with its own parent class.
--
-- So this is a promote-and-normalize, not a greenfield create. The taxonomy
-- moves to a carrier that can express it, and the classification is DERIVED from
-- the radicals rather than trusted: root_normalized already holds the letters,
-- so صحيح/معتلّ and every subtype below it are computable and verifiable.
--
-- Naming: 'nawsawti' mashed النوع الصوتي into one token. N5 wants the sub-layer's
-- Arabic term, and it is two words — ar_ling_root_naw_sawti.
--
-- §1.1 (قائمة الأصوات — letter count plus position فاء/عين/لام) had no carrier
-- and no sub_code at all. ar_ling_roots.root_letters is a JSON blob, so position
-- is not queryable. ar_ling_root_letter_slot makes each radical a row.
-- ar_ling_root_letter (the 29-row global registry at 28-PHON) is a different
-- thing: makhraj and sifat per letter of the alphabet, not per root.

-- ── §1.1 — one row per radical, position addressable ───────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_root_letter_slot (
  id          TEXT PRIMARY KEY,
  root_id     TEXT,                       -- → ar_ling_roots.id
  root_norm   TEXT NOT NULL,
  slot_index  INTEGER NOT NULL,           -- 1-based
  slot_role   TEXT NOT NULL,              -- fa | ain | lam | lam2 | lam3 | lam4
  letter_ar   TEXT NOT NULL,              -- → ar_ling_root_letter.letter_ar
  is_weak     INTEGER NOT NULL DEFAULT 0, -- و / ي in radical position
  is_hamza    INTEGER NOT NULL DEFAULT 0,
  derived_by  TEXT NOT NULL DEFAULT 'computed',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, slot_index)
);

CREATE INDEX IF NOT EXISTS ix_root_letter_slot_root  ON ar_ling_root_letter_slot (root_norm, slot_index);
CREATE INDEX IF NOT EXISTS ix_root_letter_slot_letter ON ar_ling_root_letter_slot (letter_ar, slot_role);

-- ── §1.2 — the صحيح/معتلّ taxonomy, two levels as the doc has it ───────────
CREATE TABLE IF NOT EXISTS ar_ling_root_naw_sawti (
  root_norm     TEXT PRIMARY KEY,
  root_id       TEXT,                     -- → ar_ling_roots.id
  radical_count INTEGER NOT NULL,         -- §1.1 عدد الحروف, replaces the misspelt root_type
  soundness     TEXT NOT NULL,            -- sahih | mutall            §1.2
  category      TEXT NOT NULL,            -- salim|mahmuz|mudaaf|mithal|ajwaf|naqis|
                                          -- lafif_maqrun|lafif_mafruq §1.2.1/§1.2.2
  hamza_slot    TEXT,                     -- fa | ain | lam   (مهموز, orthogonal)
  weak_letter   TEXT,                     -- waw | ya
  legacy_weak_pattern TEXT,               -- what ar_ling_roots.weak_pattern said
  agrees_with_legacy  INTEGER,            -- 1 = same verdict, 0 = differs, NULL = legacy absent
  derived_by    TEXT NOT NULL DEFAULT 'computed',
  confidence    REAL NOT NULL DEFAULT 0.9,
  note_en       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_root_naw_sawti_cat   ON ar_ling_root_naw_sawti (category, soundness);
CREATE INDEX IF NOT EXISTS ix_root_naw_sawti_agree ON ar_ling_root_naw_sawti (agrees_with_legacy);

-- ── Repair the two spelling splits in place ────────────────────────────────
-- These stay on ar_ling_roots: the column is read by existing code and the
-- carrier above is additive. The point is that both now say the same thing.
UPDATE ar_ling_roots SET root_type = 'quadrilateral', updated_at = datetime('now')
 WHERE root_type = 'quadriliteral';

UPDATE ar_ling_roots SET weak_pattern = 'mudaaf', updated_at = datetime('now')
 WHERE weak_pattern = 'mudha_af';

-- ── Registry ───────────────────────────────────────────────────────────────
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

-- Population is NOT done here. Classifying ~24,500 roots and writing ~60,000
-- slot rows exceeds what D1 accepts in one migration — the same limit that
-- rejected the slug sweep. scripts/root_phonetics.py fills both tables in
-- batches and is idempotent.
