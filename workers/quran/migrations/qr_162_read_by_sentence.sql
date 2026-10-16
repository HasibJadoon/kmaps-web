-- qr_162 — Read & listen, by the passage's own sentences (owner, 2026-10-16).
-- The step drew each listening skill over āyāt, sampled: two of each. It now builds, fills, catches and shadows every
-- sentence of the passage (qr_ss_occ_sentence, the sentence's own words cut from its āyāt and timed), and marks each
-- āyah. Its sub-path runs: the passage heard whole, then Build the sentence, then Listen & fill, Listen & mark, Catch
-- the word, Shadow.
UPDATE qr_study_label
   SET extra_json = '{"kind":"step","step":1,"skills":["ss","mark"],"only":{"ss":["ss_order","ss_fill","ss_hear","ss_shadow"]},"max":60,"sprint":12,"module":{"n":1,"title":"Reading","titleAr":"القِرَاءَة","study":"reading"}}'
 WHERE scope = 'class_node' AND key = 'read';
UPDATE qr_study_label SET sort = 2 WHERE scope = 'class_style' AND key = 'order';
UPDATE qr_study_label SET sort = 5 WHERE scope = 'class_style' AND key = 'fill';
UPDATE qr_study_label SET sort = 8 WHERE scope = 'class_style' AND key = 'mark';
