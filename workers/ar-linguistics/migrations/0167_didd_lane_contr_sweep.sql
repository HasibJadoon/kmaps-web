-- 0167: opposites, Lane-marker sweep (contr.) — نزل↔صعد, عقب↔عفو (22:60), شِدَّة↔رَخَاء; two kinds corrected.
-- Opposites (30-KIN, ar_ling_root_didd) for the 13 roots of Ghāfir 40:1–3 — third pass (after 0141, 0160, 0163).
-- Mined: Lane by "contr." / "the contr. of" / "contrary to" / "opposed to" / "opposite"; the ten Arabic books by
-- ضدّ / نقيض / خلاف — under each passage root AND under the candidate's root (all through ar_ling_root_lexicon_block_v).
-- Tafsīr checked by text_norm LIKE.
--
-- A. New rows (book-stated, not live before)
--    نزل ↔ صعد (antonym): Lane under صعد p.1687 calls نَزَّلَهُ/أَنْزَلَهُ "the contr. sense" of أَصْعَدَهُ; Tāj p.491 and
--      Qāmūs (art. فرع) mark أفرع/فرع "صعد، ونزل، ضدّ"; al-Rāghib p.483 sets الصعود (from the servant to God) against
--      النزول (from God to the servant) — the تَنزِيل sense itself. 0160 had said "no book pairs it"; that was under
--      نزل only — the pair is stated under صعد and فرع. No verse holds both words → no display.
--    عقب ↔ عفو (antonym): Jamhara p.540 «العَفْو: ضدّ العقوبة» (block keyed under خوو in the view); al-ʿAyn p.611,
--      Lisān p.1076, Qāmūs, al-Rāghib p.574 define عفو as leaving the punishment; al-Zamakhsharī and al-Ālūsī on 22:60:
--      «لا يوصف بالعفو إلا القادر على ضدّه» (= العقوبة). Display 22:60 (عاقب … لعفو غفور).
--    شدد ↔ رخو (antonym, for شِدَّة "hard times"): Jamhara p.540 «والرَّخاء: ضدّ الشِّدَّة»; Lisān p.1110 (حديث
--      «اذكر الله في الرخاء يذكرك في الشدة»; «وقع في رخاء بعد شدة»). No verse holds both → no display.
-- B. relation_kind made honest (no book says ضدّ/نقيض/contr. for these; each side is defined by NOT being the other):
--    DID:توب:صرر antonym → contrast (al-Ṭabarī/Ibn ʿĀshūr define it by negation; no ضدّ in any lexicon or tafsīr).
--    DID:قبل:ردد antonym → contrast (Ṣiḥāḥ/Lisān/Tāj: «ردّ عليه الشيء إذا لم يقبله» — a definition by negation).
-- C. Verses for live rows with display_json NULL: searched qr_ayah.text_bare for every row (both sides). Only
--    DID:عقب:عفو (new) gets one. No āyah holds both sides in the matching sense for: توب:صرر, ذنب:راس, شدد:لين,
--    شدد:خفف, شدد:حلل, شدد:ضعف, شدد:رقق, شدد:رخو, طول:قصر, طول:عرض, عزز:هون (30:27 أهون = "easier"), عزز:عزز,
--    عقب:ثوب (18:44 «خير ثوابا وخير عقبا»: عُقْب there is the good end, a near-synonym, not an opposite),
--    علم:جهل:2, غفر:غفر, قبل:ردد (all hits are قَبْل "before"), كتب:نشر, كتب:اغفل, نزل:رحل, نزل:صعد.
-- Rejected: نزل ↔ نَفِق (Tāj «طعام نفق: نقيض نَزِل» — نَزَل = food with good yield, not in the Qurʾān); نزل ↔ هبط
--    (al-Rāghib «بخلاف الإنزال» = a difference of tone, not an opposite); شدد ↔ رخصة (Ṣiḥāḥ/Lisān «خلاف التشديد» —
--    same idea as AN:شدد:2 تخفيف, not a new pair); شدد ↔ تخلية (Lane under خلو/ابض «contr. of شَدٌّ» — same as
--    DID:شدد:حلل); قَابِل ↔ دَابِر (Lane p.2984 / Tāj p.221: the winning arrow / the bucket-taker — other senses of قابل).
-- Still none: إِلَٰه (اله — Lane's only "contr." there is the pronunciation of the lām, tarqīq), مَصِير (صير — no ضدّ/
--    نقيض/خلاف/contr. in any of the ten books), ذَنْب (sin), طَوْل (bounty), عَقِب (heel).

-- ── A. new rows ─────────────────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_root_didd (id, root_norm, antonym_ar, antonym_root, antonym_en, relation_kind, sort_order, source_ref, status, confidence, generated_by, note_en, display_json, root_id, antonym_root_id, lemma_id, for_word_ar, for_word_en) VALUES ('DID:نزل:صعد', 'نزل', 'الصُّعُود', 'صعد', 'going up', 'antonym', 2, 'Lane blk_lane_f5f74fa419ed25bb p.1687 (under صعد: اصعده «like as one says in the contr. sense نَزَّلَهُ and أَنْزَلَهُ and اِسْتَنْزَلَهُ»); al-Rāghib blk_mfr_c2a81332d3743a26 p.483 («واستعير الصعود لما يصل من العبد إلى الله، كما استعير النزول لما يصل من الله إلى العبد»); Tāj blk_taj_12f859135ba51c28 p.491 (art. فرع: «أفرع في الجبل: صعّد، وأفرع منه: نزل، ضدّ»); Qāmūs blk_qms_e33e10511999d32e, no printed page (art. فرع: «صعد، ونزل، ضدّ»); Lisān blk_lsn_b08070354e2d4355 p.4094 (art. فرع: «أفرع في الجبل صعّد، وأفرع منه نزل»)', 'live', 0.8, 'source_stated', 'Coming down ↔ going up. al-Rāghib: what comes from God comes down; what rises to Him goes up.', NULL, '0d5ddad8b8e57c6cbe29034c20', '0b289fe0e21995349dbd2d2b40', NULL, NULL, NULL);
INSERT OR IGNORE INTO ar_ling_root_didd (id, root_norm, antonym_ar, antonym_root, antonym_en, relation_kind, sort_order, source_ref, status, confidence, generated_by, note_en, display_json, root_id, antonym_root_id, lemma_id, for_word_ar, for_word_en) VALUES ('DID:عقب:عفو', 'عقب', 'العَفْو', 'عفو', 'pardon, letting off', 'antonym', 3, 'Jamhara blk_jam_d8ede564a0233405 p.540 («العَفْو: ضدّ العقوبة»; keyed under خوو in the view); al-ʿAyn blk_kay_8d782b5c8df84e21 p.611 («العفو: تركك إنسانا استوجب عقوبة»); Lisān blk_lsn_b1b865fd4179417c p.1076 («التجاوز عن الذنب وترك العقاب عليه»); Qāmūs blk_qms_542adc111eff882e, no printed page («وترك عقوبة المستحق»); al-Rāghib blk_mfr_f6adde2adb064a5e p.574 («ترك العقوبة»); al-Zamakhsharī on 22:60 QR:TE:TAFSIR_BLK_BF_27e768f6d669ca27dce4d95c («لا يوصف بالعفو إلا القادر على ضدّه»); al-Ālūsī on 22:60 QR:TE:TAFSIR_BLK_BF_9f6dfa2692763c0a6811e83f p.190 (same)', 'live', 0.85, 'source_stated', 'Punishing ↔ letting off. Ibn Durayd: pardon is the opposite of punishment.', '{"quran":[{"surah":22,"ayah":60,"needle":"ومن عاقب بمثل ما عوقب به"},{"surah":22,"ayah":60,"needle":"ان الله لعفو غفور"}]}', '2cb4f93058ff7723ce0d8cd500', '1245ba54177954a211ad96c9af', NULL, NULL, NULL);
INSERT OR IGNORE INTO ar_ling_root_didd (id, root_norm, antonym_ar, antonym_root, antonym_en, relation_kind, sort_order, source_ref, status, confidence, generated_by, note_en, display_json, root_id, antonym_root_id, lemma_id, for_word_ar, for_word_en) VALUES ('DID:شدد:رخو', 'شدد', 'الرَّخَاء', 'رخو', 'ease, good times', 'antonym', 6, 'Jamhara blk_jam_168bafd7dc636ae0 p.540 («والرَّخاء: ضدّ الشِّدَّة»; keyed under خوو in the view); Lisān blk_lsn_ec15da8bff955d17 p.1110 (ḥadīth «اذكر الله في الرخاء يذكرك في الشدة»), blk_lsn_f2fb1367c656728a p.1110 («استرخت به حاله إذا وقع في حال حسنة بعد ضيق وشدة»); Tāj blk_taj_42a1aceda5a9e8d2 p.140 («استرخى به الأمر: وقع في … رخاء بعد شدة»)', 'live', 0.8, 'source_stated', 'Hard times ↔ easy times. Ibn Durayd calls them opposites.', NULL, 'df871a1ccc5785c36261aa83b2', '811e87ac2f815c130494f5e17e', NULL, 'شِدَّة', 'hard times');

-- ── B. relation_kind made honest ───────────────────────────────────────────────────────────────────────
UPDATE ar_ling_root_didd SET relation_kind = 'contrast' WHERE id = 'DID:توب:صرر' AND status = 'live' AND relation_kind = 'antonym';
UPDATE ar_ling_root_didd SET relation_kind = 'contrast' WHERE id = 'DID:قبل:ردد' AND status = 'live' AND relation_kind = 'antonym';
