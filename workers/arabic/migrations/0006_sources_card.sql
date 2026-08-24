-- ─── 0006 — every source reachable from the discipline it serves ──────────────
-- The Sources card reads ar_learning_source directly, so nothing was invisible
-- there. The citation graph was a different story: three naḥw authorities —
-- Ibn Hishām's Mughnī, al-Mubarrad's Muqtaḍab and al-Sāmarrāʾī's Maʿānī —
-- appeared in no ar_node_source row at all, so walking "which topics cite this
-- book" from the source side came back empty and walking down from GN:NH never
-- named them. Registering them at the discipline root is the honest minimum:
-- they are general references for the whole of naḥw, not for one bāb, and a
-- future migration can pin them to the exact chapters as those get read.
INSERT OR IGNORE INTO ar_node_source (node_id, source_id, locator, role, sort_order) VALUES
  ('GN:NH', 'SRC:ibn_hisham_mughni', NULL, 'classical',      6),
  ('GN:NH', 'SRC:mubarrad',          NULL, 'classical',      7),
  ('GN:NH', 'SRC:samarrai',          NULL, 'primary_modern', 8);
