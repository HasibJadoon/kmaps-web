-- The class's step 7 (drill-engine plan §3): hear the passage explained by all four recorded
-- works, then the meaning questions those recordings answer.
--
--   qr_tafsir_page_cut   where a read page that spans two passages turns to an āyah: the lines
--                        on `ayah` begin at `seq` of that recording. A passage hears a spanning
--                        page from the cut for its first āyah up to the cut after its last; a page
--                        with no cut is heard whole, in the first passage it reaches only.
--   qr_tafsir_question   English questions about the āyāt's meaning, each answered by lines of
--                        the recordings (support_json) — never about the work or its author
--                        (Rule 0). Concrete: the words, the language, an accurate picture of
--                        what the āyah says; Arabic written in Arabic, never transliterated. The supporting lines are what the drill plays, what rises
--                        after the answer, and what the listen drills are cut from.
--   qr_tafsir_segment_en every recorded line in accurate English, with the GT terms it uses.
--   class_node 'listen'  the listen gate: every work, its passage span played through, each
--                        heard to `heard`% before the tafsīr drills open. A tapped word is a
--                        word not caught: it is kept, and the line comes back until perfected.

CREATE TABLE IF NOT EXISTS qr_tafsir_page_cut (
  page_id   TEXT NOT NULL REFERENCES qr_tafsir_read_page(id),
  audio_id  TEXT NOT NULL REFERENCES qr_tafsir_audio(id),
  ayah      INTEGER NOT NULL,               -- the āyah whose lines begin here
  seq       INTEGER NOT NULL,               -- the first line (qr_tafsir_audio_segment.seq) on it
  note      TEXT,
  PRIMARY KEY (page_id, audio_id, ayah)
);

-- al-Rāzī reads 40:1–6 as one page: lines 1–136 are on 40:1–3, line 137 turns to 40:4.
INSERT OR REPLACE INTO qr_tafsir_page_cut (page_id, audio_id, ayah, seq, note) VALUES
('QRTP:razi:2257', 'QRTA:razi:40-01', 4, 137, 'واعلم أنه تعالى لما قرر أن القرآن كتاب أنزله … ما يجادل في آيات الله');

-- Every recorded line in accurate English, with the registry terms it uses: the goal of the
-- tafsīr step is to read tafsīr fluently, so each line is understood word by word and each
-- technical term it names opens its GT entry. terms_json: [{"ar": the term as the line writes
-- it, "ref": "GT:<category>:<key>"}], resolved by exact lookup in the registry, never guessed.
CREATE TABLE IF NOT EXISTS qr_tafsir_segment_en (
  segment_id  TEXT PRIMARY KEY REFERENCES qr_tafsir_audio_segment(id),
  audio_id    TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  text_en     TEXT NOT NULL,
  terms_json  TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',      -- draft | live
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_segment_en_audio ON qr_tafsir_segment_en(audio_id, seq);

CREATE TABLE IF NOT EXISTS qr_tafsir_question (
  id            TEXT PRIMARY KEY,                 -- QR:TQ:<surah>:<from>-<to>:<nn>
  passage_id    TEXT NOT NULL REFERENCES qr_surah_study_passage(id),
  surah         INTEGER NOT NULL,
  ayah_from     INTEGER NOT NULL,
  ayah_to       INTEGER NOT NULL,
  question_en   TEXT NOT NULL,                    -- about the āyah's meaning, never the book
  interaction   TEXT NOT NULL DEFAULT 'choose',   -- choose | choose_all
  options_json  TEXT NOT NULL,                    -- the options, in no order (the drill shuffles)
  correct_json  TEXT NOT NULL,                    -- indices into options
  explain_en    TEXT,                             -- what rises after the answer
  support_json  TEXT NOT NULL,                    -- [{audio, page, from, to}] the lines that answer it
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | live
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_question_passage ON qr_tafsir_question(passage_id, status, sort_order);

-- ── Ghāfir 40:1–3, written from the four recordings ──────────────────────────
-- R = al-Rāzī (QRTA:razi:40-01 / QRTP:razi:2257), A = al-Ālūsī (QRTA:alusi:40-01),
-- I = Ibn ʿĀshūr (QRTA:ibn_ashur:y-m2kq2xlU4DM-02), Z = al-Zamakhsharī (QRTA:zamakhshari:40-01).

INSERT OR REPLACE INTO qr_tafsir_question (id, passage_id, surah, ayah_from, ayah_to, question_en, interaction, options_json, correct_json, explain_en, support_json, sort_order, status, note_md) VALUES
('QR:TQ:40:1-3:01', 'QR:SP:40:1-3', 40, 1, 1,
 'حمٓ: most sūras that open with separate letters go straight on to speak of the Book. What does that pairing do?', 'choose',
 '["It challenges the deniers: the Book is made of these very letters, yet they cannot produce its like","It gives the number of the sūra’s āyāt","It names the angel who brought the revelation","It marks a secret meant for the Prophet alone"]', '[0]',
 'حمٓ is read like the other opening letters: most are followed by mention of the Qurʾān, to challenge those who denied it with their failure to match it.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2976","from":1,"to":2}]', 1, 'live', 'Ibn ʿĀshūr on 40:1'),

('QR:TQ:40:1-3:02', 'QR:SP:40:1-3', 40, 1, 1,
 'How is the letter ح said in حمٓ?', 'choose',
 '["Short, without its final hamza: حا, not حاء","Long, with its final hamza: حاء","As a full word: حَمَّ","Silent: only م is sounded"]', '[0]',
 'Letters whose names end long with a hamza (حاء، راء، ياء) are said short in these openings, the hamza dropped for ease, because they stand in a pause: حا in حمٓ, را in الٓر, يا in يسٓ.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2976","from":3,"to":5}]', 2, 'live', 'Ibn ʿĀshūr'),

('QR:TQ:40:1-3:03', 'QR:SP:40:1-3', 40, 2, 2,
 'In تَنزِيلُ ٱلْكِتَٰبِ, what does تَنزِيل stand for?', 'choose',
 '["The Book that was sent down: the act names the thing sent","The night on which it was sent down","The angel who carried it","The order in which its sūras were set"]', '[0]',
 'تَنزِيل is a verbal noun, but what is meant by it is the thing sent down: ٱلْمُنَزَّل.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":17,"to":18}]', 3, 'live', 'al-Rāzī'),

('QR:TQ:40:1-3:04', 'QR:SP:40:1-3', 40, 2, 2,
 'Why does مِنَ ٱللَّهِ go on at once to ٱلْعَزِيزِ ٱلْعَلِيمِ — names of majesty — right after saying where the Book comes from?', 'choose',
 '["So the listener takes it seriously and gives it his full attention","To date the revelation","To show the Book is easy to understand","Because the names rhyme with حمٓ"]', '[0]',
 'Once it is said the Book comes from Allah, He is described with majesty and greatness, to make the hearer roll up his sleeves when he listens and to warn him off taking it lightly.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":19,"to":21}]', 4, 'live', 'al-Rāzī'),

('QR:TQ:40:1-3:05', 'QR:SP:40:1-3', 40, 2, 2,
 'تَنزِيلُ ٱلْكِتَٰبِ مِنَ ٱللَّهِ is said plainly, with no word of emphasis. Who is it chiefly aimed at?', 'choose',
 '["The idolaters who denied that the Qurʾān comes from God","The believers, to reassure them","The People of the Book","The angels"]', '[0]',
 'It is aimed at the idolaters who denied the Qurʾān was sent down by God; it is put plainly because the proofs around them leave no ground for denial.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2977","from":7,"to":9}]', 5, 'live', 'Ibn ʿĀshūr'),

('QR:TQ:40:1-3:06', 'QR:SP:40:1-3', 40, 2, 2,
 'Which meanings can ٱلْعَزِيزِ carry in this āyah?', 'choose_all',
 '["The Overpowering, never overcome","The One who has no like","The Beloved","The One hidden from sight"]', '[0,1]',
 'ٱلْعَزِيز is the overpowering one whom none can match in power, and the one who has no like (مَا لَا مِثْلَ لَهُ); the second is preferred where the name ٱللَّه already says He is able.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":25,"to":27}]', 6, 'live', 'al-Rāzī; Ibn ʿĀshūr reads it as overpowering'),

('QR:TQ:40:1-3:07', 'QR:SP:40:1-3', 40, 2, 2,
 'Said to those who deny the Book was sent down, what does ٱلْعَزِيزِ ٱلْعَلِيمِ imply?', 'choose_all',
 '["They will be overpowered","He knows what they hide and will call them to account for it","No one but He could produce a Book like it","The Book was sent down all at once"]', '[0,1,2]',
 'The two names hint that those who deny it are overcome and subdued, that God knows what they conceal and will reckon with them, and that the Qurʾān is the speech of the Mighty, the Knowing — none else can produce its like.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":12,"to":14}]', 7, 'live', 'Ibn ʿĀshūr'),

('QR:TQ:40:1-3:08', 'QR:SP:40:1-3', 40, 2, 2,
 'سورة الزمر opens ٱلْعَزِيزِ ٱلْحَكِيمِ; here it is ٱلْعَزِيزِ ٱلْعَلِيمِ. What does ٱلْعَلِيمِ point to here?', 'choose',
 '["He knows best whom to entrust with His message, whatever the people’s great men wish","The Book was sent down in stages","Knowledge is earned by reading the Book","The Book was hidden from the angels"]', '[0]',
 'ٱللَّهُ أَعْلَمُ حَيْثُ يَجْعَلُ رِسَالَتَهُ: He does not follow people’s wishes about which of their great men should receive it — لَوْلَا نُزِّلَ هَٰذَا ٱلْقُرْءَانُ عَلَىٰ رَجُلٍ مِّنَ ٱلْقَرْيَتَيْنِ عَظِيمٍ (43:31).',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":18,"to":19}]', 8, 'live', 'Ibn ʿĀshūr'),

('QR:TQ:40:1-3:09', 'QR:SP:40:1-3', 40, 2, 2,
 'Why do ٱلْعَزِيزِ ٱلْعَلِيمِ vouch for the Book being true?', 'choose',
 '["One all-able, free of need and all-knowing acts only with wisdom, so what He sends down is true","Because the Book says so of itself","Because many people accepted it","Because it was written down at once"]', '[0]',
 'The Book is sent down by the One absolutely able, absolutely free of need and absolutely knowing; such a One knows what helps and harms and needs neither, so His acts are wisdom — and this sending down must be true.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":33,"to":36}]', 9, 'live', 'al-Rāzī'),

('QR:TQ:40:1-3:10', 'QR:SP:40:1-3', 40, 3, 3,
 'غَافِرِ comes from غَفَرَ. What does the root picture at heart?', 'choose',
 '["Covering over","Weighing","Washing away","Repaying"]', '[0]',
 'ٱلْغُفْرَانُ عِبَارَةٌ عَنِ ٱلسَّتْرِ: forgiving is covering — something remains, and is covered over.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":55,"to":55}]', 10, 'live', 'al-Rāzī'),

('QR:TQ:40:1-3:11', 'QR:SP:40:1-3', 40, 3, 3,
 'ٱلتَّوْب in قَابِلِ ٱلتَّوْبِ is a sister of ٱلْأَوْب and ٱلثَّوْب. All three mean…', 'choose',
 '["Returning","Covering","Weeping","Asking"]', '[0]',
 'ٱلتَّوْبُ وَٱلثَّوْبُ وَٱلْأَوْبُ أَخَوَاتٌ فِي مَعْنَى ٱلرُّجُوعِ: coming back to God’s command after drifting from it.',
 '[{"audio":"QRTA:zamakhshari:40-01","page":"QRTP:zamakhshari:2315","from":7,"to":8}]', 11, 'live', 'al-Zamakhsharī; Ibn ʿĀshūr the same'),

('QR:TQ:40:1-3:12', 'QR:SP:40:1-3', 40, 3, 3,
 'غَافِر and قَابِل are participles. Do they say He will forgive at some time, or that He is always so?', 'choose',
 '["That forgiving and accepting are lasting traits of His, not acts tied to a time","That He forgave once, in the past","That He will forgive only on the Day of Judgement","That He forgives only those who ask twice"]', '[0]',
 'They do not mean He forgives now or tomorrow; what is meant is that this is fixed and lasting in Him (ثُبُوتُ ذَلِكَ وَدَوَامُهُ) — like إِلَٰهُ ٱلْخَلْقِ and رَبُّ ٱلْعَرْشِ.',
 '[{"audio":"QRTA:zamakhshari:40-01","page":"QRTP:zamakhshari:2315","from":12,"to":14}]', 12, 'live', 'al-Zamakhsharī; al-Rāzī and al-Ālūsī the same'),

('QR:TQ:40:1-3:13', 'QR:SP:40:1-3', 40, 3, 3,
 'Why is وَ put between غَافِرِ ٱلذَّنۢبِ and قَابِلِ ٱلتَّوْبِ, but not before شَدِيدِ ٱلْعِقَابِ?', 'choose_all',
 '["It joins two mercies for the one who repents: his repentance is accepted as a good deed, and his sin is wiped away as if never done","It shows the two are not one and the same thing","It makes severity the most important of the names","It splits the verse into two separate sentences"]', '[0,1]',
 'The وَ gathers two mercies for the repentant sinner: acceptance of his repentance, written as obedience, and its wiping out of his sins كَأَنْ لَمْ يُذْنِبْ. And since a thing is not joined to itself, the وَ shows the two differ; severity plainly differs from both, so it needs none.',
 '[{"audio":"QRTA:zamakhshari:40-01","page":"QRTP:zamakhshari:2315","from":45,"to":49}]', 13, 'live', 'al-Zamakhsharī, al-Ālūsī, Ibn ʿĀshūr; al-Rāzī for the second'),

('QR:TQ:40:1-3:14', 'QR:SP:40:1-3', 40, 3, 3,
 'Accepting repentance comes before forgiving it. Why then is غَافِرِ named before قَابِلِ?', 'choose_all',
 '["To bring the news of forgiveness first to whoever is ready to turn back","The slate is wiped clean before good is added to it","Because forgiveness happens only after death","Because the names are listed in alphabetical order"]', '[0,1]',
 'غَافِر comes first to hurry the news to one ready to mend his ways; and clearing away comes before adorning (تَقْدِيمُ ٱلتَّخْلِيَةِ عَلَى ٱلتَّحْلِيَةِ).',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":23,"to":24}]', 14, 'live', 'Ibn ʿĀshūr; al-Ālūsī for the second'),

('QR:TQ:40:1-3:15', 'QR:SP:40:1-3', 40, 3, 3,
 'Said to those who had denied the Qurʾān, what does غَافِرِ ٱلذَّنۢبِ وَقَابِلِ ٱلتَّوْبِ tell them?', 'choose',
 '["Their denial can still be mended: He forgave earlier nations who turned back, and will forgive them","Their sin of denial can never be forgiven","Forgiveness is for believers only","Repentance is accepted only once"]', '[0]',
 'As if to say: if you have sinned by denying the Qurʾān, mending it is within your reach; as He forgave nations who repented and accepted their faith, He forgives whoever of you repents.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":20,"to":22}]', 15, 'live', 'Ibn ʿĀshūr'),

('QR:TQ:40:1-3:16', 'QR:SP:40:1-3', 40, 3, 3,
 'شَدِيدِ ٱلْعِقَابِ is named once, with غَافِرِ ٱلذَّنۢبِ وَقَابِلِ ٱلتَّوْبِ before it and ذِى ٱلطَّوْلِ after. What does that tell the listener?', 'choose',
 '["His mercy is greater, and comes first","Mercy and punishment weigh exactly the same","Punishment is the verse’s main message","Mercy is only for the prophets"]', '[0]',
 'Before it come two names that each remove punishment, and after it one that shows great mercy: جَانِبُ ٱلرَّحْمَةِ وَٱلْكَرَمِ أَرْجَحُ.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":99,"to":103}]', 16, 'live', 'al-Rāzī; al-Ālūsī the same'),

('QR:TQ:40:1-3:17', 'QR:SP:40:1-3', 40, 3, 3,
 'شَدِيدِ ٱلْعِقَابِ stands without ٱلْ among names that are definite. What can that leaving-indefinite add?', 'choose',
 '["A punishment beyond anything — nothing harder or more bitter — a sharper warning","That the punishment is light","That the punishment is in this world only","That it is not one of His names"]', '[0]',
 'تَعَمَّدَ تَنْكِيرَهُ وَإِبْهَامَهُ: left indefinite and vague on purpose, to point to the utmost severity, to what nothing is more grievous or bitter than, adding to the warning.',
 '[{"audio":"QRTA:zamakhshari:40-01","page":"QRTP:zamakhshari:2315","from":41,"to":42}]', 17, 'live', 'al-Zamakhsharī; al-Ālūsī the same'),

('QR:TQ:40:1-3:18', 'QR:SP:40:1-3', 40, 3, 3,
 'Which meanings can ٱلطَّوْل, in ذِى ٱلطَّوْلِ, carry?', 'choose_all',
 '["Bounty given freely","Ample wealth and richness","Power","Great height"]', '[0,1,2]',
 'ٱلطَّوْلُ يُطْلَقُ عَلَى سَعَةِ ٱلْفَضْلِ وَسَعَةِ ٱلْمَالِ، وَيُطْلَقُ عَلَى ٱلْقُدْرَةِ: ample bounty, ample wealth, and power. Not length or height here: طَالَ عَلَيْهِ, he did him a favour.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":40,"to":41}]', 18, 'live', 'Ibn ʿĀshūr; al-Ālūsī and al-Zamakhsharī'),

('QR:TQ:40:1-3:19', 'QR:SP:40:1-3', 40, 3, 3,
 'ذِى ٱلطَّوْلِ comes right after شَدِيدِ ٱلْعِقَابِ. What can it point to there?', 'choose_all',
 '["His favour in holding back a punishment He could justly bring","His power to punish in this world too","That punishment lasts only a short time","That the severe punishment is cancelled for everyone"]', '[0,1]',
 'Read as favour, it is His bounty in leaving a punishment He might rightly carry out; read as power, it pairs with severity: شَدِيدِ ٱلْعِقَابِ warns of the next world, ذِى ٱلطَّوْلِ of punishment in this one.',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":122,"to":126}]', 19, 'live', 'al-Rāzī for the first; Ibn ʿĀshūr for the second'),

('QR:TQ:40:1-3:20', 'QR:SP:40:1-3', 40, 3, 3,
 'لَآ إِلَٰهَ إِلَّا هُوَ follows the names of mercy and severity. What does it add?', 'choose',
 '["Since He alone is God, the hope and fear just named all point to Him alone — so turn wholly to Him","It begins a new sūra","It names the angels as witnesses","It says other gods share His mercy"]', '[0]',
 'Were there another god sharing His mercy and favour, the need to serve Him would not be pressing; because He is One with no partner, hope and fear reach their full force (فَكَانَ ٱلتَّرْغِيبُ وَٱلتَّرْهِيبُ ٱلْكَامِلَانِ يَحْصُلَانِ بِسَبَبِ هَذَا ٱلتَّوْحِيدِ).',
 '[{"audio":"QRTA:razi:40-01","page":"QRTP:razi:2257","from":127,"to":130}]', 20, 'live', 'al-Rāzī; al-Ālūsī the same'),

('QR:TQ:40:1-3:21', 'QR:SP:40:1-3', 40, 3, 3,
 'إِلَيْهِ ٱلْمَصِيرُ: what does the return to Him bring the listener to think of?', 'choose',
 '["Being raised and repaid: the end is His reward or His punishment, so weigh yourself now","Travelling back to Makka","The return of the Prophet","The end of the sūra"]', '[0]',
 'After hope and fear are stirred, they are told ٱلْمَصِيرَ إِمَّا إِلَى ثَوَابِهِ وَإِمَّا إِلَى عِقَابِهِ: so let them weigh themselves and set themselves where they belong.',
 '[{"audio":"QRTA:ibn_ashur:y-m2kq2xlU4DM-02","page":"QRTP:ibn_ashur:2978","from":45,"to":48}]', 21, 'live', 'Ibn ʿĀshūr; al-Rāzī and al-Ālūsī'),

('QR:TQ:40:1-3:22', 'QR:SP:40:1-3', 40, 1, 3,
 'After the end of سورة الزمر — where the denier and the believer are headed — why does this sūra open with غَافِرِ ٱلذَّنۢبِ وَقَابِلِ ٱلتَّوْبِ?', 'choose',
 '["To invite the denier to believe and leave what he is in","To close the door of repentance","To speak to believers only","To mark the sūra as revealed in Madina"]', '[0]',
 'Having told what becomes of the denier and the believer, the next sūra names Him the Forgiver of sin and Accepter of repentance: ٱسْتِدْعَاءً لِلْكَافِرِ إِلَى ٱلْإِيمَانِ وَٱلْإِقْلَاعِ عَمَّا هُوَ فِيهِ.',
 '[{"audio":"QRTA:alusi:40-01","page":"QRTP:alusi:4005","from":20,"to":22}]', 22, 'live', 'al-Ālūsī'),

('QR:TQ:40:1-3:23', 'QR:SP:40:1-3', 40, 1, 3,
 'A man fallen into drink was sent حمٓ … إِلَيْهِ ٱلْمَصِيرُ in a letter. What did he take from these āyāt?', 'choose',
 '["God has promised to forgive me, and has warned me of His punishment — and he turned back","That his sin could never be forgiven","That punishment was certain whatever he did","That he need not change"]', '[0]',
 'He kept reading it, saying قَدْ وَعَدَنِي ٱللَّهُ أَنْ يَغْفِرَ لِي، وَحَذَّرَنِي عِقَابَهُ — until he wept, gave it up, and repented well. Do the same for a brother who slips: steady him, and pray he turns back.',
 '[{"audio":"QRTA:zamakhshari:40-01","page":"QRTP:zamakhshari:2315","from":58,"to":59}]', 23, 'live', 'al-Zamakhsharī; al-Ālūsī the same');

-- ── the path: the listen gate, then the tafsīr drills ────────────────────────

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'tafsir_meaning', 'Tafsīr · meaning', 'مَعْنَى الآيَة', 'What the āyāt mean, as the recordings explained them', 'books.vertical', '#4FB3A9', NULL,
 '{"source":"tafsirq"}', 14),
('skill', 'tafsir_listen', 'Tafsīr · listen & mark', 'اِسْمَعِ التَّفْسِيرَ وَعَلِّمْ', 'Hear a line of the tafsīr, then tap every word you did not catch', 'hand.tap', '#4FB3A9', NULL,
 '{"source":"tafsirq","interaction":"listen_mark"}', 15);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'tq_choose', 'What does the āyah mean?', 'ما معنى الآية؟', NULL, NULL, NULL, NULL, NULL, 230),
('kind', 'tq_choose_all', 'Choose every meaning that holds', 'اختر كلّ معنى يصحّ', NULL, NULL, NULL, NULL, NULL, 231),
('kind', 'tq_listen', 'Hear the line, then tap every word you did not catch', 'اسمع السطر ثم المس كل كلمة فاتتك', NULL, NULL, NULL, NULL, NULL, 232);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_node', 'listen', 'Hear the tafsīr', 'اسْتَمِعْ إِلَى التَّفْسِير', 'All four works on the passage, read aloud: tap any word you miss', 'headphones', '#4FB3A9', NULL,
 '{"kind":"listen","step":7,"works":["razi","alusi","ibn_ashur","zamakhshari"],"heard":90}', 65);

UPDATE qr_study_label
   SET extra_json = '{"kind":"step","step":7,"skills":["tafsir_listen","tafsir_meaning"],"max":40,"sprint":12}',
       detail = 'What the āyāt mean, as the recordings explained them'
 WHERE scope = 'class_node' AND key = 'tafsir';

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_ui', 'listen_heard', '{pct}% heard', 'سُمِع {pct}٪', NULL, 'ear', NULL, NULL, NULL, 40),
('class_ui', 'listen_need', 'Hear {pct}% of each work to go on', 'اسمع {pct}٪ من كل كتاب لتتابع', NULL, 'headphones', NULL, NULL, NULL, 41),
('class_ui', 'listen_done', 'Heard', 'سُمِع', NULL, 'checkmark.circle.fill', NULL, NULL, NULL, 42),
('class_ui', 'listen_tap', 'Tap a word you did not catch', 'المس كلمة فاتتك', NULL, 'hand.tap', NULL, NULL, NULL, 43),
('class_ui', 'listen_marked', '{n} words kept to perfect', '{n} كلمات محفوظة للإتقان', NULL, 'bookmark.fill', NULL, NULL, NULL, 44),
('class_ui', 'listen_minutes', '{n} min', '{n} د', NULL, 'clock', NULL, NULL, NULL, 45),
('class_ui', 'listen_play', 'Play', 'تشغيل', NULL, 'play.fill', NULL, NULL, NULL, 46),
('class_ui', 'listen_pause', 'Pause', 'إيقاف', NULL, 'pause.fill', NULL, NULL, NULL, 47),
('class_ui', 'listen_speed', 'Speed', 'السرعة', NULL, 'gauge.with.dots.needle.33percent', NULL, NULL, NULL, 48),
('class_ui', 'listen_saving', 'Could not save — kept on this device, sent next time', 'تعذّر الحفظ — محفوظ على الجهاز ويُرسل لاحقًا', NULL, 'icloud.slash', NULL, NULL, NULL, 49);
