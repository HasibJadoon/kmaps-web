-- 0170: two Jamhara blocks (weak-letter bin, p.540) that 0167 cites were re-keyed by the group-head rule (0151) to
-- خوو — the last group head of the bin, inherited by 16,937 blocks after it. Placed here by reading (AGR:VOC:011):
--   blk_jam_d8ede564a0233405  «العَفْو: ضدّ العقوبة … عَفا يعفو … والعِفْو: ولد الأتان» — all عفو → عفو
--   blk_jam_168bafd7dc636ae0  «والرَّخاء: ضدّ الشِّدَّة. والرُّخاء: الريح … والإرخاء» — رخو (its first line, الخَراتان,
--                              is a star name of another root; the block is filed by its body)
-- The rest of the bin is a separate re-key job.
UPDATE ar_ling_lexicon_block_rekey SET root_norm_canonical = 'عفو', method = 'manual' WHERE block_id = 'blk_jam_d8ede564a0233405' AND root_norm_canonical = 'خوو';
UPDATE ar_ling_lexicon_block_rekey SET root_norm_canonical = 'رخو', method = 'manual' WHERE block_id = 'blk_jam_168bafd7dc636ae0' AND root_norm_canonical = 'خوو';
