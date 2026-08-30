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

UPDATE ar_ling_root_asl
   SET is_primary = 1
 WHERE status = 'extracted'
   AND death_hijri = (SELECT MIN(x.death_hijri) FROM ar_ling_root_asl x
                       WHERE x.root_norm = ar_ling_root_asl.root_norm
                         AND x.status = 'extracted');

UPDATE ar_ling_root_asl
   SET narrows_id = (SELECT x.id FROM ar_ling_root_asl x
                      WHERE x.root_norm = ar_ling_root_asl.root_norm
                        AND x.is_primary = 1 AND x.status = 'extracted'
                      LIMIT 1)
 WHERE status = 'extracted' AND is_primary = 0;

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

UPDATE ar_ling_root_asl SET status = 'candidate', is_primary = 0, confidence = 'low';

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

UPDATE ar_ling_reg_sub_layer
   SET carrier_state = (SELECT CASE WHEN SUM(n>0)=0 THEN 'empty'
                                    WHEN SUM(n>0)>=1642 THEN 'populated'
                                    ELSE 'partial' END
                          FROM ar_ling_root_layer_fill f WHERE f.sub_code='12-ASL')
 WHERE sub_code = '12-ASL';

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
