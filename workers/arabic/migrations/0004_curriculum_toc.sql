-- ─── 0004 — the curriculum TOC, wired end to end ──────────────────────────────
-- km_arabic already held two halves of a table of contents that never met:
--   • ar_curriculum_container / _container_unit — 3 courses, 39 modules
--   • ar_grammar_node                           — 189 nodes, depth 0-5, the
--                                                 real hierarchy (fann → bab →
--                                                 fasl → masala), with paths
-- Only 21 of the 39 modules pointed at a node, and nothing pointed back, so a
-- reader could never walk from a course down to a masala. This migration makes
-- the join total and names the three linguistic disciplines as data.
--
-- Nothing here duplicates a title: the module keeps its pedagogical framing,
-- the node keeps the classical hierarchy, and one column joins them.

-- ── 1. The three domains of Arabic linguistics, as rows ───────────────────────
CREATE TABLE IF NOT EXISTS ar_discipline (
  code        TEXT PRIMARY KEY,          -- NH | SF | BL
  slug        TEXT NOT NULL UNIQUE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_ur     TEXT,
  tagline_en  TEXT,
  root_node_id TEXT,                     -- ar_grammar_node fann root
  container_id TEXT,                     -- ar_curriculum_container course
  accent      TEXT,                      -- UI accent, one place, both clients
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO ar_discipline
  (code, slug, name_ar, name_en, name_ur, tagline_en, root_node_id, container_id, accent, sort_order)
VALUES
  ('NH', 'nahw',    'علم النحو',    'Naḥw',   'نحو',   'Syntax — how words stand in a sentence',        'GN:NH', 'ARCC:NH:course', '#d8b657', 1),
  ('SF', 'sarf',    'علم الصرف',    'Ṣarf',   'صرف',   'Morphology — how a root becomes a word',        'GN:SF', 'ARCC:SF:course', '#5bbf95', 2),
  ('BL', 'balagha', 'علم البلاغة',  'Balāgha','بلاغہ', 'Rhetoric — why this wording and not another',   'GN:BL', 'ARCC:BL:course', '#d98a8a', 3);

-- ── 2. A course names its discipline ──────────────────────────────────────────
ALTER TABLE ar_curriculum_container ADD COLUMN discipline TEXT;

UPDATE ar_curriculum_container SET discipline = 'NH' WHERE id = 'ARCC:NH:course';
UPDATE ar_curriculum_container SET discipline = 'SF' WHERE id = 'ARCC:SF:course';
UPDATE ar_curriculum_container SET discipline = 'BL' WHERE id = 'ARCC:BL:course';

-- ── 3. A unit names the node its subtree hangs from ───────────────────────────
-- ar_grammar_node.unit_id already points node → unit, but several nodes share a
-- unit (ARCU:NH:06:L1 owns five), so unit → node was ambiguous. This column
-- names the ONE node that is the unit's root.
ALTER TABLE ar_curriculum_container_unit ADD COLUMN gn_node_id TEXT;

-- ── 4. The missing node: BL:15 had no classical counterpart ───────────────────
INSERT OR IGNORE INTO ar_grammar_node
  (id, parent_id, discipline, node_type, name_ar, name_en, sort_order, depth, path, unit_id, status)
VALUES
  ('GN:BL:tatbiqi', 'GN:BL', 'BL', 'bab',
   'مباحث تطبيقية من كلام المفسرين', 'Applied devices from the mufassirūn',
   4, 1, '/BL/tatbiqi', 'ARCU:BL:15', 'skeleton');

-- ── 5. Bind every module still floating ───────────────────────────────────────
-- Ṣarf: 8 of 12 modules had no node.
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:05' WHERE id = 'GN:SF:fil:taaddi'          AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:06' WHERE id = 'GN:SF:fil:sihha'           AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:07' WHERE id IN ('GN:SF:ilal','GN:SF:idgham') AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:08' WHERE id = 'GN:SF:tasrif_asma:jumud'   AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:09' WHERE id = 'GN:SF:mushtaqqat'          AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:10' WHERE id = 'GN:SF:jumu'                AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:11' WHERE id = 'GN:SF:tasghir'             AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:SF:12' WHERE id IN ('GN:SF:waqf','GN:SF:mushtarak:khatt') AND unit_id IS NULL;

-- Balāgha: 11 of 15 modules had no node.
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:05' WHERE id = 'GN:BL:maani:qasr'      AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:06' WHERE id = 'GN:BL:maani:insha'     AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:07' WHERE id = 'GN:BL:maani:fasl_wasl' AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:08' WHERE id = 'GN:BL:maani:ijaz'      AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:09' WHERE id = 'GN:BL:bayan:tashbih'   AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:10' WHERE id = 'GN:BL:bayan:haqiqa'    AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:11' WHERE id = 'GN:BL:bayan:istiara'   AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:12' WHERE id = 'GN:BL:bayan:kinaya'    AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:13' WHERE id = 'GN:BL:badi:manawi'     AND unit_id IS NULL;
UPDATE ar_grammar_node SET unit_id = 'ARCU:BL:14' WHERE id = 'GN:BL:badi:lafzi'      AND unit_id IS NULL;

-- ── 6. Point each unit back at its root node ──────────────────────────────────
-- The root is the shallowest node bound to the unit; ties break on sort_order
-- then id, so the choice is deterministic on every re-run.
UPDATE ar_curriculum_container_unit
   SET gn_node_id = (
     SELECT n.id FROM ar_grammar_node n
      WHERE n.unit_id = ar_curriculum_container_unit.id
      ORDER BY n.depth, n.sort_order, n.id
      LIMIT 1
   )
 WHERE gn_node_id IS NULL;

-- ── 7. Indexes for the paths the TOC actually walks ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_gn_unit        ON ar_grammar_node (unit_id);
CREATE INDEX IF NOT EXISTS idx_gn_disc_parent ON ar_grammar_node (discipline, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gn_parent      ON ar_grammar_node (parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gn_path        ON ar_grammar_node (path);
CREATE INDEX IF NOT EXISTS idx_ns_source      ON ar_node_source (source_id);
CREATE INDEX IF NOT EXISTS idx_ls_discipline  ON ar_learning_source (discipline, source_kind);
CREATE INDEX IF NOT EXISTS idx_ccu_container  ON ar_curriculum_container_unit (container_id, parent_id, unit_index);
CREATE INDEX IF NOT EXISTS idx_ccu_node       ON ar_curriculum_container_unit (gn_node_id);
CREATE INDEX IF NOT EXISTS idx_cc_discipline  ON ar_curriculum_container (discipline, sort_order);
