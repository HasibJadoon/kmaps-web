-- qr_082: each focus word carries its arc — the road from the root's picture to what the word
-- means in this āyah — shown bold on the word's tile, with the plain meaning under it.
--
--   arc_en        the arc, picture → … → the sense here (Maqāyīs for the picture, the lexicons and
--                 the mufassirūn for each step after it)
--   here_en       what it means in this āyah, in plain English, as the mufassirūn read it
--   here_src_json [{src, ref, ar}] — the source lines the arc and the meaning stand on, verbatim
--
-- Sources: maqayis = Ibn Fāris, Maqāyīs al-Lugha; mufradat = al-Rāghib, al-Mufradāt;
-- tabari = Jāmiʿ al-Bayān (ed. al-Turkī) at 40:2–3; ibn_ashur = al-Taḥrīr wa-l-Tanwīr at 40:2–3
-- (and at 39:1, to which he refers 40:2).

ALTER TABLE qr_sarf_word ADD COLUMN arc_en TEXT;
ALTER TABLE qr_sarf_word ADD COLUMN here_src_json TEXT;

-- 40:2 تَنْزِيلُ — Ibn ʿĀshūr: the act of sending down, not "the thing sent"; the doubled form
-- tells it came down in instalments (Rāghib's التنزيل vs الإنزال says the same).
UPDATE qr_sarf_word SET
  arc_en  = 'coming down → sent down in stages',
  here_en = 'the sending down of the Book from God — part by part, not all at once',
  here_src_json = '[{"src":"maqayis","ref":"نزل","ar":"تدلُّ على هُبوط شيء ووُقوعه"},{"src":"mufradat","ref":"نزل","ar":"التَّنْزِيل يختصّ بالموضع الذي يُشِيرُ إليه إنزالُهُ مفرَّقاً، ومرَّةً بعد أُخْرَى"},{"src":"ibn_ashur","ref":"39:1","ar":"تَنْزِيلُ مَصْدَرٌ مُرَادٌ بِهِ مَعْنَاهُ الْمَصْدَرِيُّ لَا مَعْنَى الْمَفْعُولِ"},{"src":"ibn_ashur","ref":"39:1","ar":"وَهُوَ مُشْعِرٌ بِأَنَّهُ أَنْزَلَهُ مُنَجَّمًا"}]'
WHERE surah = 40 AND ayah = 2 AND word_index = 1;

-- 40:2 الْكِتَابِ
UPDATE qr_sarf_word SET
  arc_en  = 'joining together → writing → the Book',
  here_en = 'the Book — the Qurʾān, the one they all knew',
  here_src_json = '[{"src":"maqayis","ref":"كتب","ar":"يدلُّ على جمع شيء إلى شيءٍ. من ذلك الكِتابُ والكتابة"},{"src":"ibn_ashur","ref":"39:1","ar":"وَالتَّعْرِيفُ فِي الْكِتابِ لِلْعَهْدِ، وَهُوَ الْقُرْآنُ الْمَعْهُودُ بَيْنَهُمْ"}]'
WHERE surah = 40 AND ayah = 2 AND word_index = 2;

-- 40:2 الْعَزِيزِ
UPDATE qr_sarf_word SET
  arc_en  = 'strength → overpowering → the Almighty',
  here_en = 'the Almighty — He overpowers; those who deny the Book are the overpowered',
  here_src_json = '[{"src":"maqayis","ref":"عز","ar":"يدلُّ على شدّةٍ وقوَّةٍ وما ضاهاهما، من غلبةٍ وقهر"},{"src":"tabari","ref":"40:2","ar":"العزيز في انتقامه من أعدائه"},{"src":"ibn_ashur","ref":"40:3","ar":"تَعْرِيضٌ بِأَنَّ مُنْكِرِي تَنْزِيلِ الْكِتَابِ مِنْهُ مَغْلُوبُونَ مَقْهُورُونَ"}]'
WHERE surah = 40 AND ayah = 2 AND word_index = 5;

-- 40:2 الْعَلِيمِ
UPDATE qr_sarf_word SET
  arc_en  = 'a mark → knowing → the All-Knowing',
  here_en = 'the All-Knowing — knows what you do and what you hide',
  here_src_json = '[{"src":"maqayis","ref":"علم","ar":"يدلُّ على أثَرٍ بالشئ يتميَّزُ به عن غيره"},{"src":"tabari","ref":"40:2","ar":"العليم بما تعملون من الأعمال"},{"src":"ibn_ashur","ref":"40:3","ar":"وَبِأَنَّ اللَّهَ يَعْلَمُ مَا تُكِنُّهُ نُفُوسُهُمْ"}]'
WHERE surah = 40 AND ayah = 2 AND word_index = 6;

-- 40:3 غَافِرِ — both Ṭabarī and Ibn ʿĀshūr: a standing description, not a promise for later.
UPDATE qr_sarf_word SET
  arc_en  = 'covering → shielding → forgiving',
  here_en = 'Forgiver of sin — He covers it and shields from its harm, as He always has',
  here_src_json = '[{"src":"maqayis","ref":"غفر","ar":"عُظْمُ بابِه السَّتْر"},{"src":"mufradat","ref":"غفر","ar":"الغَفْرُ: إلباس ما يصونه عن الدّنس… والغُفْرَانُ والْمَغْفِرَةُ من الله هو أن يصون العبد من أن يمسّه العذاب"},{"src":"tabari","ref":"40:3","ar":"إذ كان لم يزل لذنوب العباد غفورا"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 1;

-- 40:3 الذَّنْبِ — Maqāyīs keeps crime and tail as separate origins; al-Rāghib joins them.
UPDATE qr_sarf_word SET
  arc_en  = 'a tail → what trails after → sin',
  here_en = 'sin — a deed whose bad end trails after it',
  here_src_json = '[{"src":"maqayis","ref":"ذنب","ar":"أصول ثلاثة: أحدها الجُرم، والآخر مؤخَّر الشئ"},{"src":"mufradat","ref":"ذنب","ar":"ويستعمل في كلّ فعل يستوخم عقباه اعتبارا بذنب الشيء"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 2;

-- 40:3 وَقَابِلِ — Ibn ʿĀshūr: the وَ joins two mercies for the one who repents.
UPDATE qr_sarf_word SET
  arc_en  = 'facing → receiving → accepting',
  here_en = 'and Accepter of repentance — He takes it as obedience, and wipes the sin too',
  here_src_json = '[{"src":"maqayis","ref":"قبل","ar":"تدلُّ كلمهُ كلُّها على مواجهةِ الشَّيء للشَّيء"},{"src":"ibn_ashur","ref":"40:3","ar":"أَنْ يَجْمَعَ لِلْمُذْنِبِ التَّائِبِ بَيْنَ رَحْمَتَيْنِ بَيْنَ أَنْ يَقْبَلَ تَوْبَتَهُ فَيَجْعَلَهَا لَهُ طَاعَةً، وَبَيْنَ أَنْ يَمْحُوَ عَنْهُ بِهَا الذُّنُوبَ"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 3;

-- 40:3 التَّوْبِ
UPDATE qr_sarf_word SET
  arc_en  = 'returning → turning back to God',
  here_en = 'repentance — coming back to God''s command after drifting from it',
  here_src_json = '[{"src":"maqayis","ref":"توب","ar":"كلمةٌ واحدةٌ تدلُّ على الرُّجوع… والتَّوْبُ التَّوبة. قال اللّه تعالى: ﴿وَقابِلِ اَلتَّوْبِ﴾"},{"src":"ibn_ashur","ref":"40:3","ar":"الرُّجُوعِ إِلَى أَمْرِ اللَّهِ وَامْتِثَالِهِ بَعْدَ الِابْتِعَادِ عَنْهُ"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 4;

-- 40:3 شَدِيدِ
UPDATE qr_sarf_word SET
  arc_en  = 'tying tight → strength → severe',
  here_en = 'severe in punishment — hope in His mercy, but never feel safe from Him',
  here_src_json = '[{"src":"maqayis","ref":"شد","ar":"يدلُّ على قوةٍ فى الشئِ… من ذلك شَدَدْتُ العقد شَدًّا"},{"src":"tabari","ref":"40:3","ar":"فلا تتكلوا على سعة رحمته… فإنه كما أنه لا يؤيس أهل الإجرام والآثام من عفوه… كذلك لا يؤمنهم من عقابه"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 5;

-- 40:3 الْعِقَابِ
UPDATE qr_sarf_word SET
  arc_en  = 'coming after → what follows a deed → punishment',
  here_en = 'punishment — what comes after the deed; here, a plain warning to those who deny the Book',
  here_src_json = '[{"src":"maqayis","ref":"عقب","ar":"يدلُّ على تأخير شئ وإتيانِه بعد غيره"},{"src":"mufradat","ref":"عقب","ar":"والعُقُوبَةُ والمعاقبة والعِقَاب يختصّ بالعذاب"},{"src":"ibn_ashur","ref":"40:3","ar":"إِفْضَاءٌ بِصَرِيحِ الْوَعِيدِ عَلَى التَّكْذِيبِ بِالْقُرْآنِ"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 6;

-- 40:3 الطَّوْلِ — Ṭabarī and Qatāda: bounty; Ibn ʿAbbās: wealth, plenty; Ibn Zayd: power.
UPDATE qr_sarf_word SET
  arc_en  = 'stretching far → more than enough → bounty',
  here_en = 'bounty — favour spread wide (some said: power); not طُول, length',
  here_src_json = '[{"src":"maqayis","ref":"طول","ar":"يدلُّ على فضْلٍ وامتداد فى الشئ"},{"src":"mufradat","ref":"طول","ar":"وَالطَّوْلُ خُصَّ به الفضلُ والمنُّ، قال: شَدِيدِ الْعِقابِ ذِي الطَّوْلِ"},{"src":"tabari","ref":"40:3","ar":"ذى الفضل والنعم المبسوطة على من شاء من خلقه"},{"src":"tabari","ref":"40:3","ar":"قال ابن زيد: الطول: القدرة"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 8;

-- 40:3 إِلَهَ
UPDATE qr_sarf_word SET
  arc_en  = 'devotion → the one worshipped → god',
  here_en = 'god — one who is worshipped; none is fit for worship but Him',
  here_src_json = '[{"src":"maqayis","ref":"أله","ar":"أصل واحد، وهو التعبُّد. فالإله اللّه تعالى، وسمِّى بذلك لأنّه معبود"},{"src":"tabari","ref":"40:3","ar":"لا معبود تصلح له العبادة إلا الله"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 10;

-- 40:3 الْمَصِيرُ
UPDATE qr_sarf_word SET
  arc_en  = 'becoming → where things end up',
  here_en = 'the return — all end up with Him, to reward or to punishment',
  here_src_json = '[{"src":"maqayis","ref":"صير","ar":"وهو المآلُ والمرجِع"},{"src":"tabari","ref":"40:3","ar":"إلى الله مصيركم ومرجعكم أيها الناس"},{"src":"ibn_ashur","ref":"40:3","ar":"بِأَنَّ الْمَصِيرَ إِمَّا إِلَى ثَوَابِهِ وَإِمَّا إِلَى عِقَابِهِ"}]'
WHERE surah = 40 AND ayah = 3 AND word_index = 14;
