UPDATE ar_ling_near_synonym_members
SET arabic_display = NULL, arabic_bare = NULL
WHERE arabic_display IS NOT NULL
  AND (

    (arabic_bare IS NOT NULL AND length(trim(arabic_bare)) = 1)

    OR arabic_display LIKE '%چ%'

    OR arabic_display LIKE '% کرنا%' OR arabic_display = 'کرنا'
    OR arabic_display LIKE '% ہونا%' OR arabic_display = 'ہونا'
    OR arabic_display LIKE '% لینا%' OR arabic_display = 'لینا'
    OR arabic_display LIKE '% دینا%' OR arabic_display = 'دینا'
    OR arabic_display LIKE '% آنا%'
    OR arabic_display LIKE '% جانا%'
  );
