-- 12-ASL: fill the aṣl band by extraction, not authoring.
--
-- Ibn Fāris wrote Maqāyīs as a dictionary OF aṣl statements, and the entries
-- are formulaic:
--
--   (كتب)
--   الكاف والتاء والباء أصلٌ صحيح واحد يدلُّ على جمع شيءٍ إلى شيءٍ. من ذلك …
--
-- so the claim is the span from أصل to the first full stop. Ibn Durayd states
-- his the same way inside the entry — وأصلُ الكَتْبِ ضمُّ الشيءِ إلى الشيء —
-- which is why one rule serves every source: start at أصل, stop at the
-- sentence end. The statement is quoted verbatim and never paraphrased; an
-- aṣl reported in our own voice is not an attestation.
--
-- Ordering is by death year, not fame: al-Khalīl (170) outranks Ibn Durayd
-- (321) outranks al-Jawharī (393) outranks Ibn Fāris (395) outranks
-- al-Rāghib (502) — even though Maqāyīs is the famous one for aṣl.

DELETE FROM ar_ling_root_asl WHERE status = 'extracted';

INSERT OR REPLACE INTO ar_ling_root_asl
  (id, root_norm, statement_ar, authority_ar, authority_en, death_hijri,
   source_slug, source_id, lexicon_entry_id, page_ref, volume_no,
   is_primary, confidence, status, note_md)
SELECT
  'ASL:' || e.root_norm || ':' || e.source_slug,
  e.root_norm,
  trim(substr(substr(e.raw_text, instr(e.raw_text, 'أصل')), 1,
              instr(substr(e.raw_text, instr(e.raw_text, 'أصل')), '.') - 1)),
  s.author_name,
  s.title_en,
  s.author_death_ah,
  e.source_slug,
  e.source_id,
  e.id,
  CAST(e.page_start AS TEXT),
  e.volume_no,
  0,
  CASE WHEN e.source_slug = 'maqayis_lugha' THEN 'high' ELSE 'medium' END,
  'extracted',
  'Extracted span: أصل → sentence end. Verify against the entry before it is quoted on a card.'
FROM "ar_ling_lexicon_entry" e
JOIN "ar_ling_source" s ON s.slug = e.source_slug
JOIN tmp_qroot q ON q.root = e.root_norm
WHERE e.source_slug IN ('khalil_kitab_ayn','ibn_durayd_jamharat_lugha',
                        'jawhari_sihah','maqayis_lugha','raghib_mufradat')
  AND instr(e.raw_text, 'أصل') > 0
  AND instr(substr(e.raw_text, instr(e.raw_text, 'أصل')), '.') BETWEEN 16 AND 400;

-- The oldest witness that actually yielded a statement becomes primary. This
-- is the whole point of the band: not "what does Maqāyīs say" but "who says
-- it earliest".
UPDATE ar_ling_root_asl
   SET is_primary = 1
 WHERE status = 'extracted'
   AND death_hijri = (SELECT MIN(x.death_hijri) FROM ar_ling_root_asl x
                       WHERE x.root_norm = ar_ling_root_asl.root_norm
                         AND x.status = 'extracted');

-- A later, narrower statement points at the earlier one it refines, so
-- al-Rāghib narrowing Ibn Durayd is kept as evidence rather than discarded.
UPDATE ar_ling_root_asl
   SET narrows_id = (SELECT x.id FROM ar_ling_root_asl x
                      WHERE x.root_norm = ar_ling_root_asl.root_norm
                        AND x.is_primary = 1 AND x.status = 'extracted'
                      LIMIT 1)
 WHERE status = 'extracted' AND is_primary = 0;

-- Refresh the band in the fill matrix.
UPDATE ar_ling_root_layer_fill
   SET n = (SELECT COUNT(*) FROM ar_ling_root_asl t
             WHERE t.root_norm = ar_ling_root_layer_fill.root)
 WHERE sub_code = '12-ASL';

UPDATE ar_ling_reg_sub_layer
   SET carrier_state = (SELECT CASE WHEN SUM(n>0)=0 THEN 'empty'
                                    WHEN SUM(n>0)>=1642 THEN 'populated'
                                    ELSE 'partial' END
                          FROM ar_ling_root_layer_fill f WHERE f.sub_code='12-ASL'),
       fill_state = 'has_carrier'
 WHERE sub_code = '12-ASL';
-- Qualifying the extracted aṣl statements.
--
-- Matching the string أصل is not the same as finding an aṣl claim. برك in
-- Jamhara yielded "أصلا الفخذين اللَّذَان عَلَيْهِمَا لحم الفرج" — أصلا, the
-- DUAL noun, "the two bases of the thighs". Anatomy, not etymology. And
-- because Ibn Durayd (321) predates Ibn Fāris (395), that false positive was
-- elected primary over Maqāyīs's correct "أصلٌ واحدٌ، وهو ثَباتُ الشيءِ".
--
-- Oldest-wins is the right rule, but only among statements that are actually
-- claims. So every row starts as a candidate and must earn 'extracted':
--
--   A. Maqāyīs, aṣl inside the opening sentence. Ibn Fāris's entries OPEN
--      with the aṣl by construction, so position is the guarantee — this is
--      the only test that needs no lexical cue.
--   B. Any source whose span carries a definitional cue — يدل / وهو / هو —
--      which is how an aṣl is predicated in all five works.
--
-- and is rejected outright if it opens with أصلا (dual) or أصول (plural
-- inventory), neither of which introduces a single-origin claim.

UPDATE ar_ling_root_asl SET status = 'candidate', is_primary = 0, confidence = 'low';

-- Statements that run into a citation block keep only their first line.
UPDATE ar_ling_root_asl
   SET statement_ar = trim(substr(statement_ar, 1, instr(statement_ar, char(10)) - 1))
 WHERE instr(statement_ar, char(10)) > 0;

UPDATE ar_ling_root_asl
   SET status = 'extracted', confidence = 'high'
 WHERE source_slug = 'maqayis_lugha'
   AND substr(statement_ar,1,4) <> 'أصلا'
   AND substr(statement_ar,1,4) <> 'أصول'
   AND EXISTS (SELECT 1 FROM "ar_ling_lexicon_entry" e
                WHERE e.id = ar_ling_root_asl.lexicon_entry_id
                  AND instr(e.raw_text, 'أصل') <= 200);

UPDATE ar_ling_root_asl
   SET status = 'extracted',
       confidence = CASE WHEN confidence = 'high' THEN 'high' ELSE 'medium' END
 WHERE status = 'candidate'
   AND substr(statement_ar,1,4) <> 'أصلا'
   AND substr(statement_ar,1,4) <> 'أصول'
   AND length(statement_ar) BETWEEN 16 AND 300
   AND (instr(statement_ar,'يدل') > 0
     OR instr(statement_ar,'وهو') > 0
     OR instr(statement_ar,' هو ') > 0);

-- Re-elect: oldest witness among QUALIFIED statements only.
UPDATE ar_ling_root_asl
   SET is_primary = 1
 WHERE status = 'extracted'
   AND death_hijri = (SELECT MIN(x.death_hijri) FROM ar_ling_root_asl x
                       WHERE x.root_norm = ar_ling_root_asl.root_norm
                         AND x.status = 'extracted');

UPDATE ar_ling_root_asl
   SET narrows_id = (SELECT x.id FROM ar_ling_root_asl x
                      WHERE x.root_norm = ar_ling_root_asl.root_norm
                        AND x.is_primary = 1 AND x.status = 'extracted' LIMIT 1)
 WHERE status = 'extracted' AND is_primary = 0;

-- The matrix counts qualified statements only; a candidate is not a fill.
UPDATE ar_ling_root_layer_fill
   SET n = (SELECT COUNT(*) FROM ar_ling_root_asl t
             WHERE t.root_norm = ar_ling_root_layer_fill.root
               AND t.status = 'extracted')
 WHERE sub_code = '12-ASL';

UPDATE ar_ling_reg_sub_layer
   SET carrier_state = (SELECT CASE WHEN SUM(n>0)=0 THEN 'empty'
                                    WHEN SUM(n>0)>=1642 THEN 'populated'
                                    ELSE 'partial' END
                          FROM ar_ling_root_layer_fill f WHERE f.sub_code='12-ASL')
 WHERE sub_code = '12-ASL';
-- Cue set C: the definite-genitive predication — أصل الـX Y — which is how
-- Ibn Durayd states an aṣl and which carries no يدل/وهو particle at all.
-- Without this the cue test rejected "أصل الكتب ضمُّ الشيء إلى الشيء", the
-- oldest and correct statement for كتب and the one the reference card quotes.
UPDATE ar_ling_root_asl
   SET status = 'extracted',
       confidence = CASE WHEN confidence = 'high' THEN 'high' ELSE 'medium' END
 WHERE status = 'candidate'
   AND substr(statement_ar,1,3) = 'أصل'
   AND substr(statement_ar,1,4) <> 'أصلا'
   AND substr(statement_ar,1,4) <> 'أصول'
   AND instr(statement_ar,' ال') BETWEEN 4 AND 6
   AND length(statement_ar) BETWEEN 16 AND 200;

UPDATE ar_ling_root_asl SET is_primary = 0;
UPDATE ar_ling_root_asl
   SET is_primary = 1
 WHERE status = 'extracted'
   AND death_hijri = (SELECT MIN(x.death_hijri) FROM ar_ling_root_asl x
                       WHERE x.root_norm = ar_ling_root_asl.root_norm
                         AND x.status = 'extracted');

UPDATE ar_ling_root_asl
   SET narrows_id = (SELECT x.id FROM ar_ling_root_asl x
                      WHERE x.root_norm = ar_ling_root_asl.root_norm
                        AND x.is_primary = 1 AND x.status = 'extracted' LIMIT 1)
 WHERE status = 'extracted' AND is_primary = 0;

UPDATE ar_ling_root_layer_fill
   SET n = (SELECT COUNT(*) FROM ar_ling_root_asl t
             WHERE t.root_norm = ar_ling_root_layer_fill.root
               AND t.status = 'extracted')
 WHERE sub_code = '12-ASL';
