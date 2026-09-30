-- qr_061_surah_expression_drills.sql
--
-- Every surah drillable on its near-synonyms, Sinai's key terms and its expressions — surah-scoped,
-- three levels each, every drill in its āyah (the word marked or blanked, al-ʿAfāsī's recitation),
-- every drill SRS-carded (module QR).
--
--   nearsyn     a word of the surah that is a member of a furūq set (AL ar_ling_root_lemma_furuq_*)
--     L1 which word is used here?          the word blanked, its set's members to choose from
--     L2 which of these defines it?        each member as Lisān, Tāj al-ʿArūs, Lane or al-Rāghib defines it
--     L3 where else is its near-synonym? · what tells them apart?   the set's other members in their āyāt;
--                                          the nuance notes where there are any, else the lexica side by side.
--                                          A set that is an unreviewed draft says so in every drill.
--   keyterm     a word of the surah that is one of Sinai's key terms (Key Terms of the Qurʾān, 2023)
--     L1 what does the key term mean?      Sinai's gloss (else Lane's rendering, said so)
--     L2 which form is it? · which word is it?   the term's Arabic among the surah's key terms; the word in its āyah
--     L3 Sinai's point · Lane's sense      the sentence of his article that cites this āyah; Lane's rendering beside Sinai's gloss
--   expression  what the sources record as an expression of the āyah: Mir's verbal idioms, the verb frames
--               (Mir's verb + particle, the curated frames, ʿUḍayma's form meanings), Ibn ʿĀshūr's and the
--               passage studies' expressions, Sinai's verbal idioms
--     L1 what does it mean here?           its sense among other expressions'
--     L2 which particle? · which verb? · who records it?
--     L3 which of its senses here? · where else in this sense? · what does the source note?
--
-- qr_drill_anchor holds where each stands, word by word — built by kmaps-resources
-- scripts/quran/surah_expr_drills.py from km_arabic_linguistic and qr_word_occurrence, every root matched
-- through all its keys (the view's geminate/biliteral keys, the weak and hamza spellings, both sides folded
-- alike; `match` keeps the key that matched). What the sources say (the set, the lexica's definitions,
-- Sinai's entry) is read from AL when the drill is made (/al/drill/nearsyn, /al/drill/keyterms, /al/drill/defs).
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_drill_anchor (
  id          TEXT PRIMARY KEY,     -- ns:<member>:<s>:<a>:<w> · sk:<entry>:<term>:<s>:<a>:<w> · kc:<entry>:<s>:<a> · ex:<source row>[:<s>:<a>]
  family      TEXT NOT NULL,        -- nearsyn | keyterm | expression
  source      TEXT NOT NULL,        -- furuq · sinai_key_terms · sinai_cite · mir_verbal_idioms · adima_dirasat · kmaps_tadiya · ibn_ashur · kmaps_passage_study
  ref         TEXT NOT NULL,        -- AL typed ref: NS:<set>|<member> · SK:<entry>|<term> · TB:<tabir id> · TD:<tadiya id> · SV:<root>|<translit>
  grp         TEXT,                 -- what the options come from: the set · the entry · <root>|<particle> · type|<expression type>
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER,              -- the marked word (qr_word_occurrence.word_index); NULL = the āyah as a whole
  word_to     INTEGER,              -- the particle / the last word of a multi-word term
  word_text   TEXT,
  lemma       TEXT,
  root        TEXT,                 -- the corpus root
  al_root     TEXT,                 -- the root as the source keys it
  match       TEXT NOT NULL,        -- lemma · evidence · surface · root · root_geminate · root_weak · …+key<n> (the view's key) · renumbered · cited
  head_ar     TEXT,                 -- the member / term / expression as the source writes it
  label_en    TEXT,                 -- its gloss / sense (the set's name for a near-synonym; Sinai's citing sentence for sinai_cite)
  note        TEXT,                 -- the source's note (Mir's explanation, the frame's Arabic, the term's transliteration)
  status      TEXT                  -- the source row's review status (a furūq set: source_status:review_status)
);
CREATE INDEX IF NOT EXISTS idx_qr_drill_anchor_scope ON qr_drill_anchor (family, surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qr_drill_anchor_grp ON qr_drill_anchor (family, grp);
CREATE INDEX IF NOT EXISTS idx_qr_drill_anchor_ref ON qr_drill_anchor (ref);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'nearsyn', 'Near-synonyms', 'الفُرُوق', 'A word of the surah among its near-synonyms (furūq): which one the āyah uses, how the lexica define each, where the others stand', 'arrow.left.arrow.right', '#4FB3A9', NULL,
 '{"source":"nearsyn","levels":{"basic":{"band":"basic","asks":["ns_which"]},"middle":{"band":"middle","asks":["ns_meaning"]},"advanced":{"band":"advanced","asks":["ns_where","ns_contrast"]}}}', 31),
('skill', 'keyterm', 'Key terms', 'المُصْطَلَحَات', 'Sinai''s key terms of the Qurʾān as they stand in the surah: their meaning, their form, his argument and Lane''s sense', 'key', '#6D9DC5', NULL,
 '{"source":"keyterm","levels":{"basic":{"band":"basic","asks":["kt_gloss"]},"middle":{"band":"middle","asks":["kt_form","kt_word"]},"advanced":{"band":"advanced","asks":["kt_point","kt_lane"]}}}', 32),
('skill', 'expression', 'Expressions', 'التَّعَابِير', 'Every expression the sources record for the surah — Mir''s verbal idioms, the verb frames, Ibn ʿĀshūr''s and Sinai''s — in its āyah', 'quote.bubble', '#F4A261', NULL,
 '{"source":"expression","levels":{"basic":{"band":"basic","asks":["ex_meaning"]},"middle":{"band":"middle","asks":["ex_particle","ex_verb","ex_source"]},"advanced":{"band":"advanced","asks":["ex_range","ex_where","ex_note"]}}}', 33),

('kind', 'ns_which', 'Listen — which of the near-synonyms does the āyah use?', 'اِسْمَعْ — أَيُّ المُتَرَادِفَاتِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 90),
('kind', 'ns_meaning', 'Which definition is the marked word''s — not its near-synonyms''?', 'أَيُّ التَّعْرِيفَاتِ لِهٰذِهِ الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 91),
('kind', 'ns_where', 'Where else does the Qurʾān use its near-synonym?', 'أَيْنَ يَسْتَعْمِلُ القُرْآنُ مُرَادِفَهَا؟', NULL, NULL, NULL, NULL, NULL, 92),
('kind', 'ns_contrast', 'What sets the marked word apart from its near-synonyms?', 'مَا الفَرْقُ بَيْنَهَا وَبَيْنَ مُرَادِفَاتِهَا؟', NULL, NULL, NULL, NULL, NULL, 93),
('kind', 'kt_gloss', 'Listen — what does Sinai''s key term mean?', 'اِسْمَعْ — مَا مَعْنَى المُصْطَلَح؟', NULL, NULL, NULL, NULL, NULL, 94),
('kind', 'kt_form', 'Listen — which form of the key term fills the āyah?', 'اِسْمَعْ — أَيُّ صِيَغِ المُصْطَلَحِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 95),
('kind', 'kt_word', 'Listen — which word of the āyah is the key term?', 'اِسْمَعْ — أَيُّ كَلِمَاتِ الآيَةِ هُوَ المُصْطَلَح؟', NULL, NULL, NULL, NULL, NULL, 96),
('kind', 'kt_point', 'Sinai cites this āyah — which point does his article make?', 'مَا الَّذِي يَقُولُهُ سِينَاي فِي هٰذِهِ الآيَة؟', NULL, NULL, NULL, NULL, NULL, 97),
('kind', 'kt_lane', 'Sinai''s gloss beside Lane''s — which is Lane''s sense?', 'أَيُّ المَعَانِي عِنْدَ لِين؟', NULL, NULL, NULL, NULL, NULL, 98),
('kind', 'ex_meaning', 'Listen — what does the marked expression mean here?', 'اِسْمَعْ — مَا مَعْنَى التَّعْبِيرِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 99),
('kind', 'ex_particle', 'Listen — which particle does the verb take here?', 'اِسْمَعْ — بِأَيِّ حَرْفٍ يَتَعَدَّى الفِعْلُ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 100),
('kind', 'ex_verb', 'Listen — which verb takes the particle in this sense?', 'اِسْمَعْ — أَيُّ فِعْلٍ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 101),
('kind', 'ex_source', 'Who records this expression?', 'مَنْ ذَكَرَ هٰذَا التَّعْبِير؟', NULL, NULL, NULL, NULL, NULL, 102),
('kind', 'ex_range', 'Listen — which of its senses does it carry here?', 'اِسْمَعْ — بِأَيِّ مَعَانِيهِ جَاءَ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 103),
('kind', 'ex_where', 'Where else does the Qurʾān use it in this sense?', 'أَيْنَ جَاءَ بِهٰذَا المَعْنَى أَيْضًا؟', NULL, NULL, NULL, NULL, NULL, 104),
('kind', 'ex_note', 'What does the source note on it?', 'مَاذَا قَالَ فِيهِ صَاحِبُه؟', NULL, NULL, NULL, NULL, NULL, 105),

('context', 'synonyms', 'Its near-synonyms, as the lexica tell them apart', NULL, NULL, NULL, NULL, NULL, NULL, 2),
('context', 'sinai', 'Sinai, Key Terms of the Qurʾān', NULL, NULL, NULL, NULL, NULL, NULL, 3);
