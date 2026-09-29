-- A scene is also read for its idioms and set expressions, and for the
-- linguistic features worth noticing in it (emphasis, ḥāl, exception, a
-- rhetorical question, a metaphor …): each tied to the words of its line.
ALTER TABLE ar_scene_vocab ADD COLUMN expressions_json TEXT;  -- [{line, phrase, meaning, literal, note, distractors:[3]}]
ALTER TABLE ar_scene_vocab ADD COLUMN features_json TEXT;     -- [{line, span, feature, term_ar, q, options:[4], answer, explanation}]
