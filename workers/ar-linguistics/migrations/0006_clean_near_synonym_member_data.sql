DELETE FROM ar_ling_near_synonym_member_sources
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display LIKE '%ٹ%'
     OR arabic_display LIKE '%ڈ%'
     OR arabic_display LIKE '%ڑ%'
     OR arabic_display LIKE '%ں%'
     OR arabic_display LIKE '%ھ%'
     OR arabic_display LIKE '%ے%'
     OR arabic_display LIKE '%ہ%'
     OR arabic_display LIKE '%ۂ%'
     OR arabic_display LIKE '%ۃ%'
);

DELETE FROM ar_ling_near_synonym_evidence
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display LIKE '%ٹ%'
     OR arabic_display LIKE '%ڈ%'
     OR arabic_display LIKE '%ڑ%'
     OR arabic_display LIKE '%ں%'
     OR arabic_display LIKE '%ھ%'
     OR arabic_display LIKE '%ے%'
     OR arabic_display LIKE '%ہ%'
     OR arabic_display LIKE '%ۂ%'
     OR arabic_display LIKE '%ۃ%'
);

DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display LIKE '%ٹ%'
   OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%'
   OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ھ%'
   OR arabic_display LIKE '%ے%'
   OR arabic_display LIKE '%ہ%'
   OR arabic_display LIKE '%ۂ%'
   OR arabic_display LIKE '%ۃ%';

DELETE FROM ar_ling_near_synonym_member_sources
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display IS NULL OR trim(arabic_display) = ''
);
DELETE FROM ar_ling_near_synonym_evidence
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display IS NULL OR trim(arabic_display) = ''
);
DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display IS NULL OR trim(arabic_display) = '';

UPDATE ar_ling_near_synonym_members
SET basic_gloss = NULL
WHERE basic_gloss IS NOT NULL
  AND basic_gloss = (
    SELECT s.canonical_en
    FROM ar_ling_near_synonym_sets s
    WHERE s.id = ar_ling_near_synonym_members.set_id
  );

UPDATE ar_ling_near_synonym_members
SET basic_gloss_ur = NULL
WHERE basic_gloss_ur IS NOT NULL
  AND basic_gloss_ur = (
    SELECT s.canonical_ur
    FROM ar_ling_near_synonym_sets s
    WHERE s.id = ar_ling_near_synonym_members.set_id
  );
