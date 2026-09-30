-- qr_056_vocab_skill.sql
--
-- Surah vocabulary: a surah's words studied lemma by lemma, each drill in its āyah (the word
-- marked, al-ʿAfāsī's recitation), each with its review card (module QR, kind 'vocab').
--
--   L1 the word        its root · its lemma (dictionary form) · what it means here (the sense a
--                      source files this āyah under; else the lemma's own gloss) — frequent first
--   L2 the family      which of the root's words it is · a word of the same family (in the surah
--                      or elsewhere) · a word of the family and its pattern (wazn) → its meaning
--   L3 the range       which of the word's Qurʾānic senses this āyah uses (the other senses the
--                      same source gives it, each with an āyah) · where else it has this sense ·
--                      which rung of the root's sense arc this usage stands on
--
-- The rows are built by kmaps-resources scripts/quran/vocab_items.py from km_arabic_linguistic
-- (al-Rāghib's Mufradāt 'quran' facts read under his own glosses, Lane's Qurʾān references on
-- their sense blocks, Mir's verbal idioms, the live sense arcs) and qr_word_occurrence. A sense is
-- only ever a heading the source gives, with only the āyāt it cites under it.
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_vocab_item (
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_word_occurrence.word_index
  word_text   TEXT NOT NULL,
  root        TEXT NOT NULL,
  lemma       TEXT,
  pos         TEXT,
  form_roman  TEXT,
  wazn_ar     TEXT,                 -- qr_lemma.wazn_ar
  lemma_n     INTEGER NOT NULL DEFAULT 0,   -- the lemma's words in the Qurʾān
  root_n      INTEGER NOT NULL DEFAULT 0,   -- the root's words in the Qurʾān
  tier        INTEGER NOT NULL,     -- 1 ≥100 · 2 ≥30 · 3 ≥10 · 4 ≥3 · 5 rarer (by lemma_n)
  n_lemmas    INTEGER NOT NULL DEFAULT 1,   -- the root's lemmas in the Qurʾān
  gloss_en    TEXT,                 -- the lemma's gloss (Lane: the headword's first sense, or the sense he cites the Qurʾān under)
  gloss_ref   TEXT,
  here_en     TEXT,                 -- the sense a source files THIS āyah under, in English (Lane, Mir)
  here_ref    TEXT,
  here_sense  TEXT,                 -- qr_vocab_sense.id of here_en
  senses_json TEXT,                 -- every qr_vocab_sense.id placed on this word
  n_range     INTEGER NOT NULL DEFAULT 0,   -- the root's Qurʾānic senses, all sources
  PRIMARY KEY (surah, ayah, word_index)
);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_item_root ON qr_vocab_item (root, lemma);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_item_tier ON qr_vocab_item (surah, tier, ayah);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_item_placed ON qr_vocab_item (surah, ayah) WHERE senses_json IS NOT NULL;

CREATE TABLE IF NOT EXISTS qr_vocab_sense (
  id          TEXT PRIMARY KEY,     -- mfr:<hash> · lane:<block id> · mir:<hash> · arc:<arc id>:<sense id>
  source      TEXT NOT NULL,        -- raghib_mufradat | lane_lexicon | mir_verbal_idioms | sense_arc
  root        TEXT NOT NULL,        -- the Qurʾān's root (qr_word_occurrence.root)
  al_root     TEXT,                 -- the root as the source files it
  head_ar     TEXT,                 -- the headword / construction the sense is given for
  label_ar    TEXT,                 -- the source's own words (al-Rāghib's gloss, Mir's construction, the rung)
  label_en    TEXT,                 -- the source's own English (Lane's definition, Mir's sense, the rung)
  kind        TEXT,                 -- Lane's sense kind · Mir's construction · the rung's gloss
  marker      TEXT,                 -- Lane's sense label (A1, B …) · Mir's particle · the rung number
  page        TEXT,
  seq         INTEGER,              -- its place in the source's entry / the arc
  group_key   TEXT NOT NULL,        -- the senses read as one range: mfr:<root> · lane:<root> · mir:<root> · <arc id>
  ref         TEXT NOT NULL,        -- the citation shown
  al_ref      TEXT,                 -- the AL rows it was read from (facts, block, tabir, sense)
  ayat_json   TEXT NOT NULL,        -- the āyāt the source cites under it that hold a word of the root
  n_ayat      INTEGER NOT NULL,
  arc_json    TEXT                  -- sense arcs: the arc and its rungs
);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_sense_group ON qr_vocab_sense (group_key, seq);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_sense_root ON qr_vocab_sense (root, source);

CREATE TABLE IF NOT EXISTS qr_vocab_place (
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,
  sense_id    TEXT NOT NULL,
  how         TEXT NOT NULL,        -- ayah (the only word of the root there) · quote · head · lemma · link · attested
  note_ar     TEXT,                 -- al-Rāghib's own reading of this āyah (his «أي: …»)
  PRIMARY KEY (surah, ayah, word_index, sense_id)
);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_place_sense ON qr_vocab_place (sense_id);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'vocab', 'Surah vocabulary', 'مُفْرَدَاتُ السُّورَة', 'The surah''s words, lemma by lemma — its root and family, what it means here, and which of its Qurʾānic senses this āyah uses', 'character.book.closed', '#4FB3A9', NULL,
 '{"source":"vocab","levels":{"basic":{"band":"basic","asks":["vocab_root","vocab_lemma","vocab_meaning"]},"middle":{"band":"middle","asks":["vocab_family","vocab_kin","vocab_form"]},"advanced":{"band":"advanced","asks":["vocab_range","vocab_same","vocab_rung"]}}}', 29),

('kind', 'vocab_root', 'Listen — which root is the marked word from?', 'اِسْمَعْ — مِنْ أَيِّ جَذْرٍ الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 70),
('kind', 'vocab_lemma', 'Listen — which dictionary form (lemma) is the marked word?', 'اِسْمَعْ — مَا أَصْلُ الكَلِمَةِ فِي المُعْجَم؟', NULL, NULL, NULL, NULL, NULL, 71),
('kind', 'vocab_meaning', 'Listen — what does the marked word mean here?', 'اِسْمَعْ — مَا مَعْنَى الكَلِمَةِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 72),
('kind', 'vocab_family', 'Which word of its root is the marked one?', 'أَيُّ كَلِمَاتِ الجَذْرِ هٰذِه؟', NULL, NULL, NULL, NULL, NULL, 73),
('kind', 'vocab_kin', 'Which of these words is of the same family?', 'أَيُّ هٰذِهِ مِنْ أُسْرَتِهَا؟', NULL, NULL, NULL, NULL, NULL, 74),
('kind', 'vocab_form', 'A word of the family, by its pattern — what does it mean?', 'كَلِمَةٌ مِنَ الأُسْرَةِ بِوَزْنِهَا — مَا مَعْنَاهَا؟', NULL, NULL, NULL, NULL, NULL, 75),
('kind', 'vocab_range', 'Listen — which of the word''s Qurʾānic senses does this āyah use?', 'اِسْمَعْ — بِأَيِّ مَعَانِيهَا فِي القُرْآنِ جَاءَتْ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 76),
('kind', 'vocab_same', 'Where else does the word carry this same sense?', 'أَيْنَ جَاءَتْ بِهٰذَا المَعْنَى نَفْسِه؟', NULL, NULL, NULL, NULL, NULL, 77),
('kind', 'vocab_rung', 'Which rung of the root''s sense arc is this usage?', 'عَلَى أَيِّ دَرَجَةٍ مِنْ سُلَّمِ المَعْنَى؟', NULL, NULL, NULL, NULL, NULL, 78);
