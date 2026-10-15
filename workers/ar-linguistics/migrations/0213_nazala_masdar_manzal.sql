-- نَزَلَ has two maṣādir in the lexicons, not one: «ينزل نزولًا ومَنزَلًا» (Lisān al-ʿArab), «نزلت نزولًا ومنزلًا» (al-Jawharī,
-- al-Ṣiḥāḥ; «نصب المنزل لأنه مصدر»). The ṣarf drills now show every maṣdar of a verb.
UPDATE ar_ling_root_form_paradigm
   SET paradigm_json = json_set(paradigm_json, '$.masadir', json('["نُزُولًا","مَنْزَلًا"]'))
 WHERE id = 'PAR:نزل:I' AND json_extract(paradigm_json, '$.masadir') = '["نُزُولًا"]';
