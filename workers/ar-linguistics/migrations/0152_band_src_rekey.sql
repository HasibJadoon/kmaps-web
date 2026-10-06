-- 0152: 010-SRC (how many books hold a root) counts each block under its RESOLVED root (0151 re-key), not the key it was
-- ingested under — so the Jamhara's letter bins and al-Qāmūs's pronoun keys count for the real root. Counted once, over the
-- Qurʾānic roots of the cache (those with a 50-META row), from the two indexed sides: blocks still under their own key, and
-- re-keyed blocks.
UPDATE ar_ling_reg_band_fill_rule SET fill_sql = 'SELECT k, COUNT(DISTINCT s) n FROM (SELECT b.root_norm k, b.source_slug s FROM ar_ling_lexicon_block b WHERE NOT EXISTS (SELECT 1 FROM ar_ling_lexicon_block_rekey r WHERE r.block_id = b.id) UNION ALL SELECT r.root_norm_canonical k, b.source_slug s FROM ar_ling_lexicon_block_rekey r JOIN ar_ling_lexicon_block b ON b.id = r.block_id) GROUP BY k',
       na_reason = 'counts distinct source_slug under the resolved root (block rekey); the denominator is the book roster', updated_at = datetime('now')
 WHERE band_code = '010-SRC';
INSERT OR REPLACE INTO ar_ling_root_band_fill (root_norm, band_code, n, computed_at)
SELECT q.root_norm, '010-SRC', coalesce(x.n, 0), datetime('now')
  FROM (SELECT root_norm FROM ar_ling_root_band_fill WHERE band_code = '50-META') q
  LEFT JOIN (SELECT k, COUNT(DISTINCT s) n FROM (
               SELECT b.root_norm k, b.source_slug s FROM ar_ling_lexicon_block b
                WHERE b.root_norm IN (SELECT root_norm FROM ar_ling_root_band_fill WHERE band_code = '50-META')
                  AND NOT EXISTS (SELECT 1 FROM ar_ling_lexicon_block_rekey r WHERE r.block_id = b.id)
               UNION ALL
               SELECT r.root_norm_canonical, b.source_slug FROM ar_ling_lexicon_block_rekey r JOIN ar_ling_lexicon_block b ON b.id = r.block_id
                WHERE r.root_norm_canonical IN (SELECT root_norm FROM ar_ling_root_band_fill WHERE band_code = '50-META'))
             GROUP BY k) x ON x.k = q.root_norm;
