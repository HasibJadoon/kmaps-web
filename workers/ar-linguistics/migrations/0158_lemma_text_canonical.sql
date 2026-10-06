-- 0158: 415 lemmas carry a shadda on their FIRST letter — تَّوْب, نَّاس, مُّبِين, رَّحِيم. It is not part of the word: it
-- is the assimilation of the word before it (the لْ of أَلْ before a sun letter, or tanwīn before م ن ر ل), cut off with
-- the word when the lemma was taken from the muṣḥaf. No Arabic word starts with a doubled letter (a doubled letter
-- needs a sukūn before it, and a word cannot start on one).
-- AGR:ANY:005: the as-ingested lemma_text stays; the dictionary form goes in a new resolved column, and every reader
-- reads coalesce(lemma_text_canonical, lemma_text). Each fix is also filed in the correction register.
ALTER TABLE ar_ling_root_lemma ADD COLUMN lemma_text_canonical TEXT;

UPDATE ar_ling_root_lemma
   SET lemma_text_canonical = substr(lemma_text, 1, 1) || substr(lemma_text, 3)
 WHERE substr(lemma_text, 2, 1) = 'ّ' AND lemma_text_canonical IS NULL;

INSERT OR IGNORE INTO ar_ling_root_lemma_taswib
  (id, upstream_slug, upstream_version, scope, key_bw, root_bw, surface_ar, field, upstream_value, proposed_value,
   detector, rationale_en, occurrences, confidence, status, verified_against, source_slug)
SELECT 'MC:AL:' || id, 'al_lemma', NULL, 'lemma', id, NULL, lemma_text, 'lemma_text', lemma_text, lemma_text_canonical,
       'initial_shadda',
       'Shadda on the first letter is the assimilation of the word before it (أَلْ before a sun letter, or tanwīn), cut off with the word; a word cannot start with a doubled letter.',
       frequency_quran, 'high', 'applied', 'orthography: no word-initial shadda', 'kmaps_five_lens'
  FROM ar_ling_root_lemma
 WHERE lemma_text_canonical IS NOT NULL;
