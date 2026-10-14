-- qr_128 · Concept, not attribution, in every instruction (owner, 2026-10-14: "meaning and concept centre — not
-- information about people or book names or year"). Live kinds whose instruction named a person or a book now ask
-- the concept; the source stays in the drill's explanation. Kinds that can only ask whose / which book are retired.
UPDATE qr_study_label SET label = CASE key
  WHEN 'kt_gloss'        THEN 'Listen — what does this key term mean here?'
  WHEN 'kt_point'        THEN 'This āyah — which point does it make about the key term?'
  WHEN 'lex_asl'         THEN 'To which root meaning (aṣl) does the word return?'
  WHEN 'lex_core'        THEN 'What does the root point to — its core image?'
  WHEN 'lex_dalala'      THEN 'What does it signify?'
  WHEN 'lex_digest'      THEN 'What does it mean, at root?'
  WHEN 'lex_keyterm'     THEN 'What does this key term mean?'
  WHEN 'lex_masdar'      THEN 'Which is its verbal noun (maṣdar)?'
  WHEN 'lex_order'       THEN 'Put its senses in order — from the first image to the last'
  WHEN 'lex_quran_sense' THEN 'Listen — which of its senses does this āyah use?'
  WHEN 'lex_sense'       THEN 'Which meaning does it carry?'
  WHEN 'lex_tropical'    THEN 'Proper or figurative here?'
  WHEN 'lex_plural'      THEN 'Which is its plural?'
  WHEN 'lex_dalala'      THEN 'What does it signify?'
  WHEN 'arc2_link'       THEN 'What links the two rungs of meaning?'
  WHEN 'arc2_order'      THEN 'Put the steps of meaning back in order'
  WHEN 'ex_note'         THEN 'What is noted about how it is used?'
  WHEN 'irab_allowed'    THEN 'Which reading of the marked word is allowed?'
  WHEN 'group_theme'     THEN 'Which group of sūras has this theme?'
  WHEN 'tafsir_section'  THEN 'These words — which step of the argument are they?'
  WHEN 'tafsir_term'     THEN 'A term in the commentary — what does it mean here?'
  WHEN 'tafsir_theme'    THEN 'This stretch of commentary — which theme is it?'
  WHEN 'tq_term'         THEN 'What does this term mean here?'
  ELSE label END
 WHERE scope = 'kind' AND key IN ('kt_gloss','kt_point','lex_asl','lex_core','lex_dalala','lex_digest','lex_keyterm','lex_masdar',
   'lex_order','lex_quran_sense','lex_sense','lex_tropical','lex_plural','arc2_link','arc2_order','ex_note','irab_allowed',
   'group_theme','tafsir_section','tafsir_term','tafsir_theme','tq_term');
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.retired', 1)
 WHERE scope = 'kind' AND key IN ('tafsir_reading', 'lex_style', 'ss_books');
-- the tafsīr drill items of retired asks (who wrote it, which āyah, whose school or ruling, the sūra's intro, a cited
-- āyah or ḥadīth, whose reading) are never dealt: removed — 29,101 rows; tafsir_drills.py no longer makes them
DELETE FROM qr_tafsir_drill_item WHERE ask IN ('tafsir_who','tafsir_where','tafsir_school','tafsir_fiqh','surah_intro',
  'tafsir_xref','tafsir_hadith','tafsir_reading');
