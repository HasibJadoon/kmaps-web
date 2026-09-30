-- qr_058_vocab_gloss.sql
--
-- Surah vocabulary: what each word means IN ITS ĀYAH, from the books. Every gloss a source gives a
-- content-word occurrence of qr_vocab_item, verbatim, with its provenance — several per word — and one
-- of them, by source priority, the word's "meaning here" (role 'primary'):
--
--   rank 1    a lexicon/grammar source that names this āyah: al-Rāghib's reading of it («أي …») or his
--             definition of the word under which he quotes it, Lane's sense block that cites it, Mir's idiom,
--             ʿUḍayma's «بمعنى …» on the word, a grammar book's gloss of it where it cites the āyah
--   rank 2    tafsīr consensus: ≥2 of the eight tafsīrs whose glosses of the word agree
--   rank 2.5  the K-Maps sense arc rung the word is linked to (attested)
--   rank 3    the iʿrāb books: Darwīsh's lughat, al-Jadwal's ṣarf «بمعنى», the Muyassar's «بمعنى»
--   rank 4    one tafsīr's gloss («﴿word﴾ أي …», «word: …», «والمراد بـword …», «ومعناه …», «بمعنى …»)
--   rank 5    the English tafsīrs (Ibn Kathīr abridged, Maʿārif, Tazkīr) glossing the word by its transliteration
--   rank 5.9  Lane's sense of the headword that the translators' renderings of this āyah use
--   rank 6    al-Rāghib's own definition of the word (lemma-matched, not āyah-matched)
--   rank 6.8  the gloss the tafsīrs agree on for the same word elsewhere (≥2 books, ≥2 āyāt)
--   rank 7    a weaker single-tafsīr gloss (the last word of a longer quotation, «X، أي …»)
--   rank 8    the K-Maps word view (English rendering only, never the meaning here)
-- Lane's first headword sense is never a fallback. role 'en' / 'ar' marks the gloss shown beside the
-- primary in the other language. grp: glosses of one word that agree share a group (Arabic < 1000,
-- English ≥ 1000) — two sources in different groups gloss the word differently.
--
-- qr_vocab_root_core: ROOT IMAGERY (Ibn Fāris's aṣl in Maqāyīs, the K-Maps root DNA core) — shown
-- beside the meaning, never as it.
--
-- Built by kmaps-resources scripts/quran/vocab_meanings.py (after vocab_items.py), which also refreshes
-- qr_vocab_item.gloss_en from the sources' English. Apply with `d1 execute --file` (see qr_046: do not
-- `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_vocab_gloss (
  id          TEXT PRIMARY KEY,
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_vocab_item (surah, ayah, word_index)
  lang        TEXT NOT NULL,        -- ar | en
  text        TEXT NOT NULL,        -- the gloss, verbatim
  source_slug TEXT NOT NULL,        -- razi · alusi · zamakhshari · ibn_ashur · tabari · ibn_atiyya · abu_hayyan · ibn_kathir ·
                                    -- qul_irab_darwish · qul_jadwal_irab_quran · qul_irab_muyassar · ibn-kathir-abridged · maarif · tazkir ·
                                    -- raghib_mufradat · lane_lexicon · mir_verbal_idioms · sense_arc · adima_dirasat · <grammar book> · kmaps_word_view
  source_kind TEXT NOT NULL,        -- tafsir | tafsir_en | irab | lexicon | grammar | kmaps
  citation    TEXT NOT NULL,        -- the book, where, and on which āyah
  method      TEXT NOT NULL,        -- ay · yani · mana · bimana · murad · colon · lughat · qala · … · lane_ayah · mufradat_ayah · lane_context · tafsir_lemma …
  confidence  TEXT NOT NULL,        -- high | medium | low
  rank        REAL NOT NULL,        -- the priority above (lower first)
  role        TEXT,                 -- primary | en | ar | NULL
  grp         INTEGER,              -- agreement group within the word
  quote_ar    TEXT,                 -- the passage as it stands (the word, the formula, the gloss)
  al_ref      TEXT                  -- the block / fact / entry it was read from
);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_gloss_word ON qr_vocab_gloss (surah, ayah, word_index);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_gloss_role ON qr_vocab_gloss (surah, role) WHERE role IS NOT NULL;

CREATE TABLE IF NOT EXISTS qr_vocab_root_core (
  root        TEXT NOT NULL,
  source_slug TEXT NOT NULL,        -- maqayis_lugha | kmaps_root_dna
  text_ar     TEXT,
  text_en     TEXT,
  citation    TEXT NOT NULL,
  al_ref      TEXT,
  PRIMARY KEY (root, source_slug)
);

-- the drills: L2 «which book glosses it so?», L3 «how does <book> gloss it here?» (only where ≥2 sources differ)
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'vocab', 'Surah vocabulary', 'مُفْرَدَاتُ السُّورَة', 'The surah''s words, lemma by lemma — its root and family, what it means here (from the tafsīrs, the iʿrāb books and the lexicons), how the books gloss it, and which of its Qurʾānic senses this āyah uses', 'character.book.closed', '#4FB3A9', NULL,
 '{"source":"vocab","levels":{"basic":{"band":"basic","asks":["vocab_root","vocab_lemma","vocab_meaning"]},"middle":{"band":"middle","asks":["vocab_family","vocab_kin","vocab_form","vocab_who"]},"advanced":{"band":"advanced","asks":["vocab_range","vocab_same","vocab_rung","vocab_books"]}}}', 29),
('kind', 'vocab_who', 'Which book glosses the marked word so, here?', 'أَيُّ كِتَابٍ فَسَّرَ الكَلِمَةَ هُنَا بِهٰذَا؟', NULL, NULL, NULL, NULL, NULL, 79),
('kind', 'vocab_books', 'How does this book gloss the marked word here?', 'كَيْفَ فَسَّرَ هٰذَا الكِتَابُ الكَلِمَةَ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 80);
