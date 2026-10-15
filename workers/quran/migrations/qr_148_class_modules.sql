-- A passage's class in six modules, each step tagged with its module (owner, 2026-10-16): 1 Reading · 2 Word forms,
-- expressions & idioms · 3 Sentence structure · 4 Passage structure · 5 Commentaries · 6 Concepts. The path shows a
-- heading where a module starts. Module 2 gains the verbal idioms (Mir). Module 6 is held for the concept slides the
-- owner will give (إضافة and the like): its step has no skills yet, so it stays off the path until it holds drills.
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.module', json(CASE key
    WHEN 'read'        THEN '{"n":1,"title":"Reading","titleAr":"القِرَاءَة"}'
    WHEN 'words'       THEN '{"n":2,"title":"Word forms, expressions & idioms","titleAr":"الصَّرْفُ وَالتَّعَابِير"}'
    WHEN 'sentences'   THEN '{"n":3,"title":"Sentence structure","titleAr":"تَرْكِيبُ الجُمَل"}'
    WHEN 'practice'    THEN '{"n":3,"title":"Sentence structure","titleAr":"تَرْكِيبُ الجُمَل"}'
    WHEN 'structure'   THEN '{"n":4,"title":"Passage structure","titleAr":"بِنَاءُ المَقْطَع"}'
    WHEN 'questions'   THEN '{"n":4,"title":"Passage structure","titleAr":"بِنَاءُ المَقْطَع"}'
    WHEN 'listen'      THEN '{"n":5,"title":"Commentaries","titleAr":"التَّفَاسِير"}'
    WHEN 'tafsir_lang' THEN '{"n":5,"title":"Commentaries","titleAr":"التَّفَاسِير"}'
    WHEN 'read_tafsir' THEN '{"n":5,"title":"Commentaries","titleAr":"التَّفَاسِير"}'
    WHEN 'hear_tafsir' THEN '{"n":5,"title":"Commentaries","titleAr":"التَّفَاسِير"}'
    WHEN 'tafsir'      THEN '{"n":5,"title":"Commentaries","titleAr":"التَّفَاسِير"}'
  END))
 WHERE scope = 'class_node' AND key IN ('read','words','sentences','practice','structure','questions','listen','tafsir_lang','read_tafsir','hear_tafsir','tafsir');
UPDATE qr_study_label SET label = 'Forms, expressions & idioms',
       extra_json = json_set(extra_json, '$.skills', json('["sarf","vocab","keyterm","expression","idiom"]'))
 WHERE scope = 'class_node' AND key = 'words';
-- module 6, held: after the commentaries, before the review and the check
INSERT INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, sort, extra_json)
SELECT 'class_node', 'concepts', 'Concepts', 'المَفَاهِيم', 'The concepts the passage turns on, slide by slide', 'lightbulb', '#C9A84C',
       (SELECT sort FROM qr_study_label WHERE scope = 'class_node' AND key = 'tafsir') + 1,
       '{"kind":"step","step":11,"skills":[],"max":60,"sprint":10,"module":{"n":6,"title":"Concepts","titleAr":"المَفَاهِيم"}}'
 WHERE NOT EXISTS (SELECT 1 FROM qr_study_label WHERE scope = 'class_node' AND key = 'concepts');
