-- A6 — the step table matches the register.
--
-- The register declares six steps; the table carried five keys (no worldview
-- row anywhere) and surah 44's board was ragged — passage_structure on all
-- seven passages, every other step on two. A passage that has a board has the
-- whole board: every registered key, missing ones seeded as draft. Passages
-- with no board at all (surah 40's twenty) stay untouched — an unstarted
-- curriculum is a real state; a board with holes is not.
INSERT OR IGNORE INTO qr_surah_study_step (id, passage_id, step_key, step_no, title, status, meta_json)
SELECT 'QR:STEP:' || p.surah || ':' || p.ayah_from || '-' || p.ayah_to || ':' || k.step_key,
       p.id, k.step_key, k.step_no,
       k.title, 'draft',
       json_object('seeded_by', 'register_reconcile_2026-08-21',
                   'note', 'board completed to the six registered keys')
  FROM qr_surah_study_passage p
  JOIN (SELECT 'reading' step_key, 100 step_no, 'Reading' title
        UNION ALL SELECT 'vocabulary', 200, 'Vocabulary'
        UNION ALL SELECT 'sentence_structure', 300, 'Sentence structure & translation'
        UNION ALL SELECT 'passage_structure', 400, 'Passage structure'
        UNION ALL SELECT 'tafsir', 500, 'Tafsir') k
 WHERE EXISTS (SELECT 1 FROM qr_surah_study_step s WHERE s.passage_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM qr_surah_study_step s
                    WHERE s.passage_id = p.id AND s.step_key = k.step_key);

INSERT OR IGNORE INTO qr_surah_study_step (id, passage_id, step_key, step_no, title, status, meta_json)
SELECT 'QR:STEP:' || p.surah || ':' || p.ayah_from || '-' || p.ayah_to || ':worldview',
       p.id, 'worldview', 600, 'Worldview', 'draft',
       json_object('seeded_by', 'register_reconcile_2026-08-21')
  FROM qr_surah_study_passage p
 WHERE EXISTS (SELECT 1 FROM qr_surah_study_step s WHERE s.passage_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM qr_surah_study_step s
                    WHERE s.passage_id = p.id AND s.step_key = 'worldview');
