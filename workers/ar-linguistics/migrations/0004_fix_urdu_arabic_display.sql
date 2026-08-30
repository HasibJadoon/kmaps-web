UPDATE ar_ling_near_synonym_members
SET arabic_display = NULL, arabic_bare = NULL
WHERE arabic_display LIKE '%ے%' OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ٹ%' OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%' OR arabic_display LIKE '%ہ%'
   OR arabic_display LIKE '%پ%' OR arabic_display LIKE '%گ%';
