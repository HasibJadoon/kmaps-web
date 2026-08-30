CREATE TABLE IF NOT EXISTS ar_ling_root_senses (
  id             TEXT PRIMARY KEY,
  root_id        TEXT,
  root_norm      TEXT NOT NULL,
  sense_key      TEXT NOT NULL,
  gloss_ar       TEXT,
  gloss_en       TEXT,
  gloss_ur       TEXT,
  definition_md  TEXT,
  is_core        INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  basis_json     TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence     REAL DEFAULT 0.8,
  generated_by   TEXT,
  source_slug    TEXT NOT NULL DEFAULT 'kmaps_sense_map',
  status         TEXT NOT NULL DEFAULT 'draft',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, sense_key),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_root_senses_root ON ar_ling_root_senses(root_norm, sort_order);
CREATE INDEX IF NOT EXISTS idx_ar_root_senses_core ON ar_ling_root_senses(root_norm, is_core);

CREATE TABLE IF NOT EXISTS ar_ling_root_semantic_fields (
  id           TEXT PRIMARY KEY,
  root_id      TEXT,
  root_norm    TEXT NOT NULL,
  field_id     TEXT NOT NULL,
  sense_id     TEXT,
  weight       INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  is_primary   INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS ar_ling_root_relations (
  id             TEXT PRIMARY KEY,
  from_root_id   TEXT,
  from_root_norm TEXT NOT NULL,
  to_root_id     TEXT,
  to_root_norm   TEXT NOT NULL,
  relation_kind  TEXT NOT NULL,

  from_sense_id  TEXT,
  to_sense_id    TEXT,
  direction      TEXT NOT NULL DEFAULT 'directed',
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
