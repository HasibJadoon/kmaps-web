-- A carrier that reaches the root through another table should say how.
--
-- `ar_ling_reg_table_map.root_bind` has four values, and only `direct` is
-- readable. Six rows are `via` — they do reach a root, but through a join — and
-- the reader's plan query filters on `root_bind = 'direct'`, so every one of
-- them is invisible. Two whole sub-layers are lost that way:
--
--   18-STEP  ar_ling_sense_arc_step   336 rows, all reached through the arc
--   19-ATT   ar_ling_sense_attestation 1,665 of 1,799 rows target a sense
--
-- Neither is empty and neither is unbound, so reporting them as unknown is the
-- least wrong thing the reader can currently say — but the Sense band shows
-- four sub-layers where the registry declares six, and the attestations that
-- back every sense are reachable only through a different endpoint.
--
-- The join is already recorded, in `root_bind_col`, as prose:
--
--   'arc_id -> ar_ling_sense_arc.id -> root_norm'
--   'target_id -> ar_ling_root_sense.id WHERE target_type=''sense'' -> root_norm'
--
-- Prose cannot be executed, and three of the six rows only name a column with
-- no target at all. This adds a machine-readable form beside it and fills in
-- the two that are fully specified. The prose stays: it is the audit note that
-- says who checked and when.
--
-- The remaining four (20-GOV, and three rows of 80-KIN) are left as they are.
-- One of them is a three-hop path through the lemma, and inventing the missing
-- halves of the others would be guessing — they keep reporting unknown, which
-- is true.

ALTER TABLE ar_ling_reg_table_map ADD COLUMN root_bind_via_json TEXT
  CHECK (root_bind_via_json IS NULL OR json_valid(root_bind_via_json));

-- 18-STEP · a step belongs to an arc, and the arc names the root.
UPDATE ar_ling_reg_table_map
   SET root_bind_via_json = json_object(
         'col',       'arc_id',
         'to_table',  'ar_ling_sense_arc',
         'to_col',    'id',
         'root_col',  'root_norm')
 WHERE sub_code = '18-STEP'
   AND table_name = 'ar_ling_sense_arc_step'
   AND root_bind = 'via';

-- 19-ATT · an attestation targets a sense, and the sense names the root. The
-- filter matters: the same table attests other scopes too, and only the rows
-- whose target IS a sense can be reached this way.
UPDATE ar_ling_reg_table_map
   SET root_bind_via_json = json_object(
         'col',        'target_id',
         'to_table',   'ar_ling_root_sense',
         'to_col',     'id',
         'root_col',   'root_norm',
         'where_col',  'target_type',
         'where_val',  'sense')
 WHERE sub_code = '19-ATT'
   AND table_name = 'ar_ling_sense_attestation'
   AND root_bind = 'via';
