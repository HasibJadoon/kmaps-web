-- A key term's essay (km_content cm_documents, doc_type 'essay'): the class path shows it as a node to read before
-- the term's slides and drills.
ALTER TABLE qr_keyterm_story ADD COLUMN essay_slug TEXT;
UPDATE qr_keyterm_story SET essay_slug = 'qr-keyterm-essay-' || term_key WHERE term_key IN ('kitab', 'tanzil');
-- the label for the node
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, extra_json)
  SELECT 'class_ui', 'essay_of', 'Read: {term}', 'اقرأ: {term}', 'The full essay — read it before the story and its drills', '{}'
   WHERE NOT EXISTS (SELECT 1 FROM qr_study_label WHERE scope = 'class_ui' AND key = 'essay_of');
