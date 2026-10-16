-- qr_166 — the key terms' stories as part of the Qurʾān's themes (owner, 2026-10-16; audit: extend what exists).
-- The themes are qr_topic_registry (QR:TOP:…), where a theme is met is qr_scope_topic; a key term's story
-- (qr_keyterm_story, qr_164) now names its theme and its term, how the term is found in a passage (match_json: Sinai
-- entries, corpus lemmas), its layer (the Qurʾān first, then the history of the word) and the source of a history step.
-- The two tables qr_165 made (qr_keyterm, qr_passage_keyterm) repeated qr_drill_anchor and the theme tables: removed.
-- For now the passage studied (40:1–3) names its themes and its terms; the rest grows as passages are studied.
DROP TABLE IF EXISTS qr_passage_keyterm;
DROP TABLE IF EXISTS qr_keyterm;

ALTER TABLE qr_topic_registry ADD COLUMN gc_ref TEXT;
ALTER TABLE qr_keyterm_story ADD COLUMN topic_ref TEXT;
ALTER TABLE qr_keyterm_story ADD COLUMN term_key TEXT;
ALTER TABLE qr_keyterm_story ADD COLUMN match_json TEXT;
ALTER TABLE qr_keyterm_story ADD COLUMN layer TEXT NOT NULL DEFAULT 'quran';
ALTER TABLE qr_keyterm_story ADD COLUMN source_ref TEXT;

INSERT OR IGNORE INTO qr_topic_registry (id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md) VALUES
  ('QR:TOP:tanzil', 'sending-down', 'The Qurʾān sent down from God, in stages', 'التنزيل', 'textuality', 'Key-term story KS:tanzil (qr_164).');
UPDATE qr_topic_registry SET gc_ref = CASE id WHEN 'QR:TOP:kitab' THEN 'GC:quran:kitab' WHEN 'QR:TOP:tanzil' THEN 'GC:quran:tanzil'
  WHEN 'QR:TOP:tawhid' THEN 'GC:theology:tawhid' WHEN 'QR:TOP:shirk' THEN 'GC:theology:shirk' WHEN 'QR:TOP:rahma' THEN 'GC:theology:divine_mercy'
  WHEN 'QR:TOP:shafaah' THEN 'GC:theology:intercession' WHEN 'QR:TOP:ikhlas' THEN 'GC:theology:ikhlas_al_din' ELSE gc_ref END;

UPDATE qr_keyterm_story SET topic_ref = 'QR:TOP:kitab', term_key = 'kitab', match_json = '{"sinai":["re_skt_e709096b4073716c"]}'
 WHERE term_grp = 're_skt_e709096b4073716c';
UPDATE qr_keyterm_story SET topic_ref = 'QR:TOP:tanzil', term_key = 'tanzil', match_json = '{"sinai":["re_skt_0b018802ff1005f9"],"lemmas":["تَنزِيل"]}'
 WHERE term_grp = 're_skt_0b018802ff1005f9';
-- nazzala beside anzala: the two readings, not one
UPDATE qr_keyterm_story SET ask_en = '3:3 says nazzala for the Book and anzala for the Torah. How does al-Zamakhsharī read nazzala?',
  explain_en = '3:3: "He sent down (nazzala) the Book to you with the truth … and sent down (anzala) the Torah and the Gospel." al-Zamakhsharī: nazzala because the Qurʾān came in parts, while the Torah and the Gospel came down whole. Sinai reads the two verbs as used interchangeably, siding with al-Akhfash against al-Rāghib: the difference is a reading, not a rule of the language.'
 WHERE id = 'KS:tanzil:8';

-- Ilāh: what a god is, the one message, Firʿawn''s claim, the idols of Mecca, the proof, Ibrāhīm, the testimony, this passage
INSERT OR REPLACE INTO qr_keyterm_story (id, topic_ref, term_grp, term_key, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json, explain_en, gc_ref, step_gc_ref) VALUES
('KS:ilah:1', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 1, 'What an ilāh is', 25, 43, 1, 43, 999, '[[43, 3, 5]]', 'Who does this āyah say a person can take as his ilāh?', 'His own desire — whatever he serves and obeys', '["Only an idol of stone", "Only a king", "Only a star in the sky"]', '25:43: "Have you seen the one who takes his own desire as his god?" An ilāh is whatever is served and obeyed as the final word — an idol, a ruler, or one''s own wants.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:2', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 2, 'Every messenger''s message', 21, 25, 1, 25, 999, '[[25, 11, 15]]', 'What was revealed to every messenger sent before?', 'There is no god but Me, so serve Me', '["Build a house of worship", "Keep the law of your fathers", "Leave the world and its people"]', '21:25: "We sent no messenger before you without revealing to him: there is no god but Me, so serve Me." The one message runs through every prophet.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:3', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 3, 'Mūsā at the fire', 20, 14, 1, 14, 999, '[[14, 1, 7]]', 'What was Mūsā told first, at the fire?', 'I am God: there is no god but Me — serve Me, and pray to remember Me', '["Go to Firʿawn at once", "Throw down your staff", "Take off your sandals and leave"]', '20:14: "I am God; there is no god but Me, so serve Me, and establish the prayer to remember Me." Before any mission, Mūsā is taught who alone is God.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:4', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 4, 'Firʿawn''s claim', 28, 38, 1, 38, 999, '[[38, 5, 10]]', 'What did Firʿawn claim before his chiefs?', 'That he knew of no god for them but himself', '["That he was a prophet", "That the Nile was their god", "That Mūsā was a god"]', '28:38: "Chiefs, I know of no god for you other than me." The claim to be an ilāh is the claim to the last word over people.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:5', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 5, 'The idols of Mecca', 53, 19, 1, 20, 999, '[[19, 2, 3], [20, 1, 1]]', 'Which goddesses does the Qurʾān name as the idols of Mecca?', 'al-Lāt, al-ʿUzzā and Manāt', '["Baʿl, Wadd and Suwāʿ", "Hubal, Isāf and Nāʾila", "Yaghūth, Yaʿūq and Nasr"]', '53:19–20: "Have you considered al-Lāt and al-ʿUzzā, and Manāt, the third, the other?" 53:23: "They are only names you and your fathers have named."', 'GC:theology:ilah', 'GC:theology:shirk'),
('KS:ilah:6', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 6, 'Mecca''s amazement', 38, 5, 1, 5, 999, '[[5, 1, 4]]', 'What astonished the leaders of Quraysh?', 'That he made all the gods one God', '["That he could read and write", "That he spoke of the angels", "That he prayed toward Jerusalem"]', '38:5: "Has he made the gods one God? That is a strange thing indeed!" The quarrel in Mecca was over this one word.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:7', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 7, 'The proof', 21, 22, 1, 22, 999, '[[22, 1, 7]]', 'What would happen if there were gods in heaven and earth besides God?', 'Both would be ruined', '["Each god would rule a land", "They would share the worship", "Nothing would change"]', '21:22: "Had there been gods in them other than God, both would have been ruined." One order in the world points to one Lord.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:8', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 8, 'Ibrāhīm''s search', 6, 76, 1, 76, 999, '[[76, 13, 15]]', 'Why did Ibrāhīm turn from the star he saw at night?', 'It set — and he does not love what sets', '["It was too small", "His people mocked it", "The moon outshone it"]', '6:76: "When the night covered him he saw a star; he said: this is my lord. When it set he said: I do not love what sets." A god cannot be one who disappears.', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:9', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 9, 'God''s own testimony', 3, 18, 1, 18, 999, '[[18, 1, 7]]', 'Who first bears witness that there is no god but He?', 'God Himself — then the angels and those with knowledge', '["The prophets alone", "The People of the Book", "The jinn who heard the Qurʾān"]', '3:18: "God bears witness that there is no god but He, and so do the angels and those with knowledge, upholding justice."', 'GC:theology:ilah', 'GC:theology:tawhid'),
('KS:ilah:10', 'QR:TOP:tawhid', 'kmaps:ilah', 'ilah', 'إِلَٰه', 10, 'In this passage', 40, 3, 1, 3, 999, '[[3, 9, 12]]', 'After the four names — Forgiver, Accepter, Severe, Bountiful — what follows?', 'There is no god but He; to Him is the return', '["Then obey His messenger", "Then the Book is sent down", "Then the angels bow down"]', '40:3: "…Forgiver of sin, Accepter of repentance, severe in punishment, full of bounty. There is no god but He; to Him is the final return." The One who forgives, accepts, punishes and gives is the only one to serve, and everyone comes back to Him.', 'GC:theology:ilah', 'GC:theology:tawhid');
UPDATE qr_keyterm_story SET match_json = '{"lemmas":["إِلَٰه"]}' WHERE term_key = 'ilah';

-- Allāh: what Mecca already said, why it served idols, Allāh and al-Raḥmān — then the name''s history (Sinai''s entry:
-- the grammarians, the Safaitic inscriptions, the bilinguals, Ḥimyar, Dūmah, Jabal Dhabūb). A history step shows no āyah (surah 0).
INSERT OR REPLACE INTO qr_keyterm_story (id, topic_ref, term_grp, term_key, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json, explain_en, gc_ref, step_gc_ref, layer, source_ref) VALUES
('KS:allah:1', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 1, 'What Mecca already said', 29, 61, 1, 61, 999, '[[61, 10, 11]]', 'Asked who created the heavens and the earth, what did the Meccans answer?', 'Allāh', '["al-Lāt", "Hubal", "The sun and the moon"]', '29:61: "If you ask them who created the heavens and the earth and made the sun and moon serve, they will say: Allāh. How then are they turned away?" The name was known before the Qurʾān; what it brought was His being the only God.', 'GC:theology:allah', 'GC:theology:allah', 'quran', NULL),
('KS:allah:2', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 2, 'Why they served idols', 39, 3, 1, 3, 999, '[[3, 13, 16]]', 'Why did they say they served the idols?', 'To bring them near to Allāh', '["Because the idols created them", "To be rid of Allāh", "Because their prophets told them to"]', '39:3: "We serve them only so they bring us near to Allāh." They kept Allāh as the high God and set intermediaries before Him; the Qurʾān rejects the intermediaries.', 'GC:theology:allah', 'GC:theology:shirk', 'quran', NULL),
('KS:allah:3', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 3, 'Allāh and al-Raḥmān', 17, 110, 1, 110, 999, '[[110, 2, 6]]', 'Call on Allāh or call on al-Raḥmān — are these two gods?', 'One God: whichever you call, His are the best names', '["Two gods, one of mercy, one of power", "al-Raḥmān is an angel of Allāh", "al-Raḥmān was a god of Yemen only"]', '17:110: "Say: call on Allāh or call on al-Raḥmān — whichever you call, to Him belong the best names."', 'GC:theology:allah', 'GC:theology:allah', 'quran', NULL),
('KS:allah:4', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 4, 'The word itself', 0, 0, 1, 0, 999, '[]', 'The Kufan grammarians explain the word allāh as coming from what?', 'al-ilāh, “the god”, contracted', '["A Syriac word for God", "The name of a moon god", "A word meaning “the high one”"]', 'The Kufan school of Arabic grammar takes allāh as a contraction of al-ilāh, “the god” (al-Thaʿlabī); the etymology remains linguistically plausible.', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)'),
('KS:allah:5', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 5, 'In the desert inscriptions', 0, 0, 1, 0, 999, '[]', 'In the Safaitic rock inscriptions of the north Arabian desert, how does ʾlh / lh appear?', 'As the name of one god among others, asked for rain and safety', '["As the only god, never beside others", "As a title of kings", "Only in curses on enemies"]', 'Safaitic graffiti use ʾlh or lh as the name of a deity, sometimes listed with other gods such as Kahl, ʿAththar or Ruḍā, and petitioned for rain, security or booty (al-Jallad).', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)'),
('KS:allah:6', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 6, 'How it was said', 0, 0, 1, 0, 999, '[]', 'Bilingual inscriptions in Arabic and Greek show that ʾlh in personal names was pronounced how?', 'allāh', '["ilāh", "elōh", "ʾalāh"]', 'Arabic–Greek bilingual inscriptions show that, at least in names built on God''s name, ʾlh or lh was pronounced allāh (Krone).', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)'),
('KS:allah:7', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 7, 'In the south', 0, 0, 1, 0, 999, '[]', 'The Ḥimyarite inscriptions of South Arabia call the master of heaven and earth by which name?', 'raḥmānān — the Merciful', '["Allāt", "ʿAththar of the stars", "Hubal"]', 'Inscriptions from Ḥimyar invoke ʾln/ʾlhn and “the Merciful” (rḥmnn, raḥmānān) as master of heaven and earth (Gajda; Robin and Rijziger).', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)'),
('KS:allah:8', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 8, 'A Christian inscription', 0, 0, 1, 0, 999, '[]', 'A Christian inscription near Dūmah, from 548 or 549 CE, prefers which form of the name?', 'al-ilāh, not contracted', '["allāh, contracted", "al-raḥmān alone", "elōhīm"]', 'Christian inscriptions, including one in mostly Arabic script from 548 or 549 CE found near Dūmah, keep the uncontracted ʾl-ʾlh (al-ilāh) over ʾlh (Nehmé; Robin).', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)'),
('KS:allah:9', 'QR:TOP:tawhid', 'kmaps:allah', 'allah', 'اللَّه', 9, 'In the name of God, the Merciful', 0, 0, 1, 0, 999, '[]', 'On al-Jallad''s reading, how does the Jabal Dhabūb inscription begin?', 'In the name of God, the Merciful (b-smlh rḥmn)', '["In the name of al-Lāt", "In the name of the Lord of the Kaʿba", "In the name of the king"]', 'A possibly pre-Qurʾānic inscription from Jabal Dhabūb opens b-smlh rḥmn, “In the name of God, the Merciful” — the only evidence so far joining “In the name of Allāh” and “the Merciful”, perhaps naming the north Arabian Allāh with the Ḥimyarite Raḥmān (al-Jallad).', 'GC:theology:allah', 'GC:theology:allah', 'history', 'Sinai, Key Terms of the Qurʾān, “allāh” (p. 59)');
UPDATE qr_keyterm_story SET match_json = '{"lemmas":["اللَّه"]}' WHERE term_key = 'allah';

INSERT OR IGNORE INTO gc_concept (id, uid, concept_key, label_en, label_ar, domain) VALUES
  ('GC:theology:ilah', lower(hex(randomblob(13))), 'ilah', 'A god (ilāh): whatever is served and obeyed', 'الإِلَٰه', 'theology'),
  ('GC:theology:allah', lower(hex(randomblob(13))), 'allah', 'Allāh: the name, and its history', 'اللَّه', 'theology');

-- the passage studied: its themes
INSERT OR REPLACE INTO qr_scope_topic (id, topic_id, scope_type, surah, ayah_from, ayah_to, prominence, note_md) VALUES
  ('QR:ST:40:1', 'QR:TOP:kitab',  'passage', 40, 1, 3, 'primary',   '{"words":"تَنْزِيلُ الْكِتَابِ"}'),
  ('QR:ST:40:2', 'QR:TOP:tanzil', 'passage', 40, 1, 3, 'primary',   '{"words":"تَنْزِيلُ"}'),
  ('QR:ST:40:3', 'QR:TOP:tawhid', 'passage', 40, 1, 3, 'primary',   '{"words":"لَا إِلَهَ إِلَّا هُوَ"}'),
  ('QR:ST:40:4', 'QR:TOP:rahma',  'passage', 40, 1, 3, 'secondary', '{"words":"غَافِرِ الذَّنْبِ"}'),
  ('QR:ST:40:5', 'QR:TOP:tawba',  'passage', 40, 1, 3, 'secondary', '{"words":"وَقَابِلِ التَّوْبِ"}'),
  ('QR:ST:40:6', 'QR:TOP:qiyama', 'passage', 40, 1, 3, 'secondary', '{"words":"إِلَيْهِ الْمَصِيرُ"}');

-- Read & listen drawn again: its sentences now carry their terms'' stories
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.rev', 4) WHERE scope = 'class_node' AND key = 'read';

-- a story's lemma as the corpus writes it (its marks in the corpus's order)
UPDATE qr_keyterm_story SET match_json = json_object('lemmas', json_array((SELECT lemma FROM qr_word_occurrence WHERE surah = 40 AND ayah = 2 AND word_index = 4)))
 WHERE term_key = 'allah';
