-- The Sentences step, one node per sentence (drill-engine plan §2.3a: "Sentence 1 · 40:1–2,
-- Sentence 2 · 40:3"). A sentence is a span of words — it may run over several āyāt, and one
-- āyah may hold several sentences — so the class places each drill by its āyah and first
-- marked word, in the sentence whose span holds it (practice-class.ts placeBySentence).
-- The step draws whole now (max 200 a skill): split by sentence, a cap would empty some.

UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.per', 'sentence', '$.max', 200)
 WHERE scope = 'class_node' AND key = 'sentences';

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('class_ui', 'sentence_n', 'Sentence {n} · {range}', 'الجُمْلَة {n} · {range}', NULL, 'text.alignright', 74);
