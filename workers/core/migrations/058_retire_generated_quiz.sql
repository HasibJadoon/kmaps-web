-- The live quiz plays the drills of passages studied (drill-engine plan §2.3c), so the 24 questions
-- generated for sūra 40 (pack quran-40-generated) are retired — status, not deleted: their answers
-- in past rooms stay where they are.
UPDATE core_bank_item SET status = 'retired'
 WHERE status = 'live' AND pack_ref IN (SELECT id FROM core_bank_pack WHERE slug = 'quran-40-generated');
