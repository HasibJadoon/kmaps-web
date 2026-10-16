-- qr_164 — a key term as a story (owner, 2026-10-16).
-- A key term met in a passage opens into its story, told by the Qurʾān's own āyāt in order: each step one āyah (or a
-- run of them, or part of one), heard as recited, the words that answer marked on the line, and one question on it.
-- The Reading class deals a term's story after its meaning (practice-reading.ts), wherever the term is met.
--   term_grp   the term as qr_drill_anchor groups it (Sinai's Key Terms entry)
--   line       the āyāt the step shows: surah, ayah_from:word_from – ayah_to:word_to
--   marks_json [[ayah, word_from, word_to], …] — the words that answer, lit on the line
--   wrong_json the near misses, written for the step
CREATE TABLE IF NOT EXISTS qr_keyterm_story (
  id          TEXT PRIMARY KEY,
  term_grp    TEXT NOT NULL,
  term_ar     TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  title_en    TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  word_from   INTEGER NOT NULL DEFAULT 1,
  ayah_to     INTEGER NOT NULL,
  word_to     INTEGER NOT NULL DEFAULT 999,
  marks_json  TEXT NOT NULL,
  ask_en      TEXT NOT NULL,
  answer_en   TEXT NOT NULL,
  wrong_json  TEXT NOT NULL,
  explain_en  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'live',
  UNIQUE (term_grp, seq)
);

-- al-Kitāb (Sinai re_skt_e709096b4073716c): where the Book is kept, what came before it, who brought it, what he is
-- like, when it came down, and the sky sealed as the jinn heard it.
INSERT OR REPLACE INTO qr_keyterm_story (id, term_grp, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json, explain_en) VALUES
('KS:kitab:1', 're_skt_e709096b4073716c', 'الكِتَاب', 1, 'Where the Book is kept', 85, 21, 1, 22, 999, '[[22,2,3]]',
 'Where is this Qurʾān kept?', 'In a Preserved Tablet',
 '["In the hearts of the angels","In scrolls handed down from Mūsā","In the Kaʿba"]',
 '85:21–22: "It is a glorious Qurʾān, in a Preserved Tablet." The Book is kept with God before it is sent down.'),
('KS:kitab:2', 're_skt_e709096b4073716c', 'الكِتَاب', 2, 'The Mother of the Book', 43, 4, 1, 4, 999, '[[4,3,4]]',
 'What does God call the source of the Book, with Him?', 'The Mother of the Book',
 '["The Book of Deeds","The Scrolls of Ibrāhīm","The Clear Reminder"]',
 '43:4: "It is with Us in the Mother of the Book, exalted, full of wisdom." Every revelation is drawn from this one source.'),
('KS:kitab:3', 're_skt_e709096b4073716c', 'الكِتَاب', 3, 'The Book before it', 46, 30, 1, 30, 999, '[[30,5,9]]',
 'The jinn heard this Book and said it came after the Book of whom?', 'Mūsā — the Torah',
 '["ʿĪsā — the Gospel","Dāwūd — the Psalms","Ibrāhīm — his scrolls"]',
 '46:30: "We have heard a Book sent down after Mūsā, confirming what came before it." 3:3: He sent down the Book with the truth, confirming what was before it, as He sent down the Torah and the Gospel.'),
('KS:kitab:4', 're_skt_e709096b4073716c', 'الكِتَاب', 4, 'Who brought it down', 26, 192, 1, 194, 999, '[[193,3,4]]',
 'Who brought the Book down upon the Prophet''s heart?', 'Jibrīl, the Trustworthy Spirit',
 '["Mīkāʾīl, the giver of rain","Isrāfīl, who blows the Horn","The angel of death"]',
 '26:193: "The Trustworthy Spirit brought it down upon your heart." 2:97 names him: "Whoever is an enemy to Jibrīl — it is he who brought it down upon your heart, by God''s leave."'),
('KS:kitab:5', 're_skt_e709096b4073716c', 'الكِتَاب', 5, 'What he is like', 53, 5, 1, 6, 999, '[[5,2,3],[6,1,2]]',
 'How does the Qurʾān describe the one who taught the Prophet?', 'Mighty in power, firm in strength',
 '["Gentle and unseen","Swift, with countless wings","Hidden, never seen"]',
 '53:5–6: "One mighty in power taught him, one of firm strength, who rose to his full form."'),
('KS:kitab:6', 're_skt_e709096b4073716c', 'الكِتَاب', 6, 'His rank', 81, 19, 1, 21, 999, '[[21,1,3]]',
 'What is he among those with the Lord of the Throne?', 'Obeyed there, and trustworthy',
 '["The first of all creation","The keeper of the Fire","A bearer of the Throne"]',
 '81:19–21: "It is the word of a noble messenger, possessed of power, secure with the Lord of the Throne, obeyed there, trustworthy."'),
('KS:kitab:7', 're_skt_e709096b4073716c', 'الكِتَاب', 7, 'The month', 2, 185, 1, 185, 6, '[[185,1,2]]',
 'In which month was the Qurʾān sent down?', 'Ramaḍān',
 '["Shaʿbān","Rajab","Dhū l-Ḥijja"]',
 '2:185: "The month of Ramaḍān, in which the Qurʾān was sent down, a guidance for people."'),
('KS:kitab:8', 're_skt_e709096b4073716c', 'الكِتَاب', 8, 'The night', 97, 1, 1, 1, 999, '[[1,4,5]]',
 'On which night was it sent down?', 'The Night of Decree',
 '["The night of the Night Journey","The night of ʿArafa","The night of the full moon"]',
 '97:1: "We sent it down on the Night of Decree." 44:3 calls it "a blessed night."'),
('KS:kitab:9', 're_skt_e709096b4073716c', 'الكِتَاب', 9, 'The sky sealed', 72, 8, 1, 9, 999, '[[8,5,8]]',
 'When the jinn reached for the sky, what did they find?', 'Filled with fierce guards and flames',
 '["Open, as it had always been","Dark and silent","Its gates broken down"]',
 '72:8–9: "We touched the sky and found it filled with fierce guards and flames. We used to sit there in places to listen; whoever listens now finds a flame lying in wait."'),
('KS:kitab:10', 're_skt_e709096b4073716c', 'الكِتَاب', 10, 'What the jinn heard', 72, 1, 1, 1, 999, '[[1,12,13]]',
 'And what did they hear?', 'A wondrous Qurʾān',
 '["The Torah read aloud","The praise of the angels","The verse of a poet"]',
 '72:1: "A company of jinn listened and said: we have heard a wondrous Qurʾān." 46:29: when it was finished, they turned back to their people as warners.');

INSERT INTO qr_study_label (scope, key, label, label_ar, sort, extra_json) VALUES
  ('kind', 'keyterm_story', 'The story of the term', 'قِصَّةُ المُصْطَلَح', 995, NULL),
  ('class_style', 'keyterm:story', 'The term''s story', 'قِصَّةُ المُصْطَلَح', 15, NULL)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;

-- al-Kitāb, the jinn's answer: they believed, and called their people to it
INSERT OR REPLACE INTO qr_keyterm_story (id, term_grp, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json, explain_en) VALUES
('KS:kitab:11', 're_skt_e709096b4073716c', 'الكِتَاب', 11, 'The jinn believed', 72, 2, 1, 2, 999, '[[2,4,9]]',
 'What did the jinn do when they heard it?', 'They believed, and would set up no partner with their Lord',
 '["They mocked it and went away","They hid it from their people","They asked for a sign first"]',
 '72:2: "It guides to what is right, so we believed in it, and we will never set up anyone as a partner with our Lord."'),
('KS:kitab:12', 're_skt_e709096b4073716c', 'الكِتَاب', 12, 'They called their people', 46, 31, 1, 31, 999, '[[31,2,6]]',
 'What did they call their people to?', 'Answer God''s caller and believe in him',
 '["Go back to listening at the sky","Wait for another Book","Keep to the ways of their fathers"]',
 '46:31: "Our people, answer God''s caller and believe in him: He will forgive you your sins and shelter you from a painful punishment."');

-- Tanzīl (Sinai re_skt_0b018802ff1005f9, anzala): from whom, how, why in stages, with what, in what tongue, where to,
-- kept by whom — and what nazzala says beside anzala
INSERT OR REPLACE INTO qr_keyterm_story (id, term_grp, term_ar, seq, title_en, surah, ayah_from, word_from, ayah_to, word_to, marks_json, ask_en, answer_en, wrong_json, explain_en) VALUES
('KS:tanzil:1', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 1, 'From whom', 40, 2, 1, 2, 999, '[[2,3,6]]',
 'From whom is the Book sent down?', 'From God, the Mighty, the All-Knowing',
 '["From the angels, by their own word","From the Prophet''s own heart","From the scholars of earlier Books"]',
 '40:2: "The sending down of the Book is from God, the Mighty, the All-Knowing." 39:1 opens the same way; 56:80: "a sending down from the Lord of the worlds."'),
('KS:tanzil:2', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 2, 'In stages', 17, 106, 1, 106, 999, '[[106,2,2],[106,6,9]]',
 'How was the Qurʾān sent down?', 'In parts, over time, to be recited slowly',
 '["All at once, in one night","Written on tablets of stone","In a single dream"]',
 '17:106: "A Qurʾān We divided, so you would recite it to people slowly, and We sent it down in stages." Tanzīl is this sending down, step by step.'),
('KS:tanzil:3', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 3, 'Why in stages', 25, 32, 1, 32, 999, '[[32,11,13]]',
 'The deniers asked why it did not come all at once. Why did it come in stages?', 'To make the Prophet''s heart firm',
 '["So it could be kept secret","Because the angel came slowly","So it could be changed later"]',
 '25:32: "Why was the Qurʾān not sent down to him all at once? — Thus, so We make your heart firm with it, and We have set it out in measured order."'),
('KS:tanzil:4', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 4, 'With the truth', 17, 105, 1, 105, 999, '[[105,1,4]]',
 'With what was it sent down, and with what did it come down?', 'With the truth',
 '["With wonders only","With a promise of land","With a sword"]',
 '17:105: "With the truth We sent it down, and with the truth it came down; and We sent you only as a bearer of good news and a warner."'),
('KS:tanzil:5', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 5, 'In Arabic', 12, 2, 1, 2, 999, '[[2,3,4]]',
 'In what form was it sent down?', 'An Arabic Qurʾān, so you would understand',
 '["In Hebrew, the tongue of Mūsā","In Syriac","In the tongue of the angels"]',
 '12:2: "We sent it down as an Arabic Qurʾān, so that you would understand." 26:195: "in a clear Arabic tongue."'),
('KS:tanzil:6', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 6, 'Upon the heart', 26, 192, 1, 194, 999, '[[194,1,2]]',
 'Where did the Trustworthy Spirit bring it down?', 'Upon the Prophet''s heart',
 '["Upon tablets of stone","Upon a mountain top","Into a written scroll first"]',
 '26:192–194: "It is the sending down of the Lord of the worlds; the Trustworthy Spirit brought it down upon your heart, so you would be one of the warners."'),
('KS:tanzil:7', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 7, 'Kept safe', 15, 9, 1, 9, 999, '[[9,5,7]]',
 'Who keeps the Reminder that was sent down safe?', 'God Himself',
 '["The scribes alone","The scholars of each age","The angels alone"]',
 '15:9: "It is We who sent down the Reminder, and it is We who keep it safe."'),
('KS:tanzil:8', 're_skt_0b018802ff1005f9', 'تَنْزِيل', 8, 'Nazzala and anzala', 3, 3, 1, 3, 999, '[[3,1,1],[3,9,9]]',
 '3:3 says nazzala for the Book and anzala for the Torah. What does nazzala add?', 'Sent down in stages, over time',
 '["Sent down from a greater height","Sent down to a whole people","Sent down only once"]',
 '3:3: "He sent down (nazzala) the Book to you with the truth … and sent down (anzala) the Torah and the Gospel." al-Zamakhsharī: nazzala because the Qurʾān came in parts; the Torah and the Gospel came down whole.');

-- global concept ids (CORE 068, mirrored here): the story's concept, and the concept each step unfolds
ALTER TABLE qr_keyterm_story ADD COLUMN gc_ref TEXT;
ALTER TABLE qr_keyterm_story ADD COLUMN step_gc_ref TEXT;
INSERT OR IGNORE INTO gc_concept (id, uid, concept_key, label_en, label_ar, domain) VALUES
('GC:quran:kitab', lower(hex(randomblob(13))), 'kitab', 'The Book (al-Kitāb)', 'الكِتَاب', 'quran'),
('GC:quran:tanzil', lower(hex(randomblob(13))), 'tanzil', 'Sending down in stages (tanzīl)', 'التَّنْزِيل', 'quran'),
('GC:quran:lawh_mahfuz', lower(hex(randomblob(13))), 'lawh_mahfuz', 'The Preserved Tablet', 'اللَّوْحُ المَحْفُوظ', 'quran'),
('GC:quran:umm_al_kitab', lower(hex(randomblob(13))), 'umm_al_kitab', 'The Mother of the Book', 'أُمُّ الكِتَاب', 'quran'),
('GC:quran:tawrat', lower(hex(randomblob(13))), 'tawrat', 'The Torah', 'التَّوْرَاة', 'quran'),
('GC:quran:laylat_al_qadr', lower(hex(randomblob(13))), 'laylat_al_qadr', 'The Night of Decree', 'لَيْلَةُ القَدْر', 'quran'),
('GC:theology:jibril', lower(hex(randomblob(13))), 'jibril', 'Jibrīl, the Trustworthy Spirit', 'جِبْرِيلُ الرُّوحُ الأَمِين', 'theology'),
('GC:theology:jinn', lower(hex(randomblob(13))), 'jinn', 'The jinn', 'الجِنّ', 'theology');
UPDATE qr_keyterm_story SET gc_ref = 'GC:quran:kitab' WHERE term_grp = 're_skt_e709096b4073716c';
UPDATE qr_keyterm_story SET gc_ref = 'GC:quran:tanzil' WHERE term_grp = 're_skt_0b018802ff1005f9';
UPDATE qr_keyterm_story SET step_gc_ref = CASE id
  WHEN 'KS:kitab:1' THEN 'GC:quran:lawh_mahfuz' WHEN 'KS:kitab:2' THEN 'GC:quran:umm_al_kitab' WHEN 'KS:kitab:3' THEN 'GC:quran:tawrat'
  WHEN 'KS:kitab:4' THEN 'GC:theology:jibril' WHEN 'KS:kitab:5' THEN 'GC:theology:jibril' WHEN 'KS:kitab:6' THEN 'GC:theology:jibril'
  WHEN 'KS:kitab:7' THEN 'GC:quran:laylat_al_qadr' WHEN 'KS:kitab:8' THEN 'GC:quran:laylat_al_qadr'
  WHEN 'KS:kitab:9' THEN 'GC:theology:jinn' WHEN 'KS:kitab:10' THEN 'GC:theology:jinn' WHEN 'KS:kitab:11' THEN 'GC:theology:jinn' WHEN 'KS:kitab:12' THEN 'GC:theology:jinn'
  WHEN 'KS:tanzil:1' THEN 'GC:theology:revelation' WHEN 'KS:tanzil:2' THEN 'GC:quran:tanzil' WHEN 'KS:tanzil:3' THEN 'GC:quran:tanzil'
  WHEN 'KS:tanzil:4' THEN 'GC:theology:revelation' WHEN 'KS:tanzil:5' THEN 'GC:quran:tanzil' WHEN 'KS:tanzil:6' THEN 'GC:theology:jibril'
  WHEN 'KS:tanzil:7' THEN 'GC:theology:revelation' WHEN 'KS:tanzil:8' THEN 'GC:quran:tanzil' END;
