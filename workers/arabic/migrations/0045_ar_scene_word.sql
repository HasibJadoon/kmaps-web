-- 0045_ar_scene_word.sql
--
-- Every word of a scripted scene: what it is, its ṣarf, and its tie to the Qurʾān's vocabulary
-- (kmaps-resources scripts/arabic-episodes/scene_words.py). The tie is a typed reference into
-- km_arabic_linguistic — AL:LEMMA:<id> when the Qurʾān uses this very lemma, AL:ROOT:<id> when the word
-- is another of a Qurʾānic root — never a copy of the lemma. Class, number, gender, aspect, pattern, the
-- generated ṣarf (ماض · مضارع, or واحد · جمع) and the derivation (مشتق / جامد) come from the analyser
-- (source 'camel-msa-r13') and are provisional: a Qurʾānic lemma's authored wazn, maṣdar and plurals in
-- km_arabic_linguistic outrank them wherever a card shows both.

CREATE TABLE IF NOT EXISTS ar_scene_word (
  unit_id      TEXT NOT NULL,
  scene_no     INTEGER NOT NULL,
  line         INTEGER NOT NULL,          -- 1-based, the scene's line
  word_index   INTEGER NOT NULL,          -- 0-based, the word in the line (as the line's timing `w`)
  surface      TEXT NOT NULL,             -- the word as written in the script
  lemma_ar     TEXT,
  root         TEXT,                      -- as the analyser gives it; '#' a weak radical
  word_class   TEXT NOT NULL,             -- verb | noun | name | particle
  pos          TEXT,                      -- the analyser's part of speech
  number       TEXT, gender TEXT, aspect TEXT, pattern TEXT,
  derivation   TEXT,                      -- mushtaqq | jamid (nouns; provisional)
  link_kind    TEXT NOT NULL,             -- lemma | root | none
  al_lemma_ref TEXT,                      -- AL:LEMMA:<26-char id>
  al_root_ref  TEXT,                      -- AL:ROOT:<26-char id>
  sarf_json    TEXT,                      -- {madi, mudari} | {mufrad, jam}
  source       TEXT NOT NULL,
  PRIMARY KEY (unit_id, scene_no, line, word_index)
);
CREATE INDEX IF NOT EXISTS idx_ar_scene_word_lemma ON ar_scene_word(al_lemma_ref);
CREATE INDEX IF NOT EXISTS idx_ar_scene_word_root  ON ar_scene_word(al_root_ref);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('word_class', 'verb',     'Verb',     'فِعْل',  NULL, NULL, '#E07A5F', NULL, NULL, 1),
 ('word_class', 'noun',     'Noun',     'اسْم',   NULL, NULL, '#5DA9E9', NULL, NULL, 2),
 ('word_class', 'name',     'Name',     'عَلَم',  NULL, NULL, '#B388EB', NULL, NULL, 3),
 ('word_class', 'particle', 'Particle', 'حَرْف',  NULL, NULL, '#8D99AE', NULL, NULL, 4),
 ('word_derivation', 'mushtaqq', 'Derived', 'مُشْتَقّ', 'Built from a root on a pattern that carries meaning: doer, done-to, place, more…', NULL, '#81B29A', NULL, NULL, 1),
 ('word_derivation', 'jamid',    'Underived', 'جَامِد', 'Not taken from a verb: a thing named as it is', NULL, '#D8B657', NULL, NULL, 2),
 ('word_link', 'lemma', 'In the Qurʾān', 'فِي القُرْآن',      'The Qurʾān uses this very word', NULL, '#2A9D8F', NULL, NULL, 1),
 ('word_link', 'root',  'Qurʾānic root', 'جِذْرٌ قُرْآنِيّ',  'Another word of a root the Qurʾān uses', NULL, '#F2CC8F', NULL, NULL, 2),
 ('word_link', 'none',  'Not in the Qurʾān', 'لَيْسَ فِي القُرْآن', NULL, NULL, '#8D99AE', NULL, NULL, 3),
 ('word_sarf', 'madi',   'Past',     'المَاضِي',  NULL, NULL, NULL, NULL, NULL, 1),
 ('word_sarf', 'mudari', 'Present',  'المُضَارِع', NULL, NULL, NULL, NULL, NULL, 2),
 ('word_sarf', 'masdar', 'Verbal noun', 'المَصْدَر', NULL, NULL, NULL, NULL, NULL, 3),
 ('word_sarf', 'mufrad', 'Singular', 'الوَاحِد',  NULL, NULL, NULL, NULL, NULL, 4),
 ('word_sarf', 'jam',    'Plural',   'الجَمْع',   NULL, NULL, NULL, NULL, NULL, 5);
