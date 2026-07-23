-- 0037 — Unified root-edge view (AL domain).
-- Root-to-root semantics currently live in three shapes:
--   • ar_ling_root_antonyms  — pairwise opposites (root_norm → antonym_root)
--   • ar_ling_root_relations — general typed pairwise graph (0035)
--   • ar_ling_syn_root       — per-root synonym/aḍdād FAMILY summary (not pairwise)
-- Consumers want one pane. This read-only view folds all three into a single
-- normalized edge list. syn_root has no target root (it's a family anchor), so
-- it surfaces with to_root_norm NULL and relation_kind 'synonym_family' /
-- 'addad_family'. The view is additive and drops nothing.

DROP VIEW IF EXISTS ar_ling_root_edges_v;
CREATE VIEW ar_ling_root_edges_v AS
  -- antonyms → edges
  SELECT
    'antonym'                          AS origin_table,
    a.id                               AS edge_id,
    NULL                               AS from_root_id,
    a.root_norm                        AS from_root_norm,
    NULL                               AS to_root_id,
    COALESCE(a.antonym_root, a.antonym_ar) AS to_root_norm,
    a.relation_kind                    AS relation_kind,
    NULL                               AS strength,
    a.antonym_en                       AS gloss_en,
    NULL                               AS evidence_json,
    a.status                           AS status,
    a.created_at                       AS created_at
  FROM ar_ling_root_antonyms a
  UNION ALL
  -- general typed relations → edges
  SELECT
    'relation',
    r.id,
    r.from_root_id,
    r.from_root_norm,
    r.to_root_id,
    r.to_root_norm,
    r.relation_kind,
    r.strength,
    r.gloss_en,
    r.evidence_json,
    r.status,
    r.created_at
  FROM ar_ling_root_relations r
  UNION ALL
  -- synonym / aḍdād family anchors (no pairwise target)
  SELECT
    'synonym_family',
    s.id,
    s.root_id,
    s.root_norm,
    NULL,
    NULL,
    CASE WHEN s.is_addad = 1 THEN 'addad_family' ELSE 'synonym_family' END,
    NULL,
    s.sense_family_summary_en,
    s.evidence_json,
    s.status,
    s.created_at
  FROM ar_ling_syn_root s;
