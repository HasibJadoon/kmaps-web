-- A rung's short step (user, 2026-10-01: «Binding → Book → …» — an aesthetic arc): one to three
-- English words naming a turning point of the root's meaning. Only the turning points carry one; the
-- QR drill 'meaning_arc' (pick the arc) offers a root only once at least three of its rungs do.
ALTER TABLE ar_ling_arc_rung ADD COLUMN step_en TEXT;
UPDATE ar_ling_arc_rung SET step_en = 'Slipping in, staying'  WHERE id = (SELECT id FROM ar_ling_arc_rung WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 1);
UPDATE ar_ling_arc_rung SET step_en = 'Iron collar'           WHERE id = (SELECT id FROM ar_ling_arc_rung WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 7);
UPDATE ar_ling_arc_rung SET step_en = 'Secret theft'          WHERE id = (SELECT id FROM ar_ling_arc_rung WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 8);
UPDATE ar_ling_arc_rung SET step_en = 'Rancour in the heart'  WHERE id = (SELECT id FROM ar_ling_arc_rung WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 10);
UPDATE ar_ling_arc_rung SET step_en = 'Burning thirst'        WHERE id = (SELECT id FROM ar_ling_arc_rung WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 12);
