-- km_arabic_linguistic · 0109 · one code per discipline in the term registry
--
-- The registry filed its terms under two spellings of the same discipline: 479 under the
-- short codes the rest of AL uses (NH, SF, BL, DL — ar_ling_gram_bab, ar_ling_gram_chunk,
-- ar_ling_gram_term_toc) and 71 under the long ones (nahw, sarf, balagha), left by an older
-- import; the categories were long-coded throughout but for three. A caller asking for naḥw
-- had to ask for both. Everything now says NH, SF, BL or DL.
--
-- Nothing reads the long form: the drill sources take both, and /al/gram/terms keeps
-- answering with its long public codes (nahw, sarf, balagha) mapped from these in the route.
--
-- Apply with `d1 execute --file` and record it in d1_migrations: this database's ledger is
-- not complete, and `migrations apply` would run files that are already live.
UPDATE ar_ling_gram_term SET discipline = 'NH' WHERE discipline = 'nahw';
UPDATE ar_ling_gram_term SET discipline = 'SF' WHERE discipline = 'sarf';
UPDATE ar_ling_gram_term SET discipline = 'BL' WHERE discipline = 'balagha';

UPDATE ar_ling_gram_category SET discipline = 'NH' WHERE discipline = 'nahw';
UPDATE ar_ling_gram_category SET discipline = 'SF' WHERE discipline = 'sarf';
UPDATE ar_ling_gram_category SET discipline = 'BL' WHERE discipline = 'balagha';

-- guard: should return nothing
-- SELECT discipline, COUNT(*) FROM ar_ling_gram_term WHERE discipline NOT IN ('NH','SF','BL','DL') GROUP BY 1;
