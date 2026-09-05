-- km-cyb-root-build · LOOP.sql
-- One root, cold to compiled. Bind :root :root_uid :node :surah :from :to
-- km_arabic_linguistic 192f4792 · km_quran 8bbd5053 · km_core afe84ce7 · km_content c59b9640

-- ═══ 0 · NODE — create if cold ═══════════════════════════════════════
INSERT OR IGNORE INTO cyb_node (id,domain,lane,scale,layer,target_kind,target_ref,
  build_state,build_pct,content_state,content_pct,priority)
VALUES (:node,'quran','vocabulary','root','root','root',:root_uid,'cold',0,'none',0,3);

-- ═══ 1 · SENSE — materialise one sensor per live band ════════════════
INSERT OR IGNORE INTO cyb_sensor
  (id,node_id,axis,kind,band_code,metric,reading,expected,weight,state,health,trend,source_table,source_slug)
SELECT 'S:'||:node||':build:'||b.band_code||':presence',:node,'build','root_band',b.band_code,
       'presence',0,1,b.weight,'empty','unknown','flat',
       json_extract(b.build_carriers,'$[0]'),:root
FROM cyb_root_band b WHERE b.status='live';

-- ═══ 2 · MEASURE — count the CARRIER, never a cache ══════════════════
-- most bands key on root_norm:
SELECT 'ar_ling_root_sense'      AS carrier, COUNT(*) FROM ar_ling_root_sense      WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_dna',        COUNT(*) FROM ar_ling_root_dna         WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_didd',       COUNT(*) FROM ar_ling_root_didd        WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_haql',       COUNT(*) FROM ar_ling_root_haql        WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_form_masmu', COUNT(*) FROM ar_ling_root_form_masmu  WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_lemma_tadiya',COUNT(*) FROM ar_ling_root_lemma_tadiya WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_scholarship',COUNT(*) FROM ar_ling_root_scholarship WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_learn_vocab',     COUNT(*) FROM ar_ling_learn_vocab      WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_learn_memlet',    COUNT(*) FROM ar_ling_learn_memlet     WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_sense_axis', COUNT(*) FROM ar_ling_root_sense_axis  WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_root_tatawwur',   COUNT(*) FROM ar_ling_root_tatawwur    WHERE root_norm=:root
UNION ALL SELECT 'ar_ling_sense_arc',       COUNT(*) FROM ar_ling_sense_arc        WHERE root_norm=:root;

-- THE THREE THAT DO NOT KEY ON root_norm ------------------------------
-- 82-EXPR
SELECT COUNT(*) FROM ar_ling_root_lemma_tabir WHERE root_ar=:root;
-- 80-KIN
SELECT COUNT(*) FROM ar_ling_root_lemma_furuq_member m
  JOIN ar_ling_root_lemma l ON l.id=m.lemma_id WHERE l.root_id=:root_uid;
-- 06-TAQL
SELECT COUNT(*) FROM ar_ling_root_taqalib
 WHERE group_key IN (SELECT group_key FROM ar_ling_root_taqalib WHERE permutation=:root);
-- 22-BAB via sarf_family blocks (km-root-forms-build owns these)
SELECT source_slug, json_array_length(json_extract(data_json,'$.forms')) forms
FROM ar_ling_lexicon_block WHERE block_type='sarf_family' AND root_norm=:root;

-- ═══ 3 · ORDER — what is ready, what is blocked ══════════════════════
SELECT b.band_ord, b.band_code, b.name_en, b.weight, b.gate_mode, b.prereq_json,
       COALESCE(s.reading,0) reading,
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM json_each(b.prereq_json) p
         JOIN cyb_sensor ps ON ps.node_id=:node AND ps.band_code=p.value AND ps.metric='presence'
         WHERE COALESCE(ps.reading,0)=0)
       THEN 'ready' ELSE 'blocked' END AS gate
FROM cyb_root_band b
LEFT JOIN cyb_sensor s ON s.node_id=:node AND s.band_code=b.band_code AND s.metric='presence'
WHERE b.status='live' AND COALESCE(s.reading,0)=0
ORDER BY gate DESC, b.weight DESC, b.band_ord;

-- ═══ 4 · ACTUATE — queue, highest error first ════════════════════════
INSERT OR REPLACE INTO cyb_job (id,node_id,op,band_code,source_slug,actuator,skill,readiness,error_val)
VALUES ('CYB:JOB:'||:root||':'||:band,:node,:op,:band,:src,'claude',:skill,'ready',:error);

SELECT id, band_code, skill, readiness, error_val FROM cyb_job
WHERE node_id=:node AND readiness='ready' ORDER BY error_val DESC;

-- ═══ 5 · RE-SENSE then recompute ═════════════════════════════════════
UPDATE cyb_sensor SET reading=:n, state=CASE WHEN :n>=expected THEN 'compiled' ELSE 'partial' END,
  health=CASE WHEN :n>0 THEN 'ok' ELSE 'absent' END, trend='up',
  error_val=CASE WHEN :n>0 THEN 0 ELSE weight END,
  read_count=read_count+1, last_read_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
WHERE node_id=:node AND band_code=:band AND metric='presence';

UPDATE cyb_node SET build_pct=CAST(ROUND(100.0*
 (SELECT SUM(CASE WHEN s.reading>0 THEN b.weight ELSE 0 END)
    FROM cyb_sensor s JOIN cyb_root_band b ON b.band_code=s.band_code AND b.status='live'
   WHERE s.node_id=:node AND s.metric='presence')
 /(SELECT SUM(weight) FROM cyb_root_band WHERE status='live')) AS INTEGER),
 updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
WHERE id=:node;

-- ═══ 6 · CARDS — conformance, must be 0/0 ════════════════════════════
SELECT c.card_template,
  (SELECT COUNT(*) FROM json_each(n.fields_json) d
    WHERE json_extract(d.value,'$.name') NOT IN (SELECT key FROM json_each(c.fields_json))) missing,
  (SELECT COUNT(*) FROM json_each(c.fields_json) f
    WHERE f.key NOT IN (SELECT json_extract(value,'$.name') FROM json_each(n.fields_json))) extra,
  c.front_text='' front_empty, c.back_text='' back_empty
FROM core_srs_card c JOIN core_srs_note_type n ON n.id=c.note_type_id
WHERE c.root_norm=:root AND c.suspended=0;

-- every GT: ref must resolve (run against km_arabic_linguistic)
SELECT DISTINCT value FROM json_tree(:card_fields_json)
WHERE value LIKE 'GT:%' AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live');

-- trilingual: no Arabic inside an en/ur string; no en without a ur sibling
SELECT j.fullkey, j.value FROM core_srs_card c, json_tree(c.fields_json) j
WHERE c.root_norm=:root AND (j.fullkey LIKE '%.en' OR j.fullkey LIKE '%.ur')
  AND j.value GLOB '*[ء-ي]*' AND j.fullkey NOT LIKE '%quote%' AND j.fullkey NOT LIKE '%.ar%';

-- ═══ 7 · DOC — anchored, five links ══════════════════════════════════
INSERT OR REPLACE INTO cm_resource_links (link_id,source_ref,target_ref,link_type,core_user_ref,confidence,is_ai_suggested)
VALUES
 ('LNK:'||:root||':root', :doc_id, 'AL:root:'||:root_uid,        'anchors',    :user,1.0,0),
 ('LNK:'||:root||':ayah', :doc_id, 'QR:'||:surah||':'||:from,    'anchors',    :user,1.0,0),
 ('LNK:'||:root||':card', :doc_id, :root_card_id,                'explains',   :user,1.0,0),
 ('LNK:'||:root||':node', :doc_id, :node,                        'governed_by',:user,1.0,0),
 ('LNK:'||:root||':band', :doc_id, '12-ASL',                     'fills_band', :user,1.0,0);

-- ═══ 8 · TICK ════════════════════════════════════════════════════════
INSERT INTO cyb_tick (id,sensed,drifts,actuated,corrected,summary) VALUES (:tick_id,:n,:d,:a,:c,:summary);

-- ═══ DONE? ══════════════════════════════════════════════════════════
SELECT (SELECT build_pct FROM cyb_node WHERE id=:node) build_pct,
       (SELECT content_pct FROM cyb_node WHERE id=:node) content_pct,
       (SELECT COUNT(*) FROM cyb_sensor WHERE node_id=:node AND metric='presence' AND reading>0) built,
       (SELECT COUNT(*) FROM cyb_root_band WHERE status='live') live_bands,
       (SELECT COUNT(*) FROM core_srs_card WHERE root_norm=:root AND suspended=0) cards,
       (SELECT COUNT(*) FROM cyb_disturbance WHERE node_id=:node AND resolved=0) open_disturbances;
