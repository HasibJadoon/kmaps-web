-- The sentence step shows two lenses only: the text (النص) and the node board (المخطط).
-- Key notes, the ladder and the readings leave the step (the ladder lives on in the Translation step).
DELETE FROM qr_study_label WHERE scope = 'ss_lens' AND key IN ('keynotes', 'ladder', 'readings');
UPDATE qr_study_label SET sort = 1 WHERE scope = 'ss_lens' AND key = 'document';
UPDATE qr_study_label SET sort = 2 WHERE scope = 'ss_lens' AND key = 'board';
