-- غ ل ل: one root's meaning arc made readable (user request, 2026-10-01): a plain-English gloss on
-- every rung, the three mismatched English labels replaced, Lane's Latin rendered in English, the Tāj's
-- ﴿﴾ headword marks and a stray «غم» taken out of the Arabic, and al-Ibn al-Athīr's verdict fragment
-- (not a sense) removed with the rungs after it renumbered.
UPDATE ar_ling_arc_rung SET label_en = 'Something slipping into another thing and staying fixed there, like a peg driven in.' WHERE id = 'ARC:غلل:combined:1';
UPDATE ar_ling_arc_rung SET label_en = 'Thirst, or burning thirst: a heat inside the body.' WHERE id = 'ARC:غلل:combined:2';
UPDATE ar_ling_arc_rung SET label_en = 'To betray a trust by taking something in secret (al-Zajjāj): whoever secretly takes what is not his has done ghulūl.' WHERE id = 'ARC:غلل:combined:3';
UPDATE ar_ling_arc_rung SET label_en = 'The Arabs say ‘ghalaltu the thing in the thing’ when they fix it inside, as if driving it in.' WHERE id = 'ARC:غلل:combined:4';
UPDATE ar_ling_arc_rung SET label_en = 'Its root (al-Rāghib): being wrapped in something, held in its midst; so the ghull is the iron collar that holds the limbs within it.' WHERE id = 'ARC:غلل:combined:5';
UPDATE ar_ling_arc_rung SET label_en = 'To work oil into the roots of the hair; to work perfume into the hair.' WHERE id = 'ARC:غلل:combined:6';
UPDATE ar_ling_arc_rung SET label_en = 'Ghulūl: secretly keeping back something from the spoils so it never reaches the share-out, as if hidden in one''s clothes.' WHERE id = 'ARC:غلل:combined:7';
UPDATE ar_ling_arc_rung SET label_en = 'Said of a ram: it mates without lifting its fat tail.' WHERE id = 'ARC:غلل:combined:8';
UPDATE ar_ling_arc_rung SET label_en = 'His heart held deceit, rancour and hatred.' WHERE id = 'ARC:غلل:combined:9';
UPDATE ar_ling_arc_rung SET label_en = 'Ghill: rancour that slips into the heart and stays there.' WHERE id = 'ARC:غلل:combined:10';
UPDATE ar_ling_arc_rung SET label_en = 'To wear the ghilāla: a garment worn next to the skin, under the clothes.' WHERE id = 'ARC:غلل:combined:11';
UPDATE ar_ling_arc_rung SET label_en = 'An estate yields its produce (ghalla) while the land itself remains.' WHERE id = 'ARC:غلل:combined:12';
UPDATE ar_ling_arc_rung SET label_en = 'He went deep into the deserts: entered them and crossed their midst.' WHERE id = 'ARC:غلل:combined:14';
UPDATE ar_ling_arc_rung SET label_en = 'To put the iron collar (ghull) on someone''s neck or hand; one so bound is maghlūl.' WHERE id = 'ARC:غلل:combined:15';
UPDATE ar_ling_arc_rung SET label_en = 'Ghullān: hidden, sunken valleys; whoever travels them disappears into them.' WHERE id = 'ARC:غلل:combined:16';
UPDATE ar_ling_arc_rung SET label_en = 'A bad-tempered woman is called ‘a lice-ridden collar’ (ghull qamil).' WHERE id = 'ARC:غلل:combined:17';
UPDATE ar_ling_arc_rung SET label_en = 'Ghulla: the cloth stopper over the mouth of a jug.' WHERE id = 'ARC:غلل:combined:18';
UPDATE ar_ling_arc_rung SET label_en = 'Ghalīl: date-stones mixed into fodder and fed to camels.' WHERE id = 'ARC:غلل:combined:19';
UPDATE ar_ling_arc_rung SET label_en = 'Ghulūl is wrapping oneself in betrayal; ghill is enmity.' WHERE id = 'ARC:غلل:combined:20';
UPDATE ar_ling_arc_rung SET label_en = 'Ghalla, yaghullu: he betrayed; aghlaltu someone: I accused him of betrayal.' WHERE id = 'ARC:غلل:combined:21';
UPDATE ar_ling_arc_rung SET label_en = 'Something slipping into another thing and staying fixed there, like a peg driven in.' WHERE id = 'ARC:غلل:maqayis_lugha:1';
UPDATE ar_ling_arc_rung SET label_en = 'The Arabs say ‘ghalaltu the thing in the thing’ when they fix it inside, as if driving it in.' WHERE id = 'ARC:غلل:maqayis_lugha:2';
UPDATE ar_ling_arc_rung SET label_en = 'Ghulūl: secretly keeping back something from the spoils so it never reaches the share-out, as if hidden in one''s clothes.' WHERE id = 'ARC:غلل:maqayis_lugha:3';
UPDATE ar_ling_arc_rung SET label_en = 'Ghill: rancour that slips into the heart and stays there.' WHERE id = 'ARC:غلل:maqayis_lugha:4';
UPDATE ar_ling_arc_rung SET label_en = 'Ghullān: hidden, sunken valleys; whoever travels them disappears into them.' WHERE id = 'ARC:غلل:maqayis_lugha:5';
UPDATE ar_ling_arc_rung SET label_en = 'Ghulla: the cloth stopper over the mouth of a jug.' WHERE id = 'ARC:غلل:maqayis_lugha:6';
UPDATE ar_ling_arc_rung SET label_en = 'Ghalīl: date-stones mixed into fodder and fed to camels.' WHERE id = 'ARC:غلل:maqayis_lugha:7';
UPDATE ar_ling_arc_rung SET label_ar = trim(replace(replace(label_ar, '﴿', ''), '﴾', '')) WHERE root_norm = 'غلل';
UPDATE ar_ling_arc_rung SET label_ar = trim(substr(label_ar, 4)) WHERE root_norm = 'غلل' AND label_ar LIKE 'غم %';
DELETE FROM ar_ling_arc_rung WHERE id = 'ARC:غلل:combined:13';
UPDATE ar_ling_arc_rung SET seq = seq - 1 WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq > 13;
