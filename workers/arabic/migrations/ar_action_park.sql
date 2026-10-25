-- The Action Park (owner, 2026-10-25: "actions that cover verb usage, showing the actions, to master Arabic verbs; prepositions
-- the same way"): verbs shown being done, prepositions shown in place; a map inside the Modern Town.
INSERT OR IGNORE INTO ar_map (id, parent_id, slug, title, title_ar, era, blurb, image_key, w, h, sort_order, districts_json) VALUES
 ('MAP:action-park', 'MAP:modern-town', 'action-park', 'The Action Park', 'حَدِيقَةُ الْأَفْعَالِ', 'msa',
  'Verbs you see being done, and prepositions you see in place', 'reading/places/town-action.jpg', 1000, 1100, 11, '[]');
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM0000000000000132','verbs_daily','Daily Actions','أَفْعَالُ الْيَوْمِ','Wake, wash, eat, drink, sleep: the day in verbs, past, present and command',306,'MAP:action-park','verbs',149),
 ('01ARDOM0000000000000133','verbs_motion','Moving','أَفْعَالُ الْحَرَكَةِ','Go, come, walk, run, climb, enter, leave',307,'MAP:action-park','verbs',150),
 ('01ARDOM0000000000000134','verbs_hands','Hands at Work','أَفْعَالُ الْيَدِ','Take, give, open, close, carry, write, cut',308,'MAP:action-park','verbs',151),
 ('01ARDOM0000000000000135','verbs_kitchen','In the Kitchen','فِي الْمَطْبَخِ','Cook, pour, mix, wash, taste',309,'MAP:action-park','verbs',152),
 ('01ARDOM0000000000000136','verbs_speech','Speaking & Listening','الْكَلَامُ وَالسَّمَاعُ','Say, ask, answer, call, hear',310,'MAP:action-park','verbs',153),
 ('01ARDOM0000000000000137','verbs_mind','Thinking & Feeling','التَّفْكِيرُ وَالشُّعُورُ','Know, think, remember, love, fear',311,'MAP:action-park','verbs',154),
 ('01ARDOM0000000000000138','verbs_play','Play & Sport','اللَّعِبُ وَالرِّيَاضَةُ','Kick, throw, jump, swim, win',312,'MAP:action-park','verbs',155),
 ('01ARDOM0000000000000139','verb_forms','One Root, Many Verbs','فِعْلٌ وَاحِدٌ وَأَوْزَانٌ','The verb forms in action: كَسَرَ، كَسَّرَ، اِنْكَسَرَ',313,'MAP:action-park','verbs',156),
 ('01ARDOM0000000000000140','prep_place','Where Is It?','أَيْنَ هُوَ؟','فِي، عَلَى، تَحْتَ، فَوْقَ: in, on, under, above',314,'MAP:action-park','preps',157),
 ('01ARDOM0000000000000141','prep_position','Around & Between','حَوْلَ وَبَيْنَ','أَمَامَ، خَلْفَ، بَيْنَ، بِجَانِبِ، عِنْدَ',315,'MAP:action-park','preps',158),
 ('01ARDOM0000000000000142','prep_direction','To & From','إِلَى وَمِنْ','إِلَى، مِنْ، عَنْ، حَتَّى: towards, from, away from, until',316,'MAP:action-park','preps',159),
 ('01ARDOM0000000000000143','prep_with','With & By','مَعَ وَبِـ','مَعَ، بِـ، لِـ، كَـ',317,'MAP:action-park','preps',160),
 ('01ARDOM0000000000000144','prep_time','Before & After','قَبْلَ وَبَعْدَ','قَبْلَ، بَعْدَ، مُنْذُ، خِلَالَ',318,'MAP:action-park','preps',161),
 ('01ARDOM0000000000000145','verb_preps','Verbs & Their Prepositions','الْأَفْعَالُ وَحُرُوفُهَا','One verb, another meaning: رَغِبَ فِي and رَغِبَ عَنْ، ذَهَبَ إِلَى and ذَهَبَ بِـ',319,'MAP:action-park','preps',162);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
