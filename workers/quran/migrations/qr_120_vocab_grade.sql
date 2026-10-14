-- How hard each Qurʾānic word is for an intermediate reader, and where a word is hard (kmaps-resources
-- scripts/quran/vocab_grade.py, rebuilt whole). The vocab drills take medium → super words everywhere and a
-- common word only where it is flagged; common words otherwise never reach the drills or review.

CREATE TABLE IF NOT EXISTS qr_vocab_grade (
  root          TEXT NOT NULL,
  lemma         TEXT NOT NULL,
  grade         TEXT NOT NULL CHECK (grade IN ('common', 'medium', 'hard', 'super')),
  quran_n       INTEGER NOT NULL DEFAULT 0,   -- the lemma's words in the Qurʾān
  fusha_n       INTEGER NOT NULL DEFAULT 0,   -- in the fuṣḥā series the AR path reads (ar_scene_word)
  root_fusha_n  INTEGER NOT NULL DEFAULT 0,   -- its root there
  focus         INTEGER NOT NULL DEFAULT 0,   -- 1: a verb, noun or adjective (not a name, not an adverbial noun)
  n_idiom       INTEGER NOT NULL DEFAULT 0,   -- its places flagged, by kind
  n_meaning     INTEGER NOT NULL DEFAULT 0,
  n_theology    INTEGER NOT NULL DEFAULT 0,
  n_grammar     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (root, lemma)
);
CREATE INDEX IF NOT EXISTS idx_qr_vocab_grade_grade ON qr_vocab_grade (grade, focus);

CREATE TABLE IF NOT EXISTS qr_vocab_flag (
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('idiom', 'meaning', 'theology', 'grammar')),
  detail      TEXT,      -- idiom: Mir's sense · meaning: how many readings · theology: the school named · grammar: how many roles
  ref         TEXT,      -- the source: Mir's page · the books · '<tafsīr slug> <block id> [p.N]' · the iʿrāb role
  quote_ar    TEXT,      -- idiom: the construction · theology: the tafsīr's sentence · grammar: the other roles
  PRIMARY KEY (surah, ayah, word_index, kind)
);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, sort) VALUES
  ('vocab_grade', 'common', 'Common',  'شائع',   'Met everywhere — left out of drills unless it is hard in this place', 'circle', '#8A8F98', 1),
  ('vocab_grade', 'medium', 'Medium',  'متوسط',  'Known in fuṣḥā, less often met', 'gauge', '#5DA9E9', 2),
  ('vocab_grade', 'hard',   'Hard',    'صعب',    'Rare in the Qurʾān and in the fuṣḥā you read', 'flame', '#F4A261', 3),
  ('vocab_grade', 'super',  'Super',   'غريب',   'Gharīb: once or twice in the Qurʾān, never met elsewhere', 'gem', '#E76F51', 4),
  ('vocab_flag', 'idiom',    'Idiom',            'تعبير',        'A verbal idiom (Mir): the verb and its particle mean more together', 'link', '#F4A261', 1),
  ('vocab_flag', 'meaning',  'Hard to translate', 'خلاف المعنى',  'The books give it different meanings here', 'languages', '#5DA9E9', 2),
  ('vocab_flag', 'theology', 'Debated',          'مسألة كلامية', 'A tafsīr names the schools in disputing this word here', 'scale', '#B388EB', 3),
  ('vocab_flag', 'grammar',  'Grammar nuance',   'أوجه الإعراب', 'The iʿrāb books give it more than one role here', 'git-branch', '#4FB3A9', 4);
