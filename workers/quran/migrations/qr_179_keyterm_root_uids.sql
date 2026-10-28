-- A table that names a root carries its AL root id (owner, 2026-10-28): the key term's roots as ar_ling_roots.id,
-- a JSON array (an expression joins two roots). Filled by kmaps-resources docs/quran/keyterms/term_words.py.
ALTER TABLE qr_keyterm ADD COLUMN root_uids TEXT NOT NULL DEFAULT '[]';
