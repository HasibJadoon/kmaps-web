-- 0199: lemma sense glosses (Meaning range in the Qurʾān) in plain, easy English — ≤ 10 words, no capitals, no
-- transliteration, grammar terms by their GT name (مَصْدَر, اسم الفاعل …); 21 long Arabic glosses cut to a whole clause of their
-- own source. Only the display gloss changes; sources and attestations stay. (One self-written Arabic gloss was left out.)
-- Plain-English sense glosses (AL km_arabic_linguistic.ar_ling_root_sense, scope_level='lemma').
-- Only gloss_en / gloss_ar change (the quran worker shows gloss_en ?? label_en, gloss_ar ?? label_ar).
-- Every UPDATE is guarded on the old value; a row edited since the dump is left alone (0 changes).
-- Sources/attestations are not touched. Grammar terms are written as their GT name_ar (ar_ling_gram_term).

-- [40:1-3] إِلَٰه · deity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a god: anything people worship' WHERE id = 'SNS:اله:deity' AND scope_level = 'lemma' AND gloss_en IS 'deity: whatever is taken as an object of worship';
-- [40:1-3] شَدِيد · shadid_firm (live)
UPDATE ar_ling_root_sense SET gloss_en = 'firm and hard against someone' WHERE id = 'SNS:شدد:shadid_firm' AND scope_level = 'lemma' AND gloss_en IS 'firm against (أَشِدَّاءُ عَلَى)';
-- [40:1-3] شَدِيد · shadid_intense (live)
UPDATE ar_ling_root_sense SET gloss_en = 'intense, said of love for wealth' WHERE id = 'SNS:شدد:shadid_intense' AND scope_level = 'lemma' AND gloss_en IS 'intense — of love for wealth';
-- [40:1-3] شَدِيد · shadid_severe (live)
UPDATE ar_ling_root_sense SET gloss_en = 'severe, said of punishment' WHERE id = 'SNS:شدد:shadid_severe' AND scope_level = 'lemma' AND gloss_en IS 'severe — of punishment';
-- [40:1-3] مَصِير · masir_evil (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a bad end: the Fire' WHERE id = 'SNS:صير:masir_evil' AND scope_level = 'lemma' AND gloss_en IS 'an evil end — the Fire';
-- [40:1-3] مَصِير · masir_return (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the final return to God' WHERE id = 'SNS:صير:masir_return' AND scope_level = 'lemma' AND gloss_en IS 'the final return — to God';
-- [40:1-3] طَوْل · tawl_bounty (live)
UPDATE ar_ling_root_sense SET gloss_en = 'God''s rich and wide favour' WHERE id = 'SNS:طول:tawl_bounty' AND scope_level = 'lemma' AND gloss_en IS 'bounty, wide favour — of God';
-- [40:1-3] طَوْل · tawl_means (live)
UPDATE ar_ling_root_sense SET gloss_en = 'wealth and means, said of people' WHERE id = 'SNS:طول:tawl_means' AND scope_level = 'lemma' AND gloss_en IS 'means, wealth — of people';
-- [40:1-3] عَزِيز · aziz_almighty (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the Almighty: God, who is never overcome' WHERE id = 'SNS:عزز:aziz_almighty' AND scope_level = 'lemma' AND gloss_en IS 'Almighty — of God: never overcome';
-- [40:1-3] عَزِيز · aziz_hard (live)
UPDATE ar_ling_root_sense SET gloss_en = 'hard to do, as in “not hard for God”' WHERE id = 'SNS:عزز:aziz_hard' AND scope_level = 'lemma' AND gloss_en IS 'hard to do (“not hard for God”)';
-- [40:1-3] عَزِيز · aziz_hard_on (live)
UPDATE ar_ling_root_sense SET gloss_en = 'hard on someone, painful to them' WHERE id = 'SNS:عزز:aziz_hard_on' AND scope_level = 'lemma' AND gloss_en IS 'hard on someone, painful to them (عَزِيزٌ عَلَى)';
-- [40:1-3] عَزِيز · aziz_title (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a title for the ruler of Egypt' WHERE id = 'SNS:عزز:aziz_title' AND scope_level = 'lemma' AND gloss_en IS 'a ruler''s title — the ʿAzīz of Egypt';
-- [40:1-3] عَزِيز · aziz_unassailable (live)
UPDATE ar_ling_root_sense SET gloss_en = 'safe from any attack, said of the Book' WHERE id = 'SNS:عزز:aziz_unassailable' AND scope_level = 'lemma' AND gloss_en IS 'beyond attack — of the Book';
-- [40:1-3] عِقَاب · iqab (live)
UPDATE ar_ling_root_sense SET gloss_en = 'punishment that follows wrongdoing' WHERE id = 'SNS:عقب:iqab' AND scope_level = 'lemma' AND gloss_en IS 'punishment — what comes after wrongdoing';
-- [40:1-3] عَلِيم · alim_god (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the All-Knowing: God, who knows everything' WHERE id = 'SNS:علم:alim_god' AND scope_level = 'lemma' AND gloss_en IS 'All-Knowing — of God';
-- [40:1-3] عَلِيم · alim_learned (live)
UPDATE ar_ling_root_sense SET gloss_en = 'full of knowledge, said of the promised boy' WHERE id = 'SNS:علم:alim_learned' AND scope_level = 'lemma' AND gloss_en IS 'a boy who will grow learned';
-- [40:1-3] عَلِيم · alim_skilled (live)
UPDATE ar_ling_root_sense SET gloss_en = 'knowing and skilled, said of people' WHERE id = 'SNS:علم:alim_skilled' AND scope_level = 'lemma' AND gloss_en IS 'knowledgeable, skilled — of people';
-- [40:1-3] غَافِر · ghafir (live)
UPDATE ar_ling_root_sense SET gloss_en = 'God, who forgives sin' WHERE id = 'SNS:غفر:ghafir' AND scope_level = 'lemma' AND gloss_en IS 'Forgiver of sin — of God';
-- [40:1-3] قَابِل · qabil (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the One who accepts repentance' WHERE id = 'SNS:قبل:qabil' AND scope_level = 'lemma' AND gloss_en IS 'Accepter — of repentance';
-- [40:1-3] كِتَٰب · celestial_record (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the record with God of all He knows and decrees' WHERE id = 'SNS:كتب:celestial_record' AND scope_level = 'lemma' AND gloss_en IS 'the CELESTIAL kitāb: a transcendent repository of God''s knowledge and decrees, distinct from the earthly scripture';
-- [40:1-3] كِتَٰب · contract (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a contract by which a slave buys his freedom' WHERE id = 'SNS:كتب:contract' AND scope_level = 'lemma' AND gloss_en IS 'manumission contract (mukātaba)';
-- [40:1-3] كِتَٰب · decree (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a duty God has laid down' WHERE id = 'SNS:كتب:decree' AND scope_level = 'lemma' AND gloss_en IS 'decree as OBLIGATION IMPOSED (farḍ)';
-- [40:1-3] كِتَٰب · destiny_qadar (live)
UPDATE ar_ling_root_sense SET gloss_en = 'fate: what has been written, so it is fixed' WHERE id = 'SNS:كتب:destiny_qadar' AND scope_level = 'lemma' AND gloss_en IS 'kitāb as DESTINY — what has been written and therefore fixed';
-- [40:1-3] كِتَٰب · letter_sent (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a letter someone writes and sends' WHERE id = 'SNS:كتب:letter_sent' AND scope_level = 'lemma' AND gloss_en IS 'kitāb as a LETTER — what a person writes and sends; feminine by intending ṣaḥīfa';
-- [40:1-3] كِتَٰب · scripture (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a holy book from God, like the Torah or Quran' WHERE id = 'SNS:كتب:scripture' AND scope_level = 'lemma' AND gloss_en IS 'a Book / scripture (Torah, Qurʾān)';
-- [40:1-3] تَنزِيل · tanzil_angels (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the angels sent down on the Day of Resurrection' WHERE id = 'SNS:نزل:tanzil_angels' AND scope_level = 'lemma' AND gloss_en IS 'the angels sent down, on the Day';
-- [40:1-3] تَنزِيل · tanzil_revelation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the revelation God sent down: the Quran' WHERE id = 'SNS:نزل:tanzil_revelation' AND scope_level = 'lemma' AND gloss_en IS 'the Revelation sent down from God — the Qurʾān';
-- [40:1-3] كِتَٰب · craft_kitaba (live)
UPDATE ar_ling_root_sense SET gloss_en = 'writing as a trade, like carpentry' WHERE id = 'SNS:كتب:craft_kitaba' AND scope_level = 'lemma' AND gloss_en IS 'kitāba as a TRADE — a craft one practises, like carpentry or perfumery';
-- [40:1-3] كِتَٰب · gathered_name (live)
UPDATE ar_ling_root_sense SET gloss_en = 'what is written, gathered into one whole' WHERE id = 'SNS:كتب:gathered_name' AND scope_level = 'lemma' AND gloss_en IS 'al-Azharī: kitāb is the NAME FOR WHAT IS WRITTEN GATHERED — the noun denotes the assembled whole, while kitāb as maṣdar denotes the act';
-- [40:1-3] كِتَٰب · inkwell (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the sheet and the inkwell together' WHERE id = 'SNS:كتب:inkwell' AND scope_level = 'lemma' AND gloss_en IS 'kitāb as the SHEET AND THE INKWELL together — al-Liḥyānī, on the variant reading of 2:283';
-- [40:1-3] كِتَٰب · joined_utterance (live)
UPDATE ar_ling_root_sense SET gloss_en = 'words joined in speech, so God''s speech is a book' WHERE id = 'SNS:كتب:joined_utterance' AND scope_level = 'lemma' AND gloss_en IS 'kitāb as JOINED UTTERANCE, not script: God''s speech is called kitāb EVEN THOUGH IT IS NOT WRITTEN, because it is speech joined together';
UPDATE ar_ling_root_sense SET gloss_ar = 'سُمِّي كلامُ اللهِ — وإن لم يُكتَبْ — كِتاباً' WHERE id = 'SNS:كتب:joined_utterance' AND scope_level = 'lemma' AND gloss_ar IS 'وقد يقال ذلك للمضمومِ بعضُها إلى بعضٍ باللَّفظِ؛ ولهذا سُمِّي كلامُ اللهِ — وإن لم يُكتَبْ — كِتاباً';
-- [40:1-3] كِتَٰب · quittance_sakk (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a receipt given once the land tax is fully paid' WHERE id = 'SNS:كتب:quittance_sakk' AND scope_level = 'lemma' AND gloss_en IS 'the ṣakk: when the tax-collector has taken the land-tax in full he WRITES them a quittance — a discharge receipt';
-- [40:1-3] كِتَٰب · ruling_hukm (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a ruling: what a judge decides' WHERE id = 'SNS:كتب:ruling_hukm' AND scope_level = 'lemma' AND gloss_en IS 'kitāb as JUDGEMENT / ruling — what a judge decides';
-- [40:1-3] كِتَٰب · sahifa_with_content (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a sheet together with what is written on it' WHERE id = 'SNS:كتب:sahifa_with_content' AND scope_level = 'lemma' AND gloss_en IS 'kitāb originally names the SHEET TOGETHER WITH what is written on it — not the sheet alone, not the text alone';
-- [40:1-3] كِتَٰب · sunna_as_kitab (live)
UPDATE ar_ling_root_sense SET gloss_en = 'God''s ruling, including what the Prophet explained' WHERE id = 'SNS:كتب:sunna_as_kitab' AND scope_level = 'lemma' AND gloss_en IS '''the Book of God'' can mean His RULING including what the Prophet clarified — not the Qurʾān verbatim';
-- [shown] آبَاء · forefathers (live)
UPDATE ar_ling_root_sense SET gloss_en = 'forefathers, ancestors' WHERE id = 'SNS:ابو:forefathers' AND scope_level = 'lemma' AND gloss_en IS 'forefathers, ancestors — the extended (tropical) use of ab / pl. abaa';
-- [shown] أَتَى · bring_produce (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to bring or produce something' WHERE id = 'SNS:اتي:bring_produce' AND scope_level = 'lemma' AND gloss_en IS 'to bring, fetch, produce a thing (ʾatā bi-)';
-- [shown] آتَى · giving (live)
UPDATE ar_ling_root_sense SET gloss_en = 'giving, granting' WHERE id = 'SNS:اتي:giving' AND scope_level = 'lemma' AND gloss_en IS 'giving, bestowing, granting (form IV ʾātā / ʾītāʾ)';
-- [shown] أَلِيم · causing_pain (live)
UPDATE ar_ling_root_sense SET gloss_en = 'painful; causing great pain' WHERE id = 'SNS:الم:causing_pain' AND scope_level = 'lemma' AND gloss_en IS 'painful, causing pain (faʿīl in the sense of mufʿil)';
-- [shown] اللَّه · allah_name (live)
UPDATE ar_ling_root_sense SET gloss_en = 'Allah: God''s own unique name' WHERE id = 'SNS:اله:allah_name' AND scope_level = 'lemma' AND gloss_en IS 'Allah: the unique divine name';
UPDATE ar_ling_root_sense SET gloss_ar = 'اللهُ: الاسمُ الأعظمُ المختصُّ بالباري؛ أصله الإله عند الأكثر' WHERE id = 'SNS:اله:allah_name' AND scope_level = 'lemma' AND gloss_ar IS 'اللهُ: الاسمُ الأعظمُ المختصُّ بالباري؛ أصله الإله عند الأكثر وقيل علمٌ غير مشتق';
-- [shown] حِكْمَة · wisdom (live)
UPDATE ar_ling_root_sense SET gloss_en = 'wisdom: reaching the truth by knowledge and reason' WHERE id = 'SNS:حكم:wisdom' AND scope_level = 'lemma' AND gloss_en IS 'wisdom (ḥikma): hitting the truth by knowledge and intellect';
-- [shown] حَكِيم · wise (live)
UPDATE ar_ling_root_sense SET gloss_en = 'wise; also firmly made, well put together' WHERE id = 'SNS:حكم:wise' AND scope_level = 'lemma' AND gloss_en IS 'wise; also firmly perfected (ḥakīm = muḥkam)';
-- [shown] أَحْيَا · give_life (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to give life; to bring back to life' WHERE id = 'SNS:حيي:give_life' AND scope_level = 'lemma' AND gloss_en IS 'to give life, revive, bring (back) to life';
-- [shown] دُخَان · famine_calamity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'famine and drought; a great evil rising like smoke' WHERE id = 'SNS:دخن:famine_calamity' AND scope_level = 'lemma' AND gloss_en IS '“smoke” as famine/drought, and as an overwhelming evil that rises like smoke';
-- [shown] دَخَنَتِ النَّارُ · rising_dust (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dust rising and spreading, called smoke' WHERE id = 'SNS:دخن:rising_dust' AND scope_level = 'lemma' AND gloss_en IS '(of dust / a dust-cloud) to rise and spread; dust called “smoke”';
-- [shown] رَبّ · divine_lord (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the Lord: God, Master of all creation' WHERE id = 'SNS:ربب:divine_lord' AND scope_level = 'lemma' AND gloss_en IS 'the Lord — God, who holds rubūbiyya over all creation';
-- [shown] رَسُول · messenger (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a messenger: one who is sent' WHERE id = 'SNS:رسل:messenger' AND scope_level = 'lemma' AND gloss_en IS 'a messenger / apostle; the one sent';
-- [shown] أَرْسَلَ · sending (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sending; letting something loose' WHERE id = 'SNS:رسل:sending' AND scope_level = 'lemma' AND gloss_en IS 'sending, dispatching; setting loose';
-- [shown] سَمَآء · sky (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the sky; anything high that covers from above' WHERE id = 'SNS:سمو:sky' AND scope_level = 'lemma' AND gloss_en IS 'the sky/heaven; every high canopy above';
-- [shown] عَذَاب · torment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'torment; painful punishment' WHERE id = 'SNS:عذب:torment' AND scope_level = 'lemma' AND gloss_en IS 'torment, chastisement, painful punishment';
-- [shown] عِند · divine_presence (live)
UPDATE ar_ling_root_sense SET gloss_en = 'nearness to God; “from Us” means from God Himself' WHERE id = 'SNS:عند:divine_presence' AND scope_level = 'lemma' AND gloss_en IS 'the divine presence: rank/nearness with God; "from Us" = from His own bestowal';
-- [shown] كُلّ · totality (live)
UPDATE ar_ling_root_sense SET gloss_en = 'all; each and every one' WHERE id = 'SNS:كلل:totality' AND scope_level = 'lemma' AND gloss_en IS 'totality; each and every (kull, exhaustive inclusion)';
-- [shown] لَيْلَة · sacred (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the blessed Night of Power, when the Book came down' WHERE id = 'SNS:ليل:sacred' AND scope_level = 'lemma' AND gloss_en IS 'the blessed night: Laylat al-Qadr, in which the Book was sent down';
-- [shown] نَذِير · warner (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a warner: one who warns, human or otherwise' WHERE id = 'SNS:نذر:warner' AND scope_level = 'lemma' AND gloss_en IS 'al-nadhir (the warner): the one who warns, human or otherwise';
-- [shown] يَوْم · day_of_judgment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the Day of Resurrection and Judgement' WHERE id = 'SNS:يوم:day_of_judgment' AND scope_level = 'lemma' AND gloss_en IS 'the Day — i.e. the Day of Resurrection / Judgement';
-- [shown] يَوْم · momentous_event (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a hard, fateful day of disaster or battle' WHERE id = 'SNS:يوم:momentous_event' AND scope_level = 'lemma' AND gloss_en IS 'a momentous day; a hard/decisive event, a “day” of calamity or battle';
-- [scan] كَاشِف · arc__kashif_idafa (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'ones who lift something, with it as مضاف إليه' WHERE id = 'ARC:كشف:kashif:idafa' AND scope_level = 'lemma' AND gloss_en IS 'ARC — THE AGENT WITH WHAT IT LIFTS ANNEXED. Both kashifu (m.pl, 44:15) and kashifat (f.pl, 39:38) belong here: the sense is one, ones who lift X, and the gender difference is inflection. Al-Zamakhshari at 39:38: tanwin is al-asl and the idafa is lil-takhfif, so kashifu al-adhabi stands for a fuller kashifuna al-adhaba; and he explains the feminine there as pointing at al-Lat, al-Uzza and Manat, which is a fact about that verse, not about this construction.';
UPDATE ar_ling_root_sense SET gloss_ar = 'اسمُ الفاعلِ مضافًا إلى مفعولِه: كاشِفُو وكاشِفات' WHERE id = 'ARC:كشف:kashif:idafa' AND scope_level = 'lemma' AND gloss_ar IS 'اسمُ الفاعلِ مضافًا إلى مفعولِه — كاشِفُو وكاشِفات، والفرقُ بينهما تصريفيٌّ لا دلاليّ';
-- [scan] كَاشِف · arc__kashif_lam (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'none can lift it for him but God' WHERE id = 'ARC:كشف:kashif:lam' AND scope_level = 'lemma' AND gloss_en IS 'ARC 5 — THE PARTICIPLE WITH LAM, and both attestations are the same sentence: fa-la kashifa lahu illa huwa, 6:17 and 10:107. The lam names the one FOR whom the lifting would be. Al-Alusi glosses the participle here as muzil and MUFARRIJ. Al-Razi grounds the exclusivity on wajib li-dhatihi against mumkin; Ibn Ashur on the decreed order of nawamis only its Maker can alter. THE PARTICIPLE NEVER TAKES AN — it does not inherit the verb dominant harf.';
-- [scan] كَٰشِفَٰت · arc__kashifat_idafa (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'female idols: can they lift harm?' WHERE id = 'ARC:كشف:kashifat:idafa' AND scope_level = 'lemma' AND gloss_en IS 'ARC 7 — THE SOUND FEMININE PLURAL, annexed. One attestation, 39:38, and the question is whether the idols CAN lift. Al-Zamakhshari: he feminised them because they WERE female — al-Lat, al-Uzza, Manat. Paired in the same ayah against mumsikat rahmatih, the Quran own antonym for this participle.';
-- [scan] كَشْف · arc__kashf_idafa_an (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'the مَصْدَر: lifting the harm from you' WHERE id = 'ARC:كشف:masdar:idafa_an' AND scope_level = 'lemma' AND gloss_en IS 'ARC 8 — THE MASDAR, one attestation, carrying BOTH routes at once: annexed to what is lifted AND taking an for the one relieved. kashfa al-durri ankum. The verbal noun compresses arc 2 into a single phrase.';
-- [scan] كَشَفَ · arc__kashafa_an__no_acc (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'to bare the shin; hence, a moment of crisis' WHERE id = 'ARC:كشف:verb:an_alone' AND scope_level = 'lemma' AND gloss_en IS 'ARC 4 — AN WITH NO ACCUSATIVE, and both attestations are a LEG. The baring sense, closest to the asl of a garment drawn off the body. At 68:42 it becomes a proverb for extremity: al-Zamakhshari traces the idiom to rout and panic, when secluded women hitch their garments off their shins to flee and their anklets show. This arc alone reaches a rhetorical terminus.';
UPDATE ar_ling_root_sense SET gloss_ar = 'كَشَفَ عن — بلا مفعولٍ، ولم يقعْ في التنزيلِ إلا في السّاق' WHERE id = 'ARC:كشف:verb:an_alone' AND scope_level = 'lemma' AND gloss_ar IS 'كَشَفَ عن — بلا مفعولٍ أصلاً، ولم يقعْ في التنزيلِ إلا في السّاق';
-- [scan] كَشَفَ · arc__kashafa_an__ghita (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'to open someone''s eyes' WHERE id = 'ARC:كشف:verb:an_ghita' AND scope_level = 'lemma' AND gloss_en IS 'ARC 2b — A SEPARATE IDIOM, on Mir reckoning. I had filed 50:22 as a branch inside arc 2, the literal-covering branch. MIR GIVES IT ITS OWN ENTRY ON A DIFFERENT PAGE (304): To open somebody eyes, literally to remove the veil or bandage from somebody eyes. So where the object is a GHITA over sight rather than an affliction, the construction is idiomatic and not compositional — the sense is not lifting a cloth but granting perception. That is why the ayah continues fa-basaruka al-yawma hadid.';
-- [scan] كَشَفَ · arc__kashafa_an__acc (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'to lift something off someone' WHERE id = 'ARC:كشف:verb:an_obj' AND scope_level = 'lemma' AND gloss_en IS 'ARC 2 — TWO PARTIES: an carries the one relieved, the accusative what is lifted. Lane A4: kashafa shayan an shayin, he stripped a thing from over a thing which it covered. 9 attestations. TWO OBJECT BRANCHES inside the one arc: where the object is an affliction, lifting it IS the relief; where the object is a covering over sight (50:22 alone), lifting it ENABLES — Mir files that one as a separate idiom, to open somebody eyes. Word order varies once, 16:54 fronting the object, which is rhetoric not government.';
-- [scan] كَشَفَ · arc__kashafa__acc (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'to lift the harm itself, as مفعول به' WHERE id = 'ARC:كشف:verb:direct' AND scope_level = 'lemma' AND gloss_en IS 'ARC 1 — THE OBJECT IS THE AFFLICTION. Drawing a thing off a thing, then lifting the cover, then: what is covered IS the harm, so lifting it is removing it. No party is named as relieved. Al-Raghib kashafa ghammahu; Lane A5 dispelling grief, equated with faraja per al-Misbah and al-Qamus. | ARC BOUNDARY CORRECTED 2026-08-13. The distinction against arc 2 is NOT whether a person is named — 21:84 ma bihi min durrin and 23:75 ma bihim min durrin both name one, inside the object phrase. It is WHERE the person stands relative to the verb: in arc 1 he sits inside the object and the verb never reaches him; in arc 2 AN brings him under the verb own government. The verb here takes the trouble and nothing else.';
-- [scan] كَشَفَ · arc__kashafa__acc_an (migrated_to_lemma_arc)
UPDATE ar_ling_root_sense SET gloss_en = 'to lift something off someone, مفعول به placed first' WHERE id = 'ARC:كشف:verb:obj_an' AND scope_level = 'lemma' AND gloss_en IS 'ARC 3 — THE SAME TWO PARTIES, REVERSED. Once only, 16:54. Same semantics as arc 2; the difference is order, which is a rhetorical choice not a lexical one. Kept separate only to record that the corpus does it once.';
-- [scan] كَاشِف · alusi_gloss_chain (live)
UPDATE ar_ling_root_sense SET gloss_en = 'one who removes and relieves; none can but God' WHERE id = 'RS:كشف:alusi:muzil_mufarrij' AND scope_level = 'lemma' AND gloss_en IS 'AL-ALUSI GLOSSES THE PARTICIPLE BY TWO OTHERS: muzil, one who removes, and MUFARRIJ, one who opens out a narrowness. This is direct textual warrant for the faraja member of FRQ:kashf_izhar — Lane cross-referred kashf to faraja through al-Misbah and al-Qamus, and here a mufassir substitutes the two in the same breath. He then narrows the sense to QUDRA: la qadira ala kashfihi siwahu, none ABLE to lift it — the negation is of capacity, not of occurrence.';
UPDATE ar_ling_root_sense SET gloss_ar = '﴿فلا كاشِفَ﴾ أي لا مُزِيلَ ولا مُفرِّجَ له عنك' WHERE id = 'RS:كشف:alusi:muzil_mufarrij' AND scope_level = 'lemma' AND gloss_ar IS 'الآلوسي عند ٦:١٧: ﴿فلا كاشِفَ﴾ أي لا مُزِيلَ ولا مُفرِّجَ له عنك، والمرادُ لا قادرَ على كشفِه سواه سبحانه من الأصنامِ وغيرِها';
-- [scan] كَاشِف · ashur_object_scope (live)
UPDATE ar_ling_root_sense SET gloss_en = 'harm: a painful state, set against all good' WHERE id = 'RS:كشف:ashur:darr_vs_sharr' AND scope_level = 'lemma' AND gloss_en IS 'IBN ASHUR SHARPENS WHAT KASHF LIFTS, and differs from al-Razi in method. Al-Razi partitions darr, naf and khayr as a closed logical division. Ibn Ashur instead notes an ASYMMETRY IN THE PAIRING: darr is answered not by naf, its true opposite, but by khayr, the wider term — because khayr covers both gaining the agreeable AND being spared the disagreeable. He calls the figure IHTIBAK: read it as if it said in yamsaska bi-durrin wa-sharrin wa-in yamsaska bi-nafin wa-khayrin.';
UPDATE ar_ling_root_sense SET gloss_ar = 'الضُّرُّ هو الحالُ الذي يُؤلمُ الإنسانَ، وهو من الشَّرِّ' WHERE id = 'RS:كشف:ashur:darr_vs_sharr' AND scope_level = 'lemma' AND gloss_ar IS 'ابن عاشور عند ٦:١٧: الضُّرُّ بضمِّ الضادِ هو الحالُ الذي يُؤلمُ الإنسانَ، وهو من الشَّرِّ، وهو المنافِرُ للإنسان؛ ويقابله النَّفْعُ وهو من الخَيْرِ وهو الملائم. وقابَل ﴿بضُرٍّ﴾ بـ﴿بخَيْرٍ﴾ مقابلةً بالأعمِّ، لأنّ الخيرَ يشمل النفعَ ويشمل السلامةَ من المنافِر — ففي الآيةِ احتباكٌ';
-- [scan] كَاشِف · ashur_kashf_and_nawamis (live)
UPDATE ar_ling_root_sense SET gloss_en = 'only God can lift what He has decreed' WHERE id = 'RS:كشف:ashur:kashf_qudra' AND scope_level = 'lemma' AND gloss_en IS 'WHY NO OTHER CAN LIFT IT — a different ground from al-Razi. Al-Razi argues from wajib li-dhatihi versus mumkin li-dhatihi, a metaphysical exclusivity. Ibn Ashur argues from CAUSAL ORDER: what God decrees is bound and hedged about by nawamis and nuzum, laws and systems, and only the power of their Maker reaches to altering them. Note also his conditional in sha dhalika — the lifting is possible for God but not thereby promised, which is exactly the force at 44:15 where the lifting is granted only qalilan.';
UPDATE ar_ling_root_sense SET gloss_ar = 'إنْ يُقدِّرِ اللهُ لك الضُّرَّ فلا يستطيعُ أحدٌ كشفَه عنك إلا هو' WHERE id = 'RS:كشف:ashur:kashf_qudra' AND scope_level = 'lemma' AND gloss_ar IS 'ابن عاشور: المعنى إنْ يُقدِّرِ اللهُ لك الضُّرَّ فلا يستطيعُ أحدٌ كشفَه عنك إلا هو إنْ شاءَ ذلك، لأنّ مُقدَّراتِه مربوطةٌ ومَحُوطةٌ بنواميسَ ونُظُمٍ لا تصلُ إلى تحويلِها إلا قدرةُ خالقِها';
-- [scan] كَشَفَ · verb_form_i (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to uncover, lift off, make plain' WHERE id = 'RS:كشف:kashafa_lemma' AND scope_level = 'lemma' AND gloss_en IS 'the form I verb: to uncover, to lift off, to make manifest';
UPDATE ar_ling_root_sense SET gloss_ar = 'كَشَفَ الشيءَ: رفعَ عنه ما يُواريه ويُغطّيه' WHERE id = 'RS:كشف:kashafa_lemma' AND scope_level = 'lemma' AND gloss_ar IS 'كَشَفَ يَكْشِفُ كَشْفاً من باب ضَرَبَ';
-- [scan] كَشْف · kashf_masdar_core (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the مَصْدَر: the act of uncovering' WHERE id = 'RS:كشف:kashf_masdar_lemma' AND scope_level = 'lemma' AND gloss_en IS 'THE MASDAR ITSELF as a lemma: the act of uncovering, not the agent and not the deed. Qiyasi fal from bab daraba. Al-Fayyumi gives the bab explicitly; al-Qamus pairs it with al-kashifa as both meaning izhar';
UPDATE ar_ling_root_sense SET gloss_ar = 'الكَشْفُ والكاشِفةُ: الإظهارُ ورفعُ شيءٍ عمّا يُواريه ويُغَطِّيه' WHERE id = 'RS:كشف:kashf_masdar_lemma' AND scope_level = 'lemma' AND gloss_ar IS 'الكَشْفُ: مصدرُ الثلاثيِّ على وزنِ فَعْل، من بابِ ضَرَبَ — الفيومي: كَشَفْتُه كَشْفًا من بابِ ضَرَبَ فانكشف. والقاموس: الكَشْفُ كالضَّرْبِ، والكاشِفةُ: الإظهارُ ورفعُ شيءٍ عمّا يُواريه ويُغَطِّيه';
-- [scan] كَشْف · kashf_quran_hapax (live)
UPDATE ar_ling_root_sense SET gloss_en = 'used once in the Quran as a مَصْدَر' WHERE id = 'RS:كشف:kashf_quran_use' AND scope_level = 'lemma' AND gloss_en IS 'Frequency 1 in the Quran as an explicit masdar — a hapax against 14 for the verb and 3 for the participle. The concept is carried almost entirely by finite verbs and participles rather than by the verbal noun';
UPDATE ar_ling_root_sense SET gloss_ar = 'يردُ الكَشْفُ مصدرًا صريحًا مرةً واحدةً في التنزيل' WHERE id = 'RS:كشف:kashf_quran_use' AND scope_level = 'lemma' AND gloss_ar IS 'يردُ الكَشْفُ مصدرًا صريحًا مرةً واحدةً في التنزيل، وسائرُ المواضعِ أفعالٌ أو أوصاف';
-- [scan] كَاشِف · ism_fail (live)
UPDATE ar_ling_root_sense SET gloss_en = 'اسم الفاعل: one who uncovers or lifts off' WHERE id = 'RS:كشف:kashif_lemma' AND scope_level = 'lemma' AND gloss_en IS 'the agent of an uncovering: the one who lifts it off';
-- [scan] كَاشِفَة · kashifa_masdar_53_58 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a مَصْدَر meaning uncovering (53:58), not اسم الفاعل' WHERE id = 'RS:كشف:kashifa_masdar' AND scope_level = 'lemma' AND gloss_en IS 'kashifa at 53:58 is a MASDAR on the pattern of afiya and khatima, not this participle. Three views on the ta: saj with azifat al-azifa, mubalagha, or Thalab reading none uncovers the Hour but the Lord of the worlds';
-- [scan] كَٰشِفَٰت · kashifat_core (live)
UPDATE ar_ling_root_sense SET gloss_en = 'جمع المؤنث السالم: ones lifting harm, said of female idols' WHERE id = 'RS:كشف:kashifat_core' AND scope_level = 'lemma' AND gloss_en IS 'THE SOUND FEMININE PLURAL of the participle, at 39:38. Al-Zamakhshari answers why the feminine after wa-yukhawwifunaka bi-lladhina min dunih: he feminised them BECAUSE THEY WERE FEMALE — al-Lat, al-Uzza and Manat — citing 53:19-20. So the gender is not grammatical agreement with a masculine relative but a pointed identification of the idols';
UPDATE ar_ling_root_sense SET gloss_ar = '﴿هل هنَّ كاشفاتُ ضُرِّه﴾ — والتأنيثُ لأنهنَّ إناثٌ: اللاتُ والعزّى ومناة' WHERE id = 'RS:كشف:kashifat_core' AND scope_level = 'lemma' AND gloss_ar IS 'كاشِفاتٌ: جمعُ مؤنثٍ سالمٍ لاسمِ الفاعلِ كاشِفة، وردَ في ٣٩:٣٨ ﴿هل هنَّ كاشفاتُ ضُرِّه﴾ — والتأنيثُ لأنهنَّ إناثٌ: اللاتُ والعزّى ومناة، كما قال الزمخشري';
-- [scan] كَشَفَ · lane_A1 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to uncover, unveil, or reveal something' WHERE id = 'RS:كشف:lane:A1' AND scope_level = 'lemma' AND gloss_en IS 'He uncovered it; unveiled it; laid it open; displayed it; exposed it to view; discovered it; detected it; revealed it; disclosed it';
-- [scan] كَشَفَ · lane_A2 (superseded_duplicate)
UPDATE ar_ling_root_sense SET gloss_en = 'to look into or examine something closely' WHERE id = 'RS:كشف:lane:A2' AND scope_level = 'lemma' AND gloss_en IS 'He investigated, explored, or scrutinized it; searched, examined, or inquired into it';
-- [scan] كَشَفَ · lane_A3 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to remove a cover; to lay open' WHERE id = 'RS:كشف:lane:A3' AND scope_level = 'lemma' AND gloss_en IS 'He removed it; namely, a cover, or covering, or the like: and he uncovered it, laid it open — as also kashafa anhu';
-- [scan] كَشَفَ · lane_A4 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to strip one thing off another it covered' WHERE id = 'RS:كشف:lane:A4' AND scope_level = 'lemma' AND gloss_en IS 'He removed, put off, took off, or stripped off, a thing from over, or from before, a thing which it covered or concealed';
-- [scan] كَشَفَ · lane_A5 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to take away grief or sorrow' WHERE id = 'RS:كشف:lane:A5' AND scope_level = 'lemma' AND gloss_en IS 'He removed, cleared away, or dispelled, grief or sorrow — Lane cross-refers to faraja, of which it is an explanation in al-Misbah and al-Qamus';
-- [scan] كَاشِف · razi_object_of_kashf (live)
UPDATE ar_ling_root_sense SET gloss_en = 'what is lifted: pain, grief and fear' WHERE id = 'RS:كشف:razi:darr_partition' AND scope_level = 'lemma' AND gloss_en IS 'AL-RAZI DEFINES WHAT KASHIF REMOVES. At 6:17, the one other place the participle governs, he partitions: DARR names pain, grief and fear and whatever leads to them; NAF names pleasure and gladness and whatever leads to them; KHAYR is the shared measure between warding off darr and obtaining naf. He then argues the partition is exhaustive — a man is either in darr or in khayr, since the removal of darr is itself khayr whether or not pleasure follows.';
UPDATE ar_ling_root_sense SET gloss_ar = 'الضُّرُّ اسمٌ للألمِ والحُزْنِ والخوفِ وما يُفضي إليها' WHERE id = 'RS:كشف:razi:darr_partition' AND scope_level = 'lemma' AND gloss_ar IS 'الرازي عند ٦:١٧: الضُّرُّ اسمٌ للألمِ والحُزْنِ والخوفِ وما يُفضي إليها أو إلى أحدِها، والنفعُ اسمٌ للذةِ والسرورِ وما يُفضي إليهما، والخيرُ اسمٌ للقدرِ المشتركِ بين دفعِ الضرِّ وحصولِ النفع';
-- [scan] كَاشِف · razi_exclusivity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'only God can lift harm away' WHERE id = 'RS:كشف:razi:hasr_argument' AND scope_level = 'lemma' AND gloss_en IS 'THE EXCLUSIVITY IS THE POINT OF THE PARTICIPLE. la kashifa lahu illa huwa is not a statement about difficulty but about metaphysical exclusivity: al-Razi grounds it on the necessary-versus-contingent distinction — only the wajib li-dhatihi is one, everything else is mumkin and exists only by His bringing it into being, so the warding of every harm is by Him alone. He then raises three objections (a man wards harm by his wealth and helpers; kufr is the chief harm so its removal would not be his own doing; medicine benefits and poison harms) and answers the first from the doctrine of the dai.';
UPDATE ar_ling_root_sense SET gloss_ar = 'المضارُّ قليلُها وكثيرُها لا يندفع إلا بالله' WHERE id = 'RS:كشف:razi:hasr_argument' AND scope_level = 'lemma' AND gloss_ar IS 'الرازي: ثبت الحصرُ في أنّ الإنسانَ إمّا أن يكونَ في الضرِّ أو في الخير؛ لأنّ زوالَ الضرِّ خيرٌ سواءٌ حصلت فيه اللذةُ أو لم تحصل. والمضارُّ قليلُها وكثيرُها لا يندفع إلا بالله';
-- [scan] كَاشِف · majaz_kashf_al_ghamm (live)
UPDATE ar_ling_root_sense SET gloss_en = 'lifting grief, as المَجَاز of uncovering' WHERE id = 'RS:كشف:taj:majaz_ghamm' AND scope_level = 'lemma' AND gloss_en IS 'AL-ZABIDI CLASSIFIES THIS AS MAJAZ, not haqiqa: God removed his grief. He also gives the intensive kashshaf al-ghamm. This is the sense operating at 44:15 — so the verse use of kashif is figurative by al-Zabidi reckoning, the lifting of a covering transferred to the lifting of an affliction';
-- [scan] كَاشِفَة · zmk_kashifa_53_58 (live)
UPDATE ar_ling_root_sense SET gloss_en = 'none but God can reveal or lift the Hour' WHERE id = 'RS:كشف:zmk:kashifa_four' AND scope_level = 'lemma' AND gloss_en IS 'FOUR READINGS OF THE HOMOGRAPH, where Lisan and Taj gave only the masdar option. Al-Zamakhshari keeps kashifa as a PARTICIPLE in three of the four, supplying an elided nafs: no soul that MAKES PLAIN when the Hour will come; or no soul ABLE TO LIFT it once it falls, save God, though He will not lift it; or no soul that can now lift it BY DELAY. Only his fourth option is the masdar reading. Plus Talha qiraa adding mimma yaduna min duni allah.';
UPDATE ar_ling_root_sense SET gloss_ar = 'ليس لها نفسٌ كاشفةٌ: مُبيِّنةٌ متى تقوم، أو قادرةٌ على كشفِها' WHERE id = 'RS:كشف:zmk:kashifa_four' AND scope_level = 'lemma' AND gloss_ar IS 'الزمخشري عند ٥٣:٥٨ يعطي أربعةَ أوجهٍ في ﴿ليس لها من دون الله كاشِفة﴾: (١) ليس لها نفسٌ كاشفةٌ أي مُبيِّنةٌ متى تقوم، كقوله ﴿لا يُجلِّيها لوقتِها إلا هو﴾؛ (٢) أي قادرةٌ على كشفِها إذا وقعت إلا الله، غيرَ أنه لا يكشفها؛ (٣) ليس لها الآنَ نفسٌ كاشفةٌ بالتأخير؛ (٤) وقيل: الكاشفةُ مصدرٌ بمعنى الكَشْف كالعافية. وقرأ طلحة: ليس لها مما يدعون من دون الله كاشفة';
-- [scan] كَٰشِفَٰت · zmk_qiraa_idafa (live)
UPDATE ar_ling_root_sense SET gloss_en = 'ones who lift his harm: مفعول به or مضاف إليه' WHERE id = 'RS:كشف:zmk:kashifat_idafa' AND scope_level = 'lemma' AND gloss_en IS 'AL-ZAMAKHSHARI ON THE ANNEXATION OF THIS VERY PARTICIPLE. At 39:38 kashifat governs its object two ways: with TANWIN, which he calls al-asl, the underlying form, the object then in the accusative; or by IDAFA, which he calls lil-takhfif, for lightness. THIS IS THE GRAMMAR OF 44:15: kashifu al-adhabi is the idafa route, nun dropped, object in the genitive — and al-Zamakhshari says the annexed form is a lightening of a fuller form that would have been kashifuna al-adhaba.';
UPDATE ar_ling_root_sense SET gloss_ar = 'قُرِئ ﴿كاشفاتٌ ضرَّه﴾ بالتنوين على الأصل، وبالإضافة للتخفيف' WHERE id = 'RS:كشف:zmk:kashifat_idafa' AND scope_level = 'lemma' AND gloss_ar IS 'الزمخشري عند ٣٩:٣٨: قُرِئ ﴿كاشفاتٌ ضرَّه﴾ و﴿ممسكاتٌ رحمتَه﴾ بالتنوين على الأصل، وبالإضافة للتخفيف';
-- [scan] أَبٌ · father (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a father; in the plural, also forefathers' WHERE id = 'SNS:ابو:father' AND scope_level = 'lemma' AND gloss_en IS 'father; pl. abaa also forefathers';
-- [scan] أَتَى · doing_undertaking (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to do or commit an act' WHERE id = 'SNS:اتي:doing_undertaking' AND scope_level = 'lemma' AND gloss_en IS 'to do, undertake, commit an act (ʾatā l-ʾamra)';
-- [scan] أَتِىٌّ · flood_stream (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a flood from another land; a water channel' WHERE id = 'SNS:اتي:flood_stream' AND scope_level = 'lemma' AND gloss_en IS 'the ʾatiyy: a torrent arriving from another land; the channel leading water to a trough';
-- [scan] أَتِىٌّ · stranger (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a stranger living among another people' WHERE id = 'SNS:اتي:stranger' AND scope_level = 'lemma' AND gloss_en IS 'the ʾatāwī: a stranger, an incomer among a people not his own';
-- [scan] أَتَآءٌ · yield_produce (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the yield of crops and palm trees' WHERE id = 'SNS:اتي:yield_produce' AND scope_level = 'lemma' AND gloss_en IS 'the ʾitāʾ: increase, yield, produce of crops and palms';
-- [scan] أَرْض · cold_zukam (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a head cold' WHERE id = 'SNS:ارض:cold_zukam' AND scope_level = 'lemma' AND gloss_en IS 'head-cold (zukam) — a distinct non-derivable root-sense';
-- [scan] أَرِيضٌ · disposed_to_good (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a person inclined to good and humble, like rich land' WHERE id = 'SNS:ارض:disposed_to_good' AND scope_level = 'lemma' AND gloss_en IS 'of a person: naturally disposed to good, well-suited, unassuming — by likeness to fertile land';
-- [scan] أَرِيضٌ · fertile (live)
UPDATE ar_ling_root_sense SET gloss_en = 'rich, fertile land, good for growing' WHERE id = 'SNS:ارض:fertile' AND scope_level = 'lemma' AND gloss_en IS 'fertile, goodly, pleasing land';
-- [scan] أَرْض · lower_parts (live)
UPDATE ar_ling_root_sense SET gloss_en = 'an animal''s lower legs and hooves; any underside' WHERE id = 'SNS:ارض:lower_parts' AND scope_level = 'lemma' AND gloss_en IS 'the lower parts / legs and hoof of a beast; by extension the underside of anything';
UPDATE ar_ling_root_sense SET gloss_ar = 'الأرضُ: أسفلُ قوائمِ الدابّة وحافرُها؛ ويُعبَّر بها عن أسفلِ الشيء' WHERE id = 'SNS:ارض:lower_parts' AND scope_level = 'lemma' AND gloss_ar IS 'الأرضُ: أسفلُ قوائمِ الدابّة وحافرُها؛ ويُعبَّر بها عن أسفلِ الشيء كما يُعبَّر بالسماء عن أعلاه';
-- [scan] أَرَضَةٌ · termite (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a termite, a grub that eats wood' WHERE id = 'SNS:ارض:termite' AND scope_level = 'lemma' AND gloss_en IS 'the termite, wood-eating grub';
-- [scan] أَرْض · tremor (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a tremor, a shudder' WHERE id = 'SNS:ارض:tremor' AND scope_level = 'lemma' AND gloss_en IS 'tremor, shudder — a distinct non-derivable root-sense';
-- [scan] أَلُومَةٌ · baseness (live)
UPDATE ar_ling_root_sense SET gloss_en = 'meanness, low character' WHERE id = 'SNS:الم:baseness' AND scope_level = 'lemma' AND gloss_en IS 'baseness, meanness (alūma)';
-- [scan] أَيْلَمَةٌ · movement_sound (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a stir, a movement; a sound' WHERE id = 'SNS:الم:movement_sound' AND scope_level = 'lemma' AND gloss_en IS 'the ayalama: a stir/movement, a sound';
-- [scan] أَلَهَ · bewilderment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to be confused and lost' WHERE id = 'SNS:اله:bewilderment' AND scope_level = 'lemma' AND gloss_en IS 'to be bewildered (disputed etymological sense)';
-- [scan] أَلَهَ · refuge (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to seek refuge; also, to give protection' WHERE id = 'SNS:اله:refuge' AND scope_level = 'lemma' AND gloss_en IS 'to take refuge in / seek shelter with; and (trans.) to grant protection and safety';
-- [scan] إِلَاهَةٌ · sun (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the sun, so named because some people worshipped it' WHERE id = 'SNS:اله:sun' AND scope_level = 'lemma' AND gloss_en IS 'the sun, named ilāha because some peoples worshipped it';
-- [scan] أَمْر · affair (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a matter, affair, or event' WHERE id = 'SNS:امر:affair' AND scope_level = 'lemma' AND gloss_en IS 'affair; matter, thing, event (pl. umūr)';
-- [scan] إِمْرَةٌ · authority (live)
UPDATE ar_ling_root_sense SET gloss_en = 'rule, authority; the post of a ruler' WHERE id = 'SNS:امر:authority' AND scope_level = 'lemma' AND gloss_en IS 'authority; command-ship, rule of an amīr';
-- [scan] يَأْتَمِرُ · consultation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'consulting one another; taking advice' WHERE id = 'SNS:امر:consultation' AND scope_level = 'lemma' AND gloss_en IS 'consultation; mutual acceptance of counsel (iʾtimār)';
-- [scan] أَمْر · divine_command (live)
UPDATE ar_ling_root_sense SET gloss_en = 'God''s command; His decree that creates' WHERE id = 'SNS:امر:divine_command' AND scope_level = 'lemma' AND gloss_en IS 'the divine command; God-s creative decree';
-- [scan] أَمَارَةٌ · sign (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a sign or mark; an appointed time' WHERE id = 'SNS:امر:sign' AND scope_level = 'lemma' AND gloss_en IS 'sign; mark, token, appointed time';
-- [scan] إِمْر · wonder (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a terrible, shocking thing' WHERE id = 'SNS:امر:wonder' AND scope_level = 'lemma' AND gloss_en IS 'grave, astounding thing (imr)';
-- [scan] آمِينَ · amen_invocation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'amen: O God, answer; or, so be it' WHERE id = 'SNS:امن:amen_invocation' AND scope_level = 'lemma' AND gloss_en IS 'āmīn: so be it / O God, answer (the prayer response)';
-- [scan] أَمُونٌ · firm_camel (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a strong she-camel that will not tire' WHERE id = 'SNS:امن:firm_camel' AND scope_level = 'lemma' AND gloss_en IS 'amūn: a firmly-built she-camel, safe from weakness';
-- [scan] ءَامَنَ · granting_safety (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to give someone safety and protection' WHERE id = 'SNS:امن:granting_safety' AND scope_level = 'lemma' AND gloss_en IS 'granting security; giving quarter/protection (amān, ijāra)';
-- [scan] أمَنَةٌ · trusting_credulous (live)
UPDATE ar_ling_root_sense SET gloss_en = 'one who trusts everyone and believes all' WHERE id = 'SNS:امن:trusting_credulous' AND scope_level = 'lemma' AND gloss_en IS 'amana: one who trusts everyone, credulous';
-- [scan] إِيَالَةٌ · governance (live)
UPDATE ar_ling_root_sense SET gloss_en = 'ruling and caring for people well' WHERE id = 'SNS:اول:governance' AND scope_level = 'lemma' AND gloss_en IS 'governance; ruling and managing a flock or people well';
-- [scan] آلَةٌ · instrument (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a tool; also a state, and a funeral bier' WHERE id = 'SNS:اول:instrument' AND scope_level = 'lemma' AND gloss_en IS 'an instrument, tool; also a state or condition, and a bier';
-- [scan] تَأْوِيل · interpretation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'explaining what a thing leads to, its outcome' WHERE id = 'SNS:اول:interpretation' AND scope_level = 'lemma' AND gloss_en IS 'interpretation; expounding what a thing comes back to, its outcome';
-- [scan] آلٌ · mirage (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a morning haze that lifts up shapes; a shape' WHERE id = 'SNS:اول:mirage' AND scope_level = 'lemma' AND gloss_en IS 'the shimmering haze of forenoon that lifts up shapes; also the shape or outline of a thing';
-- [scan] آلَ · thicken (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to thicken, said of milk or tar' WHERE id = 'SNS:اول:thicken' AND scope_level = 'lemma' AND gloss_en IS 'to thicken, curdle (of milk, tar, honey)';
-- [scan] بَرْكٌ · chest (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a camel''s chest and the belly near the ground' WHERE id = 'SNS:برك:chest' AND scope_level = 'lemma' AND gloss_en IS 'al-bark: the breast of the camel and the underbelly that meets the ground';
-- [scan] بَرَكَةٌ · felicity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'happiness and lasting good fortune' WHERE id = 'SNS:برك:felicity' AND scope_level = 'lemma' AND gloss_en IS 'baraka: felicity and lasting good fortune';
-- [scan] بَرْكٌ · herd (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a large herd of kneeling camels' WHERE id = 'SNS:برك:herd' AND scope_level = 'lemma' AND gloss_en IS 'al-bark: a great couching herd of camels';
-- [scan] بَرَكَ · kneel (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a camel kneeling, chest pressed to the ground' WHERE id = 'SNS:برك:kneel' AND scope_level = 'lemma' AND gloss_en IS 'the couching of a camel: pressing its breast to the ground';
-- [scan] تَبَارَكَ · loftiness (live)
UPDATE ar_ling_root_sense SET gloss_en = 'high and glorified; said of God alone' WHERE id = 'SNS:برك:loftiness' AND scope_level = 'lemma' AND gloss_en IS 'tabaraka: loftiness, glorification and exaltation, of God alone';
-- [scan] بِرْكَةٌ · pool (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a pool dug into the ground to hold water' WHERE id = 'SNS:برك:pool' AND scope_level = 'lemma' AND gloss_en IS 'birka: a water-reservoir, a pool dug into the ground';
-- [scan] بَرَاكَآءُ · warfast (live)
UPDATE ar_ling_root_sense SET gloss_en = 'standing firm in battle' WHERE id = 'SNS:برك:warfast' AND scope_level = 'lemma' AND gloss_en IS 'al-barakaʾ: standing firm in battle, as if the fighters had couched in it';
-- [scan] بُرَكَةٌ · waterbird (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a white water bird' WHERE id = 'SNS:برك:waterbird' AND scope_level = 'lemma' AND gloss_en IS 'al-buraka: a white water-bird';
-- [scan] بَائِنٌ · bow (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a bow whose string stands far from its grip' WHERE id = 'SNS:بين:bow' AND scope_level = 'lemma' AND gloss_en IS 'a bow whose string stands away from its grip, drawn far from it';
-- [scan] بَيَان · eloquence (live)
UPDATE ar_ling_root_sense SET gloss_en = 'eloquence: a fluent tongue with a sharp mind' WHERE id = 'SNS:بين:eloquence' AND scope_level = 'lemma' AND gloss_en IS 'eloquence and fluency of tongue joined with sharpness of mind; in the hadith indeed some eloquence is a very magic';
-- [scan] بَيْن · excellence (live)
UPDATE ar_ling_root_sense SET gloss_en = 'distance; also being better than another' WHERE id = 'SNS:بين:excellence' AND scope_level = 'lemma' AND gloss_en IS 'distance, and also superiority and merit — between the two is a far remove, and he surpassed and excelled him';
-- [scan] بَيْن · interval (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a ظرف: the space between two things, their middle' WHERE id = 'SNS:بين:interval' AND scope_level = 'lemma' AND gloss_en IS 'the interval between two things and their midst, used as noun and adverb — I sat amidst the people; and We set between them a place of ruin (al-Kahf 18:52)';
UPDATE ar_ling_root_sense SET gloss_ar = 'بَيْن: الظرفُ بين شيئين ووَسَطُهما؛ جلستُ بينَ القومِ أي وَسْطَهم' WHERE id = 'SNS:بين:interval' AND scope_level = 'lemma' AND gloss_ar IS 'بَيْن: الظرفُ بين شيئين ووَسَطُهما؛ جلستُ بينَ القومِ أي وَسْطَهم؛ ﴿وجَعَلْنا بينَهُم مَوْبِقاً﴾';
-- [scan] بَيْن · middling (live)
UPDATE ar_ling_root_sense SET gloss_en = 'middling: between good and bad' WHERE id = 'SNS:بين:middling' AND scope_level = 'lemma' AND gloss_en IS 'bayna bayna: middling, between good and bad — two words made one and built on fatha; hence the softened hamza is called bayna bayna';
UPDATE ar_ling_root_sense SET gloss_ar = 'بَيْنَ بَيْنَ: بين الجَيِّدِ والرَّديءِ' WHERE id = 'SNS:بين:middling' AND scope_level = 'lemma' AND gloss_ar IS 'بَيْنَ بَيْنَ: بين الجَيِّدِ والرَّديءِ؛ اسمانِ جُعِلا اسماً واحداً وبُنِيا على الفتح، ومنه تسمية الهمزةِ المخفَّفةِ بَيْنَ بَيْنَ';
-- [scan] بَائِنٌ · milker (live)
UPDATE ar_ling_root_sense SET gloss_en = 'one of two people milking a camel, on one side' WHERE id = 'SNS:بين:milker' AND scope_level = 'lemma' AND gloss_en IS 'one of two who milk the she-camel together, approaching from one side, the other being called the mustaʿli';
-- [scan] بَيِّنَة · proof (live)
UPDATE ar_ling_root_sense SET gloss_en = 'clear proof, seen or reasoned; two witnesses too' WHERE id = 'SNS:بين:proof' AND scope_level = 'lemma' AND gloss_en IS 'the clear indication or evidence, whether rational or perceptible; hence the two witnesses are called a bayyina';
-- [scan] بِينٌ · tract (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a stretch of land as far as the eye sees' WHERE id = 'SNS:بين:tract' AND scope_level = 'lemma' AND gloss_en IS 'with kasra, a tract of land as far as the eye can reach along a road';
-- [scan] بَيْن · union (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a bond that joins; the word also means parting' WHERE id = 'SNS:بين:union' AND scope_level = 'lemma' AND gloss_en IS 'union and bond — the contronym sense that is the opposite of separation; as in the verse now the bond between you is severed (al-Anam 6:94)';
-- [scan] بِئْرٌ بَيُونٌ · well (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a wide, deep well' WHERE id = 'SNS:بين:well' AND scope_level = 'lemma' AND gloss_en IS 'a well wide in the span between its two sides and deep of bottom';
-- [scan] حَكَمَ · judging (live)
UPDATE ar_ling_root_sense SET gloss_en = 'judging: deciding between people' WHERE id = 'SNS:حكم:judging' AND scope_level = 'lemma' AND gloss_en IS 'judging; adjudication, decisive verdict (ḥukm = qaḍāʾ)';
-- [scan] تَحِيَّة · greeting (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a greeting, first meaning a prayer for life' WHERE id = 'SNS:حيي:greeting' AND scope_level = 'lemma' AND gloss_en IS 'greeting, salutation — originally a prayer for life';
-- [scan] اسْتِحْيَآء · modesty (live)
UPDATE ar_ling_root_sense SET gloss_en = 'modesty: shrinking back from shameful things' WHERE id = 'SNS:حيي:modesty' AND scope_level = 'lemma' AND gloss_en IS 'modesty, shame, bashfulness; the soul shrinking from what is base';
-- [scan] حَيَّة · snake (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a snake, named from the word for life' WHERE id = 'SNS:حيي:snake' AND scope_level = 'lemma' AND gloss_en IS 'a serpent, snake — derived from ḥayāt (life)';
-- [scan] يَسْتَحْىِۦٓ · spare_life (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to let someone live, not kill them' WHERE id = 'SNS:حيي:spare_life' AND scope_level = 'lemma' AND gloss_en IS 'to spare alive, let live (not kill)';
-- [scan] حَيّ · tribe (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a tribe or clan of the Arabs' WHERE id = 'SNS:حيي:tribe' AND scope_level = 'lemma' AND gloss_en IS 'a tribe, clan of the Arabs';
-- [scan] دُخْنَةٌ · incense (live)
UPDATE ar_ling_root_sense SET gloss_en = 'incense burned to scent houses and clothes' WHERE id = 'SNS:دخن:incense' AND scope_level = 'lemma' AND gloss_en IS 'incense / fumigant with which houses and clothes are perfumed';
-- [scan] دَخَنٌ · latent_rancour (live)
UPDATE ar_ling_root_sense SET gloss_en = 'hidden hatred; corruption inside; bad nature' WHERE id = 'SNS:دخن:latent_rancour' AND scope_level = 'lemma' AND gloss_en IS 'latent rancour, inward corruption, ill nature (“a truce upon smoulder”)';
-- [scan] دُخْنٌ · millet (live)
UPDATE ar_ling_root_sense SET gloss_en = 'millet, a small grain' WHERE id = 'SNS:دخن:millet' AND scope_level = 'lemma' AND gloss_en IS 'dukhn — millet, the grain of the jāwars';
-- [scan] أَدْخَنُ · smoky_colour (live)
UPDATE ar_ling_root_sense SET gloss_en = 'smoke-coloured: a dull, dark colour near black' WHERE id = 'SNS:دخن:smoky_colour' AND scope_level = 'lemma' AND gloss_en IS 'smoke-coloured: a dusky, dingy hue inclining to black';
-- [scan] دَخِنٌ · tainted_by_smoke (live)
UPDATE ar_ling_root_sense SET gloss_en = 'spoiled by smoke, said of food or fire' WHERE id = 'SNS:دخن:tainted_by_smoke' AND scope_level = 'lemma' AND gloss_en IS 'spoiled / tainted by smoke (of food, of a fire choked with wood)';
-- [scan] ربب · abiding (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to stay in a place; of cloud, to keep raining' WHERE id = 'SNS:ربب:abiding' AND scope_level = 'lemma' AND gloss_en IS 'to stay, abide, keep to a place; (of cloud) to keep raining';
-- [scan] رَبّ · master_obeyed (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a master who is obeyed; one who manages and cares' WHERE id = 'SNS:ربب:master_obeyed' AND scope_level = 'lemma' AND gloss_en IS 'master, obeyed lord; manager, caretaker';
-- [scan] ربب · rearing (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to raise and care for; to set right' WHERE id = 'SNS:ربب:rearing' AND scope_level = 'lemma' AND gloss_en IS 'to rear, nurture, tend; to set right and complete';
-- [scan] ربب · rubba_particle (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a حرف جرّ meaning “few a”, before an indefinite noun' WHERE id = 'SNS:ربب:rubba_particle' AND scope_level = 'lemma' AND gloss_en IS 'rubba: the preposed particle of (usually) paucity, governing an indefinite';
-- [scan] رَبَٰٓئِب · stepchild (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a stepchild, raised in the home' WHERE id = 'SNS:ربب:stepchild' AND scope_level = 'lemma' AND gloss_en IS 'stepson / stepdaughter (the one reared)';
-- [scan] ربب · thickened_syrup (live)
UPDATE ar_ling_root_sense SET gloss_en = 'thick syrup, like boiled-down date juice' WHERE id = 'SNS:ربب:thickened_syrup' AND scope_level = 'lemma' AND gloss_en IS 'rubb: thickened juice, boiled-down syrup / molasses';
-- [scan] رَحْمَة · divine_beneficence (live)
UPDATE ar_ling_root_sense SET gloss_en = 'God''s mercy: pure kindness and giving, not tender feeling' WHERE id = 'SNS:رحم:divine_beneficence' AND scope_level = 'lemma' AND gloss_en IS 'divine mercy: pure beneficence without frailty of feeling';
-- [scan] رَّحْمَٰن · rahman_exclusive (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the Most Merciful: a name for God alone' WHERE id = 'SNS:رحم:rahman_exclusive' AND scope_level = 'lemma' AND gloss_en IS 'al-Rahman: a name exclusive to God';
-- [scan] رِسْلٌ · deliberateness (live)
UPDATE ar_ling_root_sense SET gloss_en = 'gentleness; taking it slowly' WHERE id = 'SNS:رسل:deliberateness' AND scope_level = 'lemma' AND gloss_en IS 'gentleness, unhurried deliberateness (ʿalā rislika)';
-- [scan] رَسْلٌ · lank_hair (live)
UPDATE ar_ling_root_sense SET gloss_en = 'loose and straight, said of hair' WHERE id = 'SNS:رسل:lank_hair' AND scope_level = 'lemma' AND gloss_en IS 'lank, loose-hanging (of hair)';
-- [scan] رِسَالَة · message (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a message carried by a messenger' WHERE id = 'SNS:رسل:message' AND scope_level = 'lemma' AND gloss_en IS 'a message; the thing borne by the messenger';
-- [scan] رَسَلٌ · succession (live)
UPDATE ar_ling_root_sense SET gloss_en = 'groups coming one after another' WHERE id = 'SNS:رسل:succession' AND scope_level = 'lemma' AND gloss_en IS 'a drove/troop following one after another; in successive groups';
-- [scan] راقب · fearing_regard (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to fear God; to respect a tie or pact' WHERE id = 'SNS:رقب:fearing_regard' AND scope_level = 'lemma' AND gloss_en IS 'to be mindful of / to fear God; to have regard for a tie or covenant';
-- [scan] رَقِيب · guarding (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a watcher and guardian; God, from whom nothing hides' WHERE id = 'SNS:رقب:guarding' AND scope_level = 'lemma' AND gloss_en IS 'the raqīb: watcher, guardian, keeper — of God, the One from whom nothing is hidden';
-- [scan] مَرْقَبٌ · lookout_place (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a high lookout where a watcher stands' WHERE id = 'SNS:رقب:lookout_place' AND scope_level = 'lemma' AND gloss_en IS 'the marqab: an elevated place, a lookout post on which the watcher stands';
-- [scan] رَقَبَة · neck (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the neck, at the base of its back' WHERE id = 'SNS:رقب:neck' AND scope_level = 'lemma' AND gloss_en IS 'the raqaba: the neck, the base of the back of the neck';
-- [scan] رَقُوبٌ · raqub_childless (live)
UPDATE ar_ling_root_sense SET gloss_en = 'one whose children do not survive' WHERE id = 'SNS:رقب:raqub_childless' AND scope_level = 'lemma' AND gloss_en IS 'the raqūb: one whose children do not survive; an aged man or widow with none to earn for them — one left watching for relief';
-- [scan] رَقَبَة · slave (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a slave, a person owned by another' WHERE id = 'SNS:رقب:slave' AND scope_level = 'lemma' AND gloss_en IS 'the raqaba as a person owned — a slave; hence «wa-fī l-riqāb» = the mukātabūn';
-- [scan] سَمِعَ · acceptance (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to accept and answer a prayer' WHERE id = 'SNS:سمع:acceptance' AND scope_level = 'lemma' AND gloss_en IS 'hearing as acceptance and answering';
-- [scan] اسْتَمَعَ · attentive_listening (live)
UPDATE ar_ling_root_sense SET gloss_en = 'listening closely, on purpose' WHERE id = 'SNS:سمع:attentive_listening' AND scope_level = 'lemma' AND gloss_en IS 'listening attentively, by deliberate intent';
-- [scan] سِمْعٌ · repute (live)
UPDATE ar_ling_root_sense SET gloss_en = 'good name; how people speak of someone' WHERE id = 'SNS:سمع:repute' AND scope_level = 'lemma' AND gloss_en IS 'good repute; what is spoken of one among people';
-- [scan] سَمِعَ · understanding (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to hear and obey; to understand' WHERE id = 'SNS:سمع:understanding' AND scope_level = 'lemma' AND gloss_en IS 'hearing as understanding and compliance';
-- [scan] سمو · hunting (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to go out hunting in open country' WHERE id = 'SNS:سمو:hunting' AND scope_level = 'lemma' AND gloss_en IS 'to go out hunting in open country; the sumāt = hunters';
-- [scan] اسْم · name (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a name: from being high, it makes a thing known' WHERE id = 'SNS:سمو:name' AND scope_level = 'lemma' AND gloss_en IS 'the name (ism), from elevation: raising a thing into notice';
-- [scan] سَمَآء · rain_cloud (live)
UPDATE ar_ling_root_sense SET gloss_en = 'rain, and the rain cloud' WHERE id = 'SNS:سمو:rain_cloud' AND scope_level = 'lemma' AND gloss_en IS 'rain and rain-cloud called samaa';
-- [scan] شكك · adhesion (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sticking together, like the arm against the side' WHERE id = 'SNS:شكك:adhesion' AND scope_level = 'lemma' AND gloss_en IS 'adhesion, cleaving together; the upper arm sticking to the side';
-- [scan] شكك · armour (live)
UPDATE ar_ling_root_sense SET gloss_en = 'full armour; a man fully armed' WHERE id = 'SNS:شكك:armour' AND scope_level = 'lemma' AND gloss_en IS 'full armour, weaponry; a man fully armed (shākk al-silāḥ)';
-- [scan] شكك · group (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a band of people; also a way or manner' WHERE id = 'SNS:شكك:group' AND scope_level = 'lemma' AND gloss_en IS 'a band or party of people; also a way, manner (daʿhu ʿalā shakīkatih)';
-- [scan] شكك · limp (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to limp slightly, said of a camel' WHERE id = 'SNS:شكك:limp' AND scope_level = 'lemma' AND gloss_en IS 'to limp slightly (of a camel)';
-- [scan] شكك · pierce (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to pierce with a spear or arrow' WHERE id = 'SNS:شكك:pierce' AND scope_level = 'lemma' AND gloss_en IS 'to pierce, transfix, run through with spear or arrow';
-- [scan] عَذُوبٌ · exposed_to_sky (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sleeping in the open, nothing between you and sky' WHERE id = 'SNS:عذب:exposed_to_sky' AND scope_level = 'lemma' AND gloss_en IS 'one with no cover between him and the sky; sleeping in the open';
-- [scan] عَذْب · sweet_water (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sweet and pleasant, especially of water' WHERE id = 'SNS:عذب:sweet_water' AND scope_level = 'lemma' AND gloss_en IS 'sweet, palatable (esp. of water); wholesome';
-- [scan] عَذَبَةٌ · tip_extremity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the tip of a thing, like a whip or tongue' WHERE id = 'SNS:عذب:tip_extremity' AND scope_level = 'lemma' AND gloss_en IS 'the tip/thong-end of a thing (whip, tongue, branch, scale-string)';
-- [scan] عَذَبٌ · turbid_water (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dirt and weed floating on water' WHERE id = 'SNS:عذب:turbid_water' AND scope_level = 'lemma' AND gloss_en IS 'scum/motes on water; water fouled with weed and dregs';
-- [scan] أَعْلَام · landmark_banner (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a landmark: a mountain, banner, or road sign' WHERE id = 'SNS:علم:landmark_banner' AND scope_level = 'lemma' AND gloss_en IS 'landmark: mountain, banner, waymark';
-- [scan] عَلَّمَ · teaching (live)
UPDATE ar_ling_root_sense SET gloss_en = 'teaching again and again until it sticks' WHERE id = 'SNS:علم:teaching' AND scope_level = 'lemma' AND gloss_en IS 'teaching; repeated instruction that leaves its trace';
-- [scan] عند · flowing_vein (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a vein that bleeds and will not stop' WHERE id = 'SNS:عند:flowing_vein' AND scope_level = 'lemma' AND gloss_en IS 'the ʿānid vein: one whose blood flows unstaunched, spurting sideways';
-- [scan] عِند · judgment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'in my view, in my judgment' WHERE id = 'SNS:عند:judgment' AND scope_level = 'lemma' AND gloss_en IS 'in my judgment / in my view (ʿindī = in my estimation)';
-- [scan] عَنِيد · obstinacy (live)
UPDATE ar_ling_root_sense SET gloss_en = 'stubborn: rejecting the truth while knowing it' WHERE id = 'SNS:عند:obstinacy' AND scope_level = 'lemma' AND gloss_en IS 'the ʿanīd: one who knowingly rejects the truth; obstinate, insolent';
-- [scan] عِند · proximity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a ظرف: near, close in place or time' WHERE id = 'SNS:عند:proximity' AND scope_level = 'lemma' AND gloss_en IS 'ʿinda: adverb of presence/nearness, of place and of time';
-- [scan] فُرْقَان · criterion (live)
UPDATE ar_ling_root_sense SET gloss_en = 'what tells truth from falsehood; God''s Book' WHERE id = 'SNS:فرق:criterion' AND scope_level = 'lemma' AND gloss_en IS 'the criterion (furqān): what separates truth from falsehood; the Scripture';
-- [scan] فَرَقْ · decreeing (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to decide and settle a matter clearly' WHERE id = 'SNS:فرق:decreeing' AND scope_level = 'lemma' AND gloss_en IS 'deciding, settling a matter distinctly (yufraq = yuqḍā)';
-- [scan] فَرَقٌ · fear (live)
UPDATE ar_ling_root_sense SET gloss_en = 'fear, as if the heart is torn apart' WHERE id = 'SNS:فرق:fear' AND scope_level = 'lemma' AND gloss_en IS 'fear; fright (faraq, the heart-s being rent apart)';
-- [scan] فَرِيق · group (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a group of people set apart' WHERE id = 'SNS:فرق:group' AND scope_level = 'lemma' AND gloss_en IS 'group; party, faction set apart (firqa, farīq)';
-- [scan] فِرَاق · parting (live)
UPDATE ar_ling_root_sense SET gloss_en = 'parting; people separating from each other' WHERE id = 'SNS:فرق:parting' AND scope_level = 'lemma' AND gloss_en IS 'parting; separation of persons (firāq)';
-- [scan] كَتَبَ · binding_tie (live)
UPDATE ar_ling_root_sense SET gloss_en = 'tying a waterskin''s mouth shut with a cord' WHERE id = 'SNS:كتب:binding_tie' AND scope_level = 'lemma' AND gloss_en IS 'tying a waterskin''s mouth shut with a thong — binding closed, not stitching through';
-- [scan] كَتَبَ · burden_vs_benefit (live)
UPDATE ar_ling_root_sense SET gloss_en = '“on” someone means a burden; “for” someone, a good' WHERE id = 'SNS:كتب:burden_vs_benefit' AND scope_level = 'lemma' AND gloss_en IS 'THE POLARITY: kataba ʿalā decrees a BURDEN upon someone; kataba li- decrees a GOOD in their favour. The ḥarf carries the moral direction, not the verb';
UPDATE ar_ling_root_sense SET gloss_ar = 'كَتَبَ عَلَى للفَرْضِ والحَمْلِ، وكَتَبَ لِـ للفَضْلِ والخَيْرِ' WHERE id = 'SNS:كتب:burden_vs_benefit' AND scope_level = 'lemma' AND gloss_ar IS 'كَتَبَ عَلَى للفَرْضِ والحَمْلِ، وكَتَبَ لِـ للفَضْلِ والخَيْرِ — فاللامُ تُؤذِنُ بخيرٍ مقضيٍّ';
-- [scan] كَاتِبُ · correspond (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to write to one another' WHERE id = 'SNS:كتب:correspond' AND scope_level = 'lemma' AND gloss_en IS 'form III as CORRESPONDENCE: to write to a friend; tukātabā — they wrote to one another';
-- [scan] كَتَبَ · credited_account (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to record a deed to someone''s account' WHERE id = 'SNS:كتب:credited_account' AND scope_level = 'lemma' AND gloss_en IS 'to CREDIT a deed to someone''s account — the ledger sense, distinct from decreeing a good';
-- [scan] اكْتَتَبَ · dictation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to dictate something for another to write' WHERE id = 'SNS:كتب:dictation' AND scope_level = 'lemma' AND gloss_en IS '''make me write this ode'' — i.e. dictate it to me';
-- [scan] كِتْبَةٌ · enrolment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'writing one''s name in the pay register' WHERE id = 'SNS:كتب:enrolment' AND scope_level = 'lemma' AND gloss_en IS 'enrolment: writing one''s name into the stipend and ration register';
-- [scan] كَتَبَ · executed_decree (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a decree already carried out, or as good as done' WHERE id = 'SNS:كتب:executed_decree' AND scope_level = 'lemma' AND gloss_en IS 'writing expresses the decree ALREADY CARRIED OUT, or what stands as good as carried out';
-- [scan] اكْتَتَبَ · false_enrolment (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to falsely list oneself as disabled to avoid war' WHERE id = 'SNS:كتب:false_enrolment' AND scope_level = 'lemma' AND gloss_en IS '''whoever enrols himself as disabled, God will raise him disabled'' — registering falsely in the roll of the infirm to avoid the campaign';
-- [scan] كَتَبَ · girding_self (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to gather one''s clothes tightly around the body' WHERE id = 'SNS:كتب:girding_self' AND scope_level = 'lemma' AND gloss_en IS 'to gird oneself, gathering one''s clothes tight about the body — Ibn al-Athīr derives it straight from stitching a waterskin';
-- [scan] كَتَبَ · judicial_sentence (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to rule that someone must do something' WHERE id = 'SNS:كتب:judicial_sentence' AND scope_level = 'lemma' AND gloss_en IS 'to pass SENTENCE against someone that he do a thing — ''the judge wrote for the maintenance'', i.e. gave judgement that it be paid';
-- [scan] كُتْبَةٌ · kutba_stitch (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a single stitch that draws two sides together' WHERE id = 'SNS:كتب:kutba_stitch' AND scope_level = 'lemma' AND gloss_en IS 'the kutba: the single stitch whose thong has drawn both faces together';
-- [scan] كُتَّابٌ · kuttab_school (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a school where boys gather' WHERE id = 'SNS:كتب:kuttab_school' AND scope_level = 'lemma' AND gloss_en IS 'the kuttab: the GATHERING-PLACE of its boys';
-- [scan] كَتَبَ · mental_record (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to keep something in mind, not on paper' WHERE id = 'SNS:كتب:mental_record' AND scope_level = 'lemma' AND gloss_en IS 'to record something MENTALLY — keeping it in mind, not inscribing it. Mir excludes verses of purely literal writing from this head';
-- [scan] كَاتِبُ · mukatab_person (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a slave who buys his freedom by contract' WHERE id = 'SNS:كتب:mukatab_person' AND scope_level = 'lemma' AND gloss_en IS 'the mukātab: the slave who buys himself and contracts for it — the PERSON, not the act';
-- [scan] كَاتِبُ · mukataba_islamic (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the freedom contract, called “writing” only in Islam' WHERE id = 'SNS:كتب:mukataba_islamic' AND scope_level = 'lemma' AND gloss_en IS 'the manumission contract was NAMED kitāba only in Islam — al-Azharī takes this as evidence the usage is not pre-Islamic Arabic';
UPDATE ar_ling_root_sense SET gloss_ar = 'سُمِّيَت المُكاتَبةُ كِتابةً في الإسلامِ' WHERE id = 'SNS:كتب:mukataba_islamic' AND scope_level = 'lemma' AND gloss_ar IS 'سُمِّيَت المُكاتَبةُ كِتابةً في الإسلامِ — وفيه دليلٌ على أنّ هذا الإطلاقَ ليس عربيًّا';
-- [scan] كَتَبَ · nostril_stitch (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sewing shut a camel''s nostrils so she nurses another''s calf' WHERE id = 'SNS:كتب:nostril_stitch' AND scope_level = 'lemma' AND gloss_en IS 'stitching a fostering she-camel''s nostrils shut so she cannot smell the stuffed hide and refuse the calf';
-- [scan] كَتَبَ · refuse_the_tie (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a waterskin too stiff to be tied shut' WHERE id = 'SNS:كتب:refuse_the_tie' AND scope_level = 'lemma' AND gloss_en IS '''I tied the waterskin''s mouth and it would not take the tie'' — the hide too stiff and coarse to close';
-- [scan] كَاتِب · scholar (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a writer, meaning a learned person' WHERE id = 'SNS:كتب:scholar' AND scope_level = 'lemma' AND gloss_en IS 'the kātib among them means THE KNOWER — one who has gathered knowledge, not merely one who writes';
-- [scan] كَاتِب · scribe_rare_esteemed (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a learned person, since writers were few and prized' WHERE id = 'SNS:كتب:scribe_rare_esteemed' AND scope_level = 'lemma' AND gloss_en IS 'WHY kātib meant scholar: whoever knew writing generally had knowledge — the scribe was PRIZED among them and FEW';
UPDATE ar_ling_root_sense SET gloss_ar = 'سُمِّي به العالِمُ، وكان الكاتبُ عندهم عزيزاً وفيهم قليلاً' WHERE id = 'SNS:كتب:scribe_rare_esteemed' AND scope_level = 'lemma' AND gloss_ar IS 'سُمِّي الكاتبُ عالِماً لأنّ الغالبَ على مَن كان يعرفُ الكتابةَ أنّ عنده العِلمَ — وكان الكاتبُ عندهم عزيزاً وفيهم قليلاً';
-- [scan] كَتِيبَةٌ · squadron (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a troop of horsemen gathered together' WHERE id = 'SNS:كتب:squadron' AND scope_level = 'lemma' AND gloss_en IS 'squadron / troop of horse (the gathered)';
-- [scan] كِتْبَةٌ · state_condition (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a state or condition' WHERE id = 'SNS:كتب:state_condition' AND scope_level = 'lemma' AND gloss_en IS 'kitba as STATE or condition — the way a thing stands';
-- [scan] كَتَبَ · stitching (live)
UPDATE ar_ling_root_sense SET gloss_en = 'sewing one piece of leather to another' WHERE id = 'SNS:كتب:stitching' AND scope_level = 'lemma' AND gloss_en IS 'joining HIDE to HIDE by sewing — the literal act, on leather';
-- [scan] مُكْتِبٌ · teacher (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a teacher who makes others write' WHERE id = 'SNS:كتب:teacher' AND scope_level = 'lemma' AND gloss_en IS 'the muktib: the teacher — the one who makes others write';
-- [scan] كِتْبَةٌ · transcription (live)
UPDATE ar_ling_root_sense SET gloss_en = 'copying out a book by hand' WHERE id = 'SNS:كتب:transcription' AND scope_level = 'lemma' AND gloss_en IS 'transcription: your writing out a book, copying it';
-- [scan] كَتَبَ · written_in_heart (live)
UPDATE ar_ling_root_sense SET gloss_en = 'writing faith into hearts, as on a page' WHERE id = 'SNS:كتب:written_in_heart' AND scope_level = 'lemma' AND gloss_en IS 'writing faith INTO hearts — the heart as the page inscribed';
-- [scan] كَاشَفَهُ · open_hostility (live)
UPDATE ar_ling_root_sense SET gloss_en = 'showing open hostility to someone' WHERE id = 'SNS:كشف:open_hostility' AND scope_level = 'lemma' AND gloss_en IS 'showing open enmity; acting openly towards someone';
-- [scan] كَلّ · burden (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a burden: someone who depends on another' WHERE id = 'SNS:كلل:burden' AND scope_level = 'lemma' AND gloss_en IS 'burden; dependant, one who is a weight upon another';
-- [scan] كَلَٰلَة · kalala (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dying with neither parent nor child as heir' WHERE id = 'SNS:كلل:kalala' AND scope_level = 'lemma' AND gloss_en IS 'kalāla: heirship with neither parent nor child';
-- [scan] كَانَ · copula (live)
UPDATE ar_ling_root_sense SET gloss_en = '“was”: from كان وأخواتها, linking subject and description' WHERE id = 'SNS:كون:copula' AND scope_level = 'lemma' AND gloss_en IS 'the copula kāna: past-tense to be, linking subject and predicate';
-- [scan] تَكَوَّنَ · creation (live)
UPDATE ar_ling_root_sense SET gloss_en = 'bringing something into being from nothing' WHERE id = 'SNS:كون:creation' AND scope_level = 'lemma' AND gloss_en IS 'divine origination; bringing into being from non-existence';
-- [scan] مكان · place (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a place, a location' WHERE id = 'SNS:كون:place' AND scope_level = 'lemma' AND gloss_en IS 'place; location (makān)';
-- [scan] لُعَابٌ · saliva (live)
UPDATE ar_ling_root_sense SET gloss_en = 'saliva running from the mouth' WHERE id = 'SNS:لعب:saliva' AND scope_level = 'lemma' AND gloss_en IS 'drool, saliva running from the mouth — hence luʿāb of bees = honey, luʿāb of the sun = gossamer/mirage';
-- [scan] لُعْبَةٌ · toy_game (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a toy or game, like chess; a doll' WHERE id = 'SNS:لعب:toy_game' AND scope_level = 'lemma' AND gloss_en IS 'a plaything: a game or game-piece (chess, backgammon), a toy or figurine';
-- [scan] لَيْل · idioms (live)
UPDATE ar_ling_root_sense SET gloss_en = 'night sayings: worries, a thief, a night traveller' WHERE id = 'SNS:ليل:idioms' AND scope_level = 'lemma' AND gloss_en IS 'the night idioms: banat al-layl (wishes and worries), ibn al-layl (thief or wayfarer), akhu al-layl (nightfarer)';
-- [scan] لَيْل · intense (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a very dark night' WHERE id = 'SNS:ليل:intense' AND scope_level = 'lemma' AND gloss_en IS 'laylun alyal / laylatun laylaʾ: an intensely dark night';
-- [scan] لَيَالٍ · layali (live)
UPDATE ar_ling_root_sense SET gloss_en = 'nights: an irregular جمع التكسير of night' WHERE id = 'SNS:ليل:layali' AND scope_level = 'lemma' AND gloss_en IS 'al-layali: the anomalous plural, from an unused base laylah';
-- [scan] مُلَايَلَةٌ · mulayala (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dealing or hiring night by night' WHERE id = 'SNS:ليل:mulayala' AND scope_level = 'lemma' AND gloss_en IS 'mulayala: dealing or hiring night by night';
-- [scan] لَيْلَة · namednights (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the named last three nights of the month' WHERE id = 'SNS:ليل:namednights' AND scope_level = 'lemma' AND gloss_en IS 'the named end-of-month nights: al-daʿjaʾ (28th), al-dahmaʾ (29th), al-laylaʾ (30th, the darkest)';
-- [scan] لَيْل · nightbird (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a curlew chick' WHERE id = 'SNS:ليل:nightbird' AND scope_level = 'lemma' AND gloss_en IS 'al-layl: the chick of the curlew';
-- [scan] لَيْلَة · unit (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a night: from sunset to dawn' WHERE id = 'SNS:ليل:unit' AND scope_level = 'lemma' AND gloss_en IS 'the laylah: the span from sunset to the break of dawn';
-- [scan] أُمُّ لَيْلَى · wine (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dark wine; the first rush of drunkenness' WHERE id = 'SNS:ليل:wine' AND scope_level = 'lemma' AND gloss_en IS 'umm layla: dark wine; layla: the flush of exhilaration, the onset of drunkenness';
-- [scan] نَذْرٌ · bloodmoney (live)
UPDATE ar_ling_root_sense SET gloss_en = 'payment owed for causing wounds' WHERE id = 'SNS:نذر:bloodmoney' AND scope_level = 'lemma' AND gloss_en IS 'al-nadhr (juristic): the compensation due for wounds';
-- [scan] تناذر القَوْمُ · mutual (live)
UPDATE ar_ling_root_sense SET gloss_en = 'warning one another' WHERE id = 'SNS:نذر:mutual' AND scope_level = 'lemma' AND gloss_en IS 'tanadhur: warning one another';
-- [scan] نُذْر · nudhur (live)
UPDATE ar_ling_root_sense SET gloss_en = 'warners (جمع التكسير), or a مَصْدَر: warning itself' WHERE id = 'SNS:نذر:nudhur' AND scope_level = 'lemma' AND gloss_en IS 'al-nudhur: plural of nadhir, or a verbal noun meaning the warning itself';
-- [scan] نَذِيرَةٌ · offering (live)
UPDATE ar_ling_root_sense SET gloss_en = 'something given to fulfil a vow' WHERE id = 'SNS:نذر:offering' AND scope_level = 'lemma' AND gloss_en IS 'al-nadhira: the thing given in fulfilment of a vow';
-- [scan] نَذِيرَةٌ · scout (live)
UPDATE ar_ling_root_sense SET gloss_en = 'an army''s scout who warns of the enemy' WHERE id = 'SNS:نذر:scout' AND scope_level = 'lemma' AND gloss_en IS 'nadhirat al-jaysh: the armys scout who warns them of the enemy';
-- [scan] نَذِيرَةٌ · templechild (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a child given to serve a temple or church' WHERE id = 'SNS:نذر:templechild' AND scope_level = 'lemma' AND gloss_en IS 'al-nadhira: a child dedicated to serve the temple or church';
-- [scan] نَّذْر · vow (live)
UPDATE ar_ling_root_sense SET gloss_en = 'a vow: binding yourself to what is not required' WHERE id = 'SNS:نذر:vow' AND scope_level = 'lemma' AND gloss_en IS 'al-nadhr (the vow): binding upon oneself what is not obligatory';
-- [scan] نُوَاسٌ · dangling_thing (live)
UPDATE ar_ling_root_sense SET gloss_en = 'something hanging down, like a cobweb' WHERE id = 'SNS:نوس:dangling_thing' AND scope_level = 'lemma' AND gloss_en IS 'a dangling/pendent thing (e.g. cobweb, ceiling hanging)';
-- [scan] نَاسَ · drive_camels (live)
UPDATE ar_ling_root_sense SET gloss_en = 'to drive camels' WHERE id = 'SNS:نوس:drive_camels' AND scope_level = 'lemma' AND gloss_en IS 'to drive (camels)';
-- [scan] يقن · credulity (live)
UPDATE ar_ling_root_sense SET gloss_en = 'believing everything one hears' WHERE id = 'SNS:يقن:credulity' AND scope_level = 'lemma' AND gloss_en IS 'credulous: believing whatever he hears';
-- [scan] يَقِين · death (live)
UPDATE ar_ling_root_sense SET gloss_en = 'death, the certain thing' WHERE id = 'SNS:يقن:death' AND scope_level = 'lemma' AND gloss_en IS 'death, "the Certain"';
-- [scan] يقن · eager_devotion (live)
UPDATE ar_ling_root_sense SET gloss_en = 'keen on something, attached to it' WHERE id = 'SNS:يقن:eager_devotion' AND scope_level = 'lemma' AND gloss_en IS 'keenly attached to / eager for a thing';
-- [scan] مُيَاوَمَةٌ · daily_reckoning (live)
UPDATE ar_ling_root_sense SET gloss_en = 'dealing or hiring by the day; daily wages' WHERE id = 'SNS:يوم:daily_reckoning' AND scope_level = 'lemma' AND gloss_en IS 'dealing / hiring by the day (mujāwama), day-wages';
-- [scan] يَوْم · days_of_god (live)
UPDATE ar_ling_root_sense SET gloss_en = 'the Days of God: His favours and punishments on nations' WHERE id = 'SNS:يوم:days_of_god' AND scope_level = 'lemma' AND gloss_en IS 'the Days of God: His favours and His retributions upon the nations';
-- [scan] الْيَوْم · present_time (live)
UPDATE ar_ling_root_sense SET gloss_en = 'today; the present time, not one set day' WHERE id = 'SNS:يوم:present_time' AND scope_level = 'lemma' AND gloss_en IS 'today; the present moment (not a specific calendar day)';
