DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display IS NULL
  AND source_status   = 'ai_assisted';

DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display LIKE '%ٹ%'
   OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%'
   OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ھ%'
   OR arabic_display LIKE '%ے%'
   OR arabic_display LIKE '%ہ%';
