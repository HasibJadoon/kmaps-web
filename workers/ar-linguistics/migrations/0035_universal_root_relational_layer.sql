-- 0035 — Universal Root relational layer (AL domain).
-- The root layer already holds identity (ar_ling_roots), the intelligence
-- synthesis (ar_ling_root_dna), sense axes, antonyms, synonym families, and
-- scholarship. Three connective pieces were still missing, which forced
-- interpretive data into JSON blobs or denormalized TEXT columns:
--
--   1. NO canonical root-SENSE rows. sense_axes and root_dna both *reference*
--      senses (senses_json is an embedded blob) and 0022 already flagged that
--      "sense_relations needs sense ids". Nothing let a field, relation, or
--      axis attach to a specific sense (نصر-as-victory vs نصر-as-aid).
--   2. NO root↔semantic_field link. ar_ling_semantic_fields is a taxonomy,
--      but a root's field lived only as a loose TEXT column downstream.
--   3. NO general typed root→root graph. Only synonyms (ar_ling_syn_root) and
--      antonyms (ar_ling_root_antonyms) had homes; support/overcome/cognate/
--      metathesis/sub-root edges had nowhere to go.
--
-- Design notes:
--   • Follows the ar_ling_syn_root pattern: canonical root_id FK + denormalized
--     root_norm (so display tables keyed on norm still join cheaply).
--   • Trilingual *_ar / *_en / *_ur throughout; additive and non-breaking.
--   • Every interpretive row carries provenance_json + confidence + generated_by
--     so AI-synthesized rows are trust-distinguishable from source-grounded ones
--     (parity with root_dna / syn_root, closing the uneven-provenance gap).
--   • This migration does NOT touch antonyms/synonyms. root_relations is for the
--     OTHER edge kinds; 'antonym'/'synonym' keep their dedicated tables.

-- ---------------------------------------------------------------------------
-- 1. Canonical root senses — the pivot everything else can attach to.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_root_senses (
  id             TEXT PRIMARY KEY,                 -- 'RSE:نصر:victory'
  root_id        TEXT,                             -- FK ar_ling_roots.id (source of truth)
  root_norm      TEXT NOT NULL,                    -- denormalized for cheap joins
  sense_key      TEXT NOT NULL,                    -- slug: 'victory' | 'aid' | ...
  gloss_ar       TEXT,
  gloss_en       TEXT,
  gloss_ur       TEXT,
  definition_md  TEXT,
  is_core        INTEGER NOT NULL DEFAULT 0,       -- 1 = aṣl al-maʿnā (primary sense)
  sort_order     INTEGER NOT NULL DEFAULT 0,
  basis_json     TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),  -- āyāt / shawāhid
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence     REAL DEFAULT 0.8,
  generated_by   TEXT,                             -- 'human' | 'model:<id>' | 'source:<slug>'
  source_slug    TEXT NOT NULL DEFAULT 'kmaps_sense_map',
  status         TEXT NOT NULL DEFAULT 'draft',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, sense_key),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_root_senses_root ON ar_ling_root_senses(root_norm, sort_order);
CREATE INDEX IF NOT EXISTS idx_ar_root_senses_core ON ar_ling_root_senses(root_norm, is_core);

-- ---------------------------------------------------------------------------
-- 2. Root ↔ semantic field link (optionally sense-scoped).
--    A field can attach to the whole root (sense_id NULL) or one sense.
--    NOTE: SQLite treats NULLs as distinct in UNIQUE, so multiple root-level
--    (sense_id NULL) links to the SAME field are technically allowed — the app
--    should enforce one root-level row per field, or set sense_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_root_semantic_fields (
  id           TEXT PRIMARY KEY,                   -- 'RSF:نصر:victory' or 'RSF:نصر:victory#aid'
  root_id      TEXT,                               -- FK ar_ling_roots.id
  root_norm    TEXT NOT NULL,
  field_id     TEXT NOT NULL,                      -- FK ar_ling_semantic_fields.id
  sense_id     TEXT,                               -- FK ar_ling_root_senses.id (nullable)
  weight       INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  is_primary   INTEGER NOT NULL DEFAULT 0,         -- 1 = the root's dominant field
  note_md      TEXT,
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence   REAL DEFAULT 0.8,
  generated_by TEXT,
  source_slug  TEXT NOT NULL DEFAULT 'kmaps_field_map',
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, field_id, sense_id),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id),
  FOREIGN KEY (field_id) REFERENCES ar_ling_semantic_fields(id),
  FOREIGN KEY (sense_id) REFERENCES ar_ling_root_senses(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_root_fields_root  ON ar_ling_root_semantic_fields(root_norm, is_primary);
CREATE INDEX IF NOT EXISTS idx_ar_root_fields_field ON ar_ling_root_semantic_fields(field_id);

-- ---------------------------------------------------------------------------
-- 3. General typed root→root graph (the edges antonyms/synonyms don't cover).
--    Target may be a root that has no full ar_ling_roots row yet, so to_root_norm
--    is TEXT-first with an optional to_root_id FK.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_root_relations (
  id             TEXT PRIMARY KEY,                 -- 'RRL:نصر:عون:support'
  from_root_id   TEXT,                             -- FK ar_ling_roots.id
  from_root_norm TEXT NOT NULL,
  to_root_id     TEXT,                             -- FK ar_ling_roots.id (nullable)
  to_root_norm   TEXT NOT NULL,
  relation_kind  TEXT NOT NULL,                    -- 'support' | 'overcome' | 'victory'
                                                   -- | 'cognate' | 'metathesis'
                                                   -- | 'sub_root' | 'contrast' | 'entails' ...
                                                   -- (NOT 'antonym'/'synonym' — dedicated tables)
  from_sense_id  TEXT,                             -- FK ar_ling_root_senses.id (sense-scoped edge)
  to_sense_id    TEXT,                             -- FK ar_ling_root_senses.id
  direction      TEXT NOT NULL DEFAULT 'directed', -- 'directed' | 'symmetric'
  strength       INTEGER NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 3),
  gloss_en       TEXT,
  note_md        TEXT,
  evidence_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence     REAL DEFAULT 0.8,
  generated_by   TEXT,
  source_ref     TEXT,
  source_slug    TEXT NOT NULL DEFAULT 'kmaps_root_graph',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_root_norm, to_root_norm, relation_kind),
  FOREIGN KEY (from_root_id)  REFERENCES ar_ling_roots(id),
  FOREIGN KEY (to_root_id)    REFERENCES ar_ling_roots(id),
  FOREIGN KEY (from_sense_id) REFERENCES ar_ling_root_senses(id),
  FOREIGN KEY (to_sense_id)   REFERENCES ar_ling_root_senses(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_root_rel_from ON ar_ling_root_relations(from_root_norm, relation_kind, sort_order);
CREATE INDEX IF NOT EXISTS idx_ar_root_rel_to   ON ar_ling_root_relations(to_root_norm, relation_kind);
CREATE INDEX IF NOT EXISTS idx_ar_root_rel_kind ON ar_ling_root_relations(relation_kind);
