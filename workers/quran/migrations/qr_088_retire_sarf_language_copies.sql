-- qr_088: the الصرف screen reads the LANGUAGE from AL now (AL /al/sarf/sheet, by global root and lemma id), so
-- QR's copies are retired — renamed, not dropped, so they can be compared or restored:
--   qr_sarf_verb  → AL ar_ling_root_form_paradigm (0130; source_ref keeps the QR id, so drill ids hold)
--   qr_sarf_prep  → AL ar_ling_root_lemma_tadiya (0129, 0142)
--   qr_sarf_near  → AL furūq sets (0140)
--   qr_sarf_word.plurals_json → AL ar_ling_root_lemma_jam (0138); the original values stay in qr_073.
-- qr_sarf_word stays: it is the passage's word list (which words, their verse, the preposition in that verse).
ALTER TABLE qr_sarf_verb RENAME TO zz_retired_qr_sarf_verb;
ALTER TABLE qr_sarf_prep RENAME TO zz_retired_qr_sarf_prep;
ALTER TABLE qr_sarf_near RENAME TO zz_retired_qr_sarf_near;
ALTER TABLE qr_sarf_word DROP COLUMN plurals_json;
