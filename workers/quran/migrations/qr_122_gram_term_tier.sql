-- The term registry's grade (AL 0206: basic · intermediate · expert) on QR's copy, so the QR drills can keep to the
-- high end: a grammar or balāgha drill is dealt only for an expert term. Synced from AL by id (scripts/grammar/term_tiers.py
-- writes AL; kmaps-resources scripts/quran/sync_gram_tier.py copies it here).
ALTER TABLE ar_ling_gram_term ADD COLUMN tier TEXT;
