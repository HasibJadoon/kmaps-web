-- 0165: set titles read the same way on the word screen ("Words for …").
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Names of the Book', updated_at = datetime('now') WHERE id = 'FRQ:SET:kitab_names' AND canonical_en = 'names of the revealed Book';
UPDATE ar_ling_root_lemma_furuq_set SET canonical_en = 'Words for accepting', updated_at = datetime('now') WHERE id = 'NS:TO:TO_ACCEPT' AND canonical_en = 'To accept';
