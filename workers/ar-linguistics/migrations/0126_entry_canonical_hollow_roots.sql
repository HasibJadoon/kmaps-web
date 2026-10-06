-- 0126: three keys each held TWO roots, so they are resolved per ENTRY, never per root.
--   تاب: al-Qāmūs files the hollow root توب under its past تاب («تابَ إلى اللَّه تَوْباً»);
--        al-Ṣiḥāḥ, Lisān and Tāj under the same key are the hamzated root تأب (التوأبانيان، تَيْأَب).
--   صار: al-Qāmūs = صير («صارَ الأمرُ إلى كذا صَيْراً ومَصِيراً»); Lisān and Tāj = صأر (صَوْأَر, a place).
--   طال: al-Qāmūs = طول («طالَ طُولاً: امْتَدَّ»).
-- A root-level merge (canonical_id) would have folded تأب and صأر into توب and صير. The as-ingested
-- root_norm is kept; root_norm_canonical is the resolved pointer readers use (AGR:LEX:002).

UPDATE ar_ling_lexicon_entry SET root_norm_canonical = 'توب' WHERE id = 're_qms_5f5f444688e05cff' AND root_norm = 'تاب';
UPDATE ar_ling_lexicon_entry SET root_norm_canonical = 'صير' WHERE id = 're_qms_fcc87c942996c746' AND root_norm = 'صار';
UPDATE ar_ling_lexicon_entry SET root_norm_canonical = 'طول' WHERE id = 're_qms_1b94c9cfc10492c8' AND root_norm = 'طال';
UPDATE ar_ling_lexicon_entry SET root_norm_canonical = 'تأب' WHERE id IN ('re_sih_0ab373122832d2e5', 're_lsn_d6aee62ab97325f0', 're_taj_291e8b5ed1be6ab8') AND root_norm = 'تاب';
UPDATE ar_ling_lexicon_entry SET root_norm_canonical = 'صأر' WHERE id IN ('re_lsn_a7ae612d9809342a', 're_taj_62e8d256bc8b7545') AND root_norm = 'صار';
